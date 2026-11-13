import pool from '../config/db.js';

export async function apply(req, res) {
  const { cover_letter } = req.body;
  const [jobs] = await pool.query(
    "SELECT id,status,is_closed,deadline,(deadline IS NULL OR deadline >= CURRENT_DATE) AS not_expired FROM jobs WHERE id=$1",
    [req.params.jobId]
  );
  const job = jobs[0];
  if (!job || job.status !== 'approved' || job.is_closed || !job.not_expired) return res.status(400).json({ message: 'This job is not accepting applications.' });
  const [profiles] = await pool.query('SELECT resume_path FROM job_seeker_profiles WHERE user_id=$1', [req.user.id]);
  const resume = profiles[0]?.resume_path;
  if (!resume) return res.status(400).json({ message: 'Upload a resume before applying.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [r] = await connection.query(
      "INSERT INTO applications(job_id,job_seeker_id,resume_path,cover_letter,status) VALUES ($1,$2,$3,$4,'applied') RETURNING id",
      [job.id, req.user.id, resume, cover_letter || null]
    );
    await connection.query(
      'INSERT INTO application_status_history(application_id,changed_by,old_status,new_status,note) VALUES ($1,$2,NULL,\'applied\',\'Application submitted\')',
      [r[0].id, req.user.id]
    );
    await connection.commit();
    res.status(201).json({ message: 'Application submitted.', applicationId: r[0].id });
  } catch (e) {
    await connection.rollback();
    if (e.code === '23505') return res.status(409).json({ message: 'You have already applied for this job.' });
    throw e;
  } finally { connection.release(); }
}

export async function myApplications(req, res) {
  const [rows] = await pool.query(
    `SELECT a.id,a.status,a.applied_at,a.cover_letter,j.id job_id,j.title,j.location,j.employment_type,ep.company_name
     FROM applications a JOIN jobs j ON j.id=a.job_id JOIN employer_profiles ep ON ep.user_id=j.employer_id
     WHERE a.job_seeker_id=$1 ORDER BY a.applied_at DESC`,
    [req.user.id]
  );
  res.json({ applications: rows });
}

export async function withdraw(req, res) {
  const [rows] = await pool.query("SELECT id,status FROM applications WHERE id=$1 AND job_seeker_id=$2", [req.params.id, req.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'Application not found.' });
  if (['selected', 'rejected', 'withdrawn'].includes(rows[0].status)) return res.status(400).json({ message: 'This application cannot be withdrawn.' });
  await pool.query("UPDATE applications SET status='withdrawn' WHERE id=$1", [req.params.id]);
  await pool.query(
    'INSERT INTO application_status_history(application_id,changed_by,old_status,new_status,note) VALUES ($1,$2,$3,$4,$5)',
    [req.params.id, req.user.id, rows[0].status, 'withdrawn', 'Withdrawn by candidate']
  );
  res.json({ message: 'Application withdrawn.' });
}

export async function employerApplicants(req, res) {
  const [owned] = await pool.query(
    `SELECT j.id,j.title,j.status,j.is_closed,COUNT(a.id) applicant_count
     FROM jobs j LEFT JOIN applications a ON a.job_id=j.id
     WHERE j.id=$1 AND j.employer_id=$2 GROUP BY j.id`,
    [req.params.jobId, req.user.id]
  );
  if (!owned.length) return res.status(404).json({ message: 'Job not found.' });
  const [rows] = await pool.query(
    `SELECT a.id,a.status,a.applied_at,a.resume_path,a.cover_letter,u.name,u.email,p.phone,p.location,p.headline,p.years_experience,p.highest_qualification
     FROM applications a JOIN users u ON u.id=a.job_seeker_id JOIN job_seeker_profiles p ON p.user_id=u.id
     WHERE a.job_id=$1 ORDER BY a.applied_at DESC`,
    [req.params.jobId]
  );
  res.json({ job: owned[0], applicants: rows });
}

export async function updateStatus(req, res) {
  const allowed = ['under_review', 'shortlisted', 'interview_scheduled', 'rejected', 'selected'];
  const { status, note } = req.body;
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid application status.' });
  const [rows] = await pool.query(
    `SELECT a.id,a.status FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1 AND j.employer_id=$2`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Application not found for your jobs.' });
  const old = rows[0].status;
  await pool.query('UPDATE applications SET status=$1 WHERE id=$2', [status, req.params.id]);
  await pool.query(
    'INSERT INTO application_status_history(application_id,changed_by,old_status,new_status,note) VALUES ($1,$2,$3,$4,$5)',
    [req.params.id, req.user.id, old, status, note || null]
  );
  res.json({ message: 'Application status updated.' });
}

export async function history(req, res) {
  const [rows] = await pool.query(
    `SELECT h.* FROM application_status_history h JOIN applications a ON a.id=h.application_id
     WHERE a.id=$1 AND (a.job_seeker_id=$2 OR EXISTS(SELECT 1 FROM jobs j WHERE j.id=a.job_id AND j.employer_id=$3))
     ORDER BY h.created_at DESC`,
    [req.params.id, req.user.id, req.user.id]
  );
  res.json({ history: rows });
}
