const { z } = require('zod')

const idParam = z.object({
  id: z.coerce.number().int().positive(),
})

const register = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100),
  email: z.string().trim().toLowerCase().pipe(z.email('Format email tidak valid')),
  password: z.string().min(8, 'Password minimal 8 karakter').max(72),
})

const login = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Format email tidak valid')),
  password: z.string().min(1, 'Password wajib diisi'),
})

// stok harus bilangan bulat dan TIDAK boleh negatif; harga tidak boleh negatif
const itemBody = z.object({
  name: z.string().trim().min(1, 'Nama barang wajib diisi').max(150),
  description: z.string().trim().max(1000).default(''),
  stock: z.number().int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif'),
  price: z.number().min(0, 'Harga tidak boleh negatif').max(1e12),
})

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

const decreaseStockBody = z.object({
  quantity: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
})

module.exports = { idParam, register, login, itemBody, listQuery, decreaseStockBody }
