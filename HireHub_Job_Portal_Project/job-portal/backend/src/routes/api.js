import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import pool from '../config/db.js';
import * as auth from '../controllers/authController.js';
import * as profile from '../controllers/profileController.js';
import * as jobs from '../controllers/jobController.js';
import * as apps from '../controllers/applicationController.js';
import * as dash from '../controllers/dashboardController.js';
import * as files from '../controllers/fileController.js';

const router=Router();
const wrap=(fn)=>asyncHandler(fn);

router.get('/health',wrap(async(req,res)=>{
  await pool.query('SELECT 1');
  res.json({status:'ok',service:'HireHub API'});
}));
router.post('/auth/register',body('email').isEmail(),body('password').isLength({min:8}), (req,res,next)=>{const errors=validationResult(req);if(!errors.isEmpty())return res.status(400).json({message:'Please provide a valid email and a password of at least 8 characters.',errors:errors.array()});next();},wrap(auth.register));
router.post('/auth/login',wrap(auth.login));
router.post('/auth/bootstrap-admin',wrap(auth.bootstrapAdmin));
router.get('/auth/me',authenticate,wrap(auth.me));
router.get('/files/resume/:filename',authenticate,wrap(files.getResume));

router.get('/profiles/seeker',authenticate,allowRoles('job_seeker'),wrap(profile.getSeekerProfile));
router.put('/profiles/seeker',authenticate,allowRoles('job_seeker'),wrap(profile.updateSeekerProfile));
router.post('/profiles/seeker/resume',authenticate,allowRoles('job_seeker'),upload.single('resume'),wrap(profile.uploadResume));
router.post('/profiles/seeker/education',authenticate,allowRoles('job_seeker'),wrap(profile.addEducation));
router.put('/profiles/seeker/education/:id',authenticate,allowRoles('job_seeker'),wrap(profile.updateEducation));
router.delete('/profiles/seeker/education/:id',authenticate,allowRoles('job_seeker'),wrap(profile.deleteEducation));
router.get('/profiles/employer',authenticate,allowRoles('employer'),wrap(profile.getEmployerProfile));
router.put('/profiles/employer',authenticate,allowRoles('employer'),wrap(profile.updateEmployerProfile));
router.post('/profiles/employer/logo',authenticate,allowRoles('employer'),upload.single('logo'),wrap(profile.uploadLogo));

router.get('/jobs',wrap(jobs.listJobs));
router.get('/jobs/mine',authenticate,allowRoles('employer'),wrap(jobs.myJobs));
router.get('/jobs/:id',wrap(jobs.getJob));
router.post('/jobs',authenticate,allowRoles('employer','admin'),wrap(jobs.createJob));
router.put('/jobs/:id',authenticate,allowRoles('employer'),wrap(jobs.updateJob));
router.delete('/jobs/:id',authenticate,allowRoles('employer'),wrap(jobs.deleteJob));

router.post('/jobs/:jobId/applications',authenticate,allowRoles('job_seeker'),wrap(apps.apply));
router.get('/applications/mine',authenticate,allowRoles('job_seeker'),wrap(apps.myApplications));
router.patch('/applications/:id/withdraw',authenticate,allowRoles('job_seeker'),wrap(apps.withdraw));
router.get('/jobs/:jobId/applicants',authenticate,allowRoles('employer'),wrap(apps.employerApplicants));
router.patch('/applications/:id/status',authenticate,allowRoles('employer'),wrap(apps.updateStatus));
router.get('/applications/:id/history',authenticate,wrap(apps.history));

router.get('/dashboard/employer',authenticate,allowRoles('employer'),wrap(dash.employerDashboard));
router.get('/dashboard/admin',authenticate,allowRoles('admin'),wrap(dash.adminDashboard));
router.get('/admin/users',authenticate,allowRoles('admin'),wrap(dash.listUsers));
router.patch('/admin/users/:id/status',authenticate,allowRoles('admin'),wrap(dash.setUserActive));
router.get('/admin/jobs/pending',authenticate,allowRoles('admin'),wrap(dash.pendingJobs));
router.patch('/admin/jobs/:id/moderate',authenticate,allowRoles('admin'),wrap(dash.moderateJob));
router.get('/admin/applications',authenticate,allowRoles('admin'),wrap(dash.allApplications));

export default router;
