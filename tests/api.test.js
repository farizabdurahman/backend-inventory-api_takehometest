const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { createDatabase } = require('../src/db/database')
const { createApp } = require('../src/app')

let server, base, db, token

async function call(method, path, { body, auth = true } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

before(async () => {
  db = createDatabase(':memory:')
  server = createApp(db).listen(0)
  base = `http://127.0.0.1:${server.address().port}/api`

  await call('POST', '/auth/register', {
    auth: false,
    body: { name: 'Tester', email: 'Tester@Example.com', password: 'password123' },
  })
  const login = await call('POST', '/auth/login', {
    auth: false,
    body: { email: 'tester@example.com', password: 'password123' },
  })
  token = login.body.data.token
})

after(() => {
  server.close()
  db.close()
})

test('register: email duplikat ditolak (409) dan password pendek ditolak (400)', async () => {
  const dup = await call('POST', '/auth/register', {
    auth: false,
    body: { name: 'X', email: 'tester@example.com', password: 'password123' },
  })
  assert.equal(dup.status, 409)

  const short = await call('POST', '/auth/register', {
    auth: false,
    body: { name: 'X', email: 'baru@example.com', password: '123' },
  })
  assert.equal(short.status, 400)
})

test('login: password salah -> 401', async () => {
  const res = await call('POST', '/auth/login', {
    auth: false,
    body: { email: 'tester@example.com', password: 'salah-salah' },
  })
  assert.equal(res.status, 401)
})

test('items: wajib login (tanpa token / token palsu -> 401)', async () => {
  assert.equal((await call('GET', '/items', { auth: false })).status, 401)
  const res = await fetch(base + '/items', { headers: { Authorization: 'Bearer palsu' } })
  assert.equal(res.status, 401)
})

test('items: CRUD lengkap', async () => {
  const created = await call('POST', '/items', {
    body: { name: 'Mouse', description: 'Wireless', stock: 10, price: 150000 },
  })
  assert.equal(created.status, 201)
  const id = created.body.data.id

  assert.equal((await call('GET', `/items/${id}`)).body.data.name, 'Mouse')

  const updated = await call('PUT', `/items/${id}`, {
    body: { name: 'Mouse Gaming', description: '', stock: 8, price: 200000 },
  })
  assert.equal(updated.status, 200)
  assert.equal(updated.body.data.stock, 8)

  assert.equal((await call('DELETE', `/items/${id}`)).status, 204)
  assert.equal((await call('GET', `/items/${id}`)).status, 404)
})

test('validasi: stok negatif, stok desimal, harga negatif, dan tipe salah ditolak (400)', async () => {
  const cases = [
    { name: 'A', stock: -1, price: 100 },
    { name: 'A', stock: 1.5, price: 100 },
    { name: 'A', stock: 1, price: -100 },
    { name: 'A', stock: '10', price: 100 },
    { name: '', stock: 1, price: 100 },
  ]
  for (const body of cases) {
    const res = await call('POST', '/items', { body })
    assert.equal(res.status, 400, JSON.stringify(body))
  }
  // update ke stok negatif juga harus ditolak
  const { body } = await call('POST', '/items', { body: { name: 'B', stock: 1, price: 1 } })
  const res = await call('PUT', `/items/${body.data.id}`, { body: { name: 'B', stock: -3, price: 1 } })
  assert.equal(res.status, 400)
})

test('items: search dan pagination', async () => {
  for (let i = 1; i <= 12; i++) {
    await call('POST', '/items', { body: { name: `Paginasi ${i}`, stock: i, price: 1000 } })
  }
  const page1 = await call('GET', '/items?search=Paginasi&limit=5&page=1')
  assert.equal(page1.body.data.length, 5)
  assert.equal(page1.body.meta.total, 12)
  assert.equal(page1.body.meta.totalPages, 3)

  const page3 = await call('GET', '/items?search=Paginasi&limit=5&page=3')
  assert.equal(page3.body.data.length, 2)

  assert.equal((await call('GET', '/items?limit=1000')).status, 400)
})

test('konkurensi: 2 request bersamaan pada stok tersisa 1 -> stok tidak pernah -1', async () => {
  const { body } = await call('POST', '/items', { body: { name: 'Barang X', stock: 1, price: 5000 } })
  const id = body.data.id

  const results = await Promise.all([
    call('POST', `/items/${id}/decrease-stock`, { body: { quantity: 1 } }),
    call('POST', `/items/${id}/decrease-stock`, { body: { quantity: 1 } }),
  ])
  const statuses = results.map((r) => r.status).sort()
  assert.deepEqual(statuses, [200, 409]) // satu berhasil, satu ditolak

  const final = await call('GET', `/items/${id}`)
  assert.equal(final.body.data.stock, 0)
})

test('database: constraint CHECK(stock >= 0) menjadi pengaman terakhir', () => {
  const { lastInsertRowid } = db.prepare("INSERT INTO items (name, stock, price) VALUES ('Z', 1, 1)").run()
  assert.throws(() => db.prepare('UPDATE items SET stock = -1 WHERE id = ?').run(lastInsertRowid))
})

test('error handling: JSON rusak -> 400, route tidak ada -> 404', async () => {
  const res = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{rusak',
  })
  assert.equal(res.status, 400)
  assert.equal((await call('GET', '/tidak-ada', { auth: false })).status, 404)
})
