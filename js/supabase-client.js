
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
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', or 'info'
     */
    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>`,
            info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.308.533.19 0 .452-.084.826-.252l-.4.25c-.284.19-.444.246-.5.246-.056 0-.102-.026-.144-.078.04-.05.05.097.05.131 0 .041-.01.082-.03.136l-.1.35c-.02.08-.02.12-.02.152 0 .054.02.083.08.083.053 0 .12-.023.213-.07zM8 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>`
        };

        toast.innerHTML = `
            ${icons[type] || icons.info}
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
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

