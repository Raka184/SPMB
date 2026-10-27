CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  username VARCHAR(50) NULL,
  nisn CHAR(10) NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'principal', 'admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_username_unique (username),
  UNIQUE KEY users_nisn_unique (nisn),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spmb_majors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(120) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  description VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY spmb_majors_code_unique (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO spmb_majors (code, name, description, capacity, is_active) VALUES
  ('DKV', 'Desain Komunikasi Visual', 'Mempelajari desain grafis, ilustrasi, fotografi, dan komunikasi visual.', 36, TRUE),
  ('PH', 'Perhotelan', 'Mempelajari layanan perhotelan, tata boga, dan pengelolaan akomodasi.', 36, TRUE),
  ('PM', 'Pemasaran', 'Mempelajari pemasaran digital, penjualan, dan pengelolaan bisnis ritel.', 36, TRUE),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Mempelajari administrasi perkantoran, layanan bisnis, dan komunikasi profesional.', 36, TRUE),
  ('TKJ', 'Teknik Komputer dan Jaringan', 'Mempelajari perakitan komputer, jaringan, dan administrasi sistem.', 36, TRUE),
  ('RPL', 'Rekayasa Perangkat Lunak', 'Mempelajari pemrograman, basis data, dan pengembangan aplikasi.', 36, TRUE),
  ('TM', 'Teknik Mesin', 'Mempelajari proses manufaktur, teknik pemesinan, dan perawatan mesin.', 36, TRUE);

CREATE TABLE IF NOT EXISTS spmb_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  major_id BIGINT UNSIGNED NULL,
  status ENUM(
    'pending_verification',
    'verified',
    'passed',
    'not_passed'
  ) NOT NULL DEFAULT 'pending_verification',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY spmb_applications_user_unique (user_id),
  KEY spmb_applications_major_id (major_id),
  KEY spmb_applications_status (status),
  KEY spmb_applications_created_at (created_at),
  CONSTRAINT spmb_applications_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT spmb_applications_major_fk
    FOREIGN KEY (major_id) REFERENCES spmb_majors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spmb_exam_settings (
  id TINYINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL DEFAULT 'Ujian SPMB',
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  opens_at DATETIME NULL,
  closes_at DATETIME NULL,
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT spmb_exam_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO spmb_exam_settings (id, title, duration_minutes, is_open)
VALUES (1, 'Ujian SPMB', 60, FALSE);

CREATE TABLE IF NOT EXISTS spmb_exam_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option ENUM('A', 'B', 'C', 'D') NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY spmb_exam_questions_order (sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spmb_exam_attempts (
  user_id BIGINT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  correct_answers SMALLINT UNSIGNED NULL,
  total_questions SMALLINT UNSIGNED NOT NULL,
  score DECIMAL(5, 2) NULL,
  PRIMARY KEY (user_id),
  KEY spmb_exam_attempts_submitted (submitted_at),
  CONSTRAINT spmb_exam_attempts_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spmb_exam_answers (
  user_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  selected_option ENUM('A', 'B', 'C', 'D') NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, question_id),
  CONSTRAINT spmb_exam_answers_attempt_fk
    FOREIGN KEY (user_id) REFERENCES spmb_exam_attempts(user_id) ON DELETE CASCADE,
  CONSTRAINT spmb_exam_answers_question_fk
    FOREIGN KEY (question_id) REFERENCES spmb_exam_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO spmb_applications (user_id)
SELECT users.id
FROM users
LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
WHERE users.role = 'student'
  AND spmb_applications.user_id IS NULL;

CREATE TABLE IF NOT EXISTS spmb_announcements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY spmb_announcements_published (is_published, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spmb_settings (
  setting_key VARCHAR(80) NOT NULL,
  setting_value VARCHAR(500) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS principal_sessions (
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY principal_sessions_user_id (user_id),
  KEY principal_sessions_expires_at (expires_at),
  CONSTRAINT principal_sessions_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_sessions (
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY student_sessions_user_id (user_id),
  KEY student_sessions_expires_at (expires_at),
  CONSTRAINT student_sessions_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY admin_sessions_user_id (user_id),
  KEY admin_sessions_expires_at (expires_at),
  CONSTRAINT admin_sessions_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_codes (
  user_id BIGINT UNSIGNED NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY password_reset_codes_expires_at (expires_at),
  CONSTRAINT password_reset_codes_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
