import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root',
  database: 'hirehub'
});

const [rows] = await pool.query('SELECT id, name, email, role, is_active FROM users ORDER BY id');
console.log(JSON.stringify(rows, null, 2));
await pool.end();
