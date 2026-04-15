# SRM Project - Setup & Configuration Guide

## 🎯 Overview

SRM Project is a full-stack Material Control & Documentation System with:
- **Backend**: Express.js + TypeScript + MySQL
- **Frontend**: Next.js 16 + React + TypeScript
- **Deployment**: Cloudflare Tunnel for secure HTTPS access

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MySQL database running
- (Optional) Cloudflare account for production deployment

### 1️⃣ Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2️⃣ Environment Configuration

#### Backend Setup

Create backend `.env` file (copy from `.env.example`):

```bash
cd backend
cp .env.example .env
```

Update the `.env` file with your database credentials:

```env
PORT=6000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=material_control
CORS_ORIGIN=http://localhost:6001,https://jastipravita.co,http://jastipravita.co
```

#### Frontend Setup

Create frontend `.env.local` file:

```bash
cd frontend
cp .env.example .env.local
```

The `.env.local` file should contain:

```env
NEXT_PUBLIC_API_URL=https://backend.jastipravita.co/api
NEXT_PUBLIC_UPLOADS_URL=https://backend.jastipravita.co
NEXT_PUBLIC_APP_URL=https://jastipravita.co
```

### 3️⃣ Database Setup

```bash
cd backend

# Create database (using your MySQL client)
mysql -u root -p
CREATE DATABASE material_control;

# Run migrations (automatic on first start)
npm run db:migrate
```

### 4️⃣ Start the Application

#### Option A: Using the startup script (macOS/Linux)

```bash
./start-dev.sh
```

#### Option B: Manual start

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

#### Option C: Windows users
Double-click `start-dev.bat` or run:
```cmd
start-dev.bat
```

### 5️⃣ Access the Application

- **Frontend (Local)**: http://localhost:6001
- **Backend API (Local)**: http://localhost:6000
- **Health Check**: http://localhost:6000/health

---

## 🌐 Cloudflare Tunnel Configuration

For production deployment with custom domain:

### Architecture

```
Internet
  │
  ├─ https://jastipravita.co ────────────→ http://localhost:6001 (Frontend)
  │
  └─ https://backend.jastipravita.co ───→ http://localhost:6000 (Backend)
```

### Setup Steps

#### 1. Install cloudflared

```bash
# macOS
brew install cloudflared

# Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
```

#### 2. Authenticate

```bash
cloudflared tunnel login
```

#### 3. Create Tunnel

```bash
cloudflared tunnel create srm-project
```

#### 4. Configure Tunnel

Edit `~/.cloudflared/config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/gunzie/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: backend.jastipravita.co
    service: http://localhost:6000
  
  - hostname: jastipravita.co
    service: http://localhost:6001
  
  - service: http_status:404
```

#### 5. Route DNS

```bash
cloudflared tunnel route dns srm-project jastipravita.co
cloudflared tunnel route dns srm-project backend.jastipravita.co
```

#### 6. Start Tunnel

```bash
cloudflared tunnel run srm-project
```

📖 **Full Guide**: See `CLOUDFLARE-CONFIG.md` for detailed instructions.

---

## 📁 Project Structure

```
srm-project/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── config/         # Environment & database config
│   │   ├── database/       # Database connection & migrations
│   │   ├── modules/        # Feature modules (users, material, etc.)
│   │   └── server.ts       # Entry point
│   ├── .env                # Backend environment variables
│   └── package.json
│
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # Pages & routes
│   │   ├── lib/           # API client & utilities
│   │   └── components/    # Reusable components
│   ├── .env.local         # Frontend environment variables
│   └── package.json
│
├── CLOUDFLARE-CONFIG.md   # Cloudflare tunnel guide
├── start-dev.sh           # Unix startup script
└── start-dev.bat          # Windows startup script
```

---

## 🔧 Configuration Summary

### Backend Ports & Domains
- **Port**: 6000
- **CORS Origins**: 
  - `http://localhost:6001` (local frontend)
  - `https://jastipravita.co` (production frontend)
  - `https://backend.jastipravita.co` (backend domain)

### Frontend Ports & Domains
- **Port**: 6001
- **API URL**: `https://backend.jastipravita.co/api`
- **Uploads URL**: `https://backend.jastipravita.co`

---

## 🧪 Testing

### Test Backend

```bash
cd backend

# Health check
curl http://localhost:6000/health

# Test API endpoint (if you have a token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:6000/api/users
```

### Test Frontend

Open browser: http://localhost:6001

### Test with Cloudflare Domain

```bash
# Backend
curl https://backend.jastipravita.co/health

# Frontend
curl https://jastipravita.co
```

---

## 🔐 Security Checklist

- [ ] Change `JWT_SECRET` in production
- [ ] Use strong database password
- [ ] Set Cloudflare SSL to "Full (strict)"
- [ ] Update CORS_ORIGIN to only include production domains
- [ ] Enable Cloudflare Access (optional)
- [ ] Set up rate limiting

---

## 🐛 Troubleshooting

### CORS Errors
✅ Check backend `.env` has correct `CORS_ORIGIN`
✅ Ensure it includes `https://jastipravita.co` and `http://localhost:6001`

### Images Not Loading
✅ Verify `next.config.ts` has `remotePatterns` for `backend.jastipravita.co`
✅ Check `NEXT_PUBLIC_UPLOADS_URL` is set correctly

### API Requests Failing
✅ Ensure backend is running on port 6000
✅ Check tunnel is running (if using Cloudflare)
✅ Verify `NEXT_PUBLIC_API_URL` in frontend `.env.local`

### Database Connection Errors
✅ Ensure MySQL is running
✅ Check database credentials in backend `.env`
✅ Run migrations: `npm run db:migrate`

---

## 📚 Documentation

- **Backend API**: See `BACKEND.md`
- **Frontend**: See `FRONTEND.md`
- **Cloudflare Setup**: See `CLOUDFLARE-CONFIG.md`
- **Excel Import**: See `EXCEL_IMPORT.md`
- **SPP Workflow**: See `SPP-REQUEST-WORKFLOW.md`

---

## 🛠️ Development Commands

### Backend

```bash
cd backend
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed database
```

### Frontend

```bash
cd frontend
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run linter
```

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in console for error messages
3. Verify all environment variables are set correctly

---

**Last Updated**: April 15, 2026
