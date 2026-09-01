# DueMate - Quick Start Guide

## 🚀 Starting the Application

### Step 1: Start Backend Server
```bash
cd C:\DueMate\backend
node server.js
```

**Expected Output:**
```
Server running on http://localhost:3000
```

### Step 2: Open Frontend in Browser
```
Open this URL in your browser:
file:///C:/DueMate/frontend/index.html
```

---

## 🔐 Testing JWT Authentication

### Test 1: Login & Token Storage

1. Open browser DevTools (F12)
2. Go to Application → Session Storage
3. Open login page: `file:///C:/DueMate/frontend/index.html`
4. Enter credentials:
   - Email: `test@example.com`
   - Password: `password123`
5. Click "Login"

**Expected:**
- ✅ Page redirects to dashboard
- ✅ Session Storage shows `jwtToken` with a long string (the JWT)
- ✅ Dashboard loads without errors

### Test 2: Token Expiry & Auto-Logout

1. Logged into dashboard
2. Open DevTools Console (F12)
3. Run this command to simulate expired token:
```javascript
sessionStorage.setItem('jwtToken', 'invalid.expired.token');
```
4. Click any API button (e.g., "Add Task")

**Expected:**
- ✅ API request fails with 401
- ✅ Session Storage clears
- ✅ Automatically redirects to login page

### Test 3: API Rate Limiting

1. Quickly click "Login" button 6 times in succession
2. After 5th attempt

**Expected:**
- ✅ 6th attempt shows error: "Too many attempts"
- ✅ Rate limit resets after 1 minute

### Test 4: API Request with JWT

1. Open DevTools Network tab (F12)
2. Logged into dashboard
3. Perform any action (e.g., load tasks)

**Expected:**
- ✅ Request headers include `Authorization: Bearer <token>`
- ✅ Backend responds with 200 OK
- ✅ Data loads successfully

---

## ✅ UI Consistency Verification

### All Pages Should Look Identical in Background

#### Visual Checklist (for each page)
- [ ] Light purple/blue gradient background
- [ ] Floating study icons (📚 📝 📅)
- [ ] Animated particles
- [ ] Twinkling stars
- [ ] No visual inconsistencies between pages
- [ ] Smooth animations

#### Pages to Check
1. ✅ Login Page: `index.html`
2. ✅ Dashboard: Redirect after login
3. ✅ Tasks: Click "Tasks" in sidebar
4. ✅ Groups: Click "Groups" in sidebar
5. ✅ Profile: Click profile icon
6. ✅ Settings: Click settings icon
7. ✅ Calendar: Click "Calendar"
8. ✅ Timetable: Click "Timetable"
9. ✅ Subjects: Click "Subjects"

---

## 🐛 Troubleshooting

### Issue: Login page doesn't load
**Solution:**
- Check that backend is running on port 3000
- Check browser console for errors (F12)
- Verify file path is correct

### Issue: Login succeeds but dashboard is blank
**Solution:**
- Check Session Storage for `jwtToken` (F12 → Application)
- Check Network tab for failed requests
- Look for 401 errors (token invalid)

### Issue: "Too many login attempts" error
**Solution:**
- Wait 1 minute for rate limit to reset
- Or clear browser cache and try again

### Issue: API requests failing with 401
**Solution:**
- Token might be expired (7 day limit)
- Logout and login again
- Check Session Storage for valid JWT token

### Issue: Styling looks different on some pages
**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Refresh page (Ctrl+F5)
- Check that app-shell.css is linked in page (view source)

---

## 📊 Current Implementation Status

### Backend Security ✅
- [x] JWT token generation
- [x] JWT token verification (21 endpoints)
- [x] Rate limiting (login: 5/min, general: 100/15min)
- [x] Security headers (Helmet)
- [x] Input validation (Joi)

### Frontend Authentication ✅
- [x] JWT token storage in sessionStorage
- [x] Automatic token inclusion in requests
- [x] Automatic logout on 401 response
- [x] Automatic redirect to login on expiry

### UI Consistency ✅
- [x] All 12 pages have same background
- [x] Login page matches dashboard
- [x] app-shell.css applied globally
- [x] No visual inconsistencies

---

## 🧪 Running Test Suite

To verify JWT authentication works end-to-end:

```bash
cd C:\DueMate
node test-jwt-auth.js
```

**Expected Output:**
```
✓ Test 1: User Registration - PASS
✓ Test 2: User Login - PASS
✓ Test 3: Valid JWT Token Access - PASS
✓ Test 4: Missing Token Rejection - PASS
✓ Test 5: Invalid Token Rejection - PASS

5/5 tests passed ✅
```

---

## 📝 Test Credentials

**Test User 1:**
- Email: `test@example.com`
- Password: `password123`

**Test User 2:**
- Email: `student@example.com`
- Password: `secure123`

---

## 🔑 Important Information

### JWT Token Structure
```
Header.Payload.Signature

Payload contains:
- email: user's email
- exp: expiration timestamp (7 days from login)
- iat: issued at timestamp
```

### Token Storage
- Location: `sessionStorage` (browser-only, cleared on close)
- Key: `jwtToken`
- Sent with: All API requests in `Authorization` header
- Format: `Authorization: Bearer <token>`

### Rate Limiting
- **Login/Register:** 5 attempts per minute per IP
- **General API:** 100 requests per 15 minutes per IP
- **Reset:** Automatically after time window expires

---

## 📞 Quick Reference

| Task | How To |
|------|--------|
| Start Backend | `cd backend && node server.js` |
| Open Frontend | `file:///C:/DueMate/frontend/index.html` |
| Test JWT | Run `node test-jwt-auth.js` |
| View Token | F12 → Application → Session Storage → jwtToken |
| Clear Token | F12 → Application → Session Storage → Delete jwtToken |
| Check Errors | F12 → Console tab |
| Monitor API | F12 → Network tab |
| Reset Rate Limit | Wait 1 minute or close browser |

---

## ✨ What's New in Phase 1

### Security Improvements
- ✅ JWT token-based authentication (was: email-based, vulnerable)
- ✅ Rate limiting on login (was: unlimited attempts)
- ✅ Security headers via Helmet (was: none)
- ✅ Input validation with Joi (was: minimal)
- ✅ Auto-logout on token expiry (was: indefinite sessions)

### UI Improvements
- ✅ Consistent styling across all pages (was: some inconsistencies)
- ✅ Login page matches dashboard (was: different backgrounds)
- ✅ Better error handling with feedback (was: silent failures)

### Documentation
- ✅ JWT_IMPLEMENTATION_SUMMARY.md - Technical guide
- ✅ JWT_IMPLEMENTATION_CHECKLIST.md - Task tracker
- ✅ PHASE_1_COMPLETION_REPORT.md - Status report
- ✅ FINAL_VERIFICATION_REPORT.md - Comprehensive verification
- ✅ QUICK_START_GUIDE.md - This file

---

**Phase 1 Status: ✅ COMPLETE & VERIFIED**

Ready for Phase 2: Database Schema & Features
