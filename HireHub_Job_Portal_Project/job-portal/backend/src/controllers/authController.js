import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, is_active: !!u.is_active });
function issueToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
}

export async function register(req, res) {
  const { name, email, password, role } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' || !role) {
    return res.status(400).json({ message: 'Provide a name, valid email and password.' });
  }
  if (!['job_seeker', 'employer'].includes(role)) return res.status(400).json({ message: 'Choose job seeker or employer. Admin registration is restricted.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
  const hash = await bcrypt.hash(password, 12);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id',
      [name.trim(), email.toLowerCase().trim(), hash, role]
    );
    const userId = result[0].id;
    if (role === 'job_seeker') await conn.query('INSERT INTO job_seeker_profiles (user_id) VALUES ($1)', [userId]);
    if (role === 'employer') await conn.query('INSERT INTO employer_profiles (user_id) VALUES ($1)', [userId]);
    await conn.commit();
    const user = { id: userId, name, email: email.toLowerCase(), role, is_active: true };
    res.status(201).json({ user: publicUser(user), token: issueToken(user) });
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const [rows] = await pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [String(email || '').toLowerCase().trim()]);
  if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password_hash))) return res.status(401).json({ message: 'Invalid email or password.' });
  if (!rows[0].is_active) return res.status(403).json({ message: 'Your account is deactivated. Contact the administrator.' });
  const user = rows[0];
  res.json({ user: publicUser(user), token: issueToken(user) });
}

export async function me(req, res) { res.json({ user: req.user }); }

export async function bootstrapAdmin(req, res) {
  if (process.env.ALLOW_ADMIN_BOOTSTRAP !== 'true') {
    return res.status(403).json({ message: 'Admin bootstrap is disabled.' });
  }
  const { name, email, password } = req.body;
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || password.length < 12) {
    return res.status(400).json({ message: 'Provide name, email and a password of at least 12 characters.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [admins] = await connection.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (admins.length) return res.status(403).json({ message: 'Admin bootstrap is disabled because an administrator already exists.' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await connection.query(
      "INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'admin') RETURNING id",
      [name.trim(), email.toLowerCase().trim(), hash]
    );
    await connection.commit();
    res.status(201).json({ message: 'Admin created. Sign in using the supplied credentials.', userId: result[0].id });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
