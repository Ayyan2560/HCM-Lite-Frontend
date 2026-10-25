import multer from 'multer';
import path from 'path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists on startup.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    // Use a random hex name to prevent path traversal and name collisions.
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z]/g, '');
    const safe = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, safe);
  },
});

const fileFilter = (_req, file, cb) => {
  const extOk = ALLOWED_EXTENSIONS.test(file.originalname);
  // file.mimetype is client-supplied, so we check both extension AND MIME type.
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are accepted.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

export default upload;
