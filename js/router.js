const Router = {
    init() {
        const initialCategory = this.getCategoryFromLocation();
        this.navigate(initialCategory, { replace: true });

        window.addEventListener('popstate', (e) => {
            const category = e.state?.category || this.getCategoryFromLocation();
            this.navigate(category, { skipHistory: true });
        });

        window.addEventListener('hashchange', () => {
            const category = this.getCategoryFromLocation();
            this.navigate(category, { skipHistory: true });
        });
    },

    getCategoryFromLocation() {
        const page = document.body?.dataset?.page || '';
        if (page && page !== 'category') {
            return this.normalizeCategory(page);
        }

        const hash = (window.location.hash || '').replace('#', '').trim();
        const params = new URLSearchParams(window.location.search);
        const queryCategory = params.get('category') || params.get('page') || '';
        const raw = hash || queryCategory || 'home';
        if (page === 'category') {
            return (raw || 'home').toString().replace(/^\//, '').toLowerCase();
        }
        return this.normalizeCategory(raw);
    },

    normalizeCategory(category) {
        const normalized = (category || '').toString().replace(/^\//, '').toLowerCase();
        if (this.isValidCategory(normalized)) return normalized;
        return 'home';
    },

    syncSearchTermFromLocation() {
        const params = new URLSearchParams(window.location.search);
        const term = params.get('term') || params.get('q') || '';
        if (term) {
            window.AppState.currentSearchTerm = term;
        }
    },

    isValidCategory(category) {
        if (!category) return false;
        const core = ['home', 'cart', 'checkout', 'service', 'favorites', 'about', 'search'];
        if (core.includes(category)) return true;

        const dynamic = (window.AppState?.categories || []).map(c => c.slug);
        return dynamic.includes(category);
    },

    navigate(category, options = {}) {
        const { replace = false, skipHistory = false } = options;
        const target = this.normalizeCategory(category);
        window.AppState.currentCategory = target;
        window.AppState.currentSearchTerm = '';
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        if (target === 'search') {
            this.syncSearchTermFromLocation();
            if (searchInput) searchInput.value = window.AppState.currentSearchTerm || '';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

        const page = document.body?.dataset?.page || '';
        const shouldSkipHistory = skipHistory || !!page;
        if (!shouldSkipHistory) {
            const url = `#${target}`;
            if (replace) {
                window.history.replaceState({ category: target }, '', url);
            } else {
                window.history.pushState({ category: target }, '', url);
            }
        }

        this.updateActiveNavLink(target);
        this.triggerTransition();

        switch (target) {
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
                window.CategoryPage.render(target);
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
