# DueMate Deployment Checklist & Quick Reference

## 📋 FILES CHANGED FOR DEPLOYMENT

### Frontend Changes
- ✅ `frontend/config.js` - NEW: Centralized API configuration
- ✅ `frontend/index.html` - Added config.js, updated API_BASE
- ✅ `frontend/register.html` - Added config.js, updated API_BASE_URL
- ✅ `frontend/dashboard.html` - Added config.js, updated API call
- ✅ `frontend/tasks.html` - Added config.js, updated API_BASE
- ✅ `frontend/profile.html` - Added config.js, updated API calls
- ✅ `frontend/settings.html` - Added config.js, updated API call
- ✅ `frontend/calendar.html` - Added config.js, updated API_BASE
- ✅ `frontend/groups.html` - Added config.js, updated GROUPS_API
- ✅ `frontend/forgot-password.html` - Added config.js, updated API_BASE_URL
- ✅ `frontend/notifications.html` - Added config.js
- ✅ `frontend/timetable.html` - Added config.js
- ✅ `frontend/subjects.html` - Added config.js

### Backend Changes
- ✅ `backend/server.js` - Updated CORS configuration, removed hardcoded localhost
- ✅ `backend/config/db.js` - Removed hardcoded password, updated error handling
- ✅ `backend/package.json` - Added description, engines, improved metadata
- ✅ `backend/.env.example` - NEW: Environment variables template
- ✅ `backend/Procfile` - NEW: Deployment configuration for Heroku/Railway

### Root Level Changes
- ✅ `netlify.toml` - NEW: Netlify deployment configuration
- ✅ `.gitignore` - Updated to exclude .env files
- ✅ `DEPLOYMENT_GUIDE.md` - NEW: Comprehensive deployment instructions

---

## 🚀 DEPLOYMENT ORDER (DO THIS IN SEQUENCE)

### STEP 1: Prepare Infrastructure
1. **Sign up for services:**
   - Database: PlanetScale (https://planetscale.com) OR Railway.app OR AWS RDS OR Google Cloud SQL
   - Backend: Railway.app OR Heroku OR Render.com
   - Frontend: Netlify (https://netlify.com)

2. **Create Database:**
   - Create MySQL database named `duemate`
   - Get connection credentials: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
   - Enable public access if needed

3. **Import Database Schema:**
   ```bash
   mysql -h YOUR_DB_HOST -u YOUR_DB_USER -p YOUR_DB_PASSWORD -D duemate < duemate_fixed.sql
   ```

### STEP 2: Deploy Backend
1. **Choose hosting:** Railway.app (recommended), Heroku, or Render
2. **Connect GitHub repository**
3. **Set environment variables:**
   ```
   NODE_ENV=production
   PORT=3000
   DB_HOST=<your-host>
   DB_PORT=3306
   DB_USER=<your-user>
   DB_PASSWORD=<your-password>
   DB_NAME=duemate
   DB_SSL=true
   ALLOWED_ORIGINS=https://your-netlify-domain.netlify.app
   FRONTEND_URL=https://your-netlify-domain.netlify.app
   ```
4. **Deploy from `backend/` directory**
5. **Get backend URL:** (e.g., https://duemate-prod.up.railway.app)
6. **Test health check:** `curl https://your-backend-url/`

### STEP 3: Update Frontend Configuration
1. **Edit `frontend/config.js`:**
   ```javascript
   window.API_BASE = isProduction 
       ? 'https://your-backend-url'  // ← UPDATE THIS
       : 'http://localhost:5000';
   ```
   Replace `your-backend-url` with actual backend URL from Step 2

2. **Commit changes:**
   ```bash
   git add frontend/config.js
   git commit -m "Update backend URL for production deployment"
   git push origin main
   ```

### STEP 4: Deploy Frontend
1. **Sign in to Netlify:** https://app.netlify.com
2. **Click "Add new site" → "Import an existing project"**
3. **Select GitHub repository**
4. **Configure settings:**
   - Build command: (leave empty)
   - Publish directory: `frontend`
   - Base directory: (leave empty)
5. **Deploy**
6. **Get Netlify domain:** (e.g., https://duemate.netlify.app)

### STEP 5: Update Backend CORS
1. **Go to backend hosting dashboard**
2. **Update environment variable:**
   ```
   ALLOWED_ORIGINS=https://your-netlify-domain.netlify.app
   ```
   (Replace with actual Netlify domain from Step 4)
3. **Redeploy/restart backend**

### STEP 6: Verification Tests
1. **Frontend:**
   - Open https://your-netlify-domain.netlify.app
   - Check browser console (F12) for errors
   - Try login with test credentials

2. **Backend:**
   - Test: `curl https://your-backend-url/`
   - Should show: `{"success":true,"message":"DueMate Backend is Running!"}`

3. **Full flow:**
   - Try registering new user
   - Try logging in
   - Try creating task
   - Try joining/creating group

---

## 📝 ENVIRONMENT VARIABLES

### Backend (.env)
```
# Server
NODE_ENV=production
PORT=3000

# Database
DB_HOST=<from your database provider>
DB_PORT=3306
DB_USER=<from your database provider>
DB_PASSWORD=<from your database provider>
DB_NAME=duemate
DB_SSL=true

# CORS
ALLOWED_ORIGINS=https://your-frontend-url.netlify.app

# Frontend (for password reset links)
FRONTEND_URL=https://your-frontend-url.netlify.app
```

### Frontend (frontend/config.js)
```javascript
window.API_BASE = isProduction 
    ? 'https://your-backend-url'  // Update this line
    : 'http://localhost:5000';
```

---

## 🔗 NETLIFY CONFIGURATION

File: `netlify.toml`
- Publish directory: `frontend`
- No build command needed (static site)
- Redirects all routes to index.html for SPA routing

---

## 🖥️ BACKEND DEPLOYMENT

File: `backend/Procfile`
- Command: `web: node server.js`
- Node version: >=16.0.0
- Runs on port specified by `PORT` environment variable

---

## 🗄️ DATABASE SETUP

### SQL File to Import
- Use: `duemate_fixed.sql` (correct schema)
- Tables created automatically:
  - `users`
  - `tasks`
  - `groups`
  - `group_members`
  - `group_join_requests`
  - `group_rules`
  - `group_challenges`
  - `group_game_results`

### Cloud Database Options
1. **PlanetScale** (MySQL-compatible, free tier) - RECOMMENDED
2. **Railway.app** (Full stack, easy setup)
3. **AWS RDS MySQL** (Enterprise)
4. **Google Cloud SQL** (Enterprise)
5. **Azure Database for MySQL** (Enterprise)

---

## ✅ FINAL CHECKLIST

- [ ] Database created and schema imported
- [ ] Backend deployed with all env variables set
- [ ] Frontend deployed with correct backend URL in config.js
- [ ] CORS configured in backend (ALLOWED_ORIGINS)
- [ ] SSL certificates enabled (automatic on Netlify)
- [ ] Health check passes: `curl https://your-backend-url/`
- [ ] Login works with test credentials
- [ ] Tasks can be created and deleted
- [ ] Groups functionality works
- [ ] Profile and settings accessible
- [ ] No console errors in browser
- [ ] Responsive design works on mobile
- [ ] Database backups configured
- [ ] Monitoring/logging configured

---

## 🐛 TROUBLESHOOTING

### "Cannot connect to backend"
- Check frontend `config.js` has correct backend URL
- Check `ALLOWED_ORIGINS` in backend includes frontend URL
- Verify backend is running: `curl https://backend-url/`

### "Database connection failed"
- Verify all `DB_*` environment variables are correct
- Check database is publicly accessible (for cloud databases)
- Verify SQL schema was imported: `SHOW TABLES;`

### "Login returns 500 error"
- Check backend logs for error message
- Verify `users` table exists in database
- Ensure database connection is working

### "Forgot password link doesn't work"
- Check `FRONTEND_URL` environment variable is set
- Link should point to frontend domain + `/forgot-password.html?token=...`

### "Changes not appearing after deployment"
- Hard refresh frontend (Ctrl+Shift+Del then Ctrl+F5)
- Check git changes were committed and pushed
- Trigger manual deploy in Netlify dashboard
- Clear Netlify cache and redeploy

---

## 📚 DOCUMENTATION

- Full guide: `DEPLOYMENT_GUIDE.md`
- API endpoints: Check `backend/server.js`
- Frontend structure: All pages in `frontend/`
- Database schema: `duemate_fixed.sql`

---

## 🔐 SECURITY CHECKLIST

- [ ] .env file is in .gitignore
- [ ] No credentials in GitHub
- [ ] CORS is restricted to your domain
- [ ] Passwords are hashed with bcrypt
- [ ] Database uses SSL connection (DB_SSL=true)
- [ ] Frontend uses HTTPS (automatic on Netlify)
- [ ] Backend uses HTTPS (automatic on hosting platforms)
- [ ] Reset password tokens expire (15 minutes)

---

## 📊 MONITORING & MAINTENANCE

### Set Up Alerts For:
- Backend deployment failures
- Database connection errors
- High error rates
- Slow response times

### Regular Maintenance:
- Check backend logs weekly
- Monitor database size
- Verify backups are working
- Update dependencies monthly
- Review CORS settings periodically

---

## 🎯 SUCCESS CRITERIA

✅ Frontend loads without errors  
✅ Can register new user  
✅ Can login with credentials  
✅ Dashboard shows correct user data  
✅ Can create/edit/delete tasks  
✅ Can create/join groups  
✅ Can update profile  
✅ Can change theme  
✅ Can reset password  
✅ API calls show correct backend URL  
✅ No console errors in browser  

---

## 📞 SUPPORT

For issues:
1. Check browser console (F12) for frontend errors
2. Check backend logs in hosting dashboard
3. Verify environment variables are set correctly
4. Test API manually: `curl https://backend-url/api/auth/login`
5. Review DEPLOYMENT_GUIDE.md for detailed instructions

---

**Date Created:** 2026-09-01  
**Status:** Ready for deployment  
**Version:** 1.0.0  
