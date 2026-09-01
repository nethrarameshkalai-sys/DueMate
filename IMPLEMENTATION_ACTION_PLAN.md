# DueMate - Master Implementation Action Plan

**Based on Complete Audit Findings**  
**Date:** September 2, 2026  
**Overall Completion:** 12% (61 of 74 requirements missing/broken)  
**Audit Severity:** ⚠️ CRITICAL SECURITY ISSUES FOUND

---

## 🎯 CRITICAL ISSUES TO FIX FIRST

### 🔴 ISSUE #1: Email-Based Authentication (HIGH RISK)
**Severity:** CRITICAL  
**Impact:** Any user can access any other user's data  
**Proof:** GET /api/tasks?user_email=otheruser@gmail.com → Returns other user's tasks

**What's Wrong:**
- Backend trusts `user_email` parameter from client (request)
- Client controls identity, not server
- No session/token validation

**Files to Fix:**
- backend/server.js (ALL endpoints that take user_email)
- All frontend files (must stop sending user_email in requests)

**Fix Strategy:**
- Implement JWT token system
- Replace email-based auth with token-based auth
- Use HTTP-only cookies for tokens
- Validate token on backend for every request

**Effort:** 8-10 hours

---

### 🔴 ISSUE #2: Weak Authorization on Group Updates
**Severity:** CRITICAL  
**Impact:** Any user can modify any group  
**Location:** server.js Lines 1266-1287

**What's Wrong:**
```javascript
const ownerEmail = String(req.body.user_email || "").trim().toLowerCase();
// ^ Trusts ownerEmail from request body!
db.query(`UPDATE groups SET ... WHERE id = ? AND owner_email = ?`);
```

**Fix:** Check ownership from session/token, not request body

**Effort:** 1 hour per endpoint (12 group endpoints)

---

### 🔴 ISSUE #3: No Rate Limiting
**Severity:** CRITICAL  
**Impact:** Brute force attacks, DoS vulnerable

**Fix:**
```bash
npm install express-rate-limit
```
Add rate limiting to:
- /api/auth/login (5 attempts/minute)
- /api/auth/register (10/minute)
- All other endpoints (100/minute per user)

**Effort:** 30 minutes

---

### 🟡 ISSUE #4: No Input Validation
**Severity:** HIGH  
**Impact:** SQL injection possible (though parameterized queries help)

**Fix:**
```bash
npm install joi
```

Validate all request bodies in:
- All POST endpoints
- All PUT endpoints
- All PATCH endpoints

**Effort:** 2 hours

---

## ✅ WHAT'S ALREADY WORKING

1. ✅ Group creation & management (7/8 features)
2. ✅ Task creation & management
3. ✅ Dark theme styling
4. ✅ User authentication (though email-based, not token-based)
5. ✅ Database structure for groups/tasks

---

## ⚙️ PRIORITY IMPLEMENTATION ORDER

### **PHASE 1: SECURITY (2-3 hours)**
[ ] Add rate limiting (express-rate-limit)  
[ ] Add helmet for security headers  
[ ] Add CORS validation  
[ ] Add input validation (joi)  

### **PHASE 2: AUTHENTICATION OVERHAUL (8-10 hours)**
[ ] Implement JWT token system  
[ ] Replace email-based auth with tokens  
[ ] Update all endpoints to use tokens  
[ ] Add session management  

### **PHASE 3: NOTIFICATIONS (12-15 hours)**
[ ] Create `notifications` table  
[ ] Create /api/notifications endpoints  
[ ] Implement task reminders (Due Tomorrow/Today/Overdue)  
[ ] Add notification bell to frontend  
[ ] Add notification sound  

### **PHASE 4: FILE UPLOAD (10-12 hours)**
[ ] Install multer  
[ ] Create `files` table  
[ ] Create /api/upload endpoint  
[ ] Implement group file upload  
[ ] Add file authorization checks  
[ ] Create /api/files/:id endpoint  

### **PHASE 5: SUBJECT NOTES (8-10 hours)**
[ ] Create `subjects` table  
[ ] Create `notes` table  
[ ] Implement subjects management API  
[ ] Implement notes CRUD API  
[ ] Update subjects.html UI  
[ ] Add file upload to subjects  

### **PHASE 6: GAMES (20-30 hours)**
[ ] Implement 9 playable games  
[ ] Store game scores  
[ ] Add leaderboard display  

### **PHASE 7: LANGUAGE/TAMIL (8-10 hours)**
[ ] Install i18next  
[ ] Create translation files  
[ ] Implement language switching  
[ ] Add Tamil translations  

### **PHASE 8: UI FIXES (2-3 hours)**
[ ] Fix calendar icon display (non-Dashboard pages should show icon-only)  
[ ] Fix remaining Settings options  

---

## 🔧 SPECIFIC FILES TO MODIFY

### **Backend (server.js)**
- Line 1206-1480: Fix task endpoints (email → token auth)
- Lines 1206-1453: Fix group endpoints (email → token auth)
- Lines 672, 752, 905, 1026: Update auth endpoints
- Add new endpoints:
  - /api/notifications (GET, POST, PATCH, DELETE)
  - /api/upload (POST)
  - /api/files/:id (GET, DELETE)
  - /api/subjects/* (full CRUD)
  - /api/subjects/:id/notes* (full CRUD)
  - /api/user/language (POST)

### **Database (config/db.js)**
- Add table creation for:
  - notifications
  - subjects
  - notes
  - files

### **Frontend HTML Files**
- All 12 files: Replace email-based API calls with token-based
- settings.html: Fix Language, Start Page, Compact, Task Reminders, Deadline Alerts, Group Notifications, Daily Summary, Profile Visibility options
- groups.html: Add group file upload UI
- subjects.html: Add notes UI
- notifications.html: Add real notification display

---

## 📊 CURRENT STATE VS NEEDED STATE

| Feature | Current | Needed | Gap |
|---------|---------|--------|-----|
| **Authentication** | Email-based | JWT tokens | Critical |
| **Notifications** | None | Full system | Major |
| **File Upload** | None | Full system | Major |
| **Subject Notes** | UI only | Fully functional | Major |
| **Games** | 0 of 9 | All 9 playable | Major |
| **Language** | UI only | Tamil + English | Minor |
| **Settings** | 1/9 working | 9/9 working | Minor |
| **Calendar Icon** | Inconsistent | Consistent | Trivial |
| **Rate Limiting** | None | Present | Major |
| **Input Validation** | Basic | Comprehensive | Minor |

---

## 📈 ESTIMATED TIMELINE

- **Phase 1 (Security):** 2-3 hours
- **Phase 2 (Auth):** 8-10 hours
- **Phase 3 (Notifications):** 12-15 hours
- **Phase 4 (Files):** 10-12 hours
- **Phase 5 (Subject Notes):** 8-10 hours
- **Phase 6 (Games):** 20-30 hours
- **Phase 7 (Language):** 8-10 hours
- **Phase 8 (UI Fixes):** 2-3 hours
- **Testing:** 5-8 hours

**Total:** ~75-110 hours (~2-3 weeks of full-time work)

---

## 🚨 HIGH-PRIORITY MUST-FIX TODAY

1. ✅ Add rate limiting (prevents brute force)
2. ✅ Add helmet (security headers)
3. ✅ Add input validation (prevents injection)
4. ✅ Fix email-based auth → token-based auth

These 4 issues are critical security risks.

---

## 📋 NEXT IMMEDIATE STEPS

1. ✅ Read this plan
2. ✅ Decide: Full implementation vs Core-only implementation
3. ✅ Prioritize features by business value
4. ✅ Begin with Phase 1 (Security)
5. ✅ Follow implementation order

---

## 🎯 FINAL GOAL STATE

After implementation:
- ✅ All 74 requirements met
- ✅ Security hardened
- ✅ All features functional
- ✅ End-to-end testing passed
- ✅ Production-ready

---

**Status:** Ready for implementation  
**Next:** Confirm priorities and begin Phase 1  
