# HireHub REST API

Base URL: `http://localhost:5000/api`

Protected endpoints require `Authorization: Bearer <JWT>`.

## Authentication
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register job seeker or employer |
| POST | `/auth/login` | Public | Login |
| POST | `/auth/bootstrap-admin` | One-time setup | Create first admin only if none exists |
| GET | `/auth/me` | Authenticated | Current user |

## Files
| Method | Endpoint | Access |
|---|---|---|
| GET | `/files/resume/:filename` | Owner, employer with related application, or admin |

## Profiles
| Method | Endpoint | Access |
|---|---|---|
| GET/PUT | `/profiles/seeker` | Job seeker |
| POST | `/profiles/seeker/resume` | Job seeker; multipart field `resume` |
| POST | `/profiles/seeker/education` | Job seeker |
| PUT/DELETE | `/profiles/seeker/education/:id` | Owning job seeker |
| GET/PUT | `/profiles/employer` | Employer |
| POST | `/profiles/employer/logo` | Employer; multipart field `logo` |

## Jobs
| Method | Endpoint | Access |
|---|---|---|
| GET | `/jobs` | Public; supports q, location, type, experience, skill, minSalary, maxSalary, page, limit |
| GET | `/jobs/:id` | Public; employer may view own unapproved posting |
| GET | `/jobs/mine` | Employer |
| POST | `/jobs` | Employer publishes immediately; admin can publish for an active employer by including `employer_id` |
| PUT | `/jobs/:id` | Owning employer |
| DELETE | `/jobs/:id` | Owning employer |

## Applications
| Method | Endpoint | Access |
|---|---|---|
| POST | `/jobs/:jobId/applications` | Job seeker |
| GET | `/applications/mine` | Job seeker |
| PATCH | `/applications/:id/withdraw` | Owning job seeker |
| GET | `/jobs/:jobId/applicants` | Owning employer; returns applicant count and resume file references |
| PATCH | `/applications/:id/status` | Owning employer |
| GET | `/applications/:id/history` | Related seeker/employer |

## Dashboards and admin
| Method | Endpoint | Access |
|---|---|---|
| GET | `/dashboard/employer` | Employer |
| GET | `/dashboard/admin` | Admin |
| GET | `/admin/users` | Admin |
| PATCH | `/admin/users/:id/status` | Admin |
| GET | `/admin/jobs/pending` | Admin |
| PATCH | `/admin/jobs/:id/moderate` | Admin |
| GET | `/admin/applications` | Admin |

## Common response codes
- `200` successful read/update
- `201` successful creation
- `400` invalid request/business rule
- `401` missing/invalid authentication
- `403` insufficient role or deactivated account
- `404` resource not found/not owned
- `409` duplicate email/application
- `500` unexpected server error
