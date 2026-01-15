const CategoryPage = {
    async render(category) {
        const categories = window.AppState.categories;
        const catObj = categories.find(c => c.slug === category);
        const categoryName = catObj ? catObj.name : category.charAt(0).toUpperCase() + category.slice(1);

        window.UI.updateBreadcrumb([{ label: categoryName, action: () => window.Router.navigate(category) }]);

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <div>
                   <h1 class="page-title">${categoryName}</h1>
                   <p class="page-subtitle">Quality selection for your vehicle</p>
                </div>
                <div class="flex gap-4">
                    <select id="brand-filter" class="search-input" style="width: auto; padding: 10px;">
                        <option value="all">All Brands</option>
                    </select>
                    <select id="sort-by" class="search-input" style="width: auto; padding: 10px;">
                        <option value="name">Sort by Name</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                    </select>
                </div>
            </div>
            <div id="products-grid"></div>
        `;

        window.UI.renderProductSkeletons();

        // Fetch brands for this category
        const brandsRes = await window.ProductsService.getBrands(catObj?.id);
        if (brandsRes.success) {
            const filter = document.getElementById('brand-filter');
            if (filter) {
                brandsRes.brands.forEach(brand => {
                    const opt = document.createElement('option');
                    opt.value = brand;
                    opt.textContent = brand;
                    filter.appendChild(opt);
                });
                filter.value = window.AppState.currentFilterBrand;
                filter.onchange = (e) => {
                    window.AppState.currentFilterBrand = e.target.value;
                    this.renderProducts(category);
                };
            }
        }

        const sortSelect = document.getElementById('sort-by');
        if (sortSelect) {
            sortSelect.value = window.AppState.currentSortBy;
            sortSelect.onchange = (e) => {
                window.AppState.currentSortBy = e.target.value;
                this.renderProducts(category);
            };
        }

        // Fetch products for this category specifically
        // Fetch products for this category specifically
        const fetchOptions = {
            limit: 40
        };

        if (category === 'search') {
            fetchOptions.search = window.AppState.currentSearchTerm;
        } else if (catObj) {
            fetchOptions.categoryId = catObj.id;
        } else {
            fetchOptions.categorySlug = category;
        }

        const res = await window.ProductsService.getProducts(fetchOptions);

        if (res.success) {
            const uiProducts = res.products.map(p => window.App.mapProductToUI(p));
            window.AppState.products[category] = uiProducts;
            this.renderProducts(category);
        } else {
            const grid = document.getElementById('products-grid');
            if (grid) grid.innerHTML = `<p class="error">Failed to load products: ${res.error}</p>`;
        }
    },

    renderProducts(category) {
        let productList = [...(window.AppState.products[category] || [])];

        const filterBrand = window.AppState.currentFilterBrand;
        const sortBy = window.AppState.currentSortBy;

        if (filterBrand !== 'all') {
            productList = productList.filter(p => p.brand === filterBrand);
        }

        switch (sortBy) {
            case 'price-low':
                productList.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                productList.sort((a, b) => b.price - a.price);
                break;
            default:
                productList.sort((a, b) => a.name.localeCompare(b.name));
        }

        const grid = document.getElementById('products-grid');
        if (!grid) return;

        if (productList.length === 0) {
            grid.innerHTML = `
                <div class="empty-state fade-in-up" style="grid-column: 1 / -1; width: 100%; text-align: center; padding: 100px 0;">
                    <div class="empty-state-icon" style="font-size: 64px; margin-bottom: 20px;">🔍</div>
                    <h3 style="font-size: 24px; color: white;">No products found</h3>
                    <p style="color: #888; margin-bottom: 30px;">Try adjusting your search or filters to find what you're looking for.</p>
                    <button class="back-btn" onclick="window.Router.navigate('home')">Back to Home</button>
                </div>
            `;
            return;
        }

        grid.className = 'products-grid';
        grid.innerHTML = productList.map((product, index) => window.Cards.createProductCard(product, index)).join('');
        window.UI.observeElements('.product-card');
    }
};

window.CategoryPage = CategoryPage;
