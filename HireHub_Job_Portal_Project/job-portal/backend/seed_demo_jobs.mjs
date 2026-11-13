import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hirehub',
  waitForConnections: true,
  connectionLimit: 5,
  decimalNumbers: true
});

const opportunities = [
  {
    company: 'Northstar Technologies',
    email: 'jobs@northstar.hirehub.local',
    industry: 'Software',
    companyDescription: 'Northstar builds dependable digital products for teams across India.',
    title: 'Software Engineer',
    location: 'Bengaluru, Karnataka',
    employmentType: 'full-time',
    experience: 2.5,
    minSalary: 1200000,
    maxSalary: 1800000,
    description: 'Build and maintain customer-facing web products using React and Node.js. You will work with product and design teams, review code, improve performance, and help ship reliable features. Experience with REST APIs and relational databases is preferred.'
  },
  {
    company: 'BluePeak Systems',
    email: 'jobs@bluepeak.hirehub.local',
    industry: 'Information Technology',
    companyDescription: 'BluePeak Systems develops cloud software for growing businesses.',
    title: 'Software Engineer',
    location: 'Hyderabad, Telangana',
    employmentType: 'full-time',
    experience: 1.5,
    minSalary: 900000,
    maxSalary: 1400000,
    description: 'Join a small engineering team building scalable business applications. Implement and test product features, troubleshoot production issues, and collaborate through peer reviews. Familiarity with JavaScript, Git, and cloud-based services is useful.'
  },
  {
    company: 'Aster Digital',
    email: 'jobs@asterdigital.hirehub.local',
    industry: 'Enterprise Software',
    companyDescription: 'Aster Digital helps organisations modernise their enterprise platforms.',
    title: 'Java Developer',
    location: 'Pune, Maharashtra',
    employmentType: 'full-time',
    experience: 3,
    minSalary: 1100000,
    maxSalary: 1700000,
    description: 'Develop backend services for enterprise applications using Java and Spring Boot. Design REST endpoints, write automated tests, and work with relational databases and CI pipelines. Applicants should be comfortable diagnosing issues across service integrations.'
  },
  {
    company: 'Cedar Analytics',
    email: 'jobs@cedaranalytics.hirehub.local',
    industry: 'Data and Analytics',
    companyDescription: 'Cedar Analytics turns operational data into useful business insights.',
    title: 'Python Developer',
    location: 'Remote, India',
    employmentType: 'work_from_home',
    experience: 2,
    minSalary: 1000000,
    maxSalary: 1600000,
    description: 'Create Python services and data-processing tools that support analytics products. You will build APIs, integrate third-party data sources, write tests, and improve monitoring. Experience with Python, SQL, and common web frameworks is expected.'
  },
  {
    company: 'Meridian Insights',
    email: 'jobs@meridianinsights.hirehub.local',
    industry: 'Market Research',
    companyDescription: 'Meridian Insights provides research and reporting for consumer brands.',
    title: 'Data Analyst',
    location: 'Mumbai, Maharashtra',
    employmentType: 'full-time',
    experience: 1,
    minSalary: 700000,
    maxSalary: 1100000,
    description: 'Analyse sales and customer datasets to prepare clear reports for business teams. Build dashboards, validate data quality, and explain trends with evidence. Strong SQL and spreadsheet skills are required; experience with a visualisation tool is an advantage.'
  }
];

const connection = await pool.getConnection();
try {
  await connection.beginTransaction();

  for (const opportunity of opportunities) {
    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, 'employer', 1)
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), name=VALUES(name), role='employer', is_active=1`,
      [
        `${opportunity.company} Recruiting`,
        opportunity.email,
        await bcrypt.hash(randomBytes(32).toString('hex'), 12)
      ]
    );
    const employerId = userResult.insertId;

    await connection.query(
      `INSERT INTO employer_profiles (user_id, company_name, description, location, industry)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), description=VALUES(description),
         location=VALUES(location), industry=VALUES(industry)`,
      [
        employerId,
        opportunity.company,
        opportunity.companyDescription,
        opportunity.location,
        opportunity.industry
      ]
    );

    const [existingJobs] = await connection.query(
      'SELECT id FROM jobs WHERE employer_id=? AND title=? LIMIT 1',
      [employerId, opportunity.title]
    );
    const values = [
      opportunity.title,
      opportunity.description,
      opportunity.location,
      opportunity.employmentType,
      opportunity.experience,
      opportunity.minSalary,
      opportunity.maxSalary
    ];

    if (existingJobs.length) {
      await connection.query(
        `UPDATE jobs SET title=?, description=?, location=?, employment_type=?, experience_years=?,
           min_salary=?, max_salary=?, status='approved', is_closed=0, deadline=NULL
         WHERE id=?`,
        [...values, existingJobs[0].id]
      );
    } else {
      await connection.query(
        `INSERT INTO jobs
          (employer_id, title, description, location, employment_type, experience_years,
           min_salary, max_salary, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
        [employerId, ...values]
      );
    }
  }

  await connection.commit();
  console.log(`Seeded ${opportunities.length} distinct demo job opportunities.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}
