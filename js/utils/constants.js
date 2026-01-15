/**
 * ==========================================
 * APPLICATION CONSTANTS
 * ==========================================
 * Centralized configuration and constants
 */

const AppConstants = {
    // Default store configuration
    DEFAULT_CONFIG: {
        store_name: "Car House 🚗",
        store_tagline: "Quality Parts for Your Vehicle",
        primary_color: "#2C2C2C",
        secondary_color: "#FFC700",
        accent_color: "#FFC700",
        background_color: "#1A1A1A"
    },

    // Core navigation categories (non-dynamic)
    CORE_CATEGORIES: ['home', 'cart', 'checkout', 'service', 'favorites', 'about', 'search'],

    // Pagination defaults
    PAGINATION: {
        DEFAULT_LIMIT: 24,
        CATEGORY_LIMIT: 40,
        FEATURED_LIMIT: 10,
        MAX_SEARCH_HISTORY: 5
    },

    // Local storage keys
    STORAGE_KEYS: {
        CART: 'car_house_cart',
        SEARCH_HISTORY: 'searchHistory',
        AUTH_TOKEN: 'supabase.auth.token'
    },

    // Toast colors
    TOAST_COLORS: {
        SUCCESS: '#27ae60',
        ERROR: '#e74c3c',
        WARNING: '#f39c12',
        INFO: '#3498db'
    },

    // API endpoints (if needed for external services)
    PLACEHOLDER_IMAGE: 'https://via.placeholder.com/200',

    // Animation durations (ms)
    ANIMATIONS: {
        TOAST_DURATION: 3000,
        BOUNCE_DURATION: 500,
        TRANSITION_DURATION: 300
    }
};

window.AppConstants = AppConstants;
