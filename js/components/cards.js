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
                    <button class="favorite-btn ${window.FavoritesService.isFavorite(product.id) ? 'active' : ''}" 
                            data-product-id="${product.id}" 
                            style="width: 44px; border-radius: 6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
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
        return `
            <div class="category-card fade-in-up" data-category="${category.slug}" style="animation-delay: ${index * 0.1}s">
                <div class="category-card-image-wrapper">
                    <img src="${category.image_url || category.icon || 'https://via.placeholder.com/300'}" alt="${category.name}" class="category-card-image" onerror="this.src='https://via.placeholder.com/300?text=${category.name}';">
                </div>
                <h3 class="category-card-title">${category.name}</h3>
                <p class="category-card-description">${category.description || 'Browse products'}</p>
            </div>
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
