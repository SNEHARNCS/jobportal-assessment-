import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1',
      [payload.id]
    );
    if (!rows.length || !rows[0].is_active) return res.status(401).json({ message: 'Account unavailable.' });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }
  next();
};
