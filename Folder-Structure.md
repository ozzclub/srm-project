# 📁 PROJECT_STRUCTURE.md - Fullstack Material Log System

## 🎯 OVERVIEW

Struktur project ini menggunakan:

* **Frontend**: Next.js (App Router)
* **Backend**: Node.js (Express / API)
* **Database**: MySQL
* **File Storage**: Backend (local storage / server)

---

# 🧱 ROOT STRUCTURE

```
/project-root
  /frontend
  /backend
```

---

# 🎨 FRONTEND STRUCTURE (Next.js)

```
/frontend
  /app
    /login
      page.tsx

    /dashboard
      page.tsx

    /movement-log
      page.tsx
      /[id]
        page.tsx

    /material
      page.tsx

    /users
      page.tsx

    /documents
      /[transactionId]
        page.tsx

    layout.tsx
    page.tsx

  /components
    /ui
    /forms
    /tables
    /layout

  /lib
    api.ts
    auth.ts

  /hooks

  /types

  /styles

  next.config.js
  package.json
```

---

# ⚙️ BACKEND STRUCTURE (Node.js)

```
/backend
  /src
    /controllers
      movementLog.controller.js
      material.controller.js
      user.controller.js
      document.controller.js

    /routes
      movementLog.routes.js
      material.routes.js
      user.routes.js
      document.routes.js

    /services
      movementLog.service.js
      material.service.js
      user.service.js
      document.service.js

    /models
      db.js

    /middlewares
      auth.middleware.js
      role.middleware.js
      upload.middleware.js

    /utils

    /config
      db.config.js

    app.js
    server.js
```

---

# 📂 FILE STORAGE (UPLOAD IMAGE & DOCUMENT)

👉 Semua file disimpan di backend

```
/backend
  /uploads
    /TRX-260331-001
      sj.jpg
      material.jpg
      unloading.jpg

    /TRX-260331-002
      file1.jpg
```

---

# 🧠 STRUKTUR PENYIMPANAN FILE

## 📌 RULE:

* 1 Transaction ID = 1 folder
* Semua file masuk ke folder tersebut

---

# 🔗 FILE ACCESS URL

Backend expose static folder:

```
http://yourdomain.com/uploads/TRX-260331-001/sj.jpg
```

---

# 📦 API ENDPOINT (SIMPLE DESIGN)

## Movement Log

```
GET    /api/movement-log
POST   /api/movement-log
GET    /api/movement-log/:id
PUT    /api/movement-log/:id
DELETE /api/movement-log/:id
```

## Material

```
GET    /api/material
POST   /api/material
PUT    /api/material/:id
DELETE /api/material/:id
```

## User

```
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

## Document Upload

```
POST   /api/documents/upload
GET    /api/documents/:transactionId
```

---

# 🔐 AUTH STRUCTURE

```
/backend/src/middlewares/auth.middleware.js
/backend/src/middlewares/role.middleware.js
```

* JWT Authentication
* Role-based access (admin / user)

---

# 🚀 BEST PRACTICE

## ✅ FRONTEND

* Pisahkan component
* Gunakan reusable form
* Gunakan API layer (/lib/api.ts)

## ✅ BACKEND

* Pisahkan controller, service, route
* Gunakan middleware untuk auth
* Gunakan upload handler (multer)

---

# ⚡ UPLOAD SYSTEM (RECOMMENDED)

Gunakan:

* **multer** (Node.js)

Flow:

1. User upload file
2. Backend cek Transaction ID
3. Buat folder jika belum ada
4. Simpan file

---

# 🎯 FINAL CONCLUSION

Struktur ini memberikan:

* Clean architecture
* Scalable project
* Mudah maintenance
* Siap production

---

🔥 Dengan struktur ini:

* Frontend fokus UI
* Backend handle logic & file
* Data tetap terstruktur rapi


🎯 1. DARI SISI STRUKTUR FOLDER

Struktur kamu:

/uploads/TRX-001/
   sj.jpg
   material.jpg
   unloading.jpg

👉 Ini artinya:

✅ 1 Transaction ID = banyak file
✅ Tidak ada batas jumlah file

✔ Jadi dari sisi storage → AMAN

🎯 2. DARI SISI DATABASE (documents table)

Struktur kamu:

documents
- id
- transaction_id
- file_url
- category

👉 Ini artinya:

transaction_id	file_url
TRX-001	file1.jpg
TRX-001	file2.jpg
TRX-001	file3.jpg

✅ 1 TRX bisa punya banyak row
✅ Ini disebut one-to-many relationship

✔ Jadi dari sisi database → SUDAH BENAR

🔥 3. YANG PERLU KAMU PASTIKAN (PENTING BANGET)
❗ 1. Upload harus support MULTIPLE FILE

Di backend (multer):

upload.array('files', 10) // max 10 file per upload

👉 supaya bisa upload banyak sekaligus

❗ 2. Nama file HARUS unik

Kalau tidak:
❌ file ketimpa

✅ Solusi:
const filename = `${transactionId}-${Date.now()}.jpg`;
❗ 3. Folder auto create
if (!fs.existsSync(path)) {
  fs.mkdirSync(path, { recursive: true });
}
🎯 4. FLOW FINAL YANG BENAR
📸 Upload:
User pilih TRX-001
Upload 5 foto
Backend:
buat folder /TRX-001/
simpan semua file
insert ke DB 5 row
📂 Ambil data:

Frontend call:

GET /api/documents/TRX-001

👉 backend return:

[
  { "file_url": "..." },
  { "file_url": "..." },
  { "file_url": "..." }
]
🖼️ Frontend:

👉 tampilkan gallery (grid)

🚀 5. UPGRADE (BIAR LEBIH PRO)
🔥 Tambahkan kolom di documents:
file_name
file_size
mime_type
uploaded_by
🔥 Tambahkan kategori:

Contoh:

SURAT_JALAN
MATERIAL
UNLOADING

👉 jadi bisa filter di UI

⚠️ KESALAHAN YANG SERING TERJADI

❌ simpan semua file dalam 1 kolom (array/json)
❌ tidak pakai table documents
❌ nama file tidak unik
❌ tidak grouping by TRX

🎯 KESIMPULAN PALING TAJAM

👉 Sistem kamu sekarang:

✔ 1 Transaction ID → banyak foto
✔ Backend folder → support
✔ Database → support

💥 SUDAH SIAP untuk multi-document per transaksi

🔥 KALIMAT LEVEL ENGINEER

Kalau kamu jelasin ke tim:

"Satu transaksi bisa punya banyak dokumentasi, kita simpan per file dan di-relasikan ke transaction ID"

💥 ini sudah cara pikir system design yang benar