/**
 * DueMate Settings Manager
 * Handles all user settings persistence including theme, language, and preferences
 */

class DueMateSettings {
    constructor() {
        this.userEmail = this.getUserEmail();
        this.defaults = {
            theme: "system",
            language: "en",
            start_page: "dashboard",
            compact_interface: false,
            notification_enabled: true,
            notification_email: false,
            notification_push: true,
            profile_visibility: "public"
        };
        this.translations = {
            en: {
                "Dashboard": "Dashboard",
                "Tasks": "Tasks",
                "Calendar": "Calendar",
                "Timetable": "Timetable",
                "Subjects": "Subjects",
                "Groups": "Groups",
                "Notifications": "Notifications",
                "Profile": "Profile",
                "Settings": "Settings",
                "Logout": "Logout",
                "Theme": "Theme",
                "Language": "Language",
                "Dark Mode": "Dark Mode",
                "Light Mode": "Light Mode",
                "System": "System",
                "English": "English",
                "Tamil": "Tamil",
                "Save": "Save",
                "Cancel": "Cancel"
            },
            ta: {
                "Dashboard": "டாஷ்போர்டு",
                "Tasks": "பணிகள்",
                "Calendar": "நாட்காட்டி",
                "Timetable": "நேரஅட்டவணை",
                "Subjects": "பாடங்கள்",
                "Groups": "குழுக்கள்",
                "Notifications": "அறிவிப்புகள்",
                "Profile": "சுயவிவரம்",
                "Settings": "அமைப்புகள்",
                "Logout": "வெளியேறு",
                "Theme": "தீம்",
                "Language": "மொழி",
                "Dark Mode": "இருட்டடிப்பு முறை",
                "Light Mode": "ஒளி முறை",
                "System": "கணினி",
                "English": "ஆங்கிலம்",
                "Tamil": "தமிழ்",
                "Save": "சேமி",
                "Cancel": "ரத்து"
            }
        };
    }

    getUserEmail() {
        const direct = sessionStorage.getItem("duemate-user-email") || sessionStorage.getItem("userEmail");
        if (direct && !direct.trim().startsWith("{")) return direct.trim().toLowerCase();
        for (const key of ["duemate-user", "dueMateUser", "loggedInUser"]) {
            try {
                const user = JSON.parse(sessionStorage.getItem(key) || "null");
                if (user && user.email) return String(user.email).trim().toLowerCase();
            } catch (_) {}
        }
        return "anonymous";
    }

    /**
     * Get a setting value with fallback to defaults
     */
    getSetting(key) {
        const userKey = `duemate-setting-${encodeURIComponent(this.userEmail)}-${key}`;
        const value = localStorage.getItem(userKey);
        if (value !== null) return this.parseValue(value);
        
        const globalKey = `duemate-setting-${key}`;
        const globalValue = localStorage.getItem(globalKey);
        if (globalValue !== null) return this.parseValue(globalValue);
        
        return this.defaults[key];
    }

    /**
     * Set a setting value
     */
    setSetting(key, value) {
        if (!this.defaults.hasOwnProperty(key)) {
            console.warn(`Unknown setting: ${key}`);
            return false;
        }
        const userKey = `duemate-setting-${encodeURIComponent(this.userEmail)}-${key}`;
        localStorage.setItem(userKey, JSON.stringify(value));
        
        // Also sync to backend if authenticated
        this.syncToBackend(key, value);
        
        return true;
    }

    /**
     * Parse JSON safely
     */
    parseValue(value) {
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    }

    /**
     * Get all settings
     */
    getAllSettings() {
        const settings = {};
        Object.keys(this.defaults).forEach(key => {
            settings[key] = this.getSetting(key);
        });
        return settings;
    }

    /**
     * Sync settings to backend
     */
    async syncToBackend(key, value) {
        try {
            const email = this.userEmail;
            const payload = { [key]: value };
            
            const response = await fetch((window.API_BASE || "http://localhost:5000") + "/api/settings", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sessionStorage.getItem("duemate-token") || ""}`
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                console.warn(`Failed to sync setting ${key} to backend`);
            }
        } catch (error) {
            // Settings stored locally, backend sync failed but not critical
            console.debug("Backend sync failed (non-critical):", error.message);
        }
    }

    /**
     * Apply theme setting to DOM
     */
    applyTheme() {
        const selected = this.getSetting("theme");
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = selected === "dark" || (selected === "system" && systemDark);
        document.body.classList.toggle("dark", isDark);
    }

    /**
     * Apply language setting
     */
    applyLanguage() {
        const lang = this.getSetting("language");
        document.documentElement.lang = lang;
        
        // Set text direction (RTL for Tamil if needed)
        if (lang === "ta") {
            document.documentElement.dir = "ltr"; // Tamil uses LTR on web
        } else {
            document.documentElement.dir = "ltr";
        }
    }

    /**
     * Translate text
     */
    translate(key) {
        const lang = this.getSetting("language");
        const langDict = this.translations[lang] || this.translations.en;
        return langDict[key] || key;
    }

    /**
     * Get translation dictionary for a language
     */
    getTranslationDict(lang = null) {
        lang = lang || this.getSetting("language");
        return this.translations[lang] || this.translations.en;
    }

    /**
     * Apply all settings on page load
     */
    applyAllSettings() {
        this.applyTheme();
        this.applyLanguage();
        
        // Apply compact interface if enabled
        if (this.getSetting("compact_interface")) {
            document.body.classList.add("compact");
        }
    }

    /**
     * Watch for theme preference changes
     */
    watchThemePreference() {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            if (this.getSetting("theme") === "system") {
                this.applyTheme();
            }
        });
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        Object.keys(this.defaults).forEach(key => {
            const userKey = `duemate-setting-${encodeURIComponent(this.userEmail)}-${key}`;
            localStorage.removeItem(userKey);
        });
        this.applyAllSettings();
    }
}

// Global instance
window.dueMateSettings = new DueMateSettings();

// Apply settings on page load
document.addEventListener("DOMContentLoaded", () => {
    window.dueMateSettings.applyAllSettings();
    window.dueMateSettings.watchThemePreference();
});
