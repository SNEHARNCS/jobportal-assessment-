import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';

export async function getResume(req,res) {
  const filename=path.basename(req.params.filename);
  let allowed=req.user.role==='admin';
  if(req.user.role==='job_seeker') {
    const [[row]]=await pool.query('SELECT resume_path FROM job_seeker_profiles WHERE user_id=?',[req.user.id]);
    allowed=row?.resume_path===filename;
  }
  if(req.user.role==='employer') {
    const [[row]]=await pool.query(`SELECT a.id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.employer_id=? AND a.resume_path=? LIMIT 1`,[req.user.id,filename]);
    allowed=!!row;
  }
  if(!allowed) return res.status(403).json({message:'You are not allowed to access this resume.'});
  const file=path.resolve(process.env.UPLOAD_DIR || 'uploads',filename);
  if(!fs.existsSync(file)) return res.status(404).json({message:'Resume file not found.'});
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`inline; filename="${filename}"`);
  fs.createReadStream(file).pipe(res);
}
