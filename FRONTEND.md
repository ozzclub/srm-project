
# 🎨 FRONTEND.md - Next.js Material Log System

## 🎯 OVERVIEW

Frontend dibangun menggunakan **Next.js (App Router)** dengan tujuan:

* Mudah digunakan di lapangan (mobile friendly)
* Cepat input data
* Integrasi dengan backend (Node.js API)

---

# 🧠 ROLE SYSTEM

## 👤 1. Administrator

Akses penuh:

* CRUD User
* CRUD Material
* View semua data
* Dashboard

## 👷 2. User (Material Control)

Akses:

* Input Movement Log
* Edit Movement Log
* Upload dokumentasi
* View dashboard

---

# 🗂️ ROUTING STRUCTURE

## 🔐 AUTH

```
/login
```

## 🏠 MAIN

```
/dashboard
/movement-log
/movement-log/[id]
/material
/documents/[transactionId]
```

## 🔒 ADMIN ONLY

```
/users
```

---

# 📄 PAGE BREAKDOWN

## 1. 🔐 LOGIN PAGE (/login)

### Fitur:

* Input email & password
* Authentication
* Redirect ke dashboard

### UX:

* Simple
* Mobile friendly

---

## 2. 📊 DASHBOARD (/dashboard)

### Fitur:

* Summary:

  * Total transaksi hari ini
  * Total material masuk
  * Total material keluar
* Recent movement log
* Quick search (Transaction ID)

### Komponen:

* Card stats
* Table recent activity

---

## 3. 📦 MOVEMENT LOG LIST (/movement-log)

### Fitur:

* Table semua data
* Search (Transaction ID, DO)
* Filter:

  * Date
  * Material
  * Movement Type
* Pagination
* Button Create New

---

## 4. 📄 MOVEMENT LOG DETAIL (/movement-log/[id])

### Fitur:

* Detail transaksi
* Edit data
* Upload dokumentasi
* View gallery

### Komponen:

* Form edit
* File upload
* Gallery preview

---

## 5. ➕ CREATE / EDIT FORM

### Field:

* Transaction ID
* Date
* Trip ID
* DO
* Material (dropdown)
* Qty
* From Location
* To Location
* Movement Type
* Driver
* Received By
* Loading / Unloading
* Condition

### UX:

* Dropdown (auto from API)
* Auto fill material spec & unit

---

## 6. 📦 MATERIAL PAGE (/material)

### Fitur:

* List material
* Create material
* Edit material
* Delete material

### Field:

* Material Code
* Name
* Specification
* Unit

---

## 7. 👤 USER MANAGEMENT (/users)

### 🔒 Admin Only

### Fitur:

* List user
* Create user
* Edit user
* Delete user

### Field:

* Name
* Email
* Password
* Role

---

## 8. 📂 DOCUMENTATION PAGE (/documents/[transactionId])

### Fitur:

* Gallery per transaksi
* Upload multiple file
* Preview image

### UX:

* Grid layout
* Mobile friendly

---

# 🧱 COMPONENT STRUCTURE

```
/components
  /ui
  /forms
  /tables
  /layout
```

### Contoh:

* TableMovementLog
* FormMovementLog
* MaterialDropdown
* UploadComponent

---

# 🔐 AUTHENTICATION FLOW

1. Login
2. Simpan token (JWT / session)
3. Middleware proteksi route

---

# 🚀 UX BEST PRACTICE

## ✅ Mobile First

* Input cepat di lapangan

## ✅ Minimal klik

* Dropdown
* Autofill

## ✅ Feedback

* Success / error message

---

# ⚡ ADVANCED FEATURES (RECOMMENDED)

## 🔥 1. Quick Input Mode

* Input cepat tanpa banyak field

## 🔥 2. Auto Search TRX

* Ketik TRX → langsung buka data

## 🔥 3. Photo Upload from Camera

* Langsung dari HP

## 🔥 4. Status Indicator

* Ada dokumentasi / belum

## 🔥 5. Role-based UI

* Admin vs User beda tampilan

---

# 🎯 FINAL CONCLUSION

Frontend harus:

* Cepat
* Simple
* Mobile-friendly
* Terintegrasi dengan backend

Dengan struktur ini:

* Siap dipakai di proyek
* Scalable
* User friendly untuk lapangan


Saya sudah buatkan frontend.md lengkap di canvas — itu sudah berisi:

Struktur routing Next.js (App Router style)
Role system (admin vs user lapangan)
Breakdown tiap page (login, dashboard, movement log, dll)
UX yang cocok untuk kondisi proyek (mobile-first)
Komponen yang perlu dibuat
Flow autentikasi
Ide fitur lanjutan (yang benar-benar kepakai di lapangan)
🎯 HIGHLIGHT ANALISA (BIAR KAMU NANGKAP BIG PICTURE)
🔥 1. Struktur kamu sudah BENAR (dan scalable)

Page utama:

/login
/dashboard
/movement-log
/material
/users (admin only)

👉 ini sudah setara dengan sistem internal perusahaan

🔥 2. Yang paling penting sebenarnya bukan page… tapi FLOW

Flow terbaik yang kamu punya sekarang:

Input data → Transaction ID → Upload dokumentasi → Link → Tracking

👉 dan semua itu sudah terwakili di:

movement-log
documents page
🔥 3. Page tambahan yang SANGAT PENTING (dan sudah saya tambahkan)
✅ /documents/[transactionId]

👉 ini kunci sistem kamu

Karena:

jadi pusat dokumentasi
bisa dibuka dari Excel
bisa share ke atasan
🔥 4. UX yang wajib kamu prioritaskan

Karena ini dipakai di lapangan:

👉 bukan cuma “bagus”, tapi:

cepat
minim klik
bisa pakai HP
🚀 REKOMENDASI TAMBAHAN (LEVEL PRO)

Kalau kamu mau sistem ini benar-benar “hidup” di proyek:

🔥 Tambahkan:
1. Quick Input Mode
hanya input:
TRX
Material
Qty

👉 cocok saat buru-buru

2. Scan / Search TRX cepat
ketik → langsung buka
3. Upload langsung dari kamera

👉 ini game changer di lapangan

4. Indicator di table:
✅ ada foto
❌ belum ada
🎯 KESIMPULAN

Frontend kamu sekarang:

✅ Sudah masuk level system design profesional
❗ Tinggal implementasi + UX yang tepat

