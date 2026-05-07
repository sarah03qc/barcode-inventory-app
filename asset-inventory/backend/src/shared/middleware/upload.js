const path = require('path');
const multer = require('multer');

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
    err.statusCode = 400;
    return cb(err, false);
  }
  cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

module.exports = upload;
