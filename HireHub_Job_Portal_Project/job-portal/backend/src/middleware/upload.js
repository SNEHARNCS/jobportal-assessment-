import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, safe);
  }
});
const fileFilter = (req, file, cb) => {
  const isPdf = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
  const isImage = /^image\/(png|jpeg|jpg|webp)$/.test(file.mimetype);
  if ((file.fieldname === 'resume' && isPdf) || (file.fieldname === 'logo' && isImage)) return cb(null, true);
  const error=new Error(file.fieldname === 'resume' ? 'Only PDF resumes are allowed.' : 'Only PNG, JPG or WEBP logos are allowed.');
  error.status=400;
  cb(error);
};
export const upload = multer({
  storage, fileFilter,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024 }
});
