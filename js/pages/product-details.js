const ProductDetailsPage = {
    async render() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (!productId) {
            window.location.href = 'index.html';
            return;
        }

        // We might need to fetch the product if not in state
        let product = Object.values(window.AppState.products).flat().find(p => p.id === productId);

        if (!product) {
            const res = await window.ProductsService.getProductById(productId);
            if (res.success) {
                product = window.App.mapProductToUI(res.product);
            }
        }

        if (!product) {
            document.getElementById('product-details-container').innerHTML = '<h2>Product not found</h2>';
            return;
        }

        document.getElementById('product-details-container').innerHTML = `
            <button onclick="history.back()" class="back-btn-modern">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
                Back
            </button>
            <div class="product-details-content fade-in-up" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; background: rgba(255,255,255,0.03); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px);">
                <div class="product-details-image" style="background: white; border-radius: 15px; padding: 20px; display: flex; align-items: center; justify-content: center; height: 450px;">
                    <img src="${product.icon}" alt="${product.name}" onerror="this.src=''; this.alt='Image not found'; this.style.display='none';" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <div class="product-details-info">
                    <div class="product-brand" style="font-size: 16px; color: var(--accent-color); font-weight: 700; text-transform: uppercase; margin-bottom: 10px;">${product.brand}</div>
                    <h2 style="margin: 0 0 15px 0; color: white; font-size: 32px; font-weight: 800;">${product.name}</h2>
                    <div class="product-price" style="font-size: 36px; color: var(--secondary-color); font-weight: 700; margin-bottom: 25px;">${product.price.toFixed(2)} <span class="currency-symbol" style="font-size: 18px;">EGP</span></div>
                    
                    <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                        <p style="color: #ccc; font-size: 16px; line-height: 1.8; margin: 0;">${product.description}</p>
                    </div>

                    <div class="product-specs" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                        <div class="spec-item">
                            <span style="display: block; font-size: 12px; color: #666; text-transform: uppercase;">SKU / PART NO</span>
                            <span style="font-weight: 600;">${product.sku || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span style="display: block; font-size: 12px; color: #666; text-transform: uppercase;">Category</span>
                            <span style="font-weight: 600;">${product.category || 'Standard'}</span>
                        </div>
                        <div class="spec-item">
                             <span style="display: block; font-size: 12px; color: #666; text-transform: uppercase;">Stock Status</span>
                             <span style="color: ${product.stock > 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                                 ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                             </span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 15px;">
                        <button class="add-to-cart-btn" data-product-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''} style="flex: 2; height: 55px; font-size: 18px; font-weight: 700;">
                            ${product.stock <= 0 ? 'NOT AVAILABLE' : 'ADD TO CART'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.loadReviews(productId);
    },

    async loadReviews(productId) {
        const res = await window.ProductsService.getProductReviews(productId);
        if (res.success && res.reviews.length > 0) {
            // ... review rendering ...
        }
    }
};

window.ProductDetailsPage = ProductDetailsPage;
