import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'hirehub' });
const [rows] = await pool.query('SELECT id, email, role, password_hash FROM users WHERE role IN ("admin","employer","job_seeker")');
const candidates = [
  'ChangeMe123!',
  'Password123!',
  'Admin123!',
  'Employer123!',
  'JobSeeker123!',
  'HireHub123!',
  'Password123',
  'HireHub@123',
  'hirehub123',
  'Welcome123!',
  'Demo123!',
  'demo123',
  'Demo@123',
  'P@ssw0rd123!',
  'Qwerty123!'
];
for (const row of rows) {
  for (const candidate of candidates) {
    const ok = await bcrypt.compare(candidate, row.password_hash);
    if (ok) {
      console.log(JSON.stringify({ email: row.email, role: row.role, password: candidate }, null, 2));
    }
  }
}
await pool.end();
