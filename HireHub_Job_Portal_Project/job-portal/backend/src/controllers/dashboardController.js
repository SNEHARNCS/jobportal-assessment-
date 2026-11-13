import pool from '../config/db.js';

export async function employerDashboard(req,res) {
  const [[jobs]]=await pool.query(`SELECT COUNT(*) total_jobs,SUM(status='approved' AND is_closed=0) active_jobs,SUM(status='pending_approval') pending_jobs FROM jobs WHERE employer_id=?`,[req.user.id]);
  const [[apps]]=await pool.query(`SELECT COUNT(*) total_applications,SUM(a.status='shortlisted') shortlisted,SUM(a.status='rejected') rejected FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.employer_id=?`,[req.user.id]);
  const [recent]=await pool.query(`SELECT a.id,a.status,a.applied_at,u.name candidate_name,j.title FROM applications a JOIN users u ON u.id=a.job_seeker_id JOIN jobs j ON j.id=a.job_id WHERE j.employer_id=? ORDER BY a.applied_at DESC LIMIT 8`,[req.user.id]);
  res.json({stats:{...jobs,...apps},recent});
}
export async function adminDashboard(req,res) {
  const [[users]]=await pool.query(`SELECT COUNT(*) total_users,SUM(role='job_seeker') job_seekers,SUM(role='employer') employers FROM users`);
  const [[jobs]]=await pool.query(`SELECT COUNT(*) total_jobs,SUM(status='approved') approved_jobs,SUM(status='pending_approval') pending_jobs FROM jobs`);
  const [[apps]]=await pool.query('SELECT COUNT(*) total_applications FROM applications');
  const [recent]=await pool.query('SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC LIMIT 8');
  res.json({stats:{...users,...jobs,...apps},recent});
}
export async function listUsers(req,res) {
  const [rows]=await pool.query(`SELECT u.id,u.name,u.email,u.role,u.is_active,u.created_at,ep.company_name
    FROM users u LEFT JOIN employer_profiles ep ON ep.user_id=u.id ORDER BY u.created_at DESC`);
  res.json({users:rows});
}
export async function setUserActive(req,res) {
  if(Number(req.params.id)===req.user.id) return res.status(400).json({message:'You cannot deactivate your own account.'});
  const {is_active}=req.body;
  const [r]=await pool.query('UPDATE users SET is_active=? WHERE id=? AND role <> "admin"',[is_active?1:0,req.params.id]);
  if(!r.affectedRows) return res.status(404).json({message:'User not found or cannot be modified.'});
  res.json({message:'User account updated.'});
}
export async function pendingJobs(req,res) {
  const [rows]=await pool.query(`SELECT j.*,ep.company_name,u.email employer_email FROM jobs j JOIN employer_profiles ep ON ep.user_id=j.employer_id JOIN users u ON u.id=j.employer_id WHERE j.status='pending_approval' ORDER BY j.created_at ASC`);
  res.json({jobs:rows});
}
export async function moderateJob(req,res) {
  const {decision,reason}=req.body;
  if(!['approved','rejected'].includes(decision)) return res.status(400).json({message:'Decision must be approved or rejected.'});
  const [r]=await pool.query("UPDATE jobs SET status=?,admin_note=? WHERE id=? AND status='pending_approval'",[decision,reason||null,req.params.id]);
  if(!r.affectedRows) return res.status(404).json({message:'Pending job not found.'});
  res.json({message:`Job ${decision}.`});
}
export async function allApplications(req,res) {
  const [rows]=await pool.query(`SELECT a.id,a.status,a.applied_at,j.title,u.name candidate_name,ep.company_name FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.job_seeker_id JOIN employer_profiles ep ON ep.user_id=j.employer_id ORDER BY a.applied_at DESC LIMIT 500`);
  res.json({applications:rows});
}
