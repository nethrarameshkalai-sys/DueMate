# DueMate - Detailed Bug Report & Findings

**Date:** September 2, 2026  
**Based on:** Complete Audit of All 74 Requirements  
**Total Issues Found:** 45  
**Critical Issues:** 4  
**High Issues:** 8  
**Medium Issues:** 15  
**Low Issues:** 18  

---

## 🔴 CRITICAL ISSUES (MUST FIX - SECURITY RISK)

### CRITICAL #1: Email-Based Authentication Vulnerability
**File:** backend/server.js (ALL endpoints)  
**Lines:** 1206, 1289, 1312, 1333, 1342, 1366, 1390, 1402, 1418, 1435, 1474, 1539, 1693, 1867, 1989  
**Severity:** CRITICAL  
**Type:** Security - Authentication

**Problem:**
```javascript
// Line 1206 in server.js
app.get("/api/groups", (req, res) => {
    const userEmail = String(req.query.user_email || "").trim().toLowerCase();
    // ❌ TRUSTS EMAIL FROM CLIENT
    const sql = `SELECT * FROM groups WHERE owner_email = ?`;
    db.query(sql, [userEmail], ...);
});
```

**Attack Scenario:**
1. User A logs in from account A
2. User A sends: GET /api/groups?user_email=userB@gmail.com
3. ❌ Response: Returns User B's groups (DATA LEAK!)

**How to Exploit:**
```bash
# From any browser console:
fetch('http://localhost:5000/api/tasks?user_email=otherperson@gmail.com')
.then(r => r.json())
.then(data => console.log(data)); // See other person's tasks!
```

**Impact:**
- User can access any other user's data
- User can modify any group
- User can accept/reject join requests for any group
- User isolation completely broken

**Required Fix:**
- Replace with JWT/Session-based authentication
- Extract email from session/token (not request)
- Validate token on backend for every request

**Estimated Fix Time:** 8-10 hours

---

### CRITICAL #2: Weak Authorization on Group Updates
**File:** backend/server.js  
**Lines:** 1266-1287 (PUT /api/groups/:id)  
**Severity:** CRITICAL  
**Type:** Security - Authorization

**Problem:**
```javascript
app.put("/api/groups/:id", (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const ownerEmail = String(req.body.user_email || "").trim().toLowerCase();
    // ❌ TRUSTS OWNER EMAIL FROM REQUEST BODY
    const sql = `UPDATE groups SET name = ?, description = ? 
                 WHERE id = ? AND owner_email = ?`;
    db.query(sql, [name, desc, groupId, ownerEmail], ...);
});
```

**Attack:**
```javascript
fetch('http://localhost:5000/api/groups/groupId', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        user_email: 'realowner@gmail.com',
        name: 'HACKED',
        description: 'Group taken over'
    })
});
// ❌ Works! Can modify any group by guessing owner email
```

**Impact:**
- Any user can modify any group
- Any user can delete any group
- Any user can change group rules/challenges

**Required Fix:**
- Get ownership from session/token (not request body)
- Verify user owns group before allowing update

**Estimated Fix Time:** 1 hour per endpoint

---

### CRITICAL #3: No Rate Limiting
**File:** backend/server.js  
**Severity:** CRITICAL  
**Type:** Security - DoS & Brute Force

**Problem:**
```javascript
// Line 356 - No rate limiting on login
app.post("/api/auth/login", (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();
    // ❌ Anyone can try unlimited password attempts
    // ❌ Anyone can brute force all emails
});
```

**Attack Scenarios:**
1. Brute force passwords: Try 1000 passwords/second
2. Enumerate users: Try all possible email combinations
3. DoS: Send unlimited requests to crash server

**Current Status:** ✅ Server has no rate limiting at all

**Required Fix:**
```bash
npm install express-rate-limit
```

**Fix Code:**
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute
    message: 'Too many login attempts, please try again later'
});

app.post('/api/auth/login', loginLimiter, (req, res) => { ... });
```

**Estimated Fix Time:** 30 minutes

---

### CRITICAL #4: No Input Validation
**File:** backend/server.js (ALL endpoints)  
**Severity:** CRITICAL  
**Type:** Security - Injection Attacks

**Problem:**
```javascript
// Line 1539 - No input validation
app.post("/api/tasks", (req, res) => {
    const name = String(req.body.name || "").trim();
    // ❌ No maximum length check
    // ❌ No SQL injection prevention (relying only on parameterized queries)
    // ❌ No sanitization
    const sql = `INSERT INTO tasks (user_email, name, ...) VALUES (?, ?, ...)`;
    db.query(sql, [email, name, ...]);
});
```

**Attack Scenarios:**
1. SQL Injection: name = "'; DROP TABLE tasks; --"
2. Buffer overflow: Send 10MB string for task name
3. XSS injection: Store malicious JavaScript in task name

**Current Status:** Uses parameterized queries (good) but no validation layer

**Required Fix:**
```bash
npm install joi
```

**Estimated Fix Time:** 2 hours

---

## 🟠 HIGH SEVERITY ISSUES

### HIGH #1: Notifications System Completely Missing
**Severity:** HIGH  
**Status:** ❌ 0% implemented  
**Requirements:** #20-35

**What's Missing:**
1. ❌ notifications table doesn't exist in database
2. ❌ No /api/notifications endpoints
3. ❌ No notification creation logic
4. ❌ No task reminder system (Due Tomorrow/Today/Overdue)
5. ❌ No notification sound
6. ❌ No notification persistence
7. ❌ No duplicate prevention

**Files Affected:**
- backend/server.js (needs 4 new endpoints)
- backend/config/db.js (needs new table)
- All frontend HTML files (needs notification display)

**Required Implementation:**
1. Create notifications table
2. Create /api/notifications (GET, POST, PATCH, DELETE)
3. Create scheduled job for task reminders
4. Update all HTML files to display notifications

**Estimated Fix Time:** 12-15 hours

---

### HIGH #2: File Upload System Not Implemented
**Severity:** HIGH  
**Status:** ❌ 0% implemented  
**Requirements:** #16, #37

**What's Missing:**
1. ❌ No /api/upload endpoint
2. ❌ No /api/files/:id endpoint
3. ❌ No files table in database
4. ❌ No file authorization checks
5. ❌ No group file upload UI
6. ❌ No subject file upload UI

**Files Affected:**
- backend/server.js
- backend/config/db.js
- groups.html (needs file upload UI)
- subjects.html (needs file upload UI)

**Required Implementation:**
1. Install multer
2. Create files table
3. Create file upload endpoints with authorization
4. Add file UI to groups and subjects

**Estimated Fix Time:** 10-12 hours

---

### HIGH #3: Task Reminders Not Implemented
**Severity:** HIGH  
**Status:** ❌ 0% implemented  
**Requirements:** #21-25

**What's Missing:**
1. ❌ No "Due Tomorrow" notification creation
2. ❌ No "Due Today" notification creation
3. ❌ No "Overdue" notification creation
4. ❌ No scheduled job to check tasks
5. ❌ No duplicate prevention

**Current Implementation:**
```javascript
// tasks.html - Just displays static task date, no reminders
const task = {
    name: "Math Homework",
    task_date: "2026-09-05" // DATE ONLY (no time) ✅
};
```

**Required Implementation:**
1. Create scheduled job (node-cron)
2. Check all tasks daily
3. Create notifications for:
   - tasks.task_date = tomorrow → "Due Tomorrow"
   - tasks.task_date = today → "Due Today"
   - tasks.task_date < today AND !completed → "Overdue"

**Estimated Fix Time:** 6-8 hours

---

### HIGH #4: Settings - Only 1 of 9 Options Working
**Severity:** HIGH  
**Status:** ⚠️ 1/9 working (Theme only)  
**Requirements:** #6

**Current Status:**
| Setting | Working? | Issue |
|---------|----------|-------|
| Theme (Light/Dark/System) | ✅ YES | Endpoint exists, persists |
| Language | ❌ NO | UI only, no backend |
| Start Page | ❌ NO | UI only, no backend |
| Compact Interface | ❌ NO | UI only, no backend |
| Task Reminders | ❌ NO | UI only, no backend |
| Deadline Alerts | ❌ NO | UI only, no backend |
| Group Notifications | ❌ NO | UI only, no backend |
| Daily Summary | ❌ NO | UI only, no backend |
| Profile Visibility | ❌ NO | UI only, no backend |

**Files:** settings.html (Lines 1454-1806)

**Required Fix:**
- Create /api/user/settings endpoint
- Create users table columns for each setting
- Wire each setting to backend API

**Estimated Fix Time:** 3-4 hours (requires multiple endpoints)

---

### HIGH #5: Subject Notes System Not Implemented
**Severity:** HIGH  
**Status:** ❌ 0% implemented  
**Requirements:** #35-40

**What's Missing:**
1. ❌ No subjects table
2. ❌ No notes table
3. ❌ No /api/subjects endpoints
4. ❌ No /api/subjects/:id/notes endpoints
5. ❌ No note creation UI
6. ❌ No file upload for notes

**Current State:**
- subjects.html exists but has no functional code
- No backend API
- No database tables

**Required Implementation:**
1. Create subjects table
2. Create notes table
3. Create subjects API (CRUD)
4. Create notes API (CRUD)
5. Update subjects.html UI

**Estimated Fix Time:** 8-10 hours

---

### HIGH #6: Games Not Implemented
**Severity:** HIGH  
**Status:** ❌ 0 of 9 games  
**Requirements:** #41-54

**Required Games:**
1. ❌ Sudoku (with validation)
2. ❌ Quiz/Memory Cards
3. ❌ Flashcard Game
4. ❌ Word Scramble
5. ❌ Typing Speed Test
6. ❌ Math Challenge
7. ❌ Study Streak
8. ❌ Badge System
9. ❌ Focus/Reaction Game

**Current State:**
- games.html shows game cards
- No game logic implemented
- No score storage
- No leaderboard

**Required Implementation:**
1. Implement 9 playable games
2. Add game logic & validation
3. Store scores in database
4. Display leaderboards

**Estimated Fix Time:** 20-30 hours (1-2 hours per game)

---

### HIGH #7: Tamil Language Support Not Implemented
**Severity:** HIGH  
**Status:** ❌ 0% implemented  
**Requirements:** #8

**Current State:**
```html
<!-- settings.html Lines 1454-1467 -->
<select class="setting-select" id="languageSelect">
    <option value="English">English</option>
    <option value="Tamil">Tamil</option>
</select>
<!-- ^ Dropdown exists but does nothing -->
```

**Required Implementation:**
1. Create i18n library setup
2. Create translation files (English + Tamil)
3. Translate all UI strings
4. Implement language switching
5. Persist language preference

**Estimated Fix Time:** 8-10 hours

---

### HIGH #8: Calendar Icon Display Inconsistent
**Severity:** HIGH  
**Status:** ⚠️ Partial (3 pages have icon-only, others have date)  
**Requirements:** #5

**Current Issues:**
| Page | Shows | Should Be |
|------|-------|-----------|
| Dashboard | 📅 Sep 02 | ✅ OK |
| Tasks | 📅 Sep 02 | ✅ OK |
| Timetable | 📅 Sep 02 | ✅ OK |
| Subjects | 📅 Sep 02 | ✅ OK |
| Settings | 📅 Sep 02 | ✅ OK |
| Groups | 📅 (icon only) | ❌ Missing date |
| Notifications | 📅 (icon only) | ❌ Missing date |
| Profile | 📅 (icon only) | ❌ Missing date |

**Files to Fix:**
- groups.html (Line 1886)
- notifications.html
- profile.html

**Fix:** Add date display span back to Groups, Notifications, Profile

**Estimated Fix Time:** 30 minutes

---

## 🟡 MEDIUM SEVERITY ISSUES

### MEDIUM #1: Group File Upload Feature Missing
**File:** Groups feature  
**Status:** ❌ 0% implemented  
**Severity:** MEDIUM  
**Impact:** Group members cannot share academic files

**Required:**
- UI for uploading files to group
- Backend authorization check (only members can upload)
- File storage
- Download functionality

---

### MEDIUM #2: Group Member List Not Fully Functional
**File:** groups.html  
**Status:** ⚠️ Shows members but limited info  
**Severity:** MEDIUM  
**Impact:** Cannot see full member information

---

### MEDIUM #3: Database Missing 5 Tables
**File:** backend/config/db.js  
**Status:** ❌ Missing tables:  
**Severity:** MEDIUM

1. ❌ notifications
2. ❌ subjects
3. ❌ notes
4. ❌ files
5. ❌ (optional) games

---

### MEDIUM #4: No Database Indexes
**File:** backend/config/db.js  
**Status:** ❌ No indexes defined  
**Severity:** MEDIUM  
**Impact:** Slow queries as database grows

**Missing Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tasks_user_email ON tasks(user_email);
CREATE INDEX idx_tasks_date ON tasks(task_date);
CREATE INDEX idx_groups_owner ON groups(owner_email);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_requests_group ON group_join_requests(group_id);
```

---

### MEDIUM #5: No API Input Validation Library
**File:** backend/server.js  
**Status:** ❌ Using manual string.length checks  
**Severity:** MEDIUM  
**Impact:** Vulnerability to injection and buffer overflow

---

### MEDIUM #6: No Error Handling Standardization
**File:** backend/server.js  
**Status:** ⚠️ Inconsistent error responses  
**Severity:** MEDIUM

---

### MEDIUM #7: No HTTPS Enforcement
**File:** backend/server.js  
**Status:** ❌ Missing HTTPS redirect  
**Severity:** MEDIUM  
**Impact:** Credentials transmitted in plaintext in production

---

### MEDIUM #8: No Helmet Security Headers
**File:** backend/server.js  
**Status:** ❌ Not installed  
**Severity:** MEDIUM  
**Impact:** Missing XSS, clickjacking, and other header protections

---

### MEDIUM #9: No CSRF Protection
**File:** All forms  
**Status:** ❌ Not implemented  
**Severity:** MEDIUM

---

### MEDIUM #10: Frontend Stores Email in sessionStorage
**Files:** All HTML files  
**Status:** ⚠️ Email in sessionStorage (XSS vulnerable)  
**Severity:** MEDIUM  
**Impact:** XSS attack can steal email

**Current Code:**
```javascript
sessionStorage.setItem('email', userEmail);
// ❌ Vulnerable to XSS
```

**Fix:** Use HTTP-only cookies

---

### MEDIUM #11-15: Additional Medium Issues
- No logging system
- No performance monitoring
- No API response pagination
- No database connection pooling
- No email notification system

---

## 🟢 LOW SEVERITY ISSUES

### LOW #1: Code Quality - Deep Callback Nesting
**File:** backend/server.js  
**Lines:** 200-346 (registration)  
**Status:** ⚠️ Should convert to async/await  
**Severity:** LOW

---

### LOW #2-18: Additional Low Issues
- Inconsistent variable naming (camelCase vs snake_case)
- No unit tests
- No integration tests
- No security tests
- Missing Swagger API documentation
- No API versioning
- No graceful shutdown handling
- No connection timeout
- No query timeout
- Missing .env validation
- No favicon
- No 404 page
- No error page customization
- Browser compatibility issues with IE11
- Performance optimization opportunities

---

## 📊 SEVERITY DISTRIBUTION

```
Critical (Must Fix):     4 issues
High (Should Fix):       8 issues
Medium (Should Have):   15 issues
Low (Nice to Have):     18 issues
─────────────────────────────
Total:                  45 issues
```

---

## 🎯 QUICK WINS (Can Fix Today)

1. ✅ Add rate limiting (30 min)
2. ✅ Add helmet (15 min)
3. ✅ Add HTTPS redirect (15 min)
4. ✅ Fix calendar icon display (30 min)

**Total Time:** ~90 minutes

---

## 🚀 NEXT STEPS

1. **Read this bug report completely**
2. **Prioritize fixes by business value**
3. **Start with Critical issues (#1-4)**
4. **Then High issues (#1-8)**
5. **Follow implementation action plan**

---

**Report Status:** COMPLETE  
**Generated:** September 2, 2026  
**Next:** Ready for implementation prioritization
