function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  console.error(err);
  return res.status(err.statusCode || 500).json({ error: err.message || "Error interno del servidor" });
}

module.exports = errorHandler;
