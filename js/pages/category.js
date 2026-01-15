const CategoryPage = {
    async render(category) {
        const params = new URLSearchParams(window.location.search);
        const urlCategory = params.get('category');
        if (!category && urlCategory) {
            category = urlCategory;
        }

        const categories = window.AppState.categories || [];
        let categorySlug = (category || 'home').toString().trim();
        
        // Normalize the slug - handle both space-separated names and hyphenated slugs
        let normalizedSlug = categorySlug.toLowerCase().replace(/\s+/g, '-');

        console.log('[CategoryPage] Input category:', category);
        console.log('[CategoryPage] URL category:', urlCategory);
        console.log('[CategoryPage] Normalized slug:', normalizedSlug);
        console.log('[CategoryPage] Available categories:', categories.map(c => ({ name: c.name, slug: c.slug, id: c.id })));

        // Try multiple matching strategies
        let catObj = categories.find(c => c.slug === normalizedSlug);
        
        if (!catObj) {
            // Try exact match on original category string (for slugs with spaces)
            catObj = categories.find(c => c.slug?.toLowerCase() === categorySlug.toLowerCase());
        }
        
        if (!catObj) {
            // Try matching by name (case-insensitive)
            catObj = categories.find(c => c.name?.toLowerCase() === categorySlug.toLowerCase());
        }
        
        if (!catObj) {
            // Try matching by normalized name (e.g., "Engine spare parts" -> "engine-spare-parts")
            catObj = categories.find(c => 
                c.name?.toLowerCase().replace(/\s+/g, '-') === normalizedSlug
            );
        }
        
        if (!catObj) {
            // Try matching by slug normalized (e.g., database slug "Engine spare parts" -> "engine-spare-parts")
            catObj = categories.find(c => 
                c.slug?.toLowerCase().replace(/\s+/g, '-') === normalizedSlug
            );
        }
        
        if (!catObj) {
            // Try partial slug match (e.g., "engine" matches "engine-spare-parts" or vice versa)
            catObj = categories.find(c => 
                c.slug?.toLowerCase().includes(normalizedSlug) || 
                normalizedSlug.includes(c.slug?.toLowerCase())
            );
        }
        
        if (!catObj) {
            // Try partial name match
            catObj = categories.find(c => 
                c.name?.toLowerCase().includes(categorySlug.toLowerCase()) || 
                categorySlug.toLowerCase().includes(c.name?.toLowerCase())
            );
        }
        
        if (!catObj) {
            // Try matching by first keyword (e.g., "engine" from "engine-spare-parts")
            const firstKeyword = normalizedSlug.split('-')[0];
            if (firstKeyword && firstKeyword.length > 2) {
                catObj = categories.find(c => 
                    c.slug?.toLowerCase().startsWith(firstKeyword) || 
                    c.name?.toLowerCase().startsWith(firstKeyword)
                );
            }
        }
        
        if (catObj) {
            normalizedSlug = catObj.slug;
        }
        
        console.log('[CategoryPage] Found catObj:', catObj);
        categorySlug = normalizedSlug;

        if (!catObj && categorySlug !== 'search') {
            const catRes = await window.ProductsService.getCategoryBySlug(categorySlug);
            if (catRes.success && catRes.category) {
                catObj = catRes.category;
            }
        }

        const categoryName = catObj
            ? catObj.name
            : categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);

        window.UI.updateBreadcrumb([{ label: categoryName, action: () => window.location.href = `category.html?category=${encodeURIComponent(categorySlug)}` }]);

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
        const brandsRes = await window.ProductsService.getBrands(catObj?.id || null);
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
        const fetchOptions = {
            limit: 40
        };

        if (categorySlug === 'search') {
            const term = params.get('term') || params.get('q') || window.AppState.currentSearchTerm || '';
            window.AppState.currentSearchTerm = term;
            fetchOptions.search = term;
        } else if (catObj && catObj.id) {
            fetchOptions.categoryId = catObj.id;
            fetchOptions.categorySlug = categorySlug; // Also pass slug as fallback
        } else {
            fetchOptions.categorySlug = categorySlug;
        }

        console.log('[CategoryPage] Fetch options:', fetchOptions);
        let res = await window.ProductsService.getProducts(fetchOptions);
        console.log('[CategoryPage] Products result:', res);

        // If no products found with categoryId, try with slug only
        if (res.success && res.products.length === 0 && fetchOptions.categoryId) {
            console.log('[CategoryPage] No products found with categoryId, trying slug only...');
            const slugOnlyOptions = { ...fetchOptions };
            delete slugOnlyOptions.categoryId;
            res = await window.ProductsService.getProducts(slugOnlyOptions);
            console.log('[CategoryPage] Slug-only result:', res);
        }

        if (res.success) {
            const uiProducts = res.products.map(p => window.App.mapProductToUI(p));
            window.AppState.products[categorySlug] = uiProducts;
            this.renderProducts(categorySlug);
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
                    <button class="back-btn" onclick="window.location.href='index.html'">Back to Home</button>
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
