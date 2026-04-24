# ✅ HireSmart Verification & Testing Guide

## 🔍 System Verification Checklist

### 1. Server Status Check

Run in PowerShell:
```powershell
# Check if backend is running
netstat -an | Select-String "3000"
# Expected: TCP 0.0.0.0:3000 with LISTENING status

# Check if frontend is running
netstat -an | Select-String "5173"
# Expected: TCP [::1]:5173 with LISTENING status
```

### 2. API Health Check

```powershell
# Test backend health endpoint
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
$response.Content
```

Expected Response:
```json
{
  "status": "OK",
  "message": "HireSmart API is running",
  "timestamp": "2026-03-01T..."
}
```

### 3. Frontend Accessibility

Open in browser:
- **Frontend UI**: http://localhost:5173
- Expected: Login page or dashboard loads successfully

### 4. API Proxy Verification

```powershell
# Test that frontend can reach backend through proxy
# This should return the same health response
$response = Invoke-WebRequest -Uri "http://localhost:5173/api/health" -UseBasicParsing
$response.Content
```

---

## 🧪 Feature Testing

### Test 1: Resume Upload & Analysis

**Steps:**
1. Go to http://localhost:5173
2. Upload a sample resume from `sample_resumes/` folder
3. Enter job description
4. Click "Analyze"

**Expected Result:**
- Resume uploaded successfully
- Analysis completes
- Matching score displayed
- Skills matched highlighted

### Test 2: Batch Processing

**Steps:**
1. Navigate to batch analysis section
2. Upload multiple resumes
3. Enter job description
4. Submit batch

**Expected Result:**
- All files processed
- Results shown for each candidate

### Test 3: Authentication

**Steps:**
1. Go to login page
2. Enter credentials:
   - Email: `recruiter@test.com`
   - Password: `test123`
3. Click login

**Expected Result:**
- Authentication successful
- Redirected to dashboard
- JWT token visible in browser console

---

## 🔧 Configuration Verification

### Backend Configuration

File: `backend/.env`

```
✓ PORT=3000
✓ NODE_ENV=development
✓ JWT_SECRET=dev-secret-key-for-hiresmart-project-minimum-32-characters-required
✓ ENABLE_FAIRNESS_CHECK=true
```

Verify:
```powershell
cd backend
cat .env | Select-String "PORT"
```

### Frontend Configuration

File: `frontend-react/.env`

```
✓ VITE_API_URL=/api
```

Verify:
```powershell
cd frontend-react
cat .env
```

### Vite Configuration

File: `frontend-react/vite.config.js`

```javascript
✓ server.port = 5173
✓ proxy: /api -> http://localhost:3000
```

Verify:
```powershell
cd frontend-react
cat vite.config.js | Select-String -Pattern "port|proxy" -Context 1
```

---

## 📊 Performance Metrics

### Frontend Load Time

Open DevTools (F12) → Network tab:
- Expected: Initial load < 2 seconds
- Expected: CSS files < 100KB total
- Expected: JS bundles < 500KB total

### API Response Time

```powershell
# Measure health endpoint response time
$sw = [System.Diagnostics.Stopwatch]::StartNew()
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing | Out-Null
$sw.Stop()
Write-Host "Response time: $($sw.ElapsedMilliseconds)ms"
```

Expected: < 100ms

---

## 🔐 Security Verification

### 1. CORS Headers

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
$response.Headers | Select-String "Access-Control"
```

Expected: CORS headers present

### 2. Security Headers (Helmet.js)

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
$response.Headers | Select-String "X-"
```

Expected: X-Content-Type-Options, X-Frame-Options, etc.

### 3. Rate Limiting

```powershell
# Make multiple rapid requests
for($i=0; $i -lt 150; $i++) {
    Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing | Out-Null
}
# After limit exceeded, should get 429 status
```

Expected: After threshold, receive 429 (Too Many Requests) status

---

## 📝 Logging Verification

### Backend Logs

Check console output:
```
Logs should show:
✓ Server is running on port 3000
✓ Request logging (Morgan)
✓ Error logging (Winston)
✓ Request IDs being tracked
```

### Frontend Console

Open DevTools (F12) → Console:
```
Logs should show:
✓ API calls being proxied correctly
✓ No CORS errors
✓ No missing assets
```

---

## ✨ Sample Data Testing

### Load Sample Resume

```powershell
cd backend/uploads
# Check if sample resumes exist in ../sample_resumes/
Get-ChildItem "../sample_resumes/" | Select-Object Name
```

### Use Sample API Endpoint

```powershell
$body = @{
    jobTitle = "Software Engineer"
    jobDescription = "5+ years Node.js and React experience required"
    candidateName = "John Doe"
    resumeFile = "resume_software_engineer.txt"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/analyze-sample" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing | Select-Object -ExpandProperty Content
```

Expected: JSON response with analysis results

---

## 🚀 Production Readiness

Before deploying to production:

- [ ] Change JWT_SECRET to a strong value
- [ ] Update admin password
- [ ] Configure MongoDB connection or alternative storage
- [ ] Set NODE_ENV=production
- [ ] Enable Redis for caching
- [ ] Review and adjust rate limiting thresholds
- [ ] Configure email/SMTP for notifications
- [ ] Set up SSL/TLS certificates
- [ ] Configure domain name
- [ ] Set up monitoring and alerting
- [ ] Review security policies
- [ ] Backup configuration

---

## 🐛 Common Issues & Solutions

### Issue: Port 3000 Already in Use

**Solution:**
```powershell
# Find process using port
$proc = Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess
Get-Process -Id $proc

# Kill it (if safe)
Stop-Process -Id $proc -Force

# Or change port in .env
Set-Content backend\.env -Value "PORT=3001`n..."
```

### Issue: CORS Error

**Solution:**
- Backend CORS is already enabled in `server.js`
- Frontend proxy is configured in `vite.config.js`
- Ensure both services are running

### Issue: 404 on API Calls

**Solution:**
- Verify backend is running on port 3000
- Verify frontend proxy is configured correctly
- Check API endpoint paths match documentation

### Issue: Slow Performance

**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Clear npm cache: `npm cache clean --force`
- Restart both servers
- Check system resources (CPU, Memory)

---

## ✅ Final Verification Checklist

- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] Can access http://localhost:5173 in browser
- [ ] API health endpoint returns OK
- [ ] CORS headers present
- [ ] Security headers configured
- [ ] Can upload sample resume
- [ ] Analysis returns valid score
- [ ] Logging working (check console)
- [ ] No errors in browser console
- [ ] No errors in backend output
- [ ] Rate limiting functional
- [ ] All environment variables set

---

## 📞 Verification Support

If any verification fails:

1. **Check logs**: Look at console output for error messages
2. **Verify ports**: `netstat -an | findstr :3000` and `:5173`
3. **Check dependencies**: `npm list` in both directories
4. **Restart services**: Stop and start both servers
5. **Clear cache**: `npm cache clean --force`
6. **Check firewall**: Ensure ports 3000 and 5173 aren't blocked

---

**Status**: 🟢 **SYSTEM READY FOR VERIFICATION AND DEPLOYMENT**

All components are configured and running. Follow this guide to verify all functionality.
