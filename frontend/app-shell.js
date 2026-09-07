(function () {
    let sessionUser = null;
    try { sessionUser = JSON.parse(sessionStorage.getItem("duemate-user") || "null"); } catch (_) { sessionUser = null; }
    const isStaff = sessionUser && sessionUser.role === "teacher";
    const pageName = location.pathname.split("/").pop() || "dashboard.html";
    const useMasterShell = false;
    const removedPages = ["groups.html", "subjects.html", "settings.html"];
    if (removedPages.includes(pageName)) {
        location.replace("dashboard.html");
        return;
    }
    const mainPages = isStaff ? [
        ["staff-dashboard.html", "Dashboard", "🏠"],
        ["assignments.html", "Assignments", "📄"],
        ["staff-students.html", "Students", "🎓"],
        ["staff-verification.html", "Verification", "✅"],
        ["notifications.html", "Notifications", "🔔"]
    ] : [
        ["dashboard.html", "Dashboard", "🏠"], ["calendar.html", "Calendar", "📅"],
        ["assignments.html", "Assignments", "📄"], ["notifications.html", "Notifications", "🔔"]
    ];
    const accountPages = [["profile.html", "Profile", "👤"]];

    function email() {
        const direct = sessionStorage.getItem("duemate-user-email") || sessionStorage.getItem("userEmail");
        if (direct && !direct.trim().startsWith("{")) return direct.trim().toLowerCase();
        for (const key of ["duemate-user", "dueMateUser", "loggedInUser"]) {
            try {
                const user = JSON.parse(sessionStorage.getItem(key) || "null");
                if (user && user.email) return String(user.email).trim().toLowerCase();
            } catch (_) { /* Ignore malformed compatibility entries. */ }
        }
        return "";
    }

    function theme() {
        const user = email();
        return (user && localStorage.getItem("duemate-theme-" + encodeURIComponent(user))) ||
            localStorage.getItem("duemate-theme") || "light";
    }

    function applyTheme() {
        const selected = theme();
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.classList.toggle("dark", selected === "dark" || (selected === "system" && systemDark));
    }

    function toggleTheme() {
        const user = email();
        const key = user ? "duemate-theme-" + encodeURIComponent(user) : "duemate-theme";
        const next = theme() === "dark" ? "light" : "dark";
        localStorage.setItem(key, next);
        localStorage.setItem("duemate-theme", next);
        applyTheme();
    }

    window.toggleTheme = toggleTheme;

    function ensureStaffTopbar() {
        if (!isStaff || useMasterShell) return;
        let topbar = document.querySelector(".topbar");
        if (!topbar) {
            topbar = document.createElement("header");
            topbar.className = "topbar app-shell-staff-topbar";
            topbar.innerHTML = '<div class="left-top"><button class="menu-btn" type="button" aria-label="Open menu">☰</button><div class="brand">Due<span>Mate</span></div></div><div class="top-actions"></div>';
            document.body.insertBefore(topbar, document.body.firstElementChild);
        }
        const actions = topbar.querySelector(".top-actions") || topbar;
        if (!topbar.querySelector(".menu-btn")) {
            const menuButton = document.createElement("button");
            menuButton.className = "menu-btn";
            menuButton.type = "button";
            menuButton.setAttribute("aria-label", "Open menu");
            menuButton.textContent = "☰";
            topbar.insertBefore(menuButton, topbar.firstChild);
        }
        if (!actions.querySelector("[data-shell-theme-toggle], [onclick*='toggleTheme']")) {
            const themeButton = document.createElement("button");
            themeButton.type = "button";
            themeButton.dataset.shellThemeToggle = "true";
            themeButton.setAttribute("aria-label", "Toggle light and dark theme");
            themeButton.textContent = "☀️/🌙";
            themeButton.addEventListener("click", toggleTheme);
            actions.appendChild(themeButton);
        }
        const existingDateButton = topbar.querySelector(".calendar-btn");
        if (existingDateButton) existingDateButton.dataset.shellDate = "true";
        if (!topbar.querySelector("[data-shell-date]")) {
            const dateButton = document.createElement("button");
            dateButton.type = "button";
            dateButton.dataset.shellDate = "true";
            dateButton.innerHTML = "📅 <span id=\"date\">" + new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", weekday: "short" }) + "</span>";
            dateButton.addEventListener("click", () => { location.href = "calendar.html"; });
            actions.insertBefore(dateButton, actions.firstChild);
        }
        if (!actions.textContent.includes("🔔")) {
            const notifications = document.createElement("button");
            notifications.type = "button";
            notifications.setAttribute("aria-label", "Notifications");
            notifications.textContent = "🔔";
            notifications.addEventListener("click", () => { location.href = "notifications.html"; });
            actions.appendChild(notifications);
        }
        if (!actions.textContent.includes("👤")) {
            const profile = document.createElement("button");
            profile.type = "button";
            profile.setAttribute("aria-label", "Profile");
            profile.textContent = "👤";
            profile.addEventListener("click", () => { location.href = "profile.html"; });
            actions.appendChild(profile);
        }
    }

    function ensureBackground() {
        const background = document.querySelector(".background");
        if (!background) return;
        if (!background.querySelector(".study-float, .float")) {
            background.insertAdjacentHTML("beforeend", '<div class="study-float book-one">📚</div><div class="study-float book-two">📖</div><div class="study-float pencil">✏️</div><div class="study-float calendar-float">📅</div>');
        }
        if (!background.querySelector(".particles")) {
            background.insertAdjacentHTML("beforeend", '<div class="particles"><span class="particle"></span><span class="particle"></span><span class="particle"></span><span class="particle"></span><span class="particle"></span><span class="particle"></span></div>');
        }
        if (!background.querySelector(".stars")) {
            background.insertAdjacentHTML("beforeend", '<div class="stars"><span class="star"></span><span class="star"></span><span class="star"></span><span class="star"></span><span class="star"></span><span class="star"></span><span class="star"></span><span class="star"></span><span class="star"></span><span class="star"></span></div>');
        }
    }

    function ensureMasterShell() {
        if (!useMasterShell) return;
        document.body.classList.add("master-shell-page");

        document.querySelectorAll(".topbar").forEach(function (topbar) {
            topbar.classList.add("master-shell-original");
        });

        const topbar = document.createElement("header");
        topbar.className = "topbar master-shell-topbar";
        topbar.innerHTML = '<div class="left-top"><button class="menu-btn" type="button" aria-label="Open navigation">☰</button><div class="brand">Due<span>Mate</span></div></div><div class="top-actions"><button class="calendar-btn date-control" type="button" aria-label="Open calendar">📅 <span class="calendar-date-label" id="masterShellDate">Today</span></button><button class="notification-btn" type="button" aria-label="Open notifications">🔔<span class="notification-dot"></span></button><button class="master-shell-theme-btn" type="button" aria-label="Toggle theme">☀️/🌙</button><button class="master-shell-profile-btn" type="button" aria-label="Open profile">👤</button></div>';
        document.body.insertBefore(topbar, document.body.firstElementChild);
        topbar.querySelector(".calendar-btn").addEventListener("click", function () { location.href = "calendar.html"; });
        topbar.querySelector(".notification-btn").addEventListener("click", function () { location.href = "notifications.html"; });
        topbar.querySelector(".master-shell-theme-btn").addEventListener("click", toggleTheme);
        topbar.querySelector(".master-shell-profile-btn").addEventListener("click", function () { location.href = "profile.html"; });

        const overlay = document.createElement("div");
        overlay.className = "drawer-overlay master-shell-drawer-overlay";
        const drawer = document.createElement("aside");
        drawer.className = "drawer master-shell-drawer";
        const link = function (page) {
            const current = page[0] === pageName ? " active" : "";
            return '<a href="' + page[0] + '" class="nav-link' + current + '"><span class="nav-icon">' + page[2] + "</span>" + page[1] + "</a>";
        };
        drawer.innerHTML = '<div class="drawer-header"><div class="drawer-brand">Due<span>Mate</span></div><button class="drawer-close" type="button" aria-label="Close navigation">×</button></div><div class="nav-section-title">Main</div><nav class="nav-list">' + mainPages.map(link).join("") + '</nav><div class="nav-section-title">Account</div><nav class="nav-list">' + accountPages.map(link).join("") + '<button class="nav-link logout-link" type="button"><span class="nav-icon">🚪</span>Logout</button></nav>';
        document.body.append(overlay, drawer);
        overlay.addEventListener("click", closeMenu);
        drawer.querySelector(".drawer-close").addEventListener("click", closeMenu);
        drawer.querySelector(".logout-link").addEventListener("click", function () { sessionStorage.clear(); location.href = "index.html"; });
        const removeLegacyControls = function () {
            topbar.querySelectorAll("[data-shell-theme-toggle], [data-shell-date]").forEach(function (control) {
                control.remove();
            });
        };
        removeLegacyControls();
        new MutationObserver(removeLegacyControls).observe(topbar, { childList: true, subtree: true });
    }

    function openMenu() {
        let drawer = document.querySelector(".master-shell-drawer, .app-shell-drawer");
        let overlay = document.querySelector(".master-shell-drawer-overlay, .app-shell-drawer-overlay");
        if (drawer) {
            drawer.classList.toggle("show");
            overlay.classList.toggle("show");
            document.body.style.overflow = drawer.classList.contains("show") ? "hidden" : "";
            return;
        }
        const current = location.pathname.split("/").pop() || "dashboard.html";
        overlay = document.createElement("div");
        overlay.className = "app-shell-drawer-overlay";
        drawer = document.createElement("aside");
        drawer.className = "app-shell-drawer";
        const link = function (page) {
            return '<a href="' + page[0] + '" class="' + (page[0] === current ? "active" : "") + '"><span class="nav-icon">' + page[2] + "</span>" + page[1] + "</a>";
        };
        const langButton = '<button type="button" data-shell-language-toggle style="width: 100%; margin-top: 10px; padding: 8px; background: var(--purple); color: white; border: none; border-radius: 8px; cursor: pointer;"><span class="nav-icon">🌐</span> <span id="lang-toggle-text">English</span></button>';
        drawer.innerHTML = '<h2>Due<span>Mate</span></h2><div class="app-shell-section-title">Main</div><nav>' +
            mainPages.map(link).join("") +
            '</nav><div class="app-shell-section-title">Account</div><nav>' +
            accountPages.map(link).join("") +
            '<button type="button" data-shell-logout><span class="nav-icon">🚪</span> Logout</button>' +
            langButton +
            '</nav>';
        document.body.append(overlay, drawer);
        overlay.addEventListener("click", closeMenu);
        
        // Language toggle
        drawer.querySelector("[data-shell-language-toggle]").addEventListener("click", function () {
            const currentLang = window.dueMateSettings ? window.dueMateSettings.getSetting("language") : "en";
            const newLang = currentLang === "en" ? "ta" : "en";
            if (window.dueMateSettings) {
                window.dueMateSettings.setSetting("language", newLang);
                window.dueMateSettings.applyLanguage();
                document.getElementById("lang-toggle-text").textContent = newLang === "en" ? "English" : "தமிழ்";
            }
        });
        
        drawer.querySelector("[data-shell-logout]").addEventListener("click", function () {
            sessionStorage.clear();
            location.href = "index.html";
        });
        requestAnimationFrame(function () {
            drawer.classList.add("show");
            overlay.classList.add("show");
        });
        document.body.style.overflow = "hidden";
    }

    function closeMenu() {
        const drawer = document.querySelector(".master-shell-drawer, .app-shell-drawer");
        const overlay = document.querySelector(".master-shell-drawer-overlay, .app-shell-drawer-overlay");
        if (drawer) drawer.classList.remove("show");
        if (overlay) overlay.classList.remove("show");
        document.body.style.overflow = "";
    }

    function updateNotificationBadge() {
        const showBadge = localStorage.getItem("duemate-notification-badge") === "show";
        document.querySelectorAll(".notification-btn .notification-dot").forEach(function (dot) {
            if (dot) {
                dot.style.display = showBadge ? "block" : "none";
            }
        });
    }

    function normalizeNativeDrawer() {
        if (isStaff) return;
        const drawer = document.getElementById("drawer");
        if (!drawer) return;
        const mainNav = drawer.querySelector(".nav-list");
        if (!mainNav) return;
        const desired = mainPages.map(page => page[0]);
        if (!mainNav.querySelector('a[href="assignments.html"]')) {
            const assignments = document.createElement("a");
            assignments.href = "assignments.html";
            assignments.className = "nav-link";
            assignments.innerHTML = '<span class="nav-icon">📄</span> Assignments';
            mainNav.appendChild(assignments);
        }
        Array.from(mainNav.querySelectorAll("a")).sort(function (left, right) {
            return desired.indexOf(left.getAttribute("href")) - desired.indexOf(right.getAttribute("href"));
        }).forEach(link => mainNav.appendChild(link));

        const icons = {
            "dashboard.html": "🏠",
            "calendar.html": "📅",
            "assignments.html": "📄",
            "notifications.html": "🔔",
            "profile.html": "👤",
            "settings.html": "⚙️"
        };

        drawer.querySelectorAll(".nav-icon").forEach(function (icon) {
            const link = icon.closest("a");
            const href = link && link.getAttribute("href");
            if (href && icons[href]) icon.textContent = icons[href];
        });

        drawer.querySelectorAll(".logout-link .nav-icon").forEach(function (icon) {
            icon.textContent = "🚪";
        });
    }

    if (isStaff) ensureStaffTopbar();

    document.addEventListener("DOMContentLoaded", function () {
        document.body.classList.toggle("staff-shell", Boolean(isStaff));
        ensureStaffTopbar();
        applyTheme();
        ensureBackground();
        normalizeNativeDrawer();
        updateNotificationBadge();

        document.querySelectorAll(".sidebar .nav-icon").forEach(function (icon) {
            const link = icon.closest("a");
            const href = link && link.getAttribute("href");
            const symbols = {
                "dashboard.html": "🏠",
                "calendar.html": "📅",
                "assignments.html": "📄",
                "notifications.html": "🔔",
                "profile.html": "👤",
                "settings.html": "⚙️"
            };
            icon.textContent = symbols[href] || "🚪";
        });
        document.querySelectorAll(".topbar .menu-btn, #mobileMenuBtn").forEach(function (button) {
            if (document.getElementById("drawer") || button.closest(".sidebar") || button.closest(".settings-menu")) return;
            button.removeAttribute("onclick");
            button.addEventListener("click", openMenu);
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeMenu();
        });
    });

    window.addEventListener("storage", function (event) {
        if (event.key === "duemate-theme" || (event.key && event.key.indexOf("duemate-theme-") === 0)) applyTheme();
        if (event.key === "duemate-notification-badge") updateNotificationBadge();
    });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
})();

/*
   JWT Authentication Helper
   
   Use this function to make authenticated API calls:
   const headers = window.getAuthHeaders();
   
   fetch(url, {
       method: "GET",
       headers: headers
   })
*/
window.getAuthHeaders = function() {
    const token = sessionStorage.getItem("duemate-token");
    
    const headers = {
        "Content-Type": "application/json"
    };
    
    if (token) {
        headers["Authorization"] = "Bearer " + token;
    }
    
    return headers;
};

/*
   Authenticated Fetch Wrapper
   
   Use this to make API calls with automatic JWT authentication:
   window.authenticatedFetch(url, options)
   
   Example:
   const response = await window.authenticatedFetch(
       "http://localhost:5000/api/tasks",
       { method: "GET" }
   );
*/
window.authenticatedFetch = function(url, options = {}) {
    if (!options.headers) {
        options.headers = {};
    }
    
    // Merge with auth headers
    const authHeaders = window.getAuthHeaders();
    options.headers = { ...authHeaders, ...options.headers };
    
    return fetch(url, options).then(function(response) {
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return Promise.reject(new Error("Session expired. Please login again."));
        }
        return response;
    });
};

/*
   Notification Helpers
   
   Fetch and manage notifications from backend
*/
window.fetchNotifications = async function() {
    try {
        const response = await window.authenticatedFetch(
            window.API_URL + "/api/notifications"
        );
        if (!response.ok) return [];
        const data = await response.json();
        return data.notifications || [];
    } catch (error) {
        console.warn("Unable to fetch notifications:", error);
        return [];
    }
};

window.markNotificationAsRead = async function(notificationId) {
    try {
        await window.authenticatedFetch(
            window.API_URL + "/api/notifications/" + notificationId + "/read",
            { method: "PATCH" }
        );
    } catch (error) {
        console.warn("Unable to mark notification as read:", error);
    }
};

window.deleteNotification = async function(notificationId) {
    try {
        await window.authenticatedFetch(
            window.API_URL + "/api/notifications/" + notificationId,
            { method: "DELETE" }
        );
    } catch (error) {
        console.warn("Unable to delete notification:", error);
    }
};

/*
   Settings Helpers
   
   Sync settings with backend
*/
window.fetchUserSettings = async function() {
    try {
        const response = await window.authenticatedFetch(
            window.API_URL + "/api/settings"
        );
        if (!response.ok) return null;
        const data = await response.json();
        return data.settings || null;
    } catch (error) {
        console.warn("Unable to fetch settings:", error);
        return null;
    }
};

window.updateUserSettings = async function(settings) {
    try {
        const response = await window.authenticatedFetch(
            window.API_URL + "/api/settings",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(settings)
            }
        );
        if (!response.ok) return false;
        return true;
    } catch (error) {
        console.warn("Unable to update settings:", error);
        return false;
    }
};

