// Repository: satu-satunya lapisan yang berbicara langsung dengan database.
function createUserRepository(db) {
  const insert = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?')
  const byId = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')

  return {
    create({ name, email, passwordHash }) {
      const info = insert.run(name, email, passwordHash)
      return byId.get(info.lastInsertRowid)
    },
    findByEmail: (email) => byEmail.get(email),
    findById: (id) => byId.get(id),
  }
}

module.exports = { createUserRepository }
