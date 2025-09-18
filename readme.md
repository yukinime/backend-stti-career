# STTI Career – Backend API

Backend untuk platform karier (Node.js + Express + MySQL).

## 🔗 Quick Links
- 📄 **Dokumentasi API lengkap**: [`docs/STTI_Career_API.md`](./docs/STTI_Career_API.md)
- 🧰 **Postman Collection**: [`postman/STTI_Career_API.postman_collection.json`](./postman/STTI_Career_API.postman_collection.json)

## 🚀 Jalankan Lokal
```bash
# 1) Install deps
npm install

# 2) Buat file .env
cp .env.example .env
# lalu isi nilai sesuai MySQL lokal kamu:
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=root
# DB_NAME=stti_career
# PORT=5000
# JWT_SECRET=ubah-ini
# JWT_EXPIRES_IN=1h

# 3) Start
npm run start

Health check: http://localhost:5000/health
Static uploads: http://localhost:5000/uploads/

☁️ Deploy di Railway

Gunakan host internal MySQL (bukan proxy publik). Set Variables di service backend:

DB_HOST=mysql.railway.internal
DB_PORT=3306
DB_USER=<dari addon atau root>
DB_PASSWORD=<dari addon>
DB_NAME=railway
NODE_OPTIONS=--dns-result-order=ipv4first
# (opsional)
DB_SSL=false


Kalau kamu sudah link MySQL addon, juga tersedia MYSQLHOST, MYSQLPORT, dst. Kode ini otomatis fallback ke variabel tersebut.

🔑 Auth

POST /api/auth/login → dapatkan token

Tambahkan header: Authorization: Bearer <token>

Roles: admin | hr | pelamar

🧪 Cara tes via Postman

Import file: postman/STTI_Career_API.postman_collection.json

Set environment variables:

base_url → http://localhost:5000 (atau domain Railway kamu)

token → isi setelah login

Jalankan request sesuai folder (Auth, Jobs, Admin, dll.)

📚 Dokumentasi Endpoint

Lihat detail endpoint + payload: docs/STTI_Career_API.md

Termasuk: alur Admin Dashboard, verifikasi job, Companies, Applicants, Bookmarks, Profiles, dsb.

🧩 Catatan Teknis

config/database.js sudah menangani IPv4-first (dns.setDefaultResultOrder('ipv4first')).

Di production, bootstrap DB skip kecuali DB_BOOTSTRAP=1.

Global error handler mengembalikan { success: false, message: "..." }.

Timezone DB: +07:00 (WIB).

📄 Lisensi

Private / internal use.


> Setelah ditempel, commit:
> ```bash
> git add README.md
> git commit -m "docs: add README with API docs & Postman links"
> git push
> ```

---

## 4) Import & tes di Postman (singkat)

1) **Import** → pilih `postman/STTI_Career_API.postman_collection.json`  
2) **Set Environment**:
   - `base_url = http://localhost:5000` (atau URL Railway)
   - `token = (kosong dulu)`
3) **Login** → `Auth - Login` → ambil `token` → set ke env `token`
4) Coba endpoint:
   - Public: `GET /api/jobs`
   - Protected (HR): `POST /api/jobs`
   - Admin: `PUT /api/jobs/:id/verify`

---

Kalau kamu mau, aku juga bisa bikin **README versi bilingual (ID/EN)** atau menambahkan **badge build & deploy** (Railway, Node version)—tinggal bilang.