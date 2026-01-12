const AuthUI = {
    async updateUI() {
        const user = await window.CarHouseSupabase.getCurrentUser();
        const isLoggedIn = !!user;

        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = isLoggedIn ? 'flex' : 'none';
        });

        document.querySelectorAll('.guest-only').forEach(el => {
            el.style.display = isLoggedIn ? 'none' : 'flex';
        });

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
        await window.AuthService.logout();
        window.location.reload();
    }
};

window.AuthUI = AuthUI;
