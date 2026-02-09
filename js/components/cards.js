const Cards = {
    createProductCard(product, index) {
        const isOutOfStock = product.stock <= 0;
        return `
            <div class="product-card fade-in-up ${isOutOfStock ? 'out-of-stock' : ''}" 
                 data-product-id="${product.id}" 
                 style="animation-delay: ${index * 0.05}s;">
                <div class="product-image">
                    <img src="${product.icon}" alt="${product.name}" onerror="this.src=''; this.alt='Image not found'; this.style.display='none';">
                    ${isOutOfStock ? '<span class="stock-badge" style="position: absolute; top: 10px; right: 10px; background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Out of Stock</span>' : ''}
                </div>
                <div class="product-brand">${product.brand}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">${product.price.toFixed(2)} <span class="currency-symbol">EGP</span></div>
                <div class="product-actions" style="display: flex; gap: 8px;">
                    <button class="view-details-btn" data-product-id="${product.id}" style="flex: 1;">View Details</button>
                    <button class="favorite-btn ${window.FavoritesService && window.FavoritesService.isFavorite(product.id) ? 'active' : ''}" 
                            data-product-id="${product.id}" 
                            style="width: 44px; border-radius: 6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" class="heart-icon">
                            <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
                        </svg>
                    </button>
                </div>
                <button class="add-to-cart-btn" data-product-id="${product.id}" ${isOutOfStock ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        `;
    },

    createCategoryCard(category, index) {
        const categoryPath = window.getPagePath('category');
        return `
            <a class="category-card fade-in-up" href="${categoryPath}?category=${encodeURIComponent(category.slug)}" style="animation-delay: ${index * 0.1}s">
                <div class="category-card-image-wrapper">
                    <img src="${category.image_url || category.icon || 'https://via.placeholder.com/300'}" alt="${category.name}" class="category-card-image" onerror="this.src='https://via.placeholder.com/300?text=${category.name}';">
                </div>
                <h3 class="category-card-title">${category.name}</h3>
                <p class="category-card-description">${category.description || 'Browse products'}</p>
            </a>
        `;
    },

    createPartCard(part) {
        return `
            <div class="part-card">
              <div class="part-image-bg">
                <img src="${part.icon || ''}" alt="${part.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
              </div>
              <div class="part-name">${part.name}</div>
              <div class="part-price-tag">${part.price.toFixed(2)} EGP</div>
            </div>
        `;
    }
};

window.Cards = Cards;
