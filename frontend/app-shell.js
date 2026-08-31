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
        drawer.innerHTML = '<h2>Due<span>Mate</span></h2><div class="app-shell-section-title">Main</div><nav>' +
            mainPages.map(link).join("") +
            '</nav><div class="app-shell-section-title">Account</div><nav>' +
            accountPages.map(link).join("") +
            '<button type="button" data-shell-logout><span class="nav-icon">🚪</span> Logout</button></nav>';
        document.body.append(overlay, drawer);
        overlay.addEventListener("click", closeMenu);
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
