# Production deployment: Vercel + Render

This project deploys as a static Vite/React frontend on Vercel and an Express API on Render. MySQL is a separate service: Render's managed relational database is PostgreSQL, while this API requires MySQL. Use a managed MySQL provider that allows secure connections from Render.

## 1. Prepare the source repository

1. Put the contents of `job-portal` in a GitHub repository.
2. Do not commit `.env` files, passwords, JWT secrets, `node_modules`, `dist`, or uploaded resumes. The repository `.gitignore` excludes these.
3. Keep the two committed lockfiles: `frontend/package-lock.json` and `backend/package-lock.json`.
4. Do not run `npm run seed:jobs` on production unless you intentionally want the sample job posts. The seed script creates demo employer accounts with random, unknown passwords.

The application targets Node.js 20.19+ or 22.12+. Use Node 22.12 or newer on both platforms.

## 2. Create and configure MySQL

1. Create a production MySQL 8+ database and a dedicated application user. Grant that user access only to the HireHub database; do not use the provider's root/admin account for the app.
2. Allow the Render service to connect, preferably with TLS and the provider's network allowlist/private connection.
3. Apply [`../database/schema.sql`](../database/schema.sql) to the production database. It creates the `hirehub` database and required tables. If the provider pre-creates the database and denies `CREATE DATABASE`, connect with an administrative account to apply the schema, or omit the first two `CREATE DATABASE`/`USE` statements and run the remaining schema against the selected database.
4. Save the database host, port, database name, user and password. Do not put these in source control.

## 3. Deploy the API to Render

1. In Render, create **New > Web Service** and connect the repository.
2. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
   - **Node version:** 22.12 or newer
3. Add these environment variables in the Render dashboard:

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | `https://<your-vercel-production-domain>` (no trailing slash) |
   | `ALLOWED_ORIGINS` | Optional comma-separated additional exact frontend origins, such as a custom domain |
   | `JWT_SECRET` | A new random secret of at least 32 characters |
   | `JWT_EXPIRES_IN` | `1d` (or your chosen JWT lifetime) |
   | `DB_HOST` | Managed MySQL host |
   | `DB_PORT` | Managed MySQL port |
   | `DB_USER` | Dedicated HireHub DB user |
   | `DB_PASSWORD` | DB user's password |
   | `DB_NAME` | `hirehub` (or the provisioned database name) |
   | `DB_SSL` | `true` when required by the provider; otherwise `false` |
   | `DB_SSL_CA` | Optional provider CA certificate when required; otherwise empty |
   | `MAX_FILE_SIZE_MB` | `5` |
   | `TRUST_PROXY` | `1` |
   | `ALLOW_ADMIN_BOOTSTRAP` | `false` |

   Generate a JWT secret locally with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Never use the example or local development secret in production. Render provides `PORT`; do not set it manually.

4. **Persist uploaded resumes and company logos.** Render's default filesystem is ephemeral. Attach a persistent disk to the backend service, mount it at `/var/data`, and set `UPLOAD_DIR=/var/data`. A persistent disk requires a Render plan that supports disks. Without a disk or external object storage, uploads can disappear on restart or deploy. A Render disk is tied to one service instance; use private object storage instead if you need multiple instances or horizontal scaling.
5. Deploy. Wait for the health check to pass, then verify `https://<render-service>.onrender.com/api/health` returns `{"status":"ok","service":"HireHub API"}`. This health endpoint checks the database connection too.

## 4. Create the first production admin

The bootstrap endpoint is disabled unless `ALLOW_ADMIN_BOOTSTRAP=true`, and it also refuses to create another admin once one exists.

1. Temporarily set `ALLOW_ADMIN_BOOTSTRAP=true` in Render and redeploy.
2. Send a one-time request using your own strong password and email:

   ```sh
   curl -X POST "https://<render-service>.onrender.com/api/auth/bootstrap-admin" \
     -H "Content-Type: application/json" \
     -d '{"name":"Platform Admin","email":"<your-admin-email>","password":"<unique-password-at-least-12-characters>"}'
   ```

3. Immediately set `ALLOW_ADMIN_BOOTSTRAP=false` and redeploy. Do not share or reuse the password.

## 5. Deploy the frontend to Vercel

1. In Vercel, add a project and import the same repository.
2. Set **Root Directory** to `frontend`. The included [`../frontend/vercel.json`](../frontend/vercel.json) rewrites client-side routes to `index.html`, so direct links such as `/jobs` and `/login/admin` work after refresh.
3. Use:
   - **Framework Preset:** Vite
   - **Install Command:** `npm ci`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Node.js Version:** 22.12 or newer
4. Add `VITE_API_URL=https://<render-service>.onrender.com/api` to Vercel's Production environment. Add it to Preview as well only if preview deployments should call the production API. `VITE_` variables are public and bundled into the frontend; never put secrets in them.
5. Deploy and copy the production Vercel domain.

## 6. Connect the two deployments

1. Update Render's `CLIENT_URL` to the exact Vercel production origin, for example `https://hirehub-example.vercel.app`, without `/` or `/jobs`.
2. Add any additional custom domain origins to `ALLOWED_ORIGINS`, comma-separated and with no wildcard. Avoid allowing preview origins unless needed.
3. Save/redeploy the Render service, then redeploy Vercel if its API URL changed.
4. Open the Vercel site and test registration/login, job search, publishing a job, applying with a PDF resume, employer applicant counts, and opening an applicant resume.

## 7. Go-live checklist

- Production database schema is applied; app uses a least-privilege DB user and TLS where available.
- The Vercel API URL points to the Render service and CORS allows the exact Vercel origin.
- `JWT_SECRET` is unique, random, and not committed.
- `ALLOW_ADMIN_BOOTSTRAP=false` after the admin is created.
- Resume/logo uploads are on persistent disk or private object storage, not Render's ephemeral filesystem.
- Direct navigation/reload works on client routes such as `/jobs` and `/login/admin`.
- The admin, employer, and job-seeker flows have been tested with production-like accounts.
- Database backups and a retention/access policy for resumes are configured with the relevant providers.
- Do not deploy the local `.env`, test helper scripts, or local database credentials as production configuration.

## Troubleshooting

- **Vercel shows a 404 after refreshing a nested route:** confirm the frontend Root Directory is `frontend` and `frontend/vercel.json` is deployed.
- **Browser reports a CORS error:** verify `CLIENT_URL` matches the Vercel origin exactly (scheme and hostname, no path), then redeploy Render.
- **Render health check fails:** inspect service logs and verify `DB_HOST`, `DB_PORT`, credentials, firewall/allowlist, database name, and `DB_SSL`/CA settings.
- **Resume upload works but the file is missing later:** confirm a persistent disk is mounted at `/var/data` and `UPLOAD_DIR=/var/data`, or move files to private object storage.
- **Frontend calls localhost after deployment:** set `VITE_API_URL` in Vercel and redeploy; Vite variables are read at build time.
- **Render rejects the Node version:** select Node 22.12+ in service settings; the package manifests require a Vite-compatible runtime.

## Provider documentation

- [Vercel: Vite deployment](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel: rewrites](https://vercel.com/docs/rewrites)
- [Render: web services](https://render.com/docs/web-services)
- [Render: persistent disks](https://render.com/docs/disks)
- [Render: environment variables](https://render.com/docs/configure-environment-variables)
