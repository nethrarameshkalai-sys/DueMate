(function () {
    const mainPages = [
        ["dashboard.html", "Dashboard", "🏠"],
        ["tasks.html", "Tasks", "📝"],
        ["calendar.html", "Calendar", "📅"],
        ["timetable.html", "Timetable", "🗓️"],
        ["subjects.html", "Subjects", "📚"],
        ["groups.html", "Groups", "👥"],
        ["notifications.html", "Notifications", "🔔"]
    ];
    const accountPages = [
        ["profile.html", "Profile", "👤"],
        ["settings.html", "Settings", "⚙️"]
    ];

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

    function openMenu() {
        let drawer = document.querySelector(".app-shell-drawer");
        let overlay = document.querySelector(".app-shell-drawer-overlay");
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
        const drawer = document.querySelector(".app-shell-drawer");
        const overlay = document.querySelector(".app-shell-drawer-overlay");
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
        const drawer = document.getElementById("drawer");
        if (!drawer) return;
        const mainNav = drawer.querySelector(".nav-list");
        if (!mainNav) return;
        const desired = mainPages.map(page => page[0]);
        if (!mainNav.querySelector('a[href="subjects.html"]')) {
            const subjects = document.createElement("a");
            subjects.href = "subjects.html";
            subjects.className = "nav-link";
            subjects.innerHTML = '<span class="nav-icon">📚</span> Subjects';
            mainNav.appendChild(subjects);
        }
        Array.from(mainNav.querySelectorAll("a")).sort(function (left, right) {
            return desired.indexOf(left.getAttribute("href")) - desired.indexOf(right.getAttribute("href"));
        }).forEach(link => mainNav.appendChild(link));

        const icons = {
            "dashboard.html": "🏠",
            "tasks.html": "📝",
            "calendar.html": "📅",
            "timetable.html": "🗓️",
            "subjects.html": "📚",
            "groups.html": "👥",
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

    document.addEventListener("DOMContentLoaded", function () {
        applyTheme();
        ensureBackground();
        normalizeNativeDrawer();
        updateNotificationBadge();

        document.querySelectorAll(".sidebar .nav-icon").forEach(function (icon) {
            const link = icon.closest("a");
            const href = link && link.getAttribute("href");
            const symbols = {
                "dashboard.html": "🏠",
                "tasks.html": "📝",
                "calendar.html": "📅",
                "timetable.html": "🗓️",
                "subjects.html": "📚",
                "groups.html": "👥",
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

