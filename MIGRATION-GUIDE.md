# Migration Guide - Port & Domain Configuration

## What Changed

This document summarizes the changes made to configure the SRM Project for Cloudflare tunnel deployment.

### Port Changes

| Service | Old Port | New Port |
|---------|----------|----------|
| Backend | 3000     | 6000     |
| Frontend| 3001     | 6001     |

### Domain Configuration

The application now communicates via Cloudflare tunnel domains:

- **Frontend**: `https://jastipravita.co`
- **Backend API**: `https://backend.jastipravita.co`

---

## Files Modified

### Backend Changes

#### 1. `/backend/.env`
**Changed:**
- `PORT` from `3000` to `6000`
- Added `CORS_ORIGIN` configuration

**New Content:**
```env
PORT=6000
CORS_ORIGIN=http://localhost:6001,https://jastipravita.co,http://jastipravita.co,https://backend.jastipravita.co,http://backend.jastipravita.co
```

#### 2. `/backend/.env.example`
**Changed:**
- Updated default `PORT` to `6000`
- Added `CORS_ORIGIN` example

#### 3. `/backend/src/config/env.ts`
**Changed:**
- Default port from `'3000'` to `'6000'`
- Added `corsOrigin` configuration field

**Code Changes:**
```typescript
port: parseInt(process.env.PORT || '6000'),  // was '3000'
corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:6001,...',  // NEW
```

#### 4. `/backend/src/app.ts`
**Changed:**
- CORS middleware now uses configured origins instead of allowing all

**Before:**
```typescript
app.use(cors());
```

**After:**
```typescript
app.use(cors({
  origin: config.corsOrigin.split(',').map(origin => origin.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

### Frontend Changes

#### 1. `/frontend/.env.local` (NEW FILE)
**Created with:**
```env
NEXT_PUBLIC_API_URL=https://backend.jastipravita.co/api
NEXT_PUBLIC_UPLOADS_URL=https://backend.jastipravita.co
NEXT_PUBLIC_APP_URL=https://jastipravita.co
```

#### 2. `/frontend/.env.example`
**Changed:**
- Updated example URLs to use Cloudflare domains

#### 3. `/frontend/package.json`
**Changed:**
- Development port from `3001` to `6001`
- Production start port from `3001` to `6001`

**Before:**
```json
"dev": "next dev -p 3001"
```

**After:**
```json
"dev": "next dev -p 6001"
```

#### 4. `/frontend/next.config.ts`
**Changed:**
- Updated image remotePatterns to include new domains

**Added patterns:**
```typescript
{
  protocol: 'http',
  hostname: 'localhost',
  port: '6000',  // was '3000'
  pathname: '/uploads/**',
},
{
  protocol: 'https',
  hostname: 'backend.jastipravita.co',
  pathname: '/uploads/**',
},
{
  protocol: 'http',
  hostname: 'backend.jastipravita.co',
  pathname: '/uploads/**',
},
```

#### 5. `/frontend/src/lib/api.ts`
**Changed:**
- Fallback API URL from `http://localhost:3000/api` to `https://backend.jastipravita.co/api`

**Before:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
```

**After:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.jastipravita.co/api';
```

#### 6. `/frontend/src/app/transaction/[id]/page.tsx`
**Changed:**
- Fallback URLs updated to use Cloudflare domains

**Before:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const UPLOADS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';
```

**After:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.jastipravita.co/api';
const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL || 'https://backend.jastipravita.co';
```

#### 7. `/frontend/src/app/documents/[transactionId]/page.tsx`
**Changed:**
- Added `UPLOADS_URL` constant
- Updated `getFileUrl` function to use `UPLOADS_URL` instead of `API_URL`

**Before:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const getFileUrl = (fileUrl: string) => {
  return `${API_URL}/uploads/${transactionId}/${fileUrl}`;
};
```

**After:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.jastipravita.co/api';
const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL || 'https://backend.jastipravita.co';

const getFileUrl = (fileUrl: string) => {
  return `${UPLOADS_URL}/uploads/${transactionId}/${fileUrl}`;
};
```

---

## New Files Created

1. **`/backend/.env`** - Backend environment configuration
2. **`/frontend/.env.local`** - Frontend environment configuration
3. **`/CLOUDFLARE-CONFIG.md`** - Comprehensive Cloudflare tunnel setup guide
4. **`/SETUP-GUIDE.md`** - Complete setup and configuration documentation
5. **`/start-dev.sh`** - Unix startup script
6. **`/start-dev.bat`** - Windows startup script
7. **`/MIGRATION-GUIDE.md`** - This file

---

## How to Apply These Changes

### If you're setting up fresh:

1. ✅ All changes are already applied
2. Follow the `SETUP-GUIDE.md` for installation
3. Configure Cloudflare tunnel using `CLOUDFLARE-CONFIG.md`

### If you're migrating from old setup:

1. **Update your `.env` files:**
   ```bash
   # Backend
   cd backend
   # Update PORT to 6000 in .env
   # Add CORS_ORIGIN if missing
   
   # Frontend
   cd ../frontend
   # Create .env.local if it doesn't exist
   ```

2. **Restart your services:**
   ```bash
   # Stop existing services
   # Use new startup scripts
   ./start-dev.sh  # or start-dev.bat on Windows
   ```

3. **Update Cloudflare tunnel config:**
   - Ensure `config.yml` points to ports 6000 and 6001
   - Verify DNS records are set for both domains

4. **Test the connection:**
   ```bash
   # Test backend
   curl https://backend.jastipravita.co/health
   
   # Test frontend
   curl https://jastipravita.co
   ```

---

## Breaking Changes

⚠️ **Important:** 

1. **Old bookmarks/URLs** using `localhost:3000` or `localhost:3001` will no longer work
   - Update to `localhost:6000` (backend) and `localhost:6001` (frontend)

2. **Environment variables** must be updated:
   - `NEXT_PUBLIC_API_URL` should point to `https://backend.jastipravita.co/api`
   - `NEXT_PUBLIC_UPLOADS_URL` should point to `https://backend.jastipravita.co`

3. **CORS configuration** is now stricter:
   - Only origins listed in `CORS_ORIGIN` will be allowed
   - Ensure your frontend domain is included

---

## Rollback Instructions

If you need to revert to the old configuration:

### Backend Rollback

```typescript
// /backend/src/config/env.ts
port: parseInt(process.env.PORT || '3000'),  // revert to 3000
// Remove corsOrigin field

// /backend/src/app.ts
app.use(cors());  // revert to simple cors

// /backend/.env
PORT=3000  // change back to 3000
```

### Frontend Rollback

```json
// /frontend/package.json
"dev": "next dev -p 3001",  // revert to 3001
"start": "next start -p 3001",
```

```typescript
// /frontend/src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Update all API_URL references back to localhost:3000
```

```typescript
// /frontend/next.config.ts
{
  protocol: 'http',
  hostname: 'localhost',
  port: '3000',  // revert to 3000
  pathname: '/uploads/**',
},
```

---

## Verification Checklist

After migration, verify:

- [ ] Backend starts on port 6000
- [ ] Frontend starts on port 6001
- [ ] CORS allows requests from frontend domain
- [ ] API calls use `https://backend.jastipravita.co/api`
- [ ] Images load from `https://backend.jastipravita.co/uploads/`
- [ ] Cloudflare tunnel connects to correct ports
- [ ] No console errors about CORS
- [ ] No console errors about mixed content (HTTP/HTTPS)

---

**Migration Date**: April 15, 2026  
**Version**: 1.0.0 → 2.0.0
