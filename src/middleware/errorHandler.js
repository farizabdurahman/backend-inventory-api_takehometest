const { AppError } = require('../utils/errors')

function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} tidak ditemukan`))
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // JSON body rusak
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Body request bukan JSON yang valid' } })
  }

  if (err instanceof AppError) {
    const body = { message: err.message }
    if (err.details) body.details = err.details
    return res.status(err.status).json({ error: body })
  }

  console.error(err)
  res.status(500).json({ error: { message: 'Terjadi kesalahan pada server' } })
}

module.exports = { notFoundHandler, errorHandler }
