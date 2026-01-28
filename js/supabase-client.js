
(function () {
    /**
     * =============================================================
     * SUPABASE CLIENT CONFIGURATION
     * =============================================================
     * This file initializes the Supabase client for the Car House
     * customer-facing web application.
     * 
     * Database Schema Reference: database.sql
     * 
     * IMPORTANT: Replace the placeholder values with your actual
     * Supabase project credentials before deployment.
     * =============================================================
     */

    // =============================================================
    // CONFIGURATION - Replace with your Supabase credentials
    // =============================================================

    const SUPABASE_URL = 'https://bzbximgipjziqrwkctop.supabase.co'; // e.g., https://xxxxx.supabase.co
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6YnhpbWdpcGp6aXFyd2tjdG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MzI2MzMsImV4cCI6MjA4MDAwODYzM30.F6-CCUPgJodPAOJl9rKRSSXmjb2UY_RDwPBqICniSMM'; // Public anon key

    // =============================================================
    // SUPABASE CLIENT INITIALIZATION
    // =============================================================

    /**
     * Initialize Supabase client using CDN
     * Include this script tag in your HTML before this file:
     * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     */

    let supabaseClient = null;

    function initSupabaseClient() {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storage: window.localStorage,
                    storageKey: 'carhouse_auth_token',
                    flowType: 'pkce'
                }
            });
            console.log('Supabase client initialized successfully');
            return supabaseClient;
        } else {
            console.error('Supabase JS library not loaded. Please include the CDN script.');
            return null;
        }
    }

    /**
     * Get the initialized Supabase client
     * @returns {Object|null} Supabase client instance
     */
    function getSupabaseClient() {
        if (!supabaseClient) {
            return initSupabaseClient();
        }
        return supabaseClient;
    }


    // =============================================================
    // SESSION MANAGEMENT
    // =============================================================

    /**
     * Get current authenticated user session
     * References: profiles table (id links to auth.users)
     * @returns {Promise<Object|null>} Current session or null
     */
    async function getCurrentSession() {
        const client = getSupabaseClient();
        if (!client) return null;

        try {
            const { data: { session }, error } = await client.auth.getSession();
            if (error) throw error;
            return session;
        } catch (error) {
            console.error('Error getting session:', error.message);
            return null;
        }
    }

    /**
     * Get current authenticated user
     * References: profiles table (id links to auth.users)
     * @returns {Promise<Object|null>} Current user or null
     */
    async function getCurrentUser() {
        const session = await getCurrentSession();
        return session?.user || null;
    }

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} True if authenticated
     */
    async function isAuthenticated() {
        const session = await getCurrentSession();
        return !!session;
    }

    /**
     * Listen for auth state changes
     * @param {Function} callback - Callback function(event, session)
     * @returns {Object} Subscription object with unsubscribe method
     */
    function onAuthStateChange(callback) {
        const client = getSupabaseClient();
        if (!client) return { unsubscribe: () => { } };

        return client.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    }

    // =============================================================
    // STORAGE HELPERS
    // =============================================================

    /**
     * Get public URL for a file in storage
     * References: storage.buckets (categories, products)
     * @param {string} bucket - Bucket name ('categories' or 'products')
     * @param {string} path - File path within bucket
     * @returns {string} Public URL
     */
    function getStorageUrl(bucket, path) {
        const client = getSupabaseClient();
        if (!client) return '';

        const { data } = client.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    }


    // =============================================================
    // UI HELPERS
    // =============================================================

    /**
     * Show a toast notification using the enhanced UI system
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', 'warning', or 'info'
     */
    function showToast(message, type = 'info') {
        // Use the enhanced UI.showToast if available
        if (window.UI && typeof window.UI.showToast === 'function') {
            const colorMap = {
                success: '#27ae60',
                error: '#e74c3c',
                warning: '#f39c12',
                info: '#3498db'
            };
            window.UI.showToast(message, colorMap[type] || colorMap.info, { type });
            return;
        }

        // Fallback to basic toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 4000);
    }

    // =============================================================
    // ERROR HANDLING HELPERS
    // =============================================================

    /**
     * Format Supabase error for display
     * @param {Object} error - Supabase error object
     * @returns {string} User-friendly error message
     */
    function formatError(error) {
        if (!error) return 'An unknown error occurred';

        // Handle common Supabase auth errors
        const errorMessages = {
            'Invalid login credentials': 'Invalid email or password. Please try again.',
            'Email not confirmed': 'Please verify your email before logging in.',
            'User already registered': 'An account with this email already exists.',
            'Password should be at least 6 characters': 'Password must be at least 6 characters.',
            'Email rate limit exceeded': 'Too many attempts. Please try again later.',
            'Invalid email': 'Please enter a valid email address.',
            'signup_disabled': 'Registration is currently disabled.',
            'User not found': 'No account found with this email.'
        };

        return errorMessages[error.message] || error.message || 'An error occurred';
    }

    // =============================================================
    // EXPORTS
    // =============================================================

    // Make functions available globally for use in other files

    window.CarHouseSupabase = {
        init: initSupabaseClient,
        getClient: getSupabaseClient,
        getCurrentSession,
        getCurrentUser,
        isAuthenticated,
        onAuthStateChange,
        getStorageUrl,
        showToast,
        formatError
    };


    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSupabaseClient);
    } else {
        initSupabaseClient();
    }

})();

