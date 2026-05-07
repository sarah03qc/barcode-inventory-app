// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // errores propios de multer (límite de tamaño, campo inesperado, etc.)
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    message = 'File exceeds the 10 MB limit';
  }

  if (process.env.NODE_ENV !== 'production' && status === 500) {
    console.error(err);
  }

  res.status(status).json({ error: true, message, status });
}

module.exports = errorHandler;
