const Router = {
    navigate(category) {
        window.AppState.currentCategory = category;
        window.AppState.currentSearchTerm = '';
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        window.scrollTo({ top: 0, behavior: 'smooth' });

        this.updateActiveNavLink(category);
        this.triggerTransition();

        switch (category) {
            case 'home':
                window.HomePage.render();
                break;
            case 'cart':
                window.CartPage.render();
                break;
            case 'checkout':
                window.CheckoutPage.render();
                break;
            case 'service':
                window.ServicePage.render();
                break;
            case 'favorites':
                window.FavoritesPage.render();
                break;
            case 'about':
                window.AboutPage.render();
                break;
            default:
                window.CategoryPage.render(category);
                break;
        }
    },

    updateActiveNavLink(category) {
        document.querySelectorAll('.nav-links button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
    },

    triggerTransition() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        mainContent.classList.remove('fade-in-up');
        void mainContent.offsetWidth; // Force reflow
        mainContent.classList.add('fade-in-up');
    }
};

window.Router = Router;
