# Inventory API (Take-Home Test: Backend Developer Intern)

RESTful API untuk **Sistem Manajemen Inventaris Barang** sederhana.

**Stack:** Node.js + Express 5, SQLite (`better-sqlite3`), JWT (`jsonwebtoken`), `bcryptjs`, validasi `zod`.
SQLite dipilih agar proyek bisa langsung dijalankan **tanpa install database / docker**; file DB dibuat otomatis.

## Fitur

- **Authentication**: `POST /api/auth/register` dan `POST /api/auth/login` (mengembalikan token JWT)
- **CRUD Barang** (hanya untuk user yang sudah login, header `Authorization: Bearer <token>`):
  - `POST   /api/items` - tambah barang (nama, deskripsi, stok, harga)
  - `GET    /api/items` - daftar barang, query: `search`, `page`, `limit`
  - `GET    /api/items/:id` - detail barang
  - `PUT    /api/items/:id` - edit barang
  - `DELETE /api/items/:id` - hapus barang
  - `POST   /api/items/:id/decrease-stock` - *(bonus)* kurangi stok secara atomik, untuk mendemonstrasikan jawaban soal konkurensi
- **Validasi data**: stok tidak bisa negatif (di lapisan validasi **dan** constraint database), stok harus bilangan bulat,
  harga tidak boleh negatif, format email, panjang password, dll. Error validasi dikembalikan dengan status `400` beserta detail field.
- **Dokumentasi API**: Swagger UI di `/docs`, plus file `docs/openapi.json` dan **Postman Collection** di `docs/postman_collection.json`.

## Cara Menjalankan Secara Lokal

Prasyarat: Node.js 18+ (diuji di Node 22). Tidak perlu database eksternal.

```bash
npm install
cp .env.example .env     # (opsional) ubah JWT_SECRET; tanpa .env tetap jalan dengan secret default untuk development
npm start                # http://localhost:3000
```

- Swagger UI: http://localhost:3000/docs
- Health check: http://localhost:3000/api/health
- Mode development (auto-restart): `npm run dev`
- Menjalankan tes otomatis: `npm test` (9 tes: auth, CRUD, validasi, pagination, konkurensi)

> Jika `npm install` gagal saat mengompilasi `better-sqlite3`, pastikan versi Node LTS dan toolchain build
> (python3, make, g++) tersedia; pada umumnya binary prebuilt akan terunduh otomatis.

### Contoh Penggunaan (curl)

```bash
# 1. Register & login
curl -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Fariz","email":"fariz@example.com","password":"rahasia123"}'

TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"fariz@example.com","password":"rahasia123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

# 2. Tambah barang & lihat daftar
curl -X POST localhost:3000/api/items -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Keyboard Mekanik","description":"Switch blue","stock":25,"price":450000}'

curl "localhost:3000/api/items?search=keyboard&page=1&limit=10" -H "Authorization: Bearer $TOKEN"
```

Pakai **Postman**: import `docs/postman_collection.json` → jalankan *Register* lalu *Login*
(token otomatis tersimpan di variabel collection) → request lain siap dipakai.

## Struktur Folder

```
src/
├── routes/        # pemetaan URL → middleware → controller
├── middleware/    # auth (JWT), validate (zod), errorHandler
├── controllers/   # adapter HTTP: baca req, panggil service, kirim res
├── services/      # logika bisnis (hash password, aturan stok, dll)
├── repositories/  # akses database (SQL) - satu-satunya lapisan yang menyentuh DB
├── validators/    # skema validasi input
├── db/            # inisialisasi koneksi + skema tabel
├── utils/         # AppError dan helper
├── app.js         # merakit semua lapisan (dependency injection)
└── server.js      # entry point
docs/              # openapi.json + postman_collection.json
tests/             # tes integrasi (node:test)
```

---

## Jawaban Pertanyaan Pemahaman

### 1. Alur Request: dari API dipanggil sampai data tersimpan di database

Contoh `POST /api/items`:

```
Client
  └─► Router        src/routes/index.js           cocokkan "POST /items" ke handler
       └─► Middleware authenticate                 verifikasi JWT → isi req.user (gagal → 401)
            └─► Middleware validate                cek body dengan zod (gagal → 400)
                 └─► Controller  itemController    ambil data tervalidasi, panggil service
                      └─► Service  itemService      terapkan aturan bisnis
                           └─► Repository itemRepository   jalankan INSERT lewat prepared statement
                                └─► Database (SQLite)       data disimpan
```

Response kembali lewat jalur yang sama (`201 Created` + data barang). Jika ada error di lapisan mana pun,
`AppError` di-`throw` dan ditangkap oleh `errorHandler` terpusat yang menghasilkan format error yang konsisten.

**Mengapa dipisah?**

1. **Single Responsibility**: tiap lapisan punya satu alasan untuk berubah. Router soal URL, controller soal HTTP,
   service soal aturan bisnis, repository soal SQL.
2. **Mudah dites**: service dapat dites tanpa server HTTP, repository dapat dites dengan database in-memory
   (lihat `tests/`, memakai `:memory:`).
3. **Mudah diganti/diubah**: ganti SQLite → PostgreSQL cukup mengubah repository; ganti REST → GraphQL cukup mengganti controller,
   service tetap dipakai ulang.
4. **Tidak ada duplikasi**: auth & validasi ditulis sekali sebagai middleware, dipakai banyak route.
5. **Kolaborasi & keterbacaan**: lokasi sebuah logika mudah ditebak.

### 2. Keamanan & Token: di mana frontend sebaiknya menyimpan JWT?

Rekomendasi saya: **HttpOnly Cookie** (`Secure`, `SameSite=Lax` atau `Strict`).

| | localStorage | HttpOnly Cookie |
|---|---|---|
| Bisa dibaca JavaScript | Ya | **Tidak** |
| Risiko utama | **XSS**: script jahat apa pun di halaman (termasuk dependency npm yang terinfeksi) dapat mencuri token | **CSRF**: browser mengirim cookie otomatis |
| Mitigasi | Sanitasi input, CSP (tidak menghilangkan risikonya) | `SameSite`, token CSRF, cek header `Origin`; CORS dengan `credentials` bila beda domain |
| Kemudahan | Sangat mudah (kirim via header `Authorization`) | Perlu konfigurasi cookie/CORS di backend |

Alasannya: XSS jauh lebih umum dan dampaknya langsung pencurian sesi, sedangkan CSRF punya mitigasi standar
yang efektif. Praktik tambahan: access token **berumur pendek** (di proyek ini `JWT_EXPIRES_IN=1h`) +
refresh token berumur panjang di HttpOnly cookie yang dirotasi, selalu pakai HTTPS, dan jangan menyimpan data sensitif di payload JWT
(payload hanya di-*encode*, bukan dienkripsi).

> Catatan implementasi: untuk menjaga API mudah diuji lewat Postman/Swagger, API ini membaca token dari header
> `Authorization: Bearer`. Untuk deployment dengan frontend browser, middleware `authenticate` dapat dengan mudah
> diperluas untuk membaca token dari cookie.

### 3. Penanganan Konkurensi: dua user mengurangi stok barang X (stok tersisa 1) secara bersamaan

**Masalah (race condition, pola read-modify-write):**

```
Request A: SELECT stock → 1  (cukup)
Request B: SELECT stock → 1  (cukup)
Request A: UPDATE stock = 1 - 1 → 0
Request B: UPDATE stock = 1 - 1 → 0   (seharusnya ditolak, hasilnya stok "terjual" 2x)
(atau jika menulis stock = stock_lama - 1 → -1)
```

**Solusi yang diterapkan** (`itemRepository.decreaseStock`): pengecekan dan pengurangan dijadikan **satu statement atomik** di database:

```sql
UPDATE items
   SET stock = stock - :qty
 WHERE id = :id AND stock >= :qty;
```

Database menjamin satu baris hanya diubah oleh satu transaksi pada satu waktu. Request pertama mengubah 1 baris
(berhasil → `200`); request kedua menemukan `stock >= 1` sudah tidak terpenuhi sehingga **0 baris berubah**,
dan service membalas `409 Conflict` ("Stok tidak mencukupi"). Stok tidak pernah menjadi -1.

**Lapisan pengaman berlapis:**

1. Constraint database `CHECK (stock >= 0)`: jika ada bug di kode, database tetap menolak nilai negatif.
2. Validasi input (zod): stok/jumlah tidak boleh negatif dan harus bilangan bulat.
3. Tes otomatis (`tests/api.test.js`) mengirim 2 request bersamaan pada stok 1 → hasilnya tepat `[200, 409]` dan stok akhir `0`.

**Alternatif di database lain (PostgreSQL/MySQL)** bila logikanya lebih kompleks dari satu UPDATE:

- **Pessimistic locking**: dalam transaksi, `SELECT ... FOR UPDATE` mengunci baris sampai transaksi selesai.
- **Optimistic locking**: kolom `version`; `UPDATE ... WHERE id = ? AND version = ?`, jika 0 baris berubah → ulangi/tolak.
- **Idempotency key** untuk mencegah request yang sama terkirim dua kali (retry), serta antrian (queue) untuk beban sangat tinggi.

---

## Pertanyaan Tambahan di Dokumen (React / Frontend)

Dokumen soal untuk tes Backend memuat pertanyaan tentang React (sepertinya tertukar dengan tes Frontend),
jadi saya jawab juga secara ringkas. Implementasi lengkapnya ada di proyek `frontend-user-dashboard`.

### State Management & Lifecycle

Fetching dilakukan di custom hook dengan `useEffect` + `fetch`, state `users / loading / error` memakai `useState`.
Mencegah **infinite loop**: dependency array hanya berisi nilai yang memang harus memicu fetch ulang (`[reloadKey]`),
bukan state yang diubah oleh effect itu sendiri, dan tidak berisi objek/fungsi baru di tiap render.
Mencegah **memory leak / race condition**: `AbortController` dibatalkan di cleanup function `useEffect`, sehingga
request yang masih berjalan dibatalkan saat unmount dan tidak ada `setState` pada komponen yang sudah hilang.

### Struktur Folder (frontend)

Dipisah berdasarkan tanggung jawab: `api/` (akses jaringan), `hooks/` (logika reusable), `components/` (UI murni),
`utils/` (fungsi murni). Tujuannya separation of concerns, mudah dites, dan mudah diganti (mis. ganti `fetch` ke axios hanya di `api/`).

### Optimasi Kinerja (10.000 user + pencarian lag)

Debounce input (`useDebounce`), `useMemo` untuk hasil filter, `React.memo` + `useCallback` agar kartu tidak render ulang,
`useDeferredValue`/`useTransition` untuk memberi prioritas rendah pada render daftar, **virtualisasi list** (`react-window`)
sehingga hanya item yang terlihat yang dirender, serta pagination / pencarian di sisi server.
