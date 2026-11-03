require('dotenv').config()

const isProduction = process.env.NODE_ENV === 'production'

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET wajib diisi di production')
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-jangan-dipakai-di-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  dbPath: process.env.DB_PATH || './data/inventory.db',
}
