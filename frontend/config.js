// ============================================================
// DUEMATE FRONTEND CONFIGURATION
// ============================================================
// This file contains all deployment configuration.
// It is loaded in every HTML page to provide API_BASE_URL
// ============================================================

(function() {
    // Detect environment - use localhost for development including file:// protocol
    const isLocalhost = window.location.hostname.includes('localhost') || 
                        window.location.hostname.includes('127.0.0.1') ||
                        window.location.hostname === '';
    
    const isProduction = !isLocalhost;
    
    // Set API base URL based on environment
    window.API_BASE = isProduction 
        ? 'https://your-backend-domain.com'  // Replace with your actual backend domain
        : 'http://localhost:5000';
    
    // Legacy support for different variable names used across files
    window.API_BASE_URL = window.API_BASE;
    window.GROUPS_API = window.API_BASE;
    
    console.log(`[DueMate] API Base: ${window.API_BASE} (${isProduction ? 'Production' : 'Development'})`);
})();
