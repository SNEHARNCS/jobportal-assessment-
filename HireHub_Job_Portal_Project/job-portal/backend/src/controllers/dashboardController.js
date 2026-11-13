import pool from '../config/db.js';

export async function employerDashboard(req, res) {
  const [jobs] = await pool.query(
    `SELECT COUNT(*) total_jobs,
      SUM(CASE WHEN status='approved' AND is_closed=false THEN 1 ELSE 0 END) active_jobs,
      SUM(CASE WHEN status='pending_approval' THEN 1 ELSE 0 END) pending_jobs
     FROM jobs WHERE employer_id=$1`,
    [req.user.id]
  );
  const [apps] = await pool.query(
    `SELECT COUNT(*) total_applications,
      SUM(CASE WHEN a.status='shortlisted' THEN 1 ELSE 0 END) shortlisted,
      SUM(CASE WHEN a.status='rejected' THEN 1 ELSE 0 END) rejected
     FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.employer_id=$1`,
    [req.user.id]
  );
  const [recent] = await pool.query(
    `SELECT a.id,a.status,a.applied_at,u.name candidate_name,j.title
     FROM applications a JOIN users u ON u.id=a.job_seeker_id JOIN jobs j ON j.id=a.job_id
     WHERE j.employer_id=$1 ORDER BY a.applied_at DESC LIMIT 8`,
    [req.user.id]
  );
  res.json({ stats: { ...jobs[0], ...apps[0] }, recent });
}

export async function adminDashboard(req, res) {
  const [users] = await pool.query(
    `SELECT COUNT(*) total_users,
      SUM(CASE WHEN role='job_seeker' THEN 1 ELSE 0 END) job_seekers,
      SUM(CASE WHEN role='employer' THEN 1 ELSE 0 END) employers
     FROM users`
  );
  const [jobs] = await pool.query(
    `SELECT COUNT(*) total_jobs,
      SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) approved_jobs,
      SUM(CASE WHEN status='pending_approval' THEN 1 ELSE 0 END) pending_jobs
     FROM jobs`
  );
  const [apps] = await pool.query('SELECT COUNT(*) total_applications FROM applications');
  const [recent] = await pool.query('SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC LIMIT 8');
  res.json({ stats: { ...users[0], ...jobs[0], ...apps[0] }, recent });
}

export async function listUsers(req, res) {
  const [rows] = await pool.query(
    `SELECT u.id,u.name,u.email,u.role,u.is_active,u.created_at,ep.company_name
     FROM users u LEFT JOIN employer_profiles ep ON ep.user_id=u.id ORDER BY u.created_at DESC`
  );
  res.json({ users: rows });
}

export async function setUserActive(req, res) {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'You cannot deactivate your own account.' });
  const { is_active } = req.body;
  const [r] = await pool.query(
    "UPDATE users SET is_active=$1 WHERE id=$2 AND role<>'admin' RETURNING id",
    [is_active ? true : false, req.params.id]
  );
  if (!r.length) return res.status(404).json({ message: 'User not found or cannot be modified.' });
  res.json({ message: 'User account updated.' });
}

export async function pendingJobs(req, res) {
  const [rows] = await pool.query(
    `SELECT j.*,ep.company_name,u.email employer_email
     FROM jobs j JOIN employer_profiles ep ON ep.user_id=j.employer_id JOIN users u ON u.id=j.employer_id
     WHERE j.status='pending_approval' ORDER BY j.created_at ASC`
  );
  res.json({ jobs: rows });
}

export async function moderateJob(req, res) {
  const { decision, reason } = req.body;
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Decision must be approved or rejected.' });
  const [r] = await pool.query(
    "UPDATE jobs SET status=$1,admin_note=$2 WHERE id=$3 AND status='pending_approval' RETURNING id",
    [decision, reason || null, req.params.id]
  );
  if (!r.length) return res.status(404).json({ message: 'Pending job not found.' });
  res.json({ message: `Job ${decision}.` });
}

export async function allApplications(req, res) {
  const [rows] = await pool.query(
    `SELECT a.id,a.status,a.applied_at,j.title,u.name candidate_name,ep.company_name
     FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.job_seeker_id
     JOIN employer_profiles ep ON ep.user_id=j.employer_id ORDER BY a.applied_at DESC LIMIT 500`
  );
  res.json({ applications: rows });
}
