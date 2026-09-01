# DueMate Deployment Guide

## Project Structure
- **frontend/** - Static HTML/CSS/JavaScript site (deploy to Netlify)
- **backend/** - Node.js + Express server (deploy to Heroku/Railway/Render)
- **Database** - MySQL (cloud-hosted)

---

## PHASE 1: PREPARE DATABASE

### Option A: Using PlanetScale (Recommended - Free tier available)
1. Sign up: https://planetscale.com
2. Create a new database called "duemate"
3. Go to "Passwords" tab and create a new password
4. Copy the connection string (looks like: `mysql://user:password@host`)
5. Extract: `DB_HOST`, `DB_USER`, `DB_PASSWORD`

### Option B: Using Railway.app
1. Sign up: https://railway.app
2. Create a new MySQL database
3. Copy connection details from the database settings
4. Extract: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`

### Option C: Using AWS RDS
1. Go to AWS Console → RDS
2. Create a new MySQL database
3. Get endpoint, username, password, and database name
4. Ensure publicly accessible is enabled

### Option D: Using Google Cloud SQL
1. Go to Google Cloud Console
2. Create a new MySQL instance
3. Get public IP, username, password, and database name
4. Ensure authorized networks include your deployment server

### Import Database Schema
Once you have database connection details:

```bash
# Using mysql client command line:
mysql -h DB_HOST -u DB_USER -p DB_PASSWORD -D duemate < duemate_fixed.sql

# Or using your hosting provider's web interface/CLI
# Most providers have an "Import SQL" option in their dashboard
```

---

## PHASE 2: DEPLOY BACKEND

### Option A: Deploy to Railway.app (Easiest)
1. Sign up: https://railway.app
2. Connect GitHub account
3. Select your DueMate repository
4. Create a new "Node.js" service
5. In Variables tab, add:
   ```
   NODE_ENV=production
   PORT=3000
   DB_HOST=<your-planetscale-host>
   DB_PORT=3306
   DB_USER=<your-db-user>
   DB_PASSWORD=<your-db-password>
   DB_NAME=duemate
   DB_SSL=true
   ALLOWED_ORIGINS=https://your-frontend-domain.netlify.app
   ```
6. Deploy from `backend/` directory
7. Get the public URL (e.g., https://duemate-prod.up.railway.app)

### Option B: Deploy to Heroku
1. Sign up: https://heroku.com
2. Install Heroku CLI
3. Run:
   ```bash
   cd backend
   heroku login
   heroku create duemate-backend
   heroku config:set NODE_ENV=production
   heroku config:set DB_HOST=<your-host>
   heroku config:set DB_PORT=3306
   heroku config:set DB_USER=<your-user>
   heroku config:set DB_PASSWORD=<your-password>
   heroku config:set DB_NAME=duemate
   heroku config:set DB_SSL=true
   heroku config:set ALLOWED_ORIGINS=https://your-frontend-domain.netlify.app
   git push heroku main
   ```
4. Get the URL from: `heroku domains` or check dashboard

### Option C: Deploy to Render.com
1. Sign up: https://render.com
2. Create new "Web Service"
3. Connect GitHub repository
4. Set Root Directory to `backend`
5. Set Start Command to `npm start`
6. Add environment variables (same as Railway)
7. Deploy
8. Get public URL from dashboard

### Verify Backend Deployment
```bash
# Test the health check
curl https://your-backend-url.com

# Should return:
# {"success":true,"message":"DueMate Backend is Running!"}
```

---

## PHASE 3: DEPLOY FRONTEND

### Step 1: Update config.js
1. Edit `frontend/config.js`
2. Replace `'https://your-backend-domain.com'` with your actual backend URL from PHASE 2:
   ```javascript
   window.API_BASE = isProduction 
       ? 'https://your-backend-url.com'  // Add your actual URL here
       : 'http://localhost:5000';
   ```

### Step 2: Deploy to Netlify
1. Sign up/Login: https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select your GitHub repository
4. Configure:
   - **Build Command:** (leave empty - no build needed)
   - **Publish Directory:** `frontend`
5. Deploy
6. Get your domain (e.g., https://duemate.netlify.app)

### Step 3: Update Backend CORS
1. Go to your backend hosting dashboard
2. Update environment variable:
   ```
   ALLOWED_ORIGINS=https://duemate.netlify.app
   ```
   (Replace with your actual Netlify domain)
3. Redeploy backend if required

### Verify Frontend Deployment
1. Open https://duemate.netlify.app in browser
2. Try logging in with test credentials
3. Verify dashboard loads
4. Check browser console (F12) for any API errors

---

## PHASE 4: POST-DEPLOYMENT VERIFICATION

### Test Login Flow
```bash
# Email: nethrarameshkalai@gmail.com
# Password: rkn@2008
```

### Test APIs
```bash
# Test registration
curl -X POST https://your-backend-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test@1234","mobile":"1234567890","college":"Test College","department":"CSE","course":"BTech","year":"1"}'

# Test login
curl -X POST https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nethrarameshkalai@gmail.com","password":"rkn@2008"}'
```

---

## ENVIRONMENT VARIABLES SUMMARY

### Backend (.env file)
```
NODE_ENV=production
PORT=3000
DB_HOST=<from database provider>
DB_PORT=3306
DB_USER=<from database provider>
DB_PASSWORD=<from database provider>
DB_NAME=duemate
DB_SSL=true
ALLOWED_ORIGINS=https://your-frontend-domain.netlify.app
```

### Frontend (frontend/config.js)
```javascript
window.API_BASE = 'https://your-backend-url.com'
```

---

## TROUBLESHOOTING

### Frontend can't connect to backend
1. Check CORS settings: `ALLOWED_ORIGINS` must include frontend domain
2. Verify backend URL in `frontend/config.js`
3. Check backend is running: visit backend URL in browser
4. Check browser console (F12) for specific errors

### Database connection error
1. Verify `DB_HOST`, `DB_USER`, `DB_PASSWORD` are correct
2. Ensure database is publicly accessible (for cloud databases)
3. Check database firewall rules allow your backend server IP
4. Verify `DB_NAME=duemate` is the correct database

### Login fails
1. Verify database was imported correctly: `mysql -h HOST -u USER -p PASSWORD -D duemate -e "SHOW TABLES;"`
2. Should show: `users`, `tasks`, `groups`, `group_members`, `group_join_requests`, `group_rules`, `group_challenges`, `group_game_results`
3. Check backend logs for error messages

### Deployment didn't update
1. Clear browser cache (Ctrl+Shift+Del)
2. Hard refresh (Ctrl+F5)
3. For Netlify: trigger manual redeploy from dashboard
4. For backend: redeploy with new environment variables

---

## DOMAIN MANAGEMENT (Optional)

### Connect Custom Domain to Netlify
1. In Netlify dashboard → Domain management
2. Add custom domain
3. Update DNS records to point to Netlify
4. Enable auto SSL certificate

### Connect Custom Domain to Backend
1. In backend hosting provider dashboard
2. Add domain
3. Configure DNS records
4. Enable SSL certificate

---

## MAINTENANCE

### Database Backups
- PlanetScale: Automatic daily backups
- Railway/Heroku: Configure backup settings in dashboard
- RDS/Cloud SQL: Enable automated backups in settings

### Monitoring
- Set up error monitoring (Sentry, Rollbar)
- Monitor backend logs regularly
- Monitor database performance

### Updates
- Keep Node.js and dependencies updated
- Regularly update security patches
- Test updates in staging before production

---

## FINAL CHECKLIST

- [ ] Database created and schema imported
- [ ] Backend deployed and environment variables set
- [ ] Frontend deployed with correct backend URL
- [ ] CORS configured correctly
- [ ] Login tested successfully
- [ ] Tasks, groups, and other features working
- [ ] SSL certificates installed
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Documentation updated

---

## Support Resources

- **Netlify Docs:** https://docs.netlify.com
- **Railway Docs:** https://docs.railway.app
- **Heroku Docs:** https://devcenter.heroku.com
- **MySQL Docs:** https://dev.mysql.com/doc
- **Express.js Docs:** https://expressjs.com/en/api.html
