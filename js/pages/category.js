/**
 * ==========================================
 * CATEGORY PAGE
 * ==========================================
 * Displays products for a specific category with filtering and sorting
 */

const CategoryPage = {
    async render(category) {
        const params = new URLSearchParams(window.location.search);
        const urlCategory = params.get('category');
        if (!category && urlCategory) {
            category = urlCategory;
        }

        const categories = window.AppState.categories || [];
        const categorySlug = (category || 'home').toString().trim();
        
        // Use utility to find category
        const catObj = window.CategoryUtils.findCategory(categorySlug, categories);
        const normalizedSlug = catObj?.slug || window.CategoryUtils.normalizeSlug(categorySlug);

        // Fallback: fetch from API if not found locally
        let resolvedCategory = catObj;
        if (!resolvedCategory && normalizedSlug !== 'search') {
            const catRes = await window.ProductsService.getCategoryBySlug(normalizedSlug);
            if (catRes.success && catRes.category) {
                resolvedCategory = catRes.category;
            }
        }

        const categoryName = window.CategoryUtils.getDisplayName(resolvedCategory, normalizedSlug);
        const finalSlug = resolvedCategory?.slug || normalizedSlug;

        window.UI.updateBreadcrumb([{ 
            label: categoryName, 
            action: () => window.location.href = `category.html?category=${encodeURIComponent(finalSlug)}` 
        }]);

        this.renderLayout(categoryName);
        await this.loadFilters(resolvedCategory, finalSlug);
        await this.loadProducts(finalSlug, resolvedCategory, params);
    },

    renderLayout(categoryName) {
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
            <div id="products-grid" class="products-grid"></div>
        `;
        window.UI.renderProductSkeletons();
    },

    async loadFilters(categoryObj, categorySlug) {
        const brandsRes = await window.ProductsService.getBrands(categoryObj?.id || null);
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
                filter.onchange = () => {
                    window.AppState.currentFilterBrand = filter.value;
                    this.renderProducts(categorySlug);
                };
            }
        }

        const sortSelect = document.getElementById('sort-by');
        if (sortSelect) {
            sortSelect.value = window.AppState.currentSortBy;
            sortSelect.onchange = () => {
                window.AppState.currentSortBy = sortSelect.value;
                this.renderProducts(categorySlug);
            };
        }
    },

    async loadProducts(categorySlug, categoryObj, params) {
        const limit = window.AppConstants?.PAGINATION?.CATEGORY_LIMIT || 40;
        const fetchOptions = { limit };

        if (categorySlug === 'search') {
            const term = params.get('term') || params.get('q') || window.AppState.currentSearchTerm || '';
            window.AppState.currentSearchTerm = term;
            fetchOptions.search = term;
        } else if (categoryObj?.id) {
            fetchOptions.categoryId = categoryObj.id;
            fetchOptions.categorySlug = categorySlug;
        } else {
            fetchOptions.categorySlug = categorySlug;
        }

        let res = await window.ProductsService.getProducts(fetchOptions);

        // Retry with slug only if no results with categoryId
        if (res.success && res.products.length === 0 && fetchOptions.categoryId) {
            const slugOnlyOptions = { ...fetchOptions };
            delete slugOnlyOptions.categoryId;
            res = await window.ProductsService.getProducts(slugOnlyOptions);
        }

        if (res.success) {
            const uiProducts = res.products.map(p => window.App.mapProductToUI(p));
            window.AppState.products[categorySlug] = uiProducts;
            this.renderProducts(categorySlug);
        } else {
            this.renderError(res.error);
        }
    },

    renderProducts(category) {
        let productList = [...(window.AppState.products[category] || [])];

        // Apply filters
        if (window.AppState.currentFilterBrand !== 'all') {
            productList = productList.filter(p => p.brand === window.AppState.currentFilterBrand);
        }

        // Apply sorting
        switch (window.AppState.currentSortBy) {
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
            this.renderEmptyState(grid);
            return;
        }

        grid.className = 'products-grid';
        grid.innerHTML = productList.map((product, index) => 
            window.Cards.createProductCard(product, index)
        ).join('');
        window.UI.observeElements('.product-card');
    },

    renderEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state fade-in-up" style="grid-column: 1 / -1; width: 100%; text-align: center; padding: 100px 0;">
                <div class="empty-state-icon" style="font-size: 64px; margin-bottom: 20px;">🔍</div>
                <h3 style="font-size: 24px; color: white;">No products found</h3>
                <p style="color: #888; margin-bottom: 30px;">Try adjusting your search or filters to find what you're looking for.</p>
                <button class="back-btn" onclick="window.location.href='index.html'">Back to Home</button>
            </div>
        `;
    },

    renderError(error) {
        const grid = document.getElementById('products-grid');
        if (grid) {
            grid.innerHTML = `<p class="error" style="color: #e74c3c; text-align: center; padding: 40px;">Failed to load products: ${error}</p>`;
        }
    }
};

window.CategoryPage = CategoryPage;
