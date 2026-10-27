import { cookies } from "next/headers";
import db from "@/app/lib/db";
import { jsonError } from "@/app/lib/auth";
import { findStudentSession, STUDENT_SESSION_COOKIE } from "@/app/lib/student-session";

const OPTIONS = new Set(["A", "B", "C", "D"]);

async function authenticate(request) {
  const origin = request.headers.get("origin");
  let matchesOrigin = false;
  try {
    matchesOrigin = Boolean(origin) && new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return null;
  }
  if (!matchesOrigin) return null;
  const cookieStore = await cookies();
  return findStudentSession(cookieStore.get(STUDENT_SESSION_COOKIE)?.value);
}

async function loadActiveAttempt(connection, userId, attempt) {
  const [questions] = await connection.execute(
    `SELECT id, question_text, option_a, option_b, option_c, option_d
     FROM spmb_exam_questions ORDER BY sort_order, id`,
  );
  const [answers] = await connection.execute(
    "SELECT question_id, selected_option FROM spmb_exam_answers WHERE user_id = ?",
    [userId],
  );
  const [timeRows] = await connection.execute(
    "SELECT GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, ?)) AS seconds_remaining",
    [attempt.expires_at],
  );
  return {
    success: true,
    state: "active",
    title: attempt.title,
    secondsRemaining: Number(timeRows[0].seconds_remaining),
    questions,
    answers: Object.fromEntries(answers.map((answer) => [String(answer.question_id), answer.selected_option])),
  };
}

async function finalizeAttempt(connection, userId) {
  const [attempts] = await connection.execute(
    "SELECT submitted_at, total_questions, score FROM spmb_exam_attempts WHERE user_id = ? FOR UPDATE",
    [userId],
  );
  const attempt = attempts[0];
  if (!attempt) return null;
  if (attempt.submitted_at) {
    return {
      success: true,
      state: "submitted",
      score: Number(attempt.score),
      totalQuestions: Number(attempt.total_questions),
    };
  }

  const [counts] = await connection.execute(
    `SELECT COUNT(*) AS correct_answers
     FROM spmb_exam_answers
     INNER JOIN spmb_exam_questions ON spmb_exam_questions.id = spmb_exam_answers.question_id
     WHERE spmb_exam_answers.user_id = ?
       AND spmb_exam_answers.selected_option = spmb_exam_questions.correct_option`,
    [userId],
  );
  const correctAnswers = Number(counts[0].correct_answers);
  const totalQuestions = Number(attempt.total_questions);
  const score = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 10000) / 100 : 0;
  await connection.execute(
    `UPDATE spmb_exam_attempts
     SET submitted_at = CURRENT_TIMESTAMP, correct_answers = ?, score = ?
     WHERE user_id = ? AND submitted_at IS NULL`,
    [correctAnswers, score, userId],
  );
  return { success: true, state: "submitted", score, correctAnswers, totalQuestions };
}

async function startExam(userId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [attemptRows] = await connection.execute(
      `SELECT spmb_exam_attempts.*, spmb_exam_settings.title
       FROM spmb_exam_attempts
       CROSS JOIN spmb_exam_settings
       WHERE spmb_exam_attempts.user_id = ? AND spmb_exam_settings.id = 1
       FOR UPDATE`,
      [userId],
    );
    if (attemptRows.length) {
      const attempt = attemptRows[0];
      if (attempt.submitted_at) {
        await connection.commit();
        return {
          success: true,
          state: "submitted",
          score: Number(attempt.score),
          correctAnswers: Number(attempt.correct_answers),
          totalQuestions: Number(attempt.total_questions),
        };
      }
      const [expiredRows] = await connection.execute(
        "SELECT expires_at <= CURRENT_TIMESTAMP AS is_expired FROM spmb_exam_attempts WHERE user_id = ?",
        [userId],
      );
      if (expiredRows[0].is_expired) {
        const result = await finalizeAttempt(connection, userId);
        await connection.commit();
        return result;
      }
      const active = await loadActiveAttempt(connection, userId, attempt);
      await connection.commit();
      return active;
    }

    const [settingsRows] = await connection.execute(
      `SELECT title, duration_minutes, is_open,
              opens_at <= CURRENT_TIMESTAMP AS has_opened,
              closes_at >= CURRENT_TIMESTAMP AS has_not_closed
       FROM spmb_exam_settings WHERE id = 1 FOR UPDATE`,
    );
    const settings = settingsRows[0];
    if (!settings || !settings.is_open || !settings.has_opened || !settings.has_not_closed) {
      await connection.rollback();
      return jsonError("Ujian belum dibuka atau jadwal ujian sudah berakhir.", 403);
    }
    const [questions] = await connection.execute(
      `SELECT id, question_text, option_a, option_b, option_c, option_d
       FROM spmb_exam_questions ORDER BY sort_order, id`,
    );
    if (!questions.length) {
      await connection.rollback();
      return jsonError("Soal ujian belum tersedia. Hubungi panitia SPMB.", 409);
    }
    await connection.execute(
      `INSERT INTO spmb_exam_attempts (user_id, started_at, expires_at, total_questions)
       VALUES (
         ?, CURRENT_TIMESTAMP,
         LEAST(
           DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE),
           (SELECT closes_at FROM spmb_exam_settings WHERE id = 1)
         ),
         ?
       )`,
      [userId, Number(settings.duration_minutes), questions.length],
    );
    const [attemptResult] = await connection.execute(
      `SELECT spmb_exam_attempts.*, spmb_exam_settings.title
       FROM spmb_exam_attempts
       CROSS JOIN spmb_exam_settings
       WHERE spmb_exam_attempts.user_id = ? AND spmb_exam_settings.id = 1`,
      [userId],
    );
    const result = await loadActiveAttempt(connection, userId, attemptResult[0]);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return jsonError("Ujian sudah dimulai dari sesi lain. Muat ulang halaman untuk melanjutkan.", 409);
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function saveAnswer(userId, payload) {
  const questionId = payload.questionId;
  const selectedOption = payload.selectedOption === null ? null : String(payload.selectedOption).toUpperCase();
  if (!/^[1-9]\d{0,17}$/.test(String(questionId)) || (selectedOption !== null && !OPTIONS.has(selectedOption))) {
    return jsonError("Jawaban tidak valid.", 400);
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [attempts] = await connection.execute(
      "SELECT submitted_at, expires_at <= CURRENT_TIMESTAMP AS is_expired FROM spmb_exam_attempts WHERE user_id = ? FOR UPDATE",
      [userId],
    );
    if (!attempts.length || attempts[0].submitted_at) {
      await connection.rollback();
      return jsonError("Ujian tidak sedang berlangsung.", 409);
    }
    if (attempts[0].is_expired) {
      const result = await finalizeAttempt(connection, userId);
      await connection.commit();
      return Response.json({ ...result, message: "Waktu ujian habis dan jawaban telah dikirim." }, { status: 409 });
    }
    const [questions] = await connection.execute(
      "SELECT id FROM spmb_exam_questions WHERE id = ? LIMIT 1",
      [questionId],
    );
    if (!questions.length) {
      await connection.rollback();
      return jsonError("Soal ujian tidak ditemukan.", 404);
    }
    await connection.execute(
      `INSERT INTO spmb_exam_answers (user_id, question_id, selected_option)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE selected_option = VALUES(selected_option)`,
      [userId, questionId, selectedOption],
    );
    await connection.commit();
    return Response.json({ success: true, state: "active" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function submitExam(userId, payload) {
  if (payload.answers !== undefined && (!payload.answers || typeof payload.answers !== "object" || Array.isArray(payload.answers))) {
    return jsonError("Jawaban ujian tidak valid.", 400);
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [attempts] = await connection.execute(
      "SELECT submitted_at, expires_at <= CURRENT_TIMESTAMP AS is_expired FROM spmb_exam_attempts WHERE user_id = ? FOR UPDATE",
      [userId],
    );
    if (!attempts.length) {
      await connection.rollback();
      return jsonError("Ujian belum dimulai.", 409);
    }
    if (attempts[0].submitted_at) {
      await connection.commit();
      return jsonError("Ujian sudah dikirim dan tidak dapat diulang.", 409);
    }

    if (!attempts[0].is_expired && payload.answers) {
      for (const [questionId, selectedOption] of Object.entries(payload.answers)) {
        if (!/^[1-9]\d{0,17}$/.test(questionId) || !OPTIONS.has(selectedOption)) {
          await connection.rollback();
          return jsonError("Jawaban ujian tidak valid.", 400);
        }
        const [savedAnswer] = await connection.execute(
          `INSERT INTO spmb_exam_answers (user_id, question_id, selected_option)
           SELECT ?, id, ? FROM spmb_exam_questions WHERE id = ?
           ON DUPLICATE KEY UPDATE selected_option = VALUES(selected_option)`,
          [userId, selectedOption, questionId],
        );
        if (!savedAnswer.affectedRows) {
          await connection.rollback();
          return jsonError("Soal pada jawaban tidak ditemukan.", 400);
        }
      }
    }
    const result = await finalizeAttempt(connection, userId);
    await connection.commit();
    return Response.json(result);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function POST(request) {
  const student = await authenticate(request);
  if (!student) return jsonError("Sesi siswa tidak valid. Silakan masuk kembali.", 401);

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonError("Permintaan ujian tidak valid.", 400);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError("Permintaan ujian tidak valid.", 400);
  }
  try {
    if (data.action === "start") return await startExam(student.id);
    if (data.action === "answer") return await saveAnswer(student.id, data);
    if (data.action === "submit") return await submitExam(student.id, data);
    return jsonError("Aksi ujian tidak valid.", 400);
  } catch (error) {
    console.error("Aksi ujian siswa gagal:", error);
    return jsonError("Ujian tidak dapat diproses karena layanan bermasalah.", 500);
  }
}
