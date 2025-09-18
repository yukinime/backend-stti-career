# STTI Career – Backend API

Backend untuk platform karier berbasis **Node.js + Express + MySQL**.
Mendukung autentikasi JWT, manajemen profil pelamar, lowongan kerja (jobs), perusahaan (companies), pelamar (applicants), bookmarks, dan verifikasi job (admin).

---

## 🔗 Tautan Penting

* 📄 **Dokumentasi API lengkap** → [`docs/STTI_Career_API.md`](./docs/STTI_Career_API.md)
  (Berisi semua endpoint + contoh payload/respons)
* 🧰 **Postman Collection** → [`postman/STTI_Career_API.postman_collection.json`](./postman/STTI_Career_API.postman_collection.json)

---

## 🧱 Teknologi

* Runtime: **Node.js** (disarankan ≥ 18)
* Framework: **Express**
* Database: **MySQL 8**
* Auth: **JWT (Bearer Token)**
* Upload berkas: **multer**
* Timezone DB: **WIB (UTC+07:00)**

---

## 🚀 Jalankan Secara Lokal

```bash
# 1) Install dependencies
npm install

# 2) Siapkan environment
cp .env.example .env
# Lalu edit nilai sesuai MySQL lokal kamu, contoh:
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=root
# DB_NAME=stti_career
# PORT=5000
# JWT_SECRET=ganti-ini-dengan-string-acak-panjang
# JWT_EXPIRES_IN=1h

# 3) Start server
npm run start
```

Health check:
`http://localhost:5000/health`

Static file (hasil upload):
`http://localhost:5000/uploads/`

---

## ☁️ Deploy di Railway

Gunakan **host internal MySQL** (bukan proxy publik). Atur **Variables** di service backend:

```
DB_HOST=mysql.railway.internal
DB_PORT=3306
DB_USER=<dari addon atau root>
DB_PASSWORD=<dari addon>
DB_NAME=railway
NODE_OPTIONS=--dns-result-order=ipv4first
DB_SSL=false   # opsional, default false di Railway
```

> Jika kamu menghubungkan MySQL addon, Railway juga menyediakan variabel seperti `MYSQLHOST`, `MYSQLPORT`, dll. Kode sudah **fallback** otomatis kalau variabel utama (`DB_HOST`, dsb.) tidak ada.

**Catatan bootstrap DB**
Di production, inisialisasi/patch schema otomatis **di-skip** kecuali kamu set:

```
DB_BOOTSTRAP=1
```

(Supaya aman di lingkungan produksi.)

---

## 🔑 Autentikasi & Role

* Header:

  ```
  Authorization: Bearer <token>
  ```
* Dapatkan token via **POST** `/api/auth/login`.
* Role yang digunakan:

  * `pelamar` – kelola profil sendiri, bookmarks, lihat job publik
  * `hr` – kelola jobs, applicants, companies (sesuai implementasi)
  * `admin` – verifikasi job & modul admin (jika route admin di-mount)

**Format error** (konsisten):

```json
{ "success": false, "message": "..." }
```

---

## 🧪 Uji Cepat via Postman

1. **Import** file: `postman/STTI_Career_API.postman_collection.json`
2. Buka tab **Variables** (collection):

   * `base_url` → `http://localhost:5000` (atau URL Railway kamu)
   * `token` → kosong dulu
3. Jalankan **Auth → Login**, ambil `token` dari respons → tempel ke variable `token`
4. Coba endpoint:

   * **Public**: `GET /api/jobs`
   * **Protected (HR)**: `POST /api/jobs`
   * **Admin**: `PUT /api/jobs/:id/verify` (jika route admin diaktifkan)

> Detail langkah Postman + contoh payload tiap endpoint ada di **`docs/STTI_Career_API.md`**.

---

## 📚 Dokumentasi Endpoint

Semua endpoint (Auth, Jobs, Companies, Applicants, Profile, Bookmarks, dan Admin opsional) **+ contoh payload & respons** ada di:
[`docs/STTI_Career_API.md`](./docs/STTI_Career_API.md)

Beberapa hal yang dibahas:

* Alur **Dashboard Admin** (verifikasi job)
* CRUD **Jobs**, **Companies**, **Applicants**
* Modul **Profile** (biodata, pendidikan, pengalaman, sertifikat, skill)
* **Bookmarks**
* Upload file **form-data** (nama field: `cv_file`, `cover_letter_file`, `portfolio_file`, `profile_photo`)

---

## ⚙️ Catatan Teknis

* `config/database.js` sudah set **IPv4-first**:

  ```js
  dns.setDefaultResultOrder('ipv4first')
  ```
* **Global error handler** mengembalikan objek standar:

  ```json
  { "success": false, "message": "..." }
  ```
* Timezone koneksi DB: **+07:00 (WIB)**.
* Folder upload:

  * `./uploads/files/` → dokumen (PDF/DOC/DOCX/TXT, max 5MB)
  * `./uploads/images/` → gambar (JPG/PNG/GIF, max 5MB)

---

## 🧯 Troubleshooting

* **ECONNREFUSED** saat konek DB di Railway
  Pastikan pakai host internal `mysql.railway.internal` port `3306` + `NODE_OPTIONS=--dns-result-order=ipv4first`.

* **401 Unauthorized**
  Token belum diisi/kadaluarsa → login ulang dan update header `Authorization`.

* **403 Forbidden**
  Role tidak sesuai (mis. pelamar akses endpoint HR/Admin).

* **Multer error / 413**
  Ukuran file melebihi batas atau key upload salah → cek nama field & ukuran.

---

## 📄 Lisensi

Private / internal use.

---

> Setelah menempel README ini:
>
> ```bash
> git add README.md
> git commit -m "docs: add professional README with API docs & Postman links"
> git push
> ```

Kalau kamu mau, aku bisa buat **versi bilingual (ID/EN)** atau tambahkan **badge** (Node version, Railway deploy) juga.
