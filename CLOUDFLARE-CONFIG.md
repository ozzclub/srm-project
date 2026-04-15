# Cloudflare Tunnel Configuration Guide

## Overview
This guide explains how to configure Cloudflare Tunnel to expose your SRM Project application with the following setup:
- **Frontend**: `https://jastipravita.co` → `http://localhost:6001`
- **Backend API**: `https://backend.jastipravita.co` → `http://localhost:6000`

## Prerequisites
1. Cloudflare account with domain `jastipravita.co` configured
2. Cloudflare CLI (`cloudflared`) installed
3. Backend running on port 6000
4. Frontend running on port 6001

## Architecture

```
Internet
  │
  ├─ https://jastipravita.co ────────────→ Cloudflare Tunnel → http://localhost:6001 (Frontend/Next.js)
  │
  └─ https://backend.jastipravita.co ───→ Cloudflare Tunnel → http://localhost:6000 (Backend API)
```

## Step 1: Install cloudflared

```bash
# macOS
brew install cloudflared

# Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
```

## Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will open a browser window. Select your domain (`jastipravita.co`).

## Step 3: Create a Tunnel

```bash
# Create a named tunnel
cloudflared tunnel create srm-project
```

This will create a tunnel with a UUID and store credentials in `~/.cloudflared/<TUNNEL_ID>.json`.

## Step 4: Configure the Tunnel

Create or update `~/.cloudflared/config.yml`:

```yaml
# Cloudflare Tunnel Configuration for SRM Project
tunnel: <TUNNEL_ID>  # Replace with your tunnel UUID
credentials-file: /Users/gunzie/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Backend API routes - must be first (more specific rules first)
  - hostname: backend.jastipravita.co
    path: /api/*
    service: http://localhost:6000
  
  - hostname: backend.jastipravita.co
    path: /uploads/*
    service: http://localhost:6000
  
  - hostname: backend.jastipravita.co
    path: /health
    service: http://localhost:6000
  
  # All other backend hostname requests
  - hostname: backend.jastipravita.co
    service: http://localhost:6000
  
  # Frontend - catch-all rule (must be last)
  - hostname: jastipravita.co
    service: http://localhost:6001
  
  # Default catch-all (required)
  - service: http_status:404
```

### Alternative Simplified Config:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /Users/gunzie/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Backend API
  - hostname: backend.jastipravita.co
    service: http://localhost:6000
  
  # Frontend
  - hostname: jastipravita.co
    service: http://localhost:6001
  
  # Required default rule
  - service: http_status:404
```

## Step 5: Route DNS to the Tunnel

```bash
# Route your domains to the tunnel
cloudflared tunnel route dns srm-project jastipravita.co
cloudflared tunnel route dns srm-project backend.jastipravita.co
```

This creates CNAME records pointing your domains to `<TUNNEL_ID>.cfargotunnel.com`.

## Step 6: Start the Tunnel

```bash
# Run the tunnel
cloudflared tunnel run srm-project
```

You should see output indicating the tunnel is connected.

## Step 7: Start Your Application

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Backend will start on `http://localhost:6000`

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Frontend will start on `http://localhost:6001`

## Step 8: Verify the Setup

Test the endpoints:

```bash
# Test backend API
curl https://backend.jastipravita.co/health

# Test frontend
curl https://jastipravita.co

# Test API endpoint with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://backend.jastipravita.co/api/users
```

## Production Deployment (Persistent Tunnel)

For production, run the tunnel as a service:

```bash
# Install as a system service
cloudflared service install

# Or run in the background
nohup cloudflared tunnel run srm-project > /var/log/cloudflared.log 2>&1 &
```

## Environment Variables Summary

### Backend (.env):
```env
PORT=6000
CORS_ORIGIN=http://localhost:6001,https://jastipravita.co,http://jastipravita.co,https://backend.jastipravita.co,http://backend.jastipravita.co
```

### Frontend (.env.local):
```env
NEXT_PUBLIC_API_URL=https://backend.jastipravita.co/api
NEXT_PUBLIC_UPLOADS_URL=https://backend.jastipravita.co
NEXT_PUBLIC_APP_URL=https://jastipravita.co
```

## Troubleshooting

### Issue: CORS Errors
**Solution**: Verify that `CORS_ORIGIN` in backend `.env` includes:
- `https://jastipravita.co`
- `http://localhost:6001` (for local dev)

### Issue: Images not loading
**Solution**: Check `next.config.ts` has proper `remotePatterns` for `backend.jastipravita.co`

### Issue: API requests failing
**Solution**: 
1. Verify tunnel is running: `cloudflared tunnel info srm-project`
2. Check ingress rules in config.yml
3. Ensure backend is running on port 6000
4. Check browser console for specific errors

### Issue: Tunnel not connecting
**Solution**:
```bash
# Check tunnel status
cloudflared tunnel list

# Restart tunnel
cloudflared tunnel cleanup srm-project
cloudflared tunnel run srm-project
```

### Issue: SSL/TLS Errors
**Solution**: In Cloudflare Dashboard → SSL/TLS → Overview, set to "Full" or "Full (strict)" mode

## Security Considerations

1. **JWT Secret**: Change the default `JWT_SECRET` in production
2. **Database Password**: Use a strong password for production database
3. **HTTPS Only**: Ensure Cloudflare SSL is set to "Full (strict)"
4. **Access Policies**: Consider adding Cloudflare Access for additional security
5. **Rate Limiting**: Configure rate limiting in Cloudflare dashboard

## Monitoring

Monitor your tunnel and traffic:
- Cloudflare Dashboard → Zero Trust → Tunnels
- Cloudflare Dashboard → Analytics → Traffic
- Check logs: `tail -f /var/log/cloudflared.log`

## Backup & Recovery

```bash
# Export tunnel configuration
cloudflared tunnel export srm-project > tunnel-backup.json

# Backup DNS records
# Cloudflare Dashboard → DNS → Export
```

## Quick Start Script

Create `start.sh`:

```bash
#!/bin/bash

echo "Starting SRM Project..."

# Start backend
echo "Starting backend on port 6000..."
cd backend && npm run dev &

# Start frontend
echo "Starting frontend on port 6001..."
cd ../frontend && npm run dev &

# Start Cloudflare tunnel
echo "Starting Cloudflare tunnel..."
cloudflared tunnel run srm-project &

echo "All services started!"
echo "- Frontend: https://jastipravita.co"
echo "- Backend API: https://backend.jastipravita.co"
```

Make it executable:
```bash
chmod +x start.sh
```
