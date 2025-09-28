# STTI Career – Dokumentasi API (Ramah Frontend)

_Diperbarui: 2025-09-19 02:10:51 WIB_

Dokumen ini **khusus untuk tim Frontend**. Isinya ringkas, contoh payload jelas, dan langkah uji dengan Postman.

## Rute yang aktif (sesuai `server.js`)
- `/api/auth` → autentikasi
- `/api/profile` → profil pelamar
- `/api/bookmarks` → bookmark lowongan oleh pelamar
- `/api/jobs` → lowongan kerja
- `/api/applicant` → data pelamar (HR/Admin)
- `/api/company` → perusahaan (HR/Admin)
- *(opsional, jika nanti di-mount)* `/api/admin`

> Kalau nantinya ada rute baru yang di-mount, tambahkan ke dokumen ini.

---

## Base URL
- **Local**: `http://localhost:5000`
- **Railway**: `https://<your-service>.up.railway.app`

Semua contoh di bawah memakai variabel Postman `{base_url}`.

---

## Format Auth
Gunakan JWT pada header:
```
Authorization: Bearer <token>
```
Token didapat dari endpoint **Login**.

---

## Format Error (konsisten)
```json
{ "success": false, "message": "..." }
```

---

## Cara Cepat Test di Postman (3–5 menit)
1. **Import** file `postman/STTI_Career_API.postman_collection.json` ke Postman.
2. Buka tab **Variables** di koleksi, isi:
   - `base_url` → `http://localhost:5000` (atau URL Railway)
   - `token` → kosong dulu
3. Buka folder **Auth** → kirim request **Login** (email + password usermu).
4. Ambil `token` dari response → isi ke variable `token` di koleksi.
5. Sekarang semua endpoint yang butuh auth bisa langsung dicoba (header diisi otomatis).

> Untuk upload file (CV, foto), pada Postman pilih **Body → form-data**, lalu pilih file sesuai key yang diminta.

---

# Endpoint per Modul (dengan contoh)

### 1) Auth — `/api/auth`

**POST** `/login`  
Body:
```json
{ "email": "user@site.com", "password": "secret123" }
```
Respon (contoh):
```json
{ "success": true, "token": "<JWT>", "user": { "id": 1, "full_name": "Admin", "role": "admin" } }
```

**GET** `/profile` _(butuh token)_  
Respon singkat:
```json
{ "success": true, "data": { "id": 1, "email": "user@site.com", "role": "pelamar" } }
```

> Ada juga: `/register/pelamar`, `/register/hr`, `/refresh`, `/logout`, `/change-password`.

---

### 2) Jobs — `/api/jobs`

**Public**
- **GET** `/` → list lowongan (urutan terbaru).
  - Query opsional `lang`:
    - `lang=id` (default) → kirim teks asli dari database (umumnya Bahasa Indonesia).
    - `lang=en` → paksa judul & deskripsi diterjemahkan ke Inggris. Respons juga menambahkan objek `translations`.
    - `lang=all` → kirim teks asli + seluruh hasil terjemahan yang tersedia (`translations.id`, `translations.en`, dst.).
  - Contoh respons `lang=all`:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 101,
          "job_title": "Backend Engineer",
          "job_description": "Bangun API dengan Node.js",
          "translations": {
            "id": {
              "job_title": "Backend Engineer",
              "job_description": "Bangun API dengan Node.js"
            },
            "en": {
              "job_title": "Backend Engineer",
              "job_description": "Build APIs with Node.js"
            }
          }
        }
      ]
    }
    ```
- Catatan fallback: bila layanan Google Translate gagal/timeout, API tetap mengembalikan teks asli (tanpa mengosongkan field) dan `translations` hanya berisi bahasa yang berhasil (atau di-skip sama sekali). QA bisa mengecek log server untuk detail error.
- **GET** `/loker/summary` → kolom ringkas: `id`, `job_title`, `is_active`, `verification_status`, `created_at`.
- **GET** `/details/:id` → detail + `total_applications` + `selection_stages` (jika ada).
- **GET** `/:id` → detail 1 lowongan.

**HR (butuh token)**
- **POST** `/`  
  ```json
  { "hr_id": 22, "job_title": "Backend Engineer", "description": "Node/Go", "location": "Jakarta", "is_active": 1 }
  ```
- **PUT** `/:id`  
  ```json
  { "job_title": "Backend Engineer (Senior)" }
  ```
- **DELETE** `/:id`

**Admin (butuh token admin)**
- **PUT** `/:id/verify`  
  Approve:
  ```json
  { "status": "verified" }
  ```
  Reject:
  ```json
  { "status": "rejected", "reason": "Tidak sesuai ketentuan" }
  ```

---

### 3) Companies — `/api/company` (HR/Admin)

- **GET** `/` • **GET** `/:id`
- **POST** `/`
  ```json
  {
    "nama_companies": "PT Keren",
    "email_companies": "contact@keren.co",
    "nomor_telepon": "021-1234567",
    "website": "https://keren.co",
    "alamat": "Jakarta",
    "is_active": 1
  }
  ```
- **PUT** `/:id`
  ```json
  { "is_active": 0 }
  ```
- **DELETE** `/:id`

---

### 4) Applicants — `/api/applicant` (HR/Admin)

- **GET** `/` • **GET** `/:id`
- **POST** `/`
  ```json
  { "job_id": 12, "user_id": 21, "status": "submitted" }
  ```
- **PUT** `/:id/status`
  ```json
  { "status": "accepted" }
  ```
- **DELETE** `/:id`

---

### 5) Profile Pelamar — `/api/profile` (butuh token pelamar)

- **GET** `/` → gabungan data user + profil + experiences + certificates + skills.
- **PUT** `/biodata`
  ```json
  { "full_name":"Budi", "phone":"0812...", "address":"Jakarta", "date_of_birth":"2000-01-01" }
  ```
- **PUT** `/education`
  ```json
  { "education_level":"S1", "major":"Informatika", "institution_name":"STTI", "gpa":3.5, "entry_year":2018, "graduation_year":2022 }
  ```
- **Work Experience**  
  `POST /work-experience` | `PUT /work-experience/:id` | `DELETE /work-experience/:id`
  ```json
  { "company_name":"PT Maju", "position":"Backend Dev", "start_date":"2023-01-01", "end_date": null, "is_current": 1, "job_description":"Node.js, MySQL" }
  ```
- **Certificate**  
  `POST /certificate` | `PUT /certificate/:id` | `DELETE /certificate/:id`
  ```json
  { "certificate_name":"AWS CCP", "issuer":"Amazon", "issue_date":"2024-05-01", "expiry_date": null }
  ```
- **Skill**  
  `POST /skill` | `PUT /skill/:id` | `DELETE /skill/:id`
  ```json
  { "skill_name":"Node.js", "skill_level":"Advanced" }
  ```
- **Upload**  
  - `POST /upload-files` (form-data) → **key**: `cv_file`, `cover_letter_file`, `portfolio_file` (PDF/DOC/DOCX, ≤ 5MB)  
  - `POST /upload-photo` (form-data) → **key**: `profile_photo` (JPG/PNG/GIF, ≤ 5MB)

---

### 6) Bookmarks Pelamar — `/api/bookmarks` (butuh token pelamar)

- **GET** `/`
- **POST** `/`
  ```json
  { "job_id": 12 }
  ```
- **DELETE** `/:id`
- **DELETE** `/job/:job_id`
- **GET** `/check/:job_id`
- **GET** `/stats`
- **GET** `/search?q=backend`

---

## Catatan Role
- **pelamar**: akses profil sendiri & bookmarks; lihat job publik.
- **hr**: CRUD job, kelola applicants, kelola companies (sesuai implementasi).
- **admin**: verifikasi job, bisa akses modul admin (kalau di-mount).

---

## Troubleshooting cepat
- **401**: header `Authorization` belum diisi token atau token salah/kadaluarsa → login lagi.
- **403**: role tidak sesuai (mis. pelamar akses endpoint HR/Admin).
- **413 / Multer error**: file melebihi batas atau key upload salah – cek nama field & ukuran file.
- **500**: error server – cek payload atau hubungi BE.

---

Selesai. Kalau ada perubahan rute dari backend (mount/rename), update dokumen ini + Postman Collection.
