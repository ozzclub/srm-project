# Material Control Backend API

Backend API for Material Log & Documentation System built with Node.js, Express, and TypeScript.

## 🚀 Features

- **Authentication**: JWT-based authentication with role-based access control
- **Movement Log Tracking**: Core system for tracking material movements
- **Material Management**: Master data management for materials
- **Location Management**: Manage warehouses, workshops, and sites
- **Document Upload**: Multi-file upload support per transaction
- **MySQL Database**: Relational database with proper normalization
- **TypeScript**: Full TypeScript support for type safety

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.ts      # Database connection
│   │   └── env.ts           # Environment variables
│   ├── database/            # Database scripts
│   │   ├── migrate.ts       # Migration script
│   │   └── seed.ts          # Seed script
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   └── upload.middleware.ts
│   ├── modules/             # Feature modules
│   │   ├── user/
│   │   ├── material/
│   │   ├── location/
│   │   ├── movement-type/
│   │   ├── movement-log/
│   │   └── document/
│   ├── types/               # TypeScript type definitions
│   │   ├── api.types.ts
│   │   ├── user.types.ts
│   │   ├── material.types.ts
│   │   ├── location.types.ts
│   │   ├── movement-type.types.ts
│   │   ├── movement-log.types.ts
│   │   └── document.types.ts
│   ├── app.ts               # Express app configuration
│   └── server.ts            # Server entry point
├── uploads/                 # Uploaded files (auto-created)
├── .env.example             # Environment variables template
├── package.json
└── tsconfig.json
```

## 🛠️ Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials and preferences.

3. **Create database**:
   ```sql
   CREATE DATABASE material_control;
   ```

4. **Auto-Migration** (Recommended):
   
   The system has an **intelligent auto-migration feature** that automatically checks and updates your database structure on every server start.
   
   In `.env`, set:
   ```env
   AUTO_MIGRATE=true
   ```
   
   When enabled:
   - ✅ Automatically checks if tables exist
   - ✅ Creates missing tables
   - ✅ Adds missing columns
   - ✅ Creates missing indexes
   - ✅ Safe to run multiple times (idempotent)
   - ✅ No data loss on existing tables
   
   **This means you don't need to manually run migrations!** Just start the server and it will handle everything.

5. **Manual Migration** (Optional):
   ```bash
   npm run db:migrate
   ```

6. **Check Database Structure**:
   ```bash
   npm run db:check
   ```

7. **Seed database** (optional):
   ```bash
   npm run db:seed
   ```

## 🚀 Running the Application

**Development mode** (with auto-reload on file changes):
```bash
npm run dev
```

The server will:
- 🔍 Auto-check database structure on startup (if `AUTO_MIGRATE=true`)
- 🔄 Create/update tables as needed
- 🚀 Start the API server
- 🔁 Automatically restart when you save changes to `.ts` files

**Production mode**:
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/users/login` - Login

### Users (Admin Only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Materials
- `GET /api/material` - Get all materials
- `GET /api/material/:id` - Get material by ID
- `POST /api/material` - Create material (Admin)
- `PUT /api/material/:id` - Update material (Admin)
- `DELETE /api/material/:id` - Delete material (Admin)

### Locations
- `GET /api/locations` - Get all locations
- `GET /api/locations/:id` - Get location by ID
- `POST /api/locations` - Create location (Admin)
- `PUT /api/locations/:id` - Update location (Admin)
- `DELETE /api/locations/:id` - Delete location (Admin)

### Movement Types
- `GET /api/movement-types` - Get all movement types
- `GET /api/movement-types/:id` - Get movement type by ID
- `POST /api/movement-types` - Create movement type (Admin)
- `PUT /api/movement-types/:id` - Update movement type (Admin)
- `DELETE /api/movement-types/:id` - Delete movement type (Admin)

### Movement Log
- `GET /api/movement-log` - Get all movement logs (with pagination & filters)
- `GET /api/movement-log/:id` - Get movement log by ID
- `POST /api/movement-log` - Create movement log
- `PUT /api/movement-log/:id` - Update movement log
- `DELETE /api/movement-log/:id` - Delete movement log (Admin)
- `GET /api/movement-log/dashboard` - Get dashboard statistics

### Documents
- `POST /api/documents/upload` - Upload documents (multipart/form-data)
- `GET /api/documents/:transactionId` - Get documents by transaction ID
- `GET /api/documents/detail/:id` - Get document by ID
- `DELETE /api/documents/:id` - Delete document

## 🔐 Authentication

All endpoints (except login) require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## 📝 Request Examples

### Login
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@materialcontrol.com", "password": "admin123"}'
```

### Create Movement Log
```bash
curl -X POST http://localhost:3000/api/movement-log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "transaction_id": "TRX-260404-001",
    "transaction_date": "2026-04-04",
    "material_id": 1,
    "qty": 100,
    "from_location_id": 1,
    "to_location_id": 3,
    "movement_type_id": 1
  }'
```

### Upload Documents
```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "transaction_id=TRX-260404-001" \
  -F "category=MATERIAL" \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.jpg"
```

## 🗄️ Database Schema

### Tables
- **users** - User accounts with authentication
- **materials** - Material master data
- **locations** - Location references (warehouse, workshop, site)
- **movement_types** - Movement categories
- **movement_log** - Core transaction table
- **documents** - File documentation per transaction

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=material_control

# Auto-migration: automatically check and update database structure on startup
AUTO_MIGRATE=true

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
MAX_FILES=10
```

### AUTO_MIGRATE Explained

When `AUTO_MIGRATE=true`:
- Server checks all required tables exist on startup
- Creates missing tables automatically
- Adds missing columns to existing tables
- Creates missing indexes for performance
- **Safe**: Won't delete existing data or columns
- **Idempotent**: Can run multiple times without issues

**When to set `AUTO_MIGRATE=false`:**
- Production environment (use manual migrations instead)
- When you want to manually control database changes

## 📦 Default Credentials

After running seed script:
- **Email**: admin@materialcontrol.com
- **Password**: admin123

## 🏗️ Architecture

The project follows a modular clean architecture:

```
Module/
├── controller.ts    # HTTP request handlers
├── service.ts       # Business logic
└── routes.ts        # Route definitions
```

## 📄 License

ISC
