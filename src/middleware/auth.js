const jwt = require('jsonwebtoken')
const config = require('../config')
const { unauthorized } = require('../utils/errors')

/** Memverifikasi header "Authorization: Bearer <token>" dan mengisi req.user. */
function authenticate(req, _res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized('Token tidak ditemukan. Gunakan header Authorization: Bearer <token>'))
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = { id: payload.sub, email: payload.email }
    next()
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token sudah kedaluwarsa' : 'Token tidak valid'
    next(unauthorized(msg))
  }
}

module.exports = { authenticate }
