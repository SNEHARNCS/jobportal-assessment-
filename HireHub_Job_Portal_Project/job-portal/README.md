# HireHub — Job Portal Application

A full-stack recruitment platform built to the ALTIDEA LLC-FZ Full Stack Developer assessment.

## Stack
- Frontend: React 18, Vite, React Router, Axios, Bootstrap 5
- Backend: Node.js, Express, MySQL 8
- Security: JWT, bcrypt password hashing, role-based middleware, Helmet, rate limiting
- Uploads: Multer (PDF resumes and company logos)

## Roles
- **Admin**: platform statistics, user activation/deactivation, job approval/rejection, application monitoring.
- **Employer**: company profile, CRUD for own jobs, applicant review, status updates.
- **Job seeker**: profile, education, skills, resume, job search/filtering, applications, application history and withdrawal.

## Prerequisites
- Node.js 20+
- MySQL 8+
- npm

## 1. Database
Create the database and tables:

```bash
mysql -u root -p < database/schema.sql
```

The schema creates `hirehub`. Update `backend/.env` with your local MySQL credentials.

## 2. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run seed:jobs
npm run dev
```
API runs at `http://localhost:5000`; health check: `GET /api/health`.
The idempotent `seed:jobs` command creates five distinct approved sample opportunities from different companies.

Create the first admin using the one-time bootstrap endpoint:
```http
POST /api/auth/bootstrap-admin
Content-Type: application/json

{
  "name": "Platform Admin",
  "email": "admin@example.com",
  "password": "ChangeMe123!"
}
```
This endpoint only works when the database contains no admin. Change the password after first login. Do not expose this endpoint publicly in a production deployment; disable/remove it after bootstrap.

## 3. Frontend
In a second terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Open `http://localhost:5173`.

## Demo workflow
1. Bootstrap admin.
2. Register an employer from the Register page using role `employer`.
3. Log in as employer and complete the company profile; published jobs become visible to job seekers immediately.
4. Register as `job_seeker`, complete the profile, upload a PDF resume and apply.
5. Log in as employer to see applicant counts, open candidate resumes and update application statuses.
6. Admins can publish a job for an active employer or approve/reject legacy pending job posts.

## Environment
See `backend/.env.example` and `frontend/.env.example`. Never commit `.env`, secrets, uploaded resumes, or production credentials.

## API overview
See [`docs/API.md`](docs/API.md). All protected routes require:
`Authorization: Bearer <JWT>`

## Deployment
See the complete [Vercel + Render deployment guide](docs/DEPLOYMENT.md), including MySQL provisioning, persistent resume storage, environment variables, and first-admin setup.

## Security and implementation notes
- Passwords are hashed with bcrypt; JWT secrets are environment variables.
- Server-side role checks and ownership checks protect sensitive operations.
- Job search, filtering, sorting and pagination run on the backend.
- Duplicate applications are prevented by a unique database constraint and API check.
- Applications cannot be submitted to unapproved, closed or expired jobs.
- Resume uploads accept PDF only and enforce a size limit.
- Application status changes are recorded in `application_status_history`.
- Admin creation is restricted to the bootstrap endpoint when no admin exists. Public registration cannot create an admin.
- For production, use HTTPS, private object storage for resumes, malware scanning, email verification, backups, stronger password policy, audit logging and a managed database.

## Tests
```bash
cd backend
npm test
```
The included test suite checks the supported role names and application lifecycle states. Add integration tests against a disposable MySQL database before production.

## Submission checklist
- [ ] Configure environment variables
- [ ] Run schema.sql
- [ ] Test all three roles
- [ ] Add screenshots to `docs/screenshots/`
- [ ] Push source to a public GitHub repository (without `.env` or uploads)
- [ ] Deploy frontend/backend and configure production database
- [ ] Create reviewer accounts with temporary passwords
- [ ] Record a short product walkthrough

**Important:** This source package is a complete runnable implementation baseline, but it has not been deployed to external hosting or connected to your personal GitHub account. Run and verify it locally before submitting.
