import pool from '../config/db.js';

export async function getSeekerProfile(req, res) {
  const [rows] = await pool.query(
    `SELECT u.name,u.email,p.phone,p.location,p.headline,p.summary,p.highest_qualification,p.college,p.graduation_year,p.years_experience,p.previous_company,p.resume_path
     FROM users u JOIN job_seeker_profiles p ON p.user_id=u.id WHERE u.id=$1`,
    [req.user.id]
  );
  const [skills] = await pool.query('SELECT s.id,s.name FROM skills s JOIN job_seeker_skills jss ON jss.skill_id=s.id WHERE jss.user_id=$1', [req.user.id]);
  const [education] = await pool.query('SELECT id,degree,institution,graduation_year,description FROM education WHERE user_id=$1 ORDER BY graduation_year DESC', [req.user.id]);
  res.json({ profile: rows[0] || {}, skills, education });
}

export async function updateSeekerProfile(req, res) {
  const fields = ['phone', 'location', 'headline', 'summary', 'highest_qualification', 'college', 'graduation_year', 'years_experience', 'previous_company'];
  const values = fields.map(k => k === 'years_experience' ? Number(req.body[k] || 0) : (req.body[k] === '' ? null : (req.body[k] ?? null)));
  const setClauses = fields.map((k, i) => `${k}=$${i + 1}`).join(', ');
  await pool.query(`UPDATE job_seeker_profiles SET ${setClauses} WHERE user_id=$${fields.length + 1}`, [...values, req.user.id]);
  if (Array.isArray(req.body.skills)) {
    await pool.query('DELETE FROM job_seeker_skills WHERE user_id=$1', [req.user.id]);
    for (const raw of req.body.skills) {
      const name = String(raw).trim();
      if (!name) continue;
      await pool.query('INSERT INTO skills(name) VALUES ($1) ON CONFLICT(name) DO NOTHING', [name]);
      const [skill] = await pool.query('SELECT id FROM skills WHERE name=$1', [name]);
      if (skill[0]) await pool.query('INSERT INTO job_seeker_skills(user_id,skill_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, skill[0].id]);
    }
  }
  res.json({ message: 'Profile updated successfully.' });
}

export async function uploadResume(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Select a PDF resume.' });
  await pool.query('UPDATE job_seeker_profiles SET resume_path=$1 WHERE user_id=$2', [req.file.filename, req.user.id]);
  res.json({ message: 'Resume uploaded successfully.', filename: req.file.filename });
}

export async function getEmployerProfile(req, res) {
  const [rows] = await pool.query('SELECT * FROM employer_profiles WHERE user_id=$1', [req.user.id]);
  res.json({ profile: rows[0] || {} });
}

export async function updateEmployerProfile(req, res) {
  const { company_name, description, website, location, industry } = req.body;
  await pool.query(
    `UPDATE employer_profiles SET company_name=$1,description=$2,website=$3,location=$4,industry=$5 WHERE user_id=$6`,
    [company_name || null, description || null, website || null, location || null, industry || null, req.user.id]
  );
  res.json({ message: 'Company profile updated.' });
}

export async function uploadLogo(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Select a company logo.' });
  await pool.query('UPDATE employer_profiles SET logo_path=$1 WHERE user_id=$2', [req.file.filename, req.user.id]);
  res.json({ message: 'Logo uploaded.', filename: req.file.filename });
}

export async function addEducation(req, res) {
  const { degree, institution, graduation_year, description } = req.body;
  if (!degree || !institution) return res.status(400).json({ message: 'Degree and institution are required.' });
  const [r] = await pool.query(
    'INSERT INTO education(user_id,degree,institution,graduation_year,description) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [req.user.id, degree, institution, graduation_year || null, description || null]
  );
  res.status(201).json({ message: 'Education added.', id: r[0].id });
}

export async function updateEducation(req, res) {
  const { degree, institution, graduation_year, description } = req.body;
  const [r] = await pool.query(
    'UPDATE education SET degree=$1,institution=$2,graduation_year=$3,description=$4 WHERE id=$5 AND user_id=$6 RETURNING id',
    [degree, institution, graduation_year || null, description || null, req.params.id, req.user.id]
  );
  if (!r.length) return res.status(404).json({ message: 'Education record not found.' });
  res.json({ message: 'Education updated.' });
}

export async function deleteEducation(req, res) {
  const [r] = await pool.query('DELETE FROM education WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]);
  if (!r.length) return res.status(404).json({ message: 'Education record not found.' });
  res.json({ message: 'Education deleted.' });
}
