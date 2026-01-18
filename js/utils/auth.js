const AuthUI = {
    // Check cached session state immediately (synchronous)
    getCachedAuthState() {
        try {
            const cached = localStorage.getItem('_auth_state_cache');
            if (cached) {
                const { isLoggedIn, timestamp } = JSON.parse(cached);
                // Cache valid for 5 minutes
                if (Date.now() - timestamp < 300000) {
                    return isLoggedIn;
                }
            }
        } catch (e) {
            console.log('Cache read error:', e);
        }
        return null;
    },

    setCachedAuthState(isLoggedIn) {
        try {
            localStorage.setItem('_auth_state_cache', JSON.stringify({
                isLoggedIn,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.log('Cache write error:', e);
        }
    },

    clearCachedAuthState() {
        try {
            localStorage.removeItem('_auth_state_cache');
        } catch (e) {
            console.log('Cache clear error:', e);
        }
    },

    // Apply UI state immediately (synchronous)
    applyUIState(isLoggedIn) {
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = isLoggedIn ? 'flex' : 'none';
        });

        document.querySelectorAll('.guest-only').forEach(el => {
            el.style.display = isLoggedIn ? 'none' : 'flex';
        });

        // Remove loading state
        document.querySelectorAll('.auth-loading').forEach(el => {
            el.classList.remove('auth-loading');
        });
    },

    async updateUI() {
        // First, try to apply cached state immediately
        const cachedState = this.getCachedAuthState();
        if (cachedState !== null) {
            this.applyUIState(cachedState);
        }

        // Then verify with actual session
        const user = await window.CarHouseSupabase.getCurrentUser();
        const isLoggedIn = !!user;

        // Update cache
        this.setCachedAuthState(isLoggedIn);

        // Apply actual state
        this.applyUIState(isLoggedIn);

        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay && isLoggedIn) {
            userNameDisplay.textContent = user.email.split('@')[0];

            const { profile } = await window.AuthService.getProfile();
            if (profile && profile.full_name) {
                userNameDisplay.textContent = profile.full_name;
            }
        }
    },

    async logout() {
        this.clearCachedAuthState();
        await window.AuthService.logout();
        window.location.reload();
    }
};

window.AuthUI = AuthUI;
