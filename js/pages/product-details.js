const ProductDetailsPage = {
    async render() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (!productId) {
            window.location.href = window.getPagePath('index');
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

        // Get rating info
        const ratingDisplay = this.renderRatingStars(product.rating || 0, product.rating_count || 0);

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
                    
                    <!-- Rating Display -->
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                        ${ratingDisplay}
                    </div>
                    
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
            
            <!-- Rating Section -->
            <div id="rating-section" style="margin-top: 40px; background: rgba(255,255,255,0.03); padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: white; margin-bottom: 20px;">Customer Reviews</h3>
                <div id="rating-form-container"></div>
                <div id="reviews-list"></div>
            </div>
        `;

        this.loadReviews(productId, product);
        this.attachEventListeners();
    },

    renderRatingStars(rating, count) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHTML = '<div style="display: flex; align-items: center; gap: 5px;">';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<span style="color: #FFC700; font-size: 20px;">★</span>';
        }
        
        // Half star
        if (hasHalfStar) {
            starsHTML += '<span style="color: #FFC700; font-size: 20px;">⯨</span>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<span style="color: #666; font-size: 20px;">★</span>';
        }
        
        starsHTML += `<span style="color: #ccc; margin-left: 8px; font-size: 16px;">${rating.toFixed(1)} (${count} reviews)</span>`;
        starsHTML += '</div>';
        
        return starsHTML;
    },

    async loadReviews(productId, product) {
        const user = await window.CarHouseSupabase.getCurrentUser();
        const container = document.getElementById('rating-form-container');
        
        // Show rating form for logged-in users
        if (user) {
            container.innerHTML = `
                <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                    <h4 style="color: white; margin-bottom: 15px;">Rate this product</h4>
                    <div style="margin-bottom: 15px;">
                        <div id="star-rating" style="display: flex; gap: 5px; cursor: pointer;">
                            ${[1,2,3,4,5].map(i => `<span data-rating="${i}" style="color: #666; font-size: 30px;">★</span>`).join('')}
                        </div>
                        <input type="hidden" id="selected-rating" value="0">
                    </div>
                    <textarea id="review-comment" placeholder="Write your review (optional)" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #444; background: rgba(0,0,0,0.3); color: white; min-height: 100px; resize: vertical;"></textarea>
                    <button id="submit-review-btn" style="margin-top: 15px; padding: 12px 24px; background: var(--secondary-color); color: black; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
                        Submit Review
                    </button>
                </div>
            `;
            this.initializeStarRating();
        } else {
            container.innerHTML = `
                <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
                    <p style="color: #ccc;">Please <a href="" onclick="window.location.href=window.getPagePath('login'); return false;" style="color: var(--secondary-color);">login</a> to leave a review</p>
                </div>
            `;
        }
        
        // Load existing reviews
        const res = await window.ReviewsService.getProductReviews(productId);
        const reviewsList = document.getElementById('reviews-list');
        
        if (res.success && res.reviews && res.reviews.length > 0) {
            reviewsList.innerHTML = res.reviews.map(review => {
                const displayName = review.reviewer?.full_name || 
                                   review.reviewer?.email?.split('@')[0] || 
                                   'Anonymous';
                return `
                <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div>
                            <strong style="color: white;">${displayName}</strong>
                            <div style="display: flex; gap: 3px; margin-top: 5px;">
                                ${Array(5).fill(0).map((_, i) => 
                                    `<span style="color: ${i < review.rating ? '#FFC700' : '#666'}; font-size: 16px;">★</span>`
                                ).join('')}
                            </div>
                        </div>
                        <span style="color: #888; font-size: 14px;">${new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    ${review.comment ? `<p style="color: #ccc; margin: 0;">${review.comment}</p>` : ''}
                </div>
            `;
            }).join('');
        } else {
            reviewsList.innerHTML = '<p style="color: #888; text-align: center;">No reviews yet. Be the first to review!</p>';
        }
    },

    initializeStarRating() {
        const stars = document.querySelectorAll('#star-rating span');
        const ratingInput = document.getElementById('selected-rating');
        
        stars.forEach(star => {
            star.addEventListener('mouseenter', function() {
                const rating = parseInt(this.dataset.rating);
                stars.forEach((s, i) => {
                    s.style.color = i < rating ? '#FFC700' : '#666';
                });
            });
            
            star.addEventListener('click', function() {
                const rating = parseInt(this.dataset.rating);
                ratingInput.value = rating;
                stars.forEach((s, i) => {
                    s.style.color = i < rating ? '#FFC700' : '#666';
                });
            });
        });
        
        document.getElementById('star-rating').addEventListener('mouseleave', function() {
            const selectedRating = parseInt(ratingInput.value);
            stars.forEach((s, i) => {
                s.style.color = i < selectedRating ? '#FFC700' : '#666';
            });
        });
        
        // Submit handler
        document.getElementById('submit-review-btn').addEventListener('click', async () => {
            await this.submitReview();
        });
    },

    async submitReview() {
        const rating = parseInt(document.getElementById('selected-rating').value);
        const comment = document.getElementById('review-comment').value.trim();
        
        if (rating === 0) {
            window.UI.showToast('Please select a rating', window.AppConstants.TOAST_COLORS.ERROR);
            return;
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        const result = await window.ReviewsService.createReview({
            product_id: productId,
            rating: rating,
            comment: comment || null
        });
        
        if (result.success) {
            window.UI.showToast('Review submitted successfully!', window.AppConstants.TOAST_COLORS.SUCCESS);
            
            // Clear the form
            document.getElementById('selected-rating').value = '0';
            document.getElementById('review-comment').value = '';
            
            // Reset stars
            const stars = document.querySelectorAll('#star-rating span');
            stars.forEach(s => s.style.color = '#666');
            
            // Hide the review form
            const formContainer = document.getElementById('rating-form-container');
            formContainer.innerHTML = `
                <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
                    <p style="color: #27ae60; font-weight: 600;">Thank you for your review!</p>
                </div>
            `;
            
            // Reload reviews and update rating display
            await this.reloadReviews(productId);
        } else {
            window.UI.showToast(result.error || 'Failed to submit review', window.AppConstants.TOAST_COLORS.ERROR);
        }
    },

    async reloadReviews(productId) {
        // Reload the product to get updated rating
        const res = await window.ProductsService.getProductById(productId);
        if (res.success) {
            const product = window.App.mapProductToUI(res.product);
            
            // Update the rating display
            const ratingDisplay = this.renderRatingStars(product.rating || 0, product.rating_count || 0);
            const ratingContainer = document.querySelector('.product-details-info').querySelector('div[style*="display: flex; align-items: center; gap: 10px"]');
            if (ratingContainer) {
                ratingContainer.innerHTML = ratingDisplay;
            }
        }
        
        // Reload the reviews list
        const reviewsRes = await window.ReviewsService.getProductReviews(productId);
        const reviewsList = document.getElementById('reviews-list');
        
        if (reviewsRes.success && reviewsRes.reviews && reviewsRes.reviews.length > 0) {
            reviewsList.innerHTML = reviewsRes.reviews.map(review => {
                const displayName = review.reviewer?.full_name || 
                                   review.reviewer?.email?.split('@')[0] || 
                                   'Anonymous';
                return `
                <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div>
                            <strong style="color: white;">${displayName}</strong>
                            <div style="display: flex; gap: 3px; margin-top: 5px;">
                                ${Array(5).fill(0).map((_, i) => 
                                    `<span style="color: ${i < review.rating ? '#FFC700' : '#666'}; font-size: 16px;">★</span>`
                                ).join('')}
                            </div>
                        </div>
                        <span style="color: #888; font-size: 14px;">${new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    ${review.comment ? `<p style="color: #ccc; margin: 0;">${review.comment}</p>` : ''}
                </div>
            `;
            }).join('');
        }
    },

    attachEventListeners() {
        // Add to cart buttons handled by app.integration.js global listener
        // No need to duplicate event listeners here
    }
};

window.ProductDetailsPage = ProductDetailsPage;
