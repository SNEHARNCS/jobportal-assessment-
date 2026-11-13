import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import api from './routes/api.js';
import { notFound,errorHandler } from './middleware/errors.js';
import pool from './config/db.js';

dotenv.config();
if (process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('replace_this'))) {
  throw new Error('Production JWT_SECRET must be a random value of at least 32 characters.');
}
const app=express();
const allowedOrigins = Array.from(new Set([
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
].filter(Boolean).map(origin=>origin.trim().replace(/\/+$/,''))));
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const clean = origin.replace(/\/+$/, '');
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(clean) ||
      clean.endsWith('.vercel.app') ||
      clean.includes('vercel.app') ||
      /^https?:\/\/localhost(:\d+)?$/.test(clean) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(clean)
    ) {
      return callback(null, true);
    }
    console.warn(`Origin not allowed by CORS: ${clean}`);
    const err = new Error(`Origin ${clean} not allowed by CORS`);
    err.status = 403;
    callback(err);
  },
  credentials: true
}));
app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({extended:true}));
app.use('/api',rateLimit({windowMs:15*60*1000,max:300,standardHeaders:true,legacyHeaders:false}));
app.use('/api',api);
app.use(notFound);
app.use(errorHandler);

const port=Number(process.env.PORT||5000);
if(process.env.NODE_ENV!=='test') {
  app.listen(port,'0.0.0.0',async()=>{
    try { await pool.query('SELECT 1'); console.log(`HireHub API running on http://localhost:${port}`); }
    catch(e){ console.error('Database connection failed:',e.message); }
  });
}
export default app;
