# STTI Career – Backend API (Frontend-Ready)

_Last updated: 2025-09-19 01:57:09 WIB_

This handbook documents the **currently mounted routes** in your `server.js`:

- `/api/auth` (Auth)
- `/api/profile` (Pelamar Profile)
- `/api/bookmarks` (Pelamar Bookmarks)
- `/api/jobs` (Jobs)
- `/api/applicant` (Applicants)
- `/api/company` (Companies)
- *(Optional, if mounted)* `/api/admin` (Admin)

Auth uses **JWT** via header: `Authorization: Bearer <token>`.

---

## Base URLs
- Local: `http://localhost:5000`
- Railway: `https://<your-service>.up.railway.app`

---

## Error Shape
```json
{ "success": false, "message": "..." }
```

---

## 1) Authentication (`/api/auth`)

### POST `/api/auth/register/pelamar`
**Body**
```json
{ "full_name": "Budi", "email": "budi@example.com", "password": "password123" }
```
**200**
```json
{ "success": true, "data": { "id": 21, "full_name": "Budi", "role": "pelamar" } }
```

### POST `/api/auth/register/hr`
**Body**
```json
{ "full_name": "HR Dina", "email": "hr@corp.com", "password": "secret123" }
```

### POST `/api/auth/login`
**Body**
```json
{ "email": "admin@example.com", "password": "secret123" }
```
**200**
```json
{ "success": true, "token": "<JWT>", "user": { "id": 1, "full_name": "Super Admin", "role": "admin" } }
```

### GET `/api/auth/profile` (auth)
**200**
```json
{ "success": true, "data": { "id": 1, "full_name": "Super Admin", "email": "admin@example.com", "role": "admin" } }
```

### POST `/api/auth/refresh` (auth)
### POST `/api/auth/logout` (auth)

### POST `/api/auth/change-password` (auth)
**Body**
```json
{ "old_password":"...", "new_password":"..." }
```

---

## 2) Pelamar Profile (`/api/profile`) – *auth (pelamar)*

### GET `/api/profile`
Returns user + profile + work_experiences + certificates + skills.

### PUT `/api/profile/biodata`
**Body**
```json
{ "full_name":"Budi Update", "phone":"0812...", "address":"Jakarta", "date_of_birth":"2000-01-01" }
```

### PUT `/api/profile/education`
**Body**
```json
{ "education_level":"S1", "major":"Informatika", "institution_name":"STTI",
  "gpa":3.5, "entry_year":2018, "graduation_year":2022 }
```

### POST `/api/profile/work-experience`
**Body**
```json
{ "company_name":"PT Maju", "position":"Backend Dev", "start_date":"2023-01-01",
  "end_date": null, "is_current": 1, "job_description":"Node.js, MySQL" }
```
### PUT `/api/profile/work-experience/:id`
### DELETE `/api/profile/work-experience/:id`

### POST `/api/profile/certificate`
**Body**
```json
{ "certificate_name":"AWS CCP", "issuer":"Amazon", "issue_date":"2024-05-01", "expiry_date": null }
```
### PUT `/api/profile/certificate/:id`
### DELETE `/api/profile/certificate/:id`

### POST `/api/profile/skill`
**Body**
```json
{ "skill_name":"Node.js", "skill_level":"Advanced" }
```
### PUT `/api/profile/skill/:id`
### DELETE `/api/profile/skill/:id`

### Uploads
- `POST /api/profile/upload-files` – **multipart form**  
  Fields: `cv_file`, `cover_letter_file`, `portfolio_file` (PDF/DOC/DOCX, ≤ 5MB)
- `POST /api/profile/upload-photo` – **multipart form**  
  Field: `profile_photo` (JPG/PNG/GIF, ≤ 5MB)

---

## 3) Bookmarks (`/api/bookmarks`) – *auth (pelamar)*

### GET `/api/bookmarks`
### POST `/api/bookmarks`
**Body**
```json
{ "job_id": 12 }
```
### DELETE `/api/bookmarks/:id`
### DELETE `/api/bookmarks/job/:job_id`
### GET `/api/bookmarks/check/:job_id`
### GET `/api/bookmarks/stats`
### GET `/api/bookmarks/search?q=backend`

---

## 4) Jobs (`/api/jobs`)

### PUBLIC
#### GET `/api/jobs`
List jobs (ordered by created_at desc).

#### GET `/api/jobs/loker/summary`
Returns `id, job_title, is_active, verification_status, created_at`.

#### GET `/api/jobs/details/:id`
Includes `total_applications` and `selection_stages` (if any).

#### GET `/api/jobs/:id`

### AUTH (HR/owner)
#### POST `/api/jobs`
**Body**
```json
{ "hr_id": 22, "job_title":"Backend Engineer", "description":"Go/Node backend", "location":"Jakarta", "is_active":1 }
```
#### PUT `/api/jobs/:id`
**Body**
```json
{ "job_title":"Backend Eng (Senior)" }
```
#### DELETE `/api/jobs/:id`

### ADMIN ONLY
#### PUT `/api/jobs/:id/verify`
**Body (approve)**
```json
{ "status":"verified" }
```
**Body (reject)**
```json
{ "status":"rejected", "reason":"Tidak sesuai ketentuan" }
```

---

## 5) Applicants (`/api/applicant`) – *auth (hr/admin)*

### GET `/api/applicant`
### GET `/api/applicant/:id`
### POST `/api/applicant`
**Body**
```json
{ "job_id":12, "user_id":21, "status":"submitted" }
```
### PUT `/api/applicant/:id/status`
**Body**
```json
{ "status":"accepted" }
```
### DELETE `/api/applicant/:id`

---

## 6) Companies (`/api/company`) – *auth (hr/admin)*

### GET `/api/company`
### GET `/api/company/:id`
### POST `/api/company`
**Body**
```json
{ "nama_companies":"PT Keren", "email_companies":"contact@keren.co",
  "nomor_telepon":"021-1234567", "website":"https://keren.co",
  "alamat":"Jakarta", "logo": null, "is_active": 1 }
```
### PUT `/api/company/:id`
**Body (contoh)**
```json
{ "is_active": 0 }
```
### DELETE `/api/company/:id`

---

## 7) Admin (`/api/admin`) – *optional, mount if enabled*

### GET `/api/admin/dashboard`
Aggregated counts for users/companies/jobs/applications.

### GET `/api/admin/logs`
Admin activity logs.

### (Optional) Users management
- `GET /api/admin/users?page=1&limit=10&role=hr&search=budi`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status` – body: `{ "is_active": true }`
- `DELETE /api/admin/users/:id`

---

## Postman Tips
- Import collection from `postman/STTI_Career_API.postman_collection.json`
- Set variables:
  - `base_url` → `http://localhost:5000` (atau Railway URL)
  - `token` → isi setelah login
- Folder *Auth* → Login → set env `token` → akses endpoint protected.
