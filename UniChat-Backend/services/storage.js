const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const StorageProvider = {
  LOCAL: 'local',
  S3: 's3',
  R2: 'r2',
  GCS: 'gcs',
  FIREBASE: 'firebase'
};

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'],
  file: [
    'application/pdf',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/flac',
    'audio/webm',
    'audio/aac'
  ],
  voice: ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/flac']
};

const MAX_FILE_SIZES = {
  image: 25 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  file: 50 * 1024 * 1024,
  voice: 25 * 1024 * 1024,
  sticker: 1 * 1024 * 1024
};

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jse', '.wsf', '.wsh',
  '.msi', '.scr', '.pif', '.com', '.cpl', '.jar', '.py', '.rb', '.php', '.pl',
  '.asp', '.aspx', '.jsp', '.cgi', '.htaccess', '.config', '.ini', '.reg',
  '.dll', '.so', '.dylib', '.ko'
];

function getStorageDir() {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'voice';
  return 'file';
}

function getExtension(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return ext;
}

function isDangerousFile(originalName) {
  const ext = getExtension(originalName);
  return DANGEROUS_EXTENSIONS.includes(ext);
}

function isMimeTypeAllowed(mimeType, fileType) {
  const allowed = ALLOWED_MIME_TYPES[fileType];
  if (!allowed) return false;
  return allowed.includes(mimeType);
}

function isSizeAllowed(mimeType, fileSize) {
  const fileType = getFileType(mimeType);
  const maxSize = MAX_FILE_SIZES[fileType];
  if (!maxSize) return false;
  return fileSize <= maxSize;
}

function generateChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function generateFileName(originalName) {
  const ext = getExtension(originalName);
  const unique = Date.now().toString(36) + '-' + crypto.randomBytes(8).toString('hex');
  return `${unique}${ext}`;
}

function sanitizeFileName(originalName) {
  return originalName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getStorageDir();
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = generateFileName(file.originalname);
    cb(null, safeName);
  }
});

function fileFilter(req, file, cb) {
  const fileType = getFileType(file.mimetype);

  if (isDangerousFile(file.originalname)) {
    return cb(new Error(`Dangerous file type blocked: ${file.originalname}`));
  }

  if (!isMimeTypeAllowed(file.mimetype, fileType)) {
    return cb(new Error(`File type not allowed: ${file.mimetype}`));
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

function getFileUrl(fileName) {
  const baseUrl = process.env.API_URL || 'http://localhost:9121';
  return `${baseUrl}/attachments/${fileName}`;
}

async function deleteFile(storagePath) {
  const fullPath = path.join(getStorageDir(), storagePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
  const thumbPath = fullPath + '.thumb';
  if (fs.existsSync(thumbPath)) {
    fs.unlinkSync(thumbPath);
  }
}

async function getFileStream(fileName) {
  const fullPath = path.join(getStorageDir(), fileName);
  if (!fs.existsSync(fullPath)) {
    throw new Error('File not found');
  }
  return fs.createReadStream(fullPath);
}

async function fileExists(storagePath) {
  const fullPath = path.join(getStorageDir(), storagePath);
  return fs.existsSync(fullPath);
}

const storageService = {
  StorageProvider,
  upload,
  getFileUrl,
  deleteFile,
  getFileStream,
  fileExists,
  generateFileName,
  sanitizeFileName,
  generateChecksum,
  getFileType,
  getExtension,
  isDangerousFile,
  isMimeTypeAllowed,
  isSizeAllowed,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  DANGEROUS_EXTENSIONS,
  getStorageDir
};

module.exports = storageService;