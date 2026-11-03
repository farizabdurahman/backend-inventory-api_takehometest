const { conflict, notFound } = require('../utils/errors')

function createItemService(itemRepo) {
  const getOrThrow = (id) => {
    const item = itemRepo.findById(id)
    if (!item) throw notFound('Barang tidak ditemukan')
    return item
  }

  return {
    create: (data, userId) => itemRepo.create({ ...data, createdBy: userId }),

    list({ search, page, limit }) {
      const { rows, total } = itemRepo.list({ search, limit, offset: (page - 1) * limit })
      return {
        data: rows,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }
    },

    getById: getOrThrow,

    update(id, data) {
      const updated = itemRepo.update(id, data)
      if (!updated) throw notFound('Barang tidak ditemukan')
      return updated
    },

    delete(id) {
      if (!itemRepo.delete(id)) throw notFound('Barang tidak ditemukan')
    },

    decreaseStock(id, quantity) {
      getOrThrow(id)
      // Atomik di level database; jika stok tidak cukup, tidak ada baris yang berubah.
      if (!itemRepo.decreaseStock(id, quantity)) throw conflict('Stok tidak mencukupi')
      return itemRepo.findById(id)
    },
  }
}

module.exports = { createItemService }
