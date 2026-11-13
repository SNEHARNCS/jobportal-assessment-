import pool from '../config/db.js';

export async function getSeekerProfile(req, res) {
  const [rows] = await pool.query(`SELECT u.name,u.email,p.phone,p.location,p.headline,p.summary,p.highest_qualification,p.college,p.graduation_year,p.years_experience,p.previous_company,p.resume_path
    FROM users u JOIN job_seeker_profiles p ON p.user_id=u.id WHERE u.id=?`, [req.user.id]);
  const [skills] = await pool.query('SELECT s.id,s.name FROM skills s JOIN job_seeker_skills jss ON jss.skill_id=s.id WHERE jss.user_id=?', [req.user.id]);
  const [education] = await pool.query('SELECT id,degree,institution,graduation_year,description FROM education WHERE user_id=? ORDER BY graduation_year DESC', [req.user.id]);
  res.json({ profile: rows[0] || {}, skills, education });
}

export async function updateSeekerProfile(req, res) {
  const fields = ['phone','location','headline','summary','highest_qualification','college','graduation_year','years_experience','previous_company'];
  const values = fields.map(k => k === 'years_experience' ? Number(req.body[k] || 0) : (req.body[k] === '' ? null : (req.body[k] ?? null)));
  await pool.query(`UPDATE job_seeker_profiles SET ${fields.map(k=>`${k}=?`).join(', ')} WHERE user_id=?`, [...values, req.user.id]);
  if (Array.isArray(req.body.skills)) {
    await pool.query('DELETE FROM job_seeker_skills WHERE user_id=?', [req.user.id]);
    for (const raw of req.body.skills) {
      const name = String(raw).trim();
      if (!name) continue;
      await pool.query('INSERT INTO skills(name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)', [name]);
      const [[skill]] = await pool.query('SELECT id FROM skills WHERE name=?', [name]);
      await pool.query('INSERT IGNORE INTO job_seeker_skills(user_id,skill_id) VALUES (?,?)', [req.user.id, skill.id]);
    }
  }
  res.json({ message: 'Profile updated successfully.' });
}

export async function uploadResume(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Select a PDF resume.' });
  await pool.query('UPDATE job_seeker_profiles SET resume_path=? WHERE user_id=?', [req.file.filename, req.user.id]);
  res.json({ message: 'Resume uploaded successfully.', filename: req.file.filename });
}

export async function getEmployerProfile(req, res) {
  const [rows] = await pool.query('SELECT * FROM employer_profiles WHERE user_id=?', [req.user.id]);
  res.json({ profile: rows[0] || {} });
}
export async function updateEmployerProfile(req, res) {
  const { company_name, description, website, location, industry } = req.body;
  await pool.query(`UPDATE employer_profiles SET company_name=?,description=?,website=?,location=?,industry=? WHERE user_id=?`,
    [company_name || null, description || null, website || null, location || null, industry || null, req.user.id]);
  res.json({ message: 'Company profile updated.' });
}
export async function uploadLogo(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Select a company logo.' });
  await pool.query('UPDATE employer_profiles SET logo_path=? WHERE user_id=?', [req.file.filename, req.user.id]);
  res.json({ message: 'Logo uploaded.', filename: req.file.filename });
}


export async function addEducation(req,res) {
  const {degree,institution,graduation_year,description}=req.body;
  if(!degree||!institution) return res.status(400).json({message:'Degree and institution are required.'});
  const [r]=await pool.query('INSERT INTO education(user_id,degree,institution,graduation_year,description) VALUES (?,?,?,?,?)',[req.user.id,degree,institution,graduation_year||null,description||null]);
  res.status(201).json({message:'Education added.',id:r.insertId});
}
export async function updateEducation(req,res) {
  const {degree,institution,graduation_year,description}=req.body;
  const [r]=await pool.query('UPDATE education SET degree=?,institution=?,graduation_year=?,description=? WHERE id=? AND user_id=?',[degree,institution,graduation_year||null,description||null,req.params.id,req.user.id]);
  if(!r.affectedRows) return res.status(404).json({message:'Education record not found.'});
  res.json({message:'Education updated.'});
}
export async function deleteEducation(req,res) {
  const [r]=await pool.query('DELETE FROM education WHERE id=? AND user_id=?',[req.params.id,req.user.id]);
  if(!r.affectedRows) return res.status(404).json({message:'Education record not found.'});
  res.json({message:'Education deleted.'});
}
