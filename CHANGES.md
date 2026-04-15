# Configuration Changes Summary

## 🎯 Objective
Configure SRM Project to run on new ports (backend: 6000, frontend: 6001) and communicate via Cloudflare tunnel domains.

---

## 📋 Changes Made

### 1️⃣ Backend Configuration (Port 6000)

#### Files Modified:
- ✅ `/backend/.env` - Created with PORT=6000 and CORS_ORIGIN
- ✅ `/backend/.env.example` - Updated to reflect new port and CORS settings
- ✅ `/backend/src/config/env.ts` - Changed default port from 3000 to 6000, added corsOrigin config
- ✅ `/backend/src/app.ts` - Updated CORS middleware to use configured origins

#### Key Changes:
```diff
- PORT=3000
+ PORT=6000

+ CORS_ORIGIN=http://localhost:6001,https://jastipravita.co,http://jastipravita.co,...

- app.use(cors());
+ app.use(cors({
+   origin: config.corsOrigin.split(',').map(origin => origin.trim()),
+   credentials: true,
+   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
+   allowedHeaders: ['Content-Type', 'Authorization'],
+ }));
```

---

### 2️⃣ Frontend Configuration (Port 6001)

#### Files Modified:
- ✅ `/frontend/.env.local` - Created with Cloudflare domain URLs
- ✅ `/frontend/.env.example` - Updated example URLs to Cloudflare domains
- ✅ `/frontend/package.json` - Changed dev/start ports from 3001 to 6001
- ✅ `/frontend/next.config.ts` - Updated image remotePatterns for new domains
- ✅ `/frontend/src/lib/api.ts` - Updated fallback API URL
- ✅ `/frontend/src/app/transaction/[id]/page.tsx` - Updated API and uploads URLs
- ✅ `/frontend/src/app/documents/[transactionId]/page.tsx` - Updated API and uploads URLs, fixed getFileUrl function

#### Key Changes:
```diff
- "dev": "next dev -p 3001"
+ "dev": "next dev -p 6001"

- "start": "next start -p 3001"
+ "start": "next start -p 6001"

- const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
+ const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.jastipravita.co/api';

- const UPLOADS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';
+ const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL || 'https://backend.jastipravita.co';
```

---

### 3️⃣ New Documentation Files

#### Created:
- ✅ `/CLOUDFLARE-CONFIG.md` - Comprehensive Cloudflare tunnel setup guide
- ✅ `/SETUP-GUIDE.md` - Complete project setup documentation
- ✅ `/MIGRATION-GUIDE.md` - Detailed migration instructions
- ✅ `/CHANGES.md` - This file (summary of all changes)

---

### 4️⃣ Helper Scripts

#### Created:
- ✅ `/start-dev.sh` - Unix startup script for running both services
- ✅ `/start-dev.bat` - Windows batch file for running both services
- ✅ `/verify-setup.sh` - Configuration verification script

---

## 🌐 Domain Architecture

### Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────────────────────────────────────────┘
              │                              │
              │                              │
    https://jastipravita.co      https://backend.jastipravita.co
              │                              │
              ▼                              ▼
    ┌─────────────────┐            ┌─────────────────┐
    │  Cloudflare     │            │  Cloudflare     │
    │  Tunnel         │            │  Tunnel         │
    └─────────────────┘            └─────────────────┘
              │                              │
              ▼                              ▼
    http://localhost:6001        http://localhost:6000
    (Frontend - Next.js)         (Backend - Express)
```

### Environment Variables

#### Backend (`/backend/.env`):
```env
PORT=6000
CORS_ORIGIN=http://localhost:6001,https://jastipravita.co,http://jastipravita.co,https://backend.jastipravita.co,http://backend.jastipravita.co
```

#### Frontend (`/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=https://backend.jastipravita.co/api
NEXT_PUBLIC_UPLOADS_URL=https://backend.jastipravita.co
NEXT_PUBLIC_APP_URL=https://jastipravita.co
```

---

## 🔍 Verification

### Run the verification script:
```bash
./verify-setup.sh
```

### Manual checks:
```bash
# Check if files exist
ls -la backend/.env
ls -la frontend/.env.local

# Check port configuration
grep "PORT=" backend/.env
grep "\"dev\"" frontend/package.json

# Verify CORS
grep "CORS_ORIGIN" backend/.env

# Verify API URLs
grep "NEXT_PUBLIC_API_URL" frontend/.env.local
```

---

## 🚀 How to Start

### Option 1: Using startup script
```bash
./start-dev.sh
```

### Option 2: Manual start
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Option 3: Windows
```cmd
start-dev.bat
```

---

## ✅ Testing Checklist

After starting the services:

- [ ] Backend accessible at http://localhost:6000
- [ ] Frontend accessible at http://localhost:6001
- [ ] Backend health check: http://localhost:6000/health
- [ ] No CORS errors in browser console
- [ ] API calls successful
- [ ] Images loading correctly

### With Cloudflare Tunnel:
- [ ] Backend accessible at https://backend.jastipravita.co
- [ ] Frontend accessible at https://jastipravita.co
- [ ] Health check: https://backend.jastipravita.co/health
- [ ] All API endpoints working

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| `SETUP-GUIDE.md` | Complete setup instructions |
| `CLOUDFLARE-CONFIG.md` | Cloudflare tunnel configuration |
| `MIGRATION-GUIDE.md` | Migration from old setup |
| `CHANGES.md` | This file - summary of changes |
| `BACKEND.md` | Backend API documentation |
| `FRONTEND.md` | Frontend documentation |
| `EXCEL_IMPORT.md` | Excel import guide |
| `SPP-*.md` | SPP workflow documentation |

---

## 🎯 Quick Reference

### Ports
- **Backend**: 6000 (was 3000)
- **Frontend**: 6001 (was 3001)

### Domains
- **Frontend**: https://jastipravita.co
- **Backend API**: https://backend.jastipravita.co

### Key Files to Configure
1. `/backend/.env` - Backend environment
2. `/frontend/.env.local` - Frontend environment
3. `~/.cloudflared/config.yml` - Cloudflare tunnel (if using)

---

## 🔧 Troubleshooting Quick Fixes

### CORS Errors
```bash
# Check backend .env has correct origins
cat backend/.env | grep CORS_ORIGIN
```

### API Not Responding
```bash
# Verify backend is running
lsof -i :6000

# Check API URL in frontend
cat frontend/.env.local | grep NEXT_PUBLIC_API_URL
```

### Images Not Loading
```bash
# Verify uploads URL
cat frontend/.env.local | grep NEXT_PUBLIC_UPLOADS_URL

# Check next.config.ts image configuration
cat frontend/next.config.ts
```

---

**Configuration Date**: April 15, 2026  
**Configuration Version**: 2.0.0  
**Status**: ✅ Complete and Ready for Deployment
