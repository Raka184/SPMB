"use client";

import { useEffect, useRef, useState } from "react";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function StudentExam({ exam, attempt }) {
  const [activeExam, setActiveExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [result, setResult] = useState(attempt?.submitted_at ? attempt : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const submitting = useRef(false);
  const remainingSeconds = useRef(0);
  const submitRef = useRef(null);

  useEffect(() => {
    submitRef.current = submitExam;
  });

  async function sendAction(action, payload = {}) {
    const response = await fetch("/api/student/exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json();
    if (data.state === "submitted") {
      setResult(data);
      setActiveExam(null);
      return data;
    }
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Permintaan ujian tidak dapat diproses.");
    }
    return data;
  }

  async function beginExam() {
    setLoading(true);
    setError("");
    try {
      const data = await sendAction("start");
      if (data.state === "active") {
        const firstUnanswered = data.questions.findIndex((question) => !data.answers?.[String(question.id)]);
        setActiveExam(data);
        setAnswers(data.answers || {});
        setCurrentQuestionIndex(firstUnanswered < 0 ? 0 : firstUnanswered);
        remainingSeconds.current = data.secondsRemaining;
        setSecondsRemaining(data.secondsRemaining);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitExam() {
    if (submitting.current || !activeExam) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      await sendAction("submit", { answers });
      setConfirmSubmit(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  function selectAnswer(questionId, option) {
    setAnswers((current) => ({ ...current, [String(questionId)]: option }));
    sendAction("answer", { questionId, selectedOption: option })
      .then(() => setError(""))
      .catch((requestError) => setError(requestError.message));
  }

  useEffect(() => {
    if (!activeExam || result) return undefined;
    const timer = window.setInterval(() => {
      remainingSeconds.current = Math.max(0, remainingSeconds.current - 1);
      setSecondsRemaining(remainingSeconds.current);
      if (remainingSeconds.current === 0) {
        window.clearInterval(timer);
        submitRef.current?.();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeExam, result]);

  if (result) {
    const score = Number(result.score || 0);
    return (
      <section aria-labelledby="student-exam-result-title" className="admin-panel student-exam-card">
        <header className="admin-panel-heading">
          <div><h2 id="student-exam-result-title">Ujian telah selesai</h2><p>Nilai ujianmu telah tersimpan.</p></div>
        </header>
        <div className="student-exam-result">
          <strong>{score.toLocaleString("id-ID", { maximumFractionDigits: 2 })}</strong>
          <span>Nilai</span>
          <p>Jawaban benar: {Number(result.correct_answers ?? result.correctAnswers ?? 0)} dari {Number(result.total_questions ?? result.totalQuestions ?? 0)} soal.</p>
          <p>Ujian hanya dapat dikerjakan satu kali. Kunci jawaban tidak ditampilkan.</p>
        </div>
      </section>
    );
  }

  if (activeExam) {
    const questions = activeExam.questions;
    const question = questions[currentQuestionIndex];
    const selectedAnswer = answers[String(question.id)];
    const answeredCount = questions.filter((item) => answers[String(item.id)]).length;
    const unansweredCount = questions.length - answeredCount;
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    return (
      <section aria-label="Ujian sedang berlangsung" className="student-exam-active">
        <div className="student-exam-workspace">
          <div className="student-exam-main">
            <header className="student-exam-session-heading">
              <div>
                <span className="student-exam-eyebrow">UJIAN SELEKSI SPMB</span>
                <h2>{activeExam.title}</h2>
                <p>Jawaban tersimpan otomatis saat kamu memilih opsi.</p>
              </div>
              <div aria-live="polite" className={`student-exam-clock${secondsRemaining <= 300 ? " is-low" : ""}`}>
                <span aria-hidden="true">◷</span>
                <span><small>SISA WAKTU</small><strong>{formatDuration(secondsRemaining)}</strong></span>
              </div>
            </header>

            <div className="student-exam-progress">
              <span>Soal {currentQuestionIndex + 1} <span aria-hidden="true">/</span> {questions.length}</span>
              <span>{answeredCount} dari {questions.length} terjawab</span>
              <div aria-label={`Progres ${answeredCount} dari ${questions.length} soal`} className="student-exam-progress-track">
                <span style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
              </div>
            </div>

            <form className="student-exam-question-form" onSubmit={(event) => {
              event.preventDefault();
              if (isLastQuestion) setConfirmSubmit(true);
              else setCurrentQuestionIndex((index) => index + 1);
            }}>
              <fieldset className="student-exam-current-question">
                <legend>
                  <span className="student-exam-question-number">PERTANYAAN {currentQuestionIndex + 1}</span>
                  <span>{question.question_text}</span>
                </legend>
                <div className="student-exam-options">
                  {["a", "b", "c", "d"].map((letter) => {
                    const option = letter.toUpperCase();
                    const inputId = `exam-${question.id}-${letter}`;
                    return (
                      <label
                        className={`student-exam-answer${selectedAnswer === option ? " is-selected" : ""}`}
                        htmlFor={inputId}
                        key={option}
                      >
                        <input
                          checked={selectedAnswer === option}
                          disabled={loading}
                          id={inputId}
                          name={`question-${question.id}`}
                          onChange={() => selectAnswer(question.id, option)}
                          type="radio"
                          value={option}
                        />
                        <span className="student-exam-answer-letter">{option}</span>
                        <span className="student-exam-answer-text">{question[`option_${letter}`]}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {error && <p className="admin-form-error" role="alert">{error}</p>}
              {confirmSubmit ? (
                <div aria-live="polite" className="student-exam-confirm">
                  <p>
                    {unansweredCount
                      ? `Masih ada ${unansweredCount} soal yang belum dijawab. `
                      : "Semua soal sudah dijawab. "}
                    Setelah dikirim, jawaban tidak dapat diubah.
                  </p>
                  <div>
                    <button className="student-exam-secondary-button" disabled={loading} onClick={() => setConfirmSubmit(false)} type="button">
                      Periksa kembali
                    </button>
                    <button className="student-exam-submit-button" disabled={loading} onClick={submitExam} type="button">
                      {loading ? "Mengirim..." : "Ya, kirim jawaban"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="student-exam-question-actions">
                  <button
                    className="student-exam-secondary-button"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))}
                    type="button"
                  >
                    ← Sebelumnya
                  </button>
                  {isLastQuestion ? (
                    <button className="student-exam-submit-button" disabled={loading} type="submit">
                      Selesai &amp; kirim <span aria-hidden="true">→</span>
                    </button>
                  ) : (
                    <button className="student-exam-submit-button" type="submit">
                      Selanjutnya <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>

          <aside aria-label="Peta navigasi soal" className="student-exam-map">
            <div className="student-exam-map-heading">
              <div><h3>Peta Navigasi Soal</h3><p>Pilih nomor untuk berpindah soal</p></div>
              <span aria-hidden="true">▦</span>
            </div>
            <div className="student-exam-question-grid">
              {questions.map((item, index) => {
                const isAnswered = Boolean(answers[String(item.id)]);
                const isCurrent = currentQuestionIndex === index;
                return (
                  <button
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Soal ${index + 1}, ${isAnswered ? "sudah dijawab" : "belum dijawab"}${isCurrent ? ", sedang dibuka" : ""}`}
                    className={`student-exam-map-number${isAnswered ? " is-answered" : ""}${isCurrent ? " is-current" : ""}`}
                    disabled={loading}
                    key={item.id}
                    onClick={() => { setCurrentQuestionIndex(index); setConfirmSubmit(false); }}
                    type="button"
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="student-exam-map-legend">
              <span><i className="is-answered" />Sudah dijawab</span>
              <span><i className="is-current" />Sedang dibuka</span>
              <span><i />Belum dijawab</span>
            </div>
            <div className="student-exam-map-summary">
              <span>Belum dijawab</span><strong>{unansweredCount} soal</strong>
            </div>
            <button className="student-exam-finish-link" disabled={loading} onClick={() => setConfirmSubmit(true)} type="button">
              Akhiri ujian <span aria-hidden="true">→</span>
            </button>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="student-exam-intro-title" className="admin-panel student-exam-card">
      <header className="admin-panel-heading">
        <div><h2 id="student-exam-intro-title">{exam.title}</h2><p>Ujian resmi SPMB · Durasi {exam.durationMinutes} menit · Satu kali percobaan</p></div>
      </header>
      <div className="student-exam-intro">
        <p>{exam.questionsCount} soal pilihan ganda. Nilai langsung terlihat setelah jawaban dikirim; kunci jawaban tidak ditampilkan.</p>
        {exam.hasAttempt ? (
          <p>Ujian sudah dimulai. Tekan tombol untuk melanjutkan sebelum waktu habis.</p>
        ) : exam.available ? (
          <p>Jadwal ujian sedang dibuka. Pastikan kamu siap sebelum memulai.</p>
        ) : (
          <p>{exam.isOpen ? "Ujian belum masuk jadwal buka atau jadwalnya sudah berakhir." : "Ujian belum dibuka oleh panitia."}</p>
        )}
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        <button
          className="admin-action-button"
          disabled={loading || (!exam.available && !exam.hasAttempt)}
          onClick={beginExam}
          type="button"
        >
          {loading ? "Memuat soal..." : exam.hasAttempt ? "Lanjutkan ujian" : "Mulai ujian"}
        </button>
      </div>
    </section>
  );
}
