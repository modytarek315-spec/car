/**
 * =============================================================
 * AUTHENTICATION SERVICE
 * =============================================================
 * Handles all authentication operations including:
 * - Login (Email + Password)
 * - Registration
 * - Password Reset
 * - Session Management
 * - Profile Management
 * 
 * Database Tables Referenced:
 * - profiles: User profile data (id, email, full_name, avatar_url, phone, role)
 * - admins: Admin permissions (user_id, role)
 * 
 * UI Hooks Used:
 * - None (logic-only, connects to existing UI via events)
 * =============================================================
 */

const AuthService = {

    /**
     * Register a new user
     * Creates auth.users record (via Supabase Auth) and 
     * profiles record (via database trigger: handle_new_user)
     * 
     * @param {Object} userData - User registration data
     * @param {string} userData.email - User email
     * @param {string} userData.password - User password (min 6 chars)
     * @param {string} userData.fullName - User full name
     * @param {string} [userData.phone] - Optional phone number
     * @returns {Promise<Object>} { success, user, error }
     */
    async register({ email, password, fullName, phone = null }) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            // Create auth user with metadata
            // The handle_new_user trigger will create the profiles record
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        phone: phone,
                        role: 'customer' // Default role for new users
                    }
                }
            });

            if (error) throw error;

            // If we have a user but need to update profile with phone
            if (data.user && phone) {
                await this.updateProfile({ phone });
            }

            return {
                success: true,
                user: data.user,
                message: data.session
                    ? 'Registration successful!'
                    : 'Please check your email to verify your account.'
            };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Login with email and password
     * Checks if user is blocked (profiles.blocked = true)
     * 
     * @param {Object} credentials - Login credentials
     * @param {string} credentials.email - User email
     * @param {string} credentials.password - User password
     * @returns {Promise<Object>} { success, user, session, error }
     */
    async login({ email, password }) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Check if user is blocked
            // References: profiles.blocked column (not in original schema, but in requirements)
            // Note: If blocked column doesn't exist, this check will be skipped gracefully
            const { data: profile, error: profileError } = await client
                .from('profiles')
                .select('blocked')
                .eq('id', data.user.id)
                .single();

            if (!profileError && profile?.blocked === true) {
                // Sign out the blocked user
                await client.auth.signOut();
                return {
                    success: false,
                    error: 'Your account has been suspended. Please contact support.'
                };
            }

            return {
                success: true,
                user: data.user,
                session: data.session
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Logout current user
     * Clears session and local storage
     * 
     * @returns {Promise<Object>} { success, error }
     */
    async logout() {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { error } = await client.auth.signOut();
            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Send password reset email
     * 
     * @param {string} email - User email address
     * @param {string} [redirectTo] - URL to redirect after reset
     * @returns {Promise<Object>} { success, error }
     */
    async forgotPassword(email, redirectTo = window.location.origin + '/reset-password.html') {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { error } = await client.auth.resetPasswordForEmail(email, {
                redirectTo
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Password reset email sent. Please check your inbox.'
            };
        } catch (error) {
            console.error('Forgot password error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Update user password (after reset)
     * 
     * @param {string} newPassword - New password (min 6 chars)
     * @returns {Promise<Object>} { success, error }
     */
    async updatePassword(newPassword) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { error } = await client.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Password updated successfully!'
            };
        } catch (error) {
            console.error('Update password error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Get current user profile from profiles table
     * 
     * Table: profiles
     * Columns: id, email, full_name, avatar_url, phone, role, created_at, updated_at
     * RLS: profiles_select_own - users can only see their own profile
     * 
     * @returns {Promise<Object>} { success, profile, error }
     */
    async getProfile() {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const user = await window.CarHouseSupabase.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            const { data, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            return {
                success: true,
                profile: data
            };
        } catch (error) {
            console.error('Get profile error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Update user profile
     * 
     * Table: profiles
     * Columns that can be updated: full_name, phone, avatar_url
     * RLS: profiles_update_own - users can only update their own profile
     * 
     * @param {Object} updates - Profile updates
     * @param {string} [updates.fullName] - New full name
     * @param {string} [updates.phone] - New phone number
     * @param {string} [updates.avatarUrl] - New avatar URL
     * @returns {Promise<Object>} { success, profile, error }
     */
    async updateProfile(params) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        const fullName = params.fullName || params.full_name;
        const phone = params.phone;
        const address = params.address;
        const avatarUrl = params.avatarUrl || params.avatar_url;

        try {
            const user = await window.CarHouseSupabase.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            // Build update object with only provided fields
            const updates = {
                updated_at: new Date().toISOString()
            };

            if (fullName !== undefined) updates.full_name = fullName;
            if (phone !== undefined) updates.phone = phone;
            if (address !== undefined) updates.address = address;
            if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

            const { data, error } = await client
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                profile: data
            };
        } catch (error) {
            console.error('Update profile error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Upload profile avatar to Supabase Storage
     * 
     * @param {File} file - The image file to upload
     * @returns {Promise<Object>} { success, publicUrl, error }
     */
    async uploadAvatar(file) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) return { success: false, error: 'Supabase client not initialized' };

        try {
            const user = await window.CarHouseSupabase.getCurrentUser();
            if (!user) return { success: false, error: 'Not authenticated' };

            // 1. Upload file
            // We use user.id as folder to keep it organized
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await client.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = client.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // 3. Update profile with new URL
            await this.updateProfile({ avatarUrl: publicUrl });

            return {
                success: true,
                publicUrl
            };
        } catch (error) {
            console.error('Avatar upload error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Check if current user has admin role
     * 
     * Uses the is_admin() function defined in database.sql
     * Checks both admins table and profiles.role
     * 
     * @returns {Promise<boolean>} True if user is admin
     */
    async isAdmin() {
        const client = window.CarHouseSupabase.getClient();
        if (!client) return false;

        try {
            const { data, error } = await client.rpc('is_admin');
            if (error) throw error;
            return data === true;
        } catch (error) {
            console.error('Check admin error:', error);
            return false;
        }
    },

    /**
     * Restore session on page load
     * Call this on app initialization to restore user session
     * 
     * @returns {Promise<Object>} { success, session, error }
     */
    async restoreSession() {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data: { session }, error } = await client.auth.getSession();
            if (error) throw error;

            if (session) {
                // Check if user is blocked
                const { data: profile } = await client
                    .from('profiles')
                    .select('blocked')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.blocked === true) {
                    await client.auth.signOut();
                    return {
                        success: false,
                        error: 'Your account has been suspended.'
                    };
                }

                return {
                    success: true,
                    session
                };
            }

            return {
                success: true,
                session: null
            };
        } catch (error) {
            console.error('Restore session error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    }
};

// Export globally
window.AuthService = AuthService;
