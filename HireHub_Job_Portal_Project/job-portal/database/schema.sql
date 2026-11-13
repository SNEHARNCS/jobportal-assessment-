CREATE DATABASE IF NOT EXISTS hirehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hirehub;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','employer','job_seeker') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_active(role,is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_seeker_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  phone VARCHAR(30), location VARCHAR(160), headline VARCHAR(180), summary TEXT,
  highest_qualification VARCHAR(120), college VARCHAR(180), graduation_year YEAR NULL,
  years_experience DECIMAL(4,1) NOT NULL DEFAULT 0, previous_company VARCHAR(180),
  resume_path VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_seeker_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employer_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  company_name VARCHAR(180), description TEXT, website VARCHAR(255), location VARCHAR(180),
  industry VARCHAR(120), logo_path VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employer_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS education (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  degree VARCHAR(160) NOT NULL, institution VARCHAR(180) NOT NULL,
  graduation_year YEAR NULL, description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_education_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_education_user(user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS skills (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_seeker_skills (
  user_id BIGINT UNSIGNED NOT NULL, skill_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(user_id,skill_id),
  CONSTRAINT fk_jss_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_jss_skill FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employer_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL, description TEXT NOT NULL,
  location VARCHAR(180) NOT NULL,
  employment_type ENUM('full-time','part-time','internship','contract','work_from_home') NOT NULL,
  experience_years DECIMAL(4,1) NOT NULL DEFAULT 0,
  min_salary DECIMAL(12,2) NULL, max_salary DECIMAL(12,2) NULL,
  qualification VARCHAR(180), vacancies INT NOT NULL DEFAULT 1,
  deadline DATE NULL,
  status ENUM('draft','pending_approval','approved','rejected','closed','expired') NOT NULL DEFAULT 'pending_approval',
  is_closed BOOLEAN NOT NULL DEFAULT FALSE, admin_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_employer FOREIGN KEY(employer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_jobs_search(status,is_closed,created_at),
  INDEX idx_jobs_employer(employer_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_skills (
  job_id BIGINT UNSIGNED NOT NULL, skill_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(job_id,skill_id),
  CONSTRAINT fk_js_job FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_js_skill FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resumes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL, file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255), uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resume_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS applications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id BIGINT UNSIGNED NOT NULL, job_seeker_id BIGINT UNSIGNED NOT NULL,
  resume_path VARCHAR(255) NOT NULL, cover_letter TEXT,
  status ENUM('applied','under_review','shortlisted','interview_scheduled','rejected','selected','withdrawn') NOT NULL DEFAULT 'applied',
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_application_job FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_seeker FOREIGN KEY(job_seeker_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_application_job_seeker(job_id,job_seeker_id),
  INDEX idx_application_job(job_id,status),
  INDEX idx_application_seeker(job_seeker_id,applied_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS application_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  changed_by BIGINT UNSIGNED NULL,
  old_status VARCHAR(40), new_status VARCHAR(40) NOT NULL, note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_application FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_history_application(application_id,created_at)
) ENGINE=InnoDB;
