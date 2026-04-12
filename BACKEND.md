# 📦 DATABASE.md - Material Log & Documentation System

## 🎯 OVERVIEW

Sistem ini dirancang untuk:

* Tracking pergerakan material (Movement Log)
* Menghubungkan dokumentasi (foto/file)
* Mendukung sistem scalable (multi project / multi user)

Database menggunakan **MySQL**.

---

# 🧠 DESIGN PRINCIPLE

### ❗ RULE UTAMA

* Jangan duplikasi data (normalisasi)
* Gunakan relasi (foreign key)
* Transaction ID sebagai pusat sistem

---

# 🏗️ DATABASE STRUCTURE

## 1. 📊 TABLE: movement_log (CORE TABLE)

Tabel utama untuk semua aktivitas material.

```sql
CREATE TABLE movement_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,
    transaction_date DATE NOT NULL,

    trip_id VARCHAR(50),
    document_no VARCHAR(50),

    material_id INT,

    qty DECIMAL(10,2),

    from_location_id INT,
    to_location_id INT,

    movement_type_id INT,

    vehicle_driver VARCHAR(100),
    received_by VARCHAR(100),

    loading_time DATETIME,
    unloading_time DATETIME,

    condition_notes TEXT,

    documentation_link TEXT,

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (from_location_id) REFERENCES locations(id),
    FOREIGN KEY (to_location_id) REFERENCES locations(id),
    FOREIGN KEY (movement_type_id) REFERENCES movement_types(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

---

## 2. 📦 TABLE: materials

Pisahkan data material agar tidak duplikasi.

```sql
CREATE TABLE materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_code VARCHAR(20) UNIQUE,
    material_name VARCHAR(100),
    specification VARCHAR(255),
    unit VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🎯 Kenapa dipisah?

* Menghindari typo
* Konsistensi data
* Bisa dipakai di banyak transaksi

---

## 3. 📍 TABLE: locations

Untuk semua lokasi (Gudang, Workshop, Site).

```sql
CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100),
    location_type ENUM('warehouse','workshop','site'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. 🔄 TABLE: movement_types

Standarisasi jenis pergerakan.

```sql
CREATE TABLE movement_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50)
);
```

### Default Data:

* DIRECT_DELIVERY
* TRANSFER
* ISSUE_TO_SITE

---

## 5. 👤 TABLE: users

Untuk login dashboard.

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('admin','staff') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. 📂 TABLE: documents

Untuk menyimpan file/foto.

```sql
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50),
    file_url TEXT,
    category VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 🔗 RELATIONSHIP SUMMARY

| Table        | Relasi           |
| ------------ | ---------------- |
| movement_log | → materials      |
| movement_log | → locations      |
| movement_log | → movement_types |
| movement_log | → users          |
| documents    | → transaction_id |

---

# 🧠 DESIGN DECISION ANALYSIS

## ❓ Kolom yang HARUS dipisah

### ✅ MATERIAL

* material_code
* material_name
* specification
* unit

➡️ masuk ke table `materials`

---

### ✅ LOCATION

* From Location
* To Location

➡️ masuk ke table `locations`

---

### ✅ MOVEMENT TYPE

➡️ masuk ke table `movement_types`

---

### ❌ TIDAK PERLU dipisah (cukup di movement_log)

* Transaction ID
* Trip ID
* DO
* Vehicle / Driver
* Received By
* Condition

---

# 🚀 FUTURE SCALABILITY

Sistem ini siap untuk:

* Multi project
* Dashboard analytics
* Mobile upload documentation
* Audit trail

---

# 🎯 FINAL CONCLUSION

Struktur terbaik:

* movement_log = transaksi
* materials = master data
* locations = referensi lokasi
* movement_types = kategori
* users = login
* documents = dokumentasi

---

🔥 Dengan struktur ini:

* Data rapi
* Tidak duplikasi
* Mudah dikembangkan
* Siap jadi sistem profesional



Saya sudah buatkan DATABASE.md lengkap di canvas untuk kamu — itu sudah termasuk:

Struktur tabel yang proper (MySQL)
Relasi antar tabel
Alasan kenapa beberapa kolom harus dipisah (normalisasi)
Desain yang siap untuk Next.js + Node.js
Future scalability (biar tidak perlu refactor besar nanti)
🎯 INTI ANALISA (BIAR KAMU BENAR-BENAR PAHAM)
✅ Yang kamu tanyakan (penting banget):

Apakah material harus dipisah?

👉 Jawaban:

WAJIB DIPISAH (best practice database design)

Karena kalau tidak:

data duplikat
typo (Plywood vs Playwood 😅)
susah maintain
🔥 STRUKTUR YANG SEKARANG KAMU PUNYA (SUDAH BENAR ARAHNYA)
Dipisah jadi:
materials → master data
movement_log → transaksi
locations → lokasi
movement_types → jenis movement
users → login
documents → foto/file
🚀 YANG PALING PENTING DARI SEMUA INI
🧠 1. Transaction ID = pusat sistem

Semua akan connect ke sini:

movement_log
documents
🧠 2. Movement Log = “source of truth”

Semua:

stock
report
dokumentasi

👉 berasal dari sini

🧠 3. Documents dipisah (JANGAN disimpan di movement_log)

Kenapa?

1 transaksi bisa banyak foto
scalable
lebih fleksibel
🔥 SEDIKIT UPGRADE (REKOMENDASI SAYA)

Kalau kamu mau lebih PRO lagi, nanti bisa tambah:

👉 Table: projects

Kalau kamu pegang banyak site

👉 Table: suppliers

Untuk GCSP, KKPR, dll

👉 Table: trips

Untuk grouping truck