const FavoritesPage = {
    async render() {
        const mainContent = document.getElementById('main-content');
        window.UI.updateBreadcrumb([{ label: 'My Favorites', action: () => window.Router.navigate('favorites') }]);

        mainContent.innerHTML = `
            <h1 class="page-title">My Favorites</h1>
            <p class="page-subtitle">Your personally curated collection of parts</p>
            <div id="products-grid" class="products-grid"></div>
        `;

        const { favorites } = await window.FavoritesService.getFavoritesWithDetails();
        const grid = document.getElementById('products-grid');

        if (!favorites || favorites.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">❤️</div>
                    <h3>Your wishlist is empty</h3>
                    <p>Save products you love to keep track of them here.</p>
                    <button class="back-btn" onclick="window.Router.navigate('home')" style="margin-top: 20px;">Browse Shop</button>
                </div>
            `;
            return;
        }

        const uiProducts = favorites.filter(f => f.product).map(f => window.App.mapProductToUI(f.product));
        window.AppState.products['favorites'] = uiProducts;

        grid.innerHTML = uiProducts.map((product, index) => window.Cards.createProductCard(product, index)).join('');
        window.UI.observeElements('.product-card');
    }
};

window.FavoritesPage = FavoritesPage;
