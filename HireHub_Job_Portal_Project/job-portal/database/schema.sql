-- PostgreSQL Schema for HireHub Job Portal

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'employer', 'job_seeker');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE employment_type AS ENUM ('full-time', 'part-time', 'internship', 'contract', 'work_from_home');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'closed', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('applied', 'under_review', 'shortlisted', 'interview_scheduled', 'rejected', 'selected', 'withdrawn');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

CREATE TABLE IF NOT EXISTS job_seeker_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(30), location VARCHAR(160), headline VARCHAR(180), summary TEXT,
  highest_qualification VARCHAR(120), college VARCHAR(180), graduation_year SMALLINT,
  years_experience NUMERIC(4,1) NOT NULL DEFAULT 0, previous_company VARCHAR(180),
  resume_path VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employer_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(180), description TEXT, website VARCHAR(255), location VARCHAR(180),
  industry VARCHAR(120), logo_path VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS education (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  degree VARCHAR(160) NOT NULL, institution VARCHAR(180) NOT NULL,
  graduation_year SMALLINT, description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_education_user ON education(user_id);

CREATE TABLE IF NOT EXISTS skills (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS job_seeker_skills (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  employer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL, description TEXT NOT NULL,
  location VARCHAR(180) NOT NULL,
  employment_type employment_type NOT NULL,
  experience_years NUMERIC(4,1) NOT NULL DEFAULT 0,
  min_salary NUMERIC(12,2), max_salary NUMERIC(12,2),
  qualification VARCHAR(180), vacancies INT NOT NULL DEFAULT 1,
  deadline DATE,
  status job_status NOT NULL DEFAULT 'pending_approval',
  is_closed BOOLEAN NOT NULL DEFAULT FALSE, admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs(status, is_closed, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);

CREATE TABLE IF NOT EXISTS job_skills (
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY(job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS resumes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255), uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  job_seeker_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_path VARCHAR(255) NOT NULL, cover_letter TEXT,
  status application_status NOT NULL DEFAULT 'applied',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, job_seeker_id)
);
CREATE INDEX IF NOT EXISTS idx_application_job ON applications(job_id, status);
CREATE INDEX IF NOT EXISTS idx_application_seeker ON applications(job_seeker_id, applied_at);

CREATE TABLE IF NOT EXISTS application_status_history (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  old_status VARCHAR(40), new_status VARCHAR(40) NOT NULL, note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_history_application ON application_status_history(application_id, created_at);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
