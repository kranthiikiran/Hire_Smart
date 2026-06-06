# HireSmart Vercel + Render Deployment Setup

## Problem: Login Fails on Vercel

**Symptoms:**
- Login page loads but login button doesn't work
- Console shows API connection errors
- "Unable to reach server" message

**Root Cause:** Frontend cannot communicate with backend API due to missing environment configuration.

---

## Solution: 3-Step Configuration

### Step 1: Configure Vercel Frontend (VITE_API_URL)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your HireSmart project
3. Click **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-render-backend-url.onrender.com` (NO trailing slash)
   - **Environments:** Check all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** the frontend (or push to trigger auto-deploy)

**Find your backend URL:**
- Go to Render Dashboard
- Select your backend service
- Copy the URL from the top (e.g., `https://hiresmart-backend.onrender.com`)

---

### Step 2: Configure Render Backend (DATABASE_URL)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your `hiresmart-backend` service
3. Click **Environment** tab
4. Add the following environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/hiresmart?retryWrites=true&w=majority` | Get this from MongoDB Atlas |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/hiresmart?retryWrites=true&w=majority` | Same as DATABASE_URL for compatibility |
| `NODE_ENV` | `production` | Required for production mode |
| `JWT_SECRET` | `your-long-random-secret-key-min-32-chars` | Change this! Use a strong key |
| `PORT` | `3000` | Usually auto-set by Render |
| `OPENAI_API_KEY` | Your OpenAI key | Optional: for AI scoring |

5. Click **Save Changes**
6. Backend will auto-redeploy with new environment variables

**Get MongoDB Connection String:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Cluster → Connect → Driver → Node.js
3. Copy connection string
4. Replace `<username>`, `<password>`, and `<database_name>`

---

### Step 3: Test the Connection

#### Test Backend Health:
```bash
# Replace with your actual backend URL
curl https://hiresmart-backend.onrender.com/api/health
```

**Expected Response:** `{ "status": "ok" }` or similar

#### Test Login Endpoint:
1. Open browser console (F12)
2. Go to your Vercel frontend URL
3. Open Network tab
4. Try to login
5. Check the login request:
   - **Look for:** POST to correct backend URL
   - **Status should be:** 200 (not 401, 500, or connection timeout)

#### Common Error Codes:
- **502 Bad Gateway:** Backend is not running (check Render logs)
- **401 Unauthorized:** Wrong credentials (test with new account)
- **Cannot reach server:** `VITE_API_URL` not set or wrong
- **CORS error:** Backend CORS not allowing Vercel domain

---

## Troubleshooting Checklist

### Frontend (Vercel)

- [ ] `VITE_API_URL` environment variable is set
- [ ] No trailing slash in `VITE_API_URL`
- [ ] Backend URL is accessible (not localhost!)
- [ ] Frontend was redeployed after setting env var
- [ ] Browser cache cleared (Ctrl+Shift+Del or Cmd+Shift+Del)

### Backend (Render)

- [ ] `DATABASE_URL` is set and valid
- [ ] MongoDB Atlas allows Render's IP (or uses 0.0.0.0/0)
- [ ] `NODE_ENV=production`
- [ ] Backend service status is "Live" (not building)
- [ ] No red "Deploy Error" message in Render dashboard

### Database (MongoDB Atlas)

- [ ] Credentials are URL-encoded (special chars like `@` become `%40`)
- [ ] IP whitelist includes Render's outbound IPs (or 0.0.0.0/0)
- [ ] Database user has readWrite role on the database

---

## Environment Variable Reference

### Vercel Frontend Environment Variables

```env
# Required
VITE_API_URL=https://hiresmart-backend.onrender.com

# Optional
VITE_APP_NAME=HireSmart
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=false
```

### Render Backend Environment Variables

```env
# Required for Production
NODE_ENV=production
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/hiresmart?retryWrites=true&w=majority
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hiresmart?retryWrites=true&w=majority
JWT_SECRET=your-production-secret-key-here-min-32-chars
PORT=3000

# Optional but Recommended
CORS_ORIGIN=https://your-vercel-frontend.vercel.app
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
LOG_LEVEL=info
```

---

## Deployment Flow

```
User Login on Vercel Frontend
    ↓
Frontend calls VITE_API_URL/api/auth/login
    ↓
Request reaches Render Backend
    ↓
Backend queries MongoDB Atlas (using DATABASE_URL)
    ↓
Returns JWT token to frontend
    ↓
Login succeeds ✓
```

---

## After Deployment

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Wait 2-3 minutes** for Vercel/Render to finish deployment
3. **Test login** with a new account
4. **Check browser console** (F12) for specific error messages
5. **Monitor** Vercel and Render logs for errors

---

## Still Having Issues?

### Check Render Logs:
1. Render Dashboard → Backend Service → Logs tab
2. Look for "connected" messages
3. Check for "connection failed" or "timeout" errors

### Check Vercel Logs:
1. Vercel Dashboard → Deployments → Select deployment
2. Click "Build Logs" tab
3. Scroll up to see build output
4. Check for build errors or missing env vars

### Test API Directly:
```bash
# Test if backend is responsive
curl -i https://your-backend-url.onrender.com/api/health

# Test MongoDB connection (should not error)
# Check Render logs instead
```

---

## Quick Start Deployment Checklist

- [ ] MongoDB Atlas cluster created and credentials obtained
- [ ] Render account created with backend deployed
- [ ] Vercel account created with frontend deployed  
- [ ] Backend `DATABASE_URL` set on Render
- [ ] Frontend `VITE_API_URL` set on Vercel (pointing to Render backend)
- [ ] Both services redeployed after env var changes
- [ ] Backend URL is in allowedOrigins on backend
- [ ] Login test successful on production

---

## Support

For more info, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Backend API Docs: `/api` endpoint
- Frontend Source: `frontend-react/src/services/api.js`
