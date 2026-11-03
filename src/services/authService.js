const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config')
const { conflict, unauthorized } = require('../utils/errors')

// Service: aturan bisnis. Tidak tahu soal HTTP (req/res) maupun SQL.
function createAuthService(userRepo) {
  // Hash dummy agar waktu respons login tetap mirip meski email tidak ada (mengurangi user enumeration)
  const dummyHash = bcrypt.hashSync('dummy-password', 10)

  return {
    async register({ name, email, password }) {
      if (userRepo.findByEmail(email)) throw conflict('Email sudah terdaftar')
      const passwordHash = await bcrypt.hash(password, 10)
      return userRepo.create({ name, email, passwordHash })
    },

    async login({ email, password }) {
      const user = userRepo.findByEmail(email)
      const ok = await bcrypt.compare(password, user ? user.password_hash : dummyHash)
      if (!user || !ok) throw unauthorized('Email atau password salah')

      const token = jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
      })
      return { token, user: { id: user.id, name: user.name, email: user.email } }
    },
  }
}

module.exports = { createAuthService }
