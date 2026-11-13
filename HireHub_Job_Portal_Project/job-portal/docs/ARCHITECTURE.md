# Architecture and database relationships

## Request flow
React pages/components → Axios API client → Express routes → authentication/role middleware → controllers → MySQL connection pool → JSON response.

## Main relationships
- `users` is the identity table. One user can have one `job_seeker_profiles` or `employer_profiles` row.
- `users` 1-to-many `education`.
- `users` many-to-many `skills` through `job_seeker_skills`.
- `users` (employer) 1-to-many `jobs`.
- `jobs` many-to-many `skills` through `job_skills`.
- `users` (job seeker) 1-to-many `applications`.
- `jobs` 1-to-many `applications`.
- `applications` 1-to-many `application_status_history`.
- `users` 1-to-many `resumes`.

## Important rules
1. Public registration cannot assign the admin role.
2. Only approved, open and unexpired jobs are returned by public search.
3. Employer job modifications are scoped to the authenticated employer ID.
4. Applicant list is scoped to jobs owned by the authenticated employer.
5. Unique `(job_id, job_seeker_id)` prevents duplicate applications.
6. Applications require a resume and cannot be submitted for closed, expired or unapproved jobs.
7. Employer status changes are recorded in application history.
