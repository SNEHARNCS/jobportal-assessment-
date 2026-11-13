import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'hirehub' });
const email = 'admin.test@hirehub.local';
const passwordHash = await bcrypt.hash('Admin@123456', 12);
const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
if (!existing.length) {
  const [result] = await pool.query('INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)', ['Test Admin', email, passwordHash, 'admin']);
  console.log(JSON.stringify({ inserted: true, id: result.insertId, email, password: 'Admin@123456' }, null, 2));
} else {
  console.log(JSON.stringify({ inserted: false, id: existing[0].id, email, password: 'Admin@123456' }, null, 2));
}
await pool.end();
