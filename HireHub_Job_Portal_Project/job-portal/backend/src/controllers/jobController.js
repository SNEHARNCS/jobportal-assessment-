import pool from '../config/db.js';

const employmentTypes = ['full-time', 'part-time', 'internship', 'contract', 'work_from_home'];

function jobInputError(input, requireCore = false) {
  for (const field of ['title', 'description', 'location']) {
    if (requireCore && (typeof input[field] !== 'string' || !input[field].trim())) return `${field} is required.`;
    if (input[field] !== undefined && (typeof input[field] !== 'string' || !input[field].trim())) return `${field} cannot be empty.`;
  }
  if (input.title !== undefined && input.title.trim().length > 180) return 'Job title cannot exceed 180 characters.';
  if (input.location !== undefined && input.location.trim().length > 180) return 'Location cannot exceed 180 characters.';
  if (requireCore && !employmentTypes.includes(input.employment_type)) return 'Choose a valid employment type.';
  if (input.employment_type !== undefined && !employmentTypes.includes(input.employment_type)) return 'Choose a valid employment type.';
  for (const field of ['experience_years', 'min_salary', 'max_salary']) {
    if (input[field] === undefined || input[field] === '') continue;
    const value = Number(input[field]), max = field === 'experience_years' ? 999.9 : 9999999999.99;
    if (!Number.isFinite(value) || value < 0 || value > max) return `${field.replaceAll('_', ' ')} must be a valid non-negative number.`;
  }
  if (input.min_salary !== undefined && input.max_salary !== undefined && input.min_salary !== '' && input.max_salary !== '' && Number(input.min_salary) > Number(input.max_salary)) {
    return 'Maximum salary must be greater than or equal to minimum salary.';
  }
  if (input.vacancies !== undefined) {
    const vacancies = Number(input.vacancies);
    if (!Number.isSafeInteger(vacancies) || vacancies < 1 || vacancies > 2147483647) return 'Vacancies must be a positive whole number.';
  }
  if (input.deadline !== undefined && input.deadline !== '') {
    const date = String(input.deadline);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
      return 'Deadline must be a valid date in YYYY-MM-DD format.';
    }
  }
  return null;
}

export async function listJobs(req, res) {
  const { q = '', location = '', type = '', experience = '', skill = '', minSalary = '', maxSalary = '', page = '1', limit = '10' } = req.query;
  const p = Math.max(1, Number(page) || 1), size = Math.min(50, Math.max(1, Number(limit) || 10));
  const where = ["j.status='approved'", 'j.is_closed=false', 'u.is_active=true', '(j.deadline IS NULL OR j.deadline >= CURRENT_DATE)'];
  const args = [];
  let idx = 1;
  if (q) { where.push(`(j.title ILIKE $${idx} OR ep.company_name ILIKE $${idx+1})`); args.push(`%${q}%`, `%${q}%`); idx += 2; }
  if (location) { where.push(`j.location ILIKE $${idx}`); args.push(`%${location}%`); idx++; }
  if (type) { where.push(`j.employment_type=$${idx}`); args.push(type); idx++; }
  if (experience !== '') { where.push(`j.experience_years <= $${idx}`); args.push(Number(experience)); idx++; }
  if (minSalary !== '') { where.push(`j.max_salary >= $${idx}`); args.push(Number(minSalary)); idx++; }
  if (maxSalary !== '') { where.push(`j.min_salary <= $${idx}`); args.push(Number(maxSalary)); idx++; }
  if (skill) { where.push(`EXISTS (SELECT 1 FROM job_skills js JOIN skills s ON s.id=js.skill_id WHERE js.job_id=j.id AND s.name ILIKE $${idx})`); args.push(`%${skill}%`); idx++; }
  const clause = where.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM jobs j JOIN employer_profiles ep ON ep.user_id=j.employer_id JOIN users u ON u.id=j.employer_id WHERE ${clause}`, args);
  const total = Number(countRows[0].total);
  const [rows] = await pool.query(
    `SELECT j.id,j.title,j.location,j.employment_type,j.experience_years,j.min_salary,j.max_salary,j.description,j.deadline,j.created_at,ep.company_name,ep.logo_path
     FROM jobs j JOIN employer_profiles ep ON ep.user_id=j.employer_id JOIN users u ON u.id=j.employer_id
     WHERE ${clause} ORDER BY j.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
    [...args, size, (p - 1) * size]
  );
  res.json({ jobs: rows, pagination: { page: p, limit: size, total, pages: Math.ceil(total / size) } });
}

export async function getJob(req, res) {
  const [rows] = await pool.query(
    `SELECT j.*,ep.company_name,ep.description company_description,ep.website,ep.logo_path
     FROM jobs j JOIN employer_profiles ep ON ep.user_id=j.employer_id JOIN users u ON u.id=j.employer_id
     WHERE j.id=$1 AND u.is_active=true AND ((j.status='approved' AND j.is_closed=false AND (j.deadline IS NULL OR j.deadline>=CURRENT_DATE)) OR j.employer_id=$2)`,
    [req.params.id, req.user?.id || 0]
  );
  if (!rows.length) return res.status(404).json({ message: 'Job not found.' });
  const [skills] = await pool.query('SELECT s.name FROM skills s JOIN job_skills js ON js.skill_id=s.id WHERE js.job_id=$1', [req.params.id]);
  res.json({ job: rows[0], skills: skills.map(s => s.name) });
}

export async function createJob(req, res) {
  const { title, description, location, employment_type, experience_years, min_salary, max_salary, qualification, vacancies, deadline, skills = [] } = req.body;
  const validationError = jobInputError(req.body, true);
  if (validationError) return res.status(400).json({ message: validationError });
  let employerId = req.user.id;
  if (req.user.role === 'admin') {
    employerId = Number(req.body.employer_id);
    if (!Number.isSafeInteger(employerId) || employerId < 1) return res.status(400).json({ message: 'Select an employer for this job.' });
    const [[employer]] = await pool.query(
      `SELECT u.id,ep.company_name FROM users u JOIN employer_profiles ep ON ep.user_id=u.id WHERE u.id=$1 AND u.role='employer' AND u.is_active=true`,
      [employerId]
    );
    if (!employer) return res.status(400).json({ message: 'Select an active employer with a company profile.' });
    if (!employer.company_name?.trim()) return res.status(400).json({ message: 'The selected employer must complete their company profile before a job can be published.' });
  }
  const [result] = await pool.query(
    `INSERT INTO jobs (employer_id,title,description,location,employment_type,experience_years,min_salary,max_salary,qualification,vacancies,deadline,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'approved') RETURNING id`,
    [employerId, title, description, location, employment_type, Number(experience_years || 0), min_salary || null, max_salary || null, qualification || null, Number(vacancies || 1), deadline || null]
  );
  await setJobSkills(result[0].id, skills);
  res.status(201).json({ message: 'Job published and visible to job seekers.', jobId: result[0].id });
}

async function setJobSkills(jobId, skills) {
  for (const raw of (Array.isArray(skills) ? skills : String(skills).split(','))) {
    const name = String(raw).trim(); if (!name) continue;
    await pool.query('INSERT INTO skills(name) VALUES ($1) ON CONFLICT(name) DO NOTHING', [name]);
    const [s] = await pool.query('SELECT id FROM skills WHERE name=$1', [name]);
    if (s[0]) await pool.query('INSERT INTO job_skills(job_id,skill_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [jobId, s[0].id]);
  }
}

export async function myJobs(req, res) {
  const [rows] = await pool.query(
    `SELECT j.*,
      COALESCE(STRING_AGG(DISTINCT s.name, ', '), '') skills,
      (SELECT COUNT(*) FROM applications a WHERE a.job_id=j.id) applicant_count
     FROM jobs j
     LEFT JOIN job_skills js ON js.job_id=j.id
     LEFT JOIN skills s ON s.id=js.skill_id
     WHERE j.employer_id=$1 GROUP BY j.id ORDER BY j.created_at DESC`,
    [req.user.id]
  );
  res.json({ jobs: rows });
}

export async function updateJob(req, res) {
  const allowed = ['title', 'description', 'location', 'employment_type', 'experience_years', 'min_salary', 'max_salary', 'qualification', 'vacancies', 'deadline'];
  const updates = allowed.filter(k => req.body[k] !== undefined);
  if (!updates.length) return res.status(400).json({ message: 'No fields to update.' });
  const validationError = jobInputError(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const values = updates.map(k => req.body[k] === '' ? null : req.body[k]);
  let idx = 1;
  const setClauses = updates.map(k => `${k}=$${idx++}`);
  setClauses.push(`status='approved'`);
  const [r] = await pool.query(
    `UPDATE jobs SET ${setClauses.join(', ')} WHERE id=$${idx} AND employer_id=$${idx+1} RETURNING id`,
    [...values, req.params.id, req.user.id]
  );
  if (!r.length) return res.status(404).json({ message: 'Job not found or not owned by you.' });
  if (req.body.skills) {
    await pool.query('DELETE FROM job_skills WHERE job_id=$1', [req.params.id]);
    await setJobSkills(req.params.id, req.body.skills);
  }
  res.json({ message: 'Job updated and published.' });
}

export async function deleteJob(req, res) {
  const [r] = await pool.query('DELETE FROM jobs WHERE id=$1 AND employer_id=$2 RETURNING id', [req.params.id, req.user.id]);
  if (!r.length) return res.status(404).json({ message: 'Job not found or not owned by you.' });
  res.json({ message: 'Job deleted.' });
}
