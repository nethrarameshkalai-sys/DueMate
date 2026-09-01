# DueMate - Deployment Quick Start

## 📦 ALL FILES CHANGED

### Frontend (13 files)
```
✅ frontend/config.js (NEW) - API configuration hub
✅ frontend/index.html - Uses config.js
✅ frontend/register.html - Uses config.js
✅ frontend/dashboard.html - Uses config.js
✅ frontend/tasks.html - Uses config.js
✅ frontend/profile.html - Uses config.js
✅ frontend/settings.html - Uses config.js
✅ frontend/calendar.html - Uses config.js
✅ frontend/groups.html - Uses config.js
✅ frontend/forgot-password.html - Uses config.js
✅ frontend/notifications.html - Uses config.js
✅ frontend/timetable.html - Uses config.js
✅ frontend/subjects.html - Uses config.js
```

### Backend (4 files)
```
✅ backend/server.js - Production CORS config
✅ backend/config/db.js - Removed hardcoded password
✅ backend/package.json - Added metadata & Node version
✅ backend/.env.example (NEW) - Environment template
✅ backend/Procfile (NEW) - Deployment config
```

### Root (3 files)
```
✅ netlify.toml (NEW) - Netlify configuration
✅ .gitignore - Updated for .env security
✅ DEPLOYMENT_GUIDE.md (existing) - Full instructions
✅ DEPLOYMENT_CHECKLIST.md (NEW) - Quick checklist
```

---

## 🎯 DEPLOYMENT SETTINGS

### Netlify Frontend
```
Repository: Your GitHub repo
Build command: (leave blank)
Publish directory: frontend
```

### Backend (Railway/Heroku/Render)
```
Repository: Your GitHub repo
Root directory: backend
Node version: >=16.0.0
Command: node server.js
```

### Environment Variables (Backend)
```
NODE_ENV = production
PORT = 3000
DB_HOST = (from your database)
DB_PORT = 3306
DB_USER = (from your database)
DB_PASSWORD = (from your database)
DB_NAME = duemate
DB_SSL = true
ALLOWED_ORIGINS = https://your-netlify-domain.netlify.app
FRONTEND_URL = https://your-netlify-domain.netlify.app
```

### Environment Variables (Frontend)
```
Edit frontend/config.js line 12:
window.API_BASE = 'https://your-backend-url'
```

---

## 🚀 DEPLOYMENT SEQUENCE

1. **Setup Database** → Get credentials
2. **Deploy Backend** → Get backend URL
3. **Update frontend/config.js** → Set backend URL
4. **Deploy Frontend** → Get Netlify URL
5. **Update Backend CORS** → Set ALLOWED_ORIGINS & FRONTEND_URL
6. **Test & Verify** → Login, tasks, groups all work

---

## 🗄️ DATABASE SETUP

Import `duemate_fixed.sql` to your cloud database:
```bash
mysql -h DB_HOST -u DB_USER -p < duemate_fixed.sql
```

Tables created automatically:
- users, tasks, groups, group_members, group_join_requests
- group_rules, group_challenges, group_game_results

---

## ✅ TESTING CHECKLIST

```
□ Frontend loads without errors
□ Can register new user
□ Can login
□ Dashboard displays user data
□ Can create tasks
□ Can create groups
□ Can join groups
□ Can edit profile
□ Theme switching works
□ Password reset works
□ No console errors
□ Responsive on mobile
```

---

## 🔒 SECURITY

- ✅ No hardcoded credentials
- ✅ All secrets via environment variables
- ✅ .env files in .gitignore
- ✅ CORS restricted to frontend domain
- ✅ SSL enabled on both frontend & backend
- ✅ Password reset tokens expire after 15 minutes

---

## 📞 IF SOMETHING BREAKS

1. Check browser console (F12)
2. Check backend logs
3. Verify env variables
4. Test API: `curl https://backend-url/`
5. Verify database connection
6. Review DEPLOYMENT_GUIDE.md

---

## 🎓 UNDERSTANDING THE SETUP

**Why centralized config.js?**
- Single point to change API URL for all 12 frontend pages
- Auto-detects development vs production
- No need to edit each HTML file individually

**Why environment variables?**
- Keep secrets out of GitHub
- Different settings per environment (dev/prod)
- Easy to update without code changes

**Why Netlify + Backend + MySQL?**
- Frontend: Static hosting (cheap, fast, global CDN)
- Backend: Node.js (flexible, handles business logic)
- Database: MySQL (reliable, scalable, widely supported)

---

**Status:** ✅ Deployment Ready  
**Last Updated:** September 1, 2026  
**Next Step:** Follow DEPLOYMENT_CHECKLIST.md
