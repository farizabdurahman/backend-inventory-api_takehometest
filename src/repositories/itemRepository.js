function createItemRepository(db) {
  const insert = db.prepare(
    'INSERT INTO items (name, description, stock, price, created_by) VALUES (@name, @description, @stock, @price, @createdBy)',
  )
  const byId = db.prepare('SELECT * FROM items WHERE id = ?')
  const remove = db.prepare('DELETE FROM items WHERE id = ?')
  const update = db.prepare(`
    UPDATE items
       SET name = @name, description = @description, stock = @stock, price = @price,
           updated_at = datetime('now')
     WHERE id = @id
  `)

  // Pengurangan stok ATOMIK: pengecekan (stock >= qty) dan pengurangan terjadi
  // dalam SATU statement SQL, sehingga tidak ada celah race condition.
  const decrease = db.prepare(`
    UPDATE items
       SET stock = stock - @qty, updated_at = datetime('now')
     WHERE id = @id AND stock >= @qty
  `)

  return {
    create: (data) => byId.get(insert.run(data).lastInsertRowid),
    findById: (id) => byId.get(id),

    update(id, data) {
      const info = update.run({ id, ...data })
      return info.changes ? byId.get(id) : undefined
    },

    delete: (id) => remove.run(id).changes > 0,

    /** @returns {boolean} true jika stok berhasil dikurangi, false jika stok tidak cukup */
    decreaseStock: (id, qty) => decrease.run({ id, qty }).changes === 1,

    list({ search, limit, offset }) {
      const where = search ? 'WHERE name LIKE @q OR description LIKE @q' : ''
      const params = { limit, offset, ...(search ? { q: `%${search}%` } : {}) }
      const rows = db
        .prepare(`SELECT * FROM items ${where} ORDER BY id DESC LIMIT @limit OFFSET @offset`)
        .all(params)
      const { total } = db
        .prepare(`SELECT COUNT(*) AS total FROM items ${where}`)
        .get(search ? { q: params.q } : {})
      return { rows, total }
    },
  }
}

module.exports = { createItemRepository }
