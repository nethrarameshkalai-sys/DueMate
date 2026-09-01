# DueMate Deployment Architecture

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          END USER                                     │
└────────────────────────────────────────┬───────────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
          ┌─────────▼──────────┐                 ┌────────────▼────────┐
          │   NETLIFY CDN      │                 │    BROWSER CACHE    │
          │ (Global, Cached)   │                 │   (localStorage)    │
          └─────────┬──────────┘                 └────────────────────┘
                    │
          ┌─────────▼────────────────────┐
          │     NETLIFY FRONTEND         │
          │  https://duemate.netlify.app │
          ├──────────────────────────────┤
          │  • index.html                │
          │  • config.js ← API_BASE      │
          │  • dashboard.html            │
          │  • tasks.html                │
          │  • profile.html              │
          │  • settings.html             │
          │  • calendar.html             │
          │  • groups.html               │
          │  • forgot-password.html      │
          │  • notifications.html        │
          │  • timetable.html            │
          │  • subjects.html             │
          └─────────┬────────────────────┘
                    │
                    │ HTTPS API Calls
                    │ (Uses API_BASE from config.js)
                    │
          ┌─────────▼──────────────────────────┐
          │     BACKEND EXPRESS SERVER         │
          │  (Railway/Heroku/Render)           │
          │  https://your-backend-url          │
          ├────────────────────────────────────┤
          │  Environment Variables:            │
          │  • NODE_ENV=production             │
          │  • PORT=3000                       │
          │  • DB_HOST, DB_USER, DB_PASSWORD   │
          │  • ALLOWED_ORIGINS (Netlify URL)   │
          │  • FRONTEND_URL (for reset links)  │
          │                                    │
          │  Routes:                           │
          │  • POST /api/auth/register         │
          │  • POST /api/auth/login            │
          │  • GET/POST /api/tasks             │
          │  • GET/POST /api/groups            │
          │  • GET /api/user/profile           │
          │  • ... (all other endpoints)       │
          └─────────┬────────────────────────────┘
                    │
                    │ HTTPS Connection
                    │ (SSL Enabled)
                    │
          ┌─────────▼──────────────────────────┐
          │      CLOUD MYSQL DATABASE          │
          │  (PlanetScale/Railway/AWS/GCP)     │
          ├────────────────────────────────────┤
          │  Tables:                           │
          │  • users (with hashed passwords)   │
          │  • tasks (user tasks)              │
          │  • groups (group management)       │
          │  • group_members (group users)     │
          │  • group_join_requests (invites)   │
          │  • group_rules (group settings)    │
          │  • group_challenges (gamification) │
          │  • group_game_results (scores)     │
          └────────────────────────────────────┘
```

---

## Request Flow Example: User Login

```
1. USER
   └─► Browser opens https://duemate.netlify.app

2. NETLIFY FRONTEND
   ├─► Loads index.html
   ├─► Executes config.js
   │   └─► Sets window.API_BASE = "https://your-backend-url"
   ├─► User clicks "Login"
   └─► User enters email & password

3. FRONTEND JAVASCRIPT
   └─► fetch(`${window.API_BASE}/api/auth/login`, {
       ├─► method: "POST"
       ├─► body: {email: "user@example.com", password: "hash"}
       └─► ... sends to backend

4. NETLIFY CDN
   └─► HTTPS request crosses internet to backend

5. BACKEND CORS CHECK
   ├─► Receives request from https://duemate.netlify.app
   ├─► Checks ALLOWED_ORIGINS env variable
   ├─► Matches! Allows request
   └─► Proceeds with login logic

6. BACKEND AUTH LOGIC
   ├─► Receives credentials
   ├─► Queries database for user
   └─► Validates password hash

7. MYSQL DATABASE
   ├─► Query: SELECT * FROM users WHERE email = 'user@example.com'
   ├─► Returns user record
   └─► Backend checks password match

8. BACKEND RESPONSE
   ├─► Generates JWT token
   ├─► Returns: {success: true, token: "eyJhbGc...", user: {...}}
   └─► Sets CORS headers

9. BROWSER RECEIVES
   ├─► Parses JSON response
   ├─► Stores token in localStorage
   ├─► Stores user data in sessionStorage
   └─► Redirects to dashboard.html

10. DASHBOARD LOADS
    ├─► dashboard.html loads config.js
    ├─► Reads JWT token from localStorage
    ├─► Fetches tasks: GET /api/tasks?user_email=...
    ├─► Backend validates token & returns user tasks
    └─► Dashboard renders task list
```

---

## Environment Variable Flow

```
Local Development
├─► frontend/config.js detects localhost
│   └─► API_BASE = "http://localhost:5000"
├─► backend/.env (manual or auto-loaded)
│   ├─► DB_HOST="localhost"
│   └─► NODE_ENV="development"
└─► Works locally without .env file

Production Deployment
├─► Netlify Frontend
│   └─► frontend/config.js detects non-localhost
│       └─► API_BASE = "https://your-backend-url"
├─► Backend Hosting (Railway/Heroku)
│   ├─► Environment Variables (from dashboard)
│   │   ├─► DB_HOST="db.planetscale.com"
│   │   ├─► DB_PASSWORD="pscale_pw_xxx"
│   │   ├─► ALLOWED_ORIGINS="https://duemate.netlify.app"
│   │   └─► NODE_ENV="production"
│   └─► Starts with process.env variables
└─► Works in production without .env file
```

---

## Security Perimeter

```
┌────────────────────────────────────────────────────────────────┐
│                        PUBLIC INTERNET                         │
├────────────────────────────────────────────────────────────────┤
│  HTTPS Only                                                    │
│  └─► User Browser ←→ Netlify CDN ←→ Backend Server           │
└────────────────────────────────────────────────────────────────┘
                            ▲
                    CORS Check Here
                    (ALLOWED_ORIGINS)
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                    SECURE PERIMETER                            │
├────────────────────────────────────────────────────────────────┤
│  Backend Server                                                │
│  ├─► Environment Variables (NOT in code)                      │
│  │   ├─► DB Credentials                                       │
│  │   └─► ALLOWED_ORIGINS                                      │
│  │                                                             │
│  └─► Database Connection (SSL/TLS)                            │
│      └─► Credentials from env vars (NOT hardcoded)           │
└────────────────────────────────────────────────────────────────┘
```

---

## File Structure for Deployment

```
DueMate/
├── frontend/                    (Deployed to Netlify)
│   ├── config.js               ← Single config file for all pages
│   ├── index.html              ← Includes config.js
│   ├── register.html
│   ├── dashboard.html
│   ├── tasks.html
│   ├── profile.html
│   ├── settings.html
│   ├── calendar.html
│   ├── groups.html
│   ├── forgot-password.html
│   ├── notifications.html
│   ├── timetable.html
│   ├── subjects.html
│   ├── css/                    ← Styling
│   └── assets/                 ← Images, fonts
│
├── backend/                     (Deployed to Railway/Heroku)
│   ├── server.js               ← Main Express app
│   ├── package.json            ← Dependencies
│   ├── Procfile                ← Deployment config
│   ├── .env                    ← NEVER commit (in .gitignore)
│   ├── .env.example            ← Template (commit to Git)
│   ├── config/
│   │   └── db.js               ← Database connection (env vars)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tasks.js
│   │   ├── groups.js
│   │   └── users.js
│   └── controllers/            ← Business logic
│
├── .gitignore                  ← Excludes .env files
├── netlify.toml               ← Netlify configuration
├── DEPLOYMENT_FINAL_SUMMARY.md ← This file (complete reference)
├── DEPLOYMENT_CHECKLIST.md    ← Quick checklist
├── DEPLOYMENT_GUIDE.md        ← Detailed guide
├── QUICK_START.md             ← One-page reference
├── GIT_COMMITS.md             ← Commit history template
└── duemate_fixed.sql          ← Database schema to import
```

---

## Deployment Verification Points

```
✅ Infrastructure Level
   ├─► Netlify CDN responds to requests
   ├─► Backend server responds to health check
   ├─► Database accepts connections
   └─► SSL certificates valid

✅ Configuration Level
   ├─► frontend/config.js has correct backend URL
   ├─► Backend has all env variables set
   ├─► Database connection string correct
   └─► CORS allows frontend domain

✅ Application Level
   ├─► Can register new user
   ├─► Can login with credentials
   ├─► JWT token stored in localStorage
   ├─► API calls include Authorization header
   └─► Database queries return correct data

✅ Feature Level
   ├─► Tasks CRUD works
   ├─► Groups management works
   ├─► User profile updates work
   ├─► Password reset emails work
   └─► All pages load without errors

✅ Security Level
   ├─► No hardcoded secrets in code
   ├─► All credentials in env variables
   ├─► HTTPS enforced
   ├─► Database SSL enabled
   └─► CORS restricted to frontend domain
```

---

## Troubleshooting Decision Tree

```
Problem: "Cannot connect to backend"
├─► Check: Is backend URL correct in frontend/config.js?
│   ├─► No → Update config.js and redeploy frontend
│   └─► Yes → Continue
├─► Check: Is backend server running?
│   ├─► No → Start backend deployment
│   └─► Yes → Continue
├─► Check: Is CORS configured correctly?
│   ├─► No → Update ALLOWED_ORIGINS in backend env vars
│   └─► Yes → Continue
└─► Check: Are there CORS errors in browser console?
    └─► Yes → See CORS troubleshooting section

Problem: "Cannot login"
├─► Check: Are you getting a response from /api/auth/login?
│   ├─► No → See "Cannot connect to backend" above
│   └─► Yes → Continue
├─► Check: Does users table exist in database?
│   └─► Verify: mysql -h HOST -u USER -p duemate -e "SHOW TABLES;"
├─► Check: Have you registered a user?
│   └─► Try: /api/auth/register first
└─► Check: Backend logs for error details
    └─► Login to backend hosting dashboard and check logs

Problem: "Database won't connect"
├─► Check: Database host is accessible
│   └─► Test: mysql -h HOST -u USER -p
├─► Check: Credentials are correct
│   └─► Verify: DB_HOST, DB_USER, DB_PASSWORD in env vars
├─► Check: Database is created
│   └─► Verify: mysql -u USER -p -e "SHOW DATABASES;"
└─► Check: Schema is imported
    └─► Verify: mysql -u USER -p duemate -e "SHOW TABLES;"
```

---

## Success Indicators

### Frontend Ready ✅
- Page loads at Netlify URL
- No console errors (F12 → Console)
- Can see login form
- Network requests show correct backend URL

### Backend Ready ✅
- Health check succeeds: `curl https://backend-url/`
- Logs show "MySQL connected successfully"
- Can query database
- No error messages in logs

### Database Ready ✅
- Can connect: `mysql -h HOST -u USER -p`
- Database exists: `SHOW DATABASES;`
- Tables exist: `USE duemate; SHOW TABLES;`
- Data can be queried: `SELECT * FROM users;`

### Full Stack Ready ✅
- User can register (data in database)
- User can login (token generated)
- Tasks appear after login
- Groups can be created
- All pages accessible
- No errors anywhere

---

**Architecture Version:** 1.0.0  
**Last Updated:** September 1, 2026  
**Status:** Deployment Ready
