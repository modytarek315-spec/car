/**
 * =============================================================
 * APP INTEGRATION - CONNECTS SERVICES TO EXISTING UI
 * =============================================================
 * This file bridges the Supabase services with the existing UI.
 * It provides the integration layer between:
 * - Supabase service layer (js/services/*.js)
 * - Existing UI (script.js, HTML pages)
 * 
 * IMPORTANT: This file does NOT modify any HTML or CSS.
 * It only connects logic to existing UI elements.
 * 
 * UI Hooks Connected:
 * - #cart-btn, #cart-count: Cart functionality
 * - #search-input, #search-btn: Search functionality
 * - [data-category]: Category navigation
 * - .add-to-cart-btn: Add to cart buttons
 * - .favorite-btn: Favorite toggle buttons
 * - #checkout-form: Checkout form
 * - #service-booking-form: Service booking form
 * - And more...
 * =============================================================
 */

const AppIntegration = {

    /**
     * Current user session
     */
    currentUser: null,

    /**
     * Initialize the app integration
     * Call this after Supabase client is initialized
     */
    async init() {
        console.log('Initializing Car House App Integration...');

        // Wait for Supabase to be ready
        await this.waitForSupabase();

        // Restore session
        await this.restoreSession();

        // Setup auth state listener
        this.setupAuthListener();

        // Setup event listeners
        this.setupEventListeners();

        // Update UI based on auth state
        await this.updateAuthUI();

        // Initialize Favorites from Supabase
        if (window.FavoritesService) {
            await window.FavoritesService.init();
        }

        // Update cart count
        if (window.CartService) {
            window.CartService.updateCartUI();
        }

        console.log('App Integration initialized successfully');
    },

    /**
     * Wait for Supabase client to be ready
     */
    async waitForSupabase() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.CarHouseSupabase && window.CarHouseSupabase.getClient()) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    },

    /**
     * Restore user session on page load
     */
    async restoreSession() {
        if (!window.AuthService) return;

        try {
            const result = await window.AuthService.restoreSession();
            if (result.success && result.session) {
                this.currentUser = result.session.user;
                console.log('Session restored for:', this.currentUser.email);

                // Sync favorites on session restore
                if (window.FavoritesService) {
                    await window.FavoritesService.syncWithSupabase();
                }
            }
        } catch (error) {
            console.error('Session restore error:', error);
        }
    },

    /**
     * Setup auth state change listener
     */
    setupAuthListener() {
        if (!window.CarHouseSupabase) return;

        window.CarHouseSupabase.onAuthStateChange(async (event, session) => { // Made async to allow await
            console.log('Auth state changed:', event);

            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                // Sync favorites on login
                if (window.FavoritesService) {
                    await window.FavoritesService.syncWithSupabase();
                }
                this.updateAuthUI();
                this.onUserLoggedIn();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                // Clear favorites on logout
                if (window.FavoritesService) {
                    await window.FavoritesService.clearFavorites();
                }
                this.updateAuthUI();
                this.onUserLoggedOut();
            }
        });
    },

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Override add to cart to use Supabase service
        document.addEventListener('click', async (e) => {
            // Add to cart with stock check
            if (e.target.matches('.add-to-cart-btn')) {
                e.preventDefault();
                const productId = e.target.dataset.productId;
                await this.handleAddToCart(productId, e.target);
            }

            // Favorite toggle
            if (e.target.matches('.favorite-btn, .favorite-btn *')) {
                e.preventDefault();
                const btn = e.target.closest('.favorite-btn');
                const productId = btn?.dataset.productId;
                if (productId && productId !== 'null' && productId !== 'undefined') {
                    await this.handleToggleFavorite(productId, btn);
                }
            }

            // View product details
            if (e.target.matches('.view-details-btn')) {
                const productId = e.target.dataset.productId;
                // This is already handled by script.js
            }

            // Login button
            if (e.target.matches('#login-btn, .login-btn')) {
                e.preventDefault();
                this.showLoginModal();
            }

            // Logout button
            if (e.target.matches('#logout-btn, .logout-btn')) {
                e.preventDefault();
                await this.handleLogout();
            }

            // Profile button
            if (e.target.matches('#profile-btn, .profile-btn')) {
                e.preventDefault();
                this.showProfilePage();
            }
        });

        // Checkout flow is now multi-step and handled by script.js + submitFinalOrder
        document.addEventListener('submit', async (e) => {
            /*
            if (e.target.matches('#checkout-form')) {
                e.preventDefault();
                await this.handleCheckout(e.target);
            }
            */

            // Login form
            if (e.target.matches('#login-form')) {
                e.preventDefault();
                await this.handleLogin(e.target);
            }

            // Register form
            if (e.target.matches('#register-form')) {
                e.preventDefault();
                await this.handleRegister(e.target);
            }

            // Forgot password form
            if (e.target.matches('#forgot-password-form')) {
                e.preventDefault();
                await this.handleForgotPassword(e.target);
            }

            /*
            // Service booking is now handled by script.js to ensure proper ID mapping
            if (e.target.matches('#service-booking-form')) {
                e.preventDefault();
                await this.handleServiceBooking(e.target);
            }
            */

            // Profile update form
            if (e.target.matches('#profile-form')) {
                e.preventDefault();
                await this.handleProfileUpdate(e.target);
            }

            // Review form
            if (e.target.matches('#review-form')) {
                e.preventDefault();
                await this.handleReviewSubmit(e.target);
            }

            // Coupon form
            if (e.target.matches('#coupon-form')) {
                e.preventDefault();
                await this.handleApplyCoupon(e.target);
            }
        });

        // Coupon input
        document.addEventListener('click', async (e) => {
            if (e.target.matches('#apply-coupon-btn')) {
                e.preventDefault();
                const input = document.getElementById('coupon-input');
                if (input) {
                    await this.handleApplyCouponCode(input.value);
                }
            }

            if (e.target.matches('#remove-coupon-btn')) {
                e.preventDefault();
                this.handleRemoveCoupon();
            }
        });
    },

    /**
     * Update UI based on auth state
     */
    async updateAuthUI() {
        const isLoggedIn = !!this.currentUser;

        // Show/hide auth-dependent elements
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = isLoggedIn ? 'flex' : 'none';
        });

        document.querySelectorAll('.guest-only').forEach(el => {
            el.style.display = isLoggedIn ? 'none' : 'flex';
        });

        // Update user name display if exists
        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay && this.currentUser) {
            // First show email as fallback
            userNameDisplay.textContent = this.currentUser.email.split('@')[0];

            // Try to get profile name
            if (window.AuthService) {
                const { profile } = await window.AuthService.getProfile();
                if (profile && profile.full_name) {
                    userNameDisplay.textContent = profile.full_name;
                }
            }
        }
    },

    /**
     * Handle add to cart with stock check
     * 
     * @param {string} productId - Product ID
     * @param {HTMLElement} button - The clicked button
     */
    async handleAddToCart(productId, button) {
        if (!window.CartService || !window.ProductsService) {
            // Fallback to existing behavior
            return;
        }

        // Disable button
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Adding...';

        try {
            // Get product details from Supabase
            const productResult = await window.ProductsService.getProductById(productId);

            if (!productResult.success) {
                // Fallback: try to get from existing data
                this.showToast(productResult.error || 'Product not found', '#e74c3c');
                return;
            }

            const product = productResult.product;

            // Check stock
            if (product.stock <= 0) {
                this.showToast('This product is out of stock', '#e74c3c');
                return;
            }

            // Add to cart
            const result = await window.CartService.addToCart(product);

            if (result.success) {
                this.showToast(result.message);
                this.bounceCartIcon();
            } else {
                if (result.requiresAuth) {
                    this.showToast('Please login to add items to cart', '#f39c12');
                    // Still add to localStorage cart for guests
                }
                this.showToast(result.error || 'Failed to add to cart', '#e74c3c');
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            this.showToast('Failed to add to cart', '#e74c3c');
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    },

    /**
     * Handle favorite toggle
     * 
     * @param {string} productId - Product ID
     * @param {HTMLElement} button - The clicked button
     */
    async handleToggleFavorite(productId, button) {
        if (!window.FavoritesService) return;

        if (!this.currentUser) {
            this.showToast('Please login to save favorites', '#f39c12');
            return;
        }

        try {
            // Get product info if available
            const product = { id: productId };

            const result = await window.FavoritesService.toggleFavorite(product);

            if (result.success) {
                // Toggle active class on button
                button.classList.toggle('active', result.isFavorite);
                this.showToast(result.message);
            } else {
                if (result.requiresAuth) {
                    this.showToast('Please login to save favorites', '#f39c12');
                } else {
                    this.showToast(result.error || 'Failed to update favorites', '#e74c3c');
                }
            }
        } catch (error) {
            console.error('Toggle favorite error:', error);
            this.showToast('Failed to update favorites', '#e74c3c');
        }
    },

    /**
     * Handle checkout form submission
     * 
     * @param {HTMLFormElement} form - Checkout form
     */
    async handleCheckout(form) {
        if (!window.OrdersService) return;

        // Check auth
        if (!this.currentUser) {
            this.showToast('Please login to complete your order', '#f39c12');
            this.showLoginModal();
            return;
        }

        const submitBtn = form.querySelector('#submit-order-btn, [type="submit"]');
        const originalText = submitBtn?.textContent || 'Place Order';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';
            }

            // Get form data
            const formData = new FormData(form);

            const orderData = {
                shippingAddress: {
                    fullName: formData.get('customer-name') || document.getElementById('customer-name')?.value,
                    email: formData.get('customer-email') || document.getElementById('customer-email')?.value,
                    phone: formData.get('customer-phone') || document.getElementById('customer-phone')?.value,
                    address: formData.get('customer-address') || document.getElementById('customer-address')?.value,
                    city: formData.get('city') || '',
                    postalCode: formData.get('postal-code') || ''
                },
                paymentMethod: formData.get('payment-method') || 'cash',
                shippingType: formData.get('shipping-type') || 'standard',
                notes: formData.get('notes') || ''
            };

            // Apply coupon if exists
            if (window.CouponsService) {
                const appliedCoupon = window.CouponsService.getAppliedCoupon(
                    window.CartService.getCartTotals().subtotal
                );
                if (appliedCoupon) {
                    orderData.couponId = appliedCoupon.coupon.id;
                    orderData.discount = appliedCoupon.discount;
                }
            }

            // Create order
            const result = await window.OrdersService.createOrder(orderData);

            if (result.success) {
                // Show success message
                const messageDiv = document.getElementById('checkout-message');
                if (messageDiv) {
                    messageDiv.innerHTML = `
                        <div class="success-message">
                            <strong>Order placed successfully!</strong><br>
                            Thank you for your order. Your order ID is: ${result.order.id.slice(0, 8)}...
                        </div>
                    `;
                }

                // Hide form
                form.style.display = 'none';

                // Clear applied coupon
                if (window.CouponsService) {
                    window.CouponsService.removeCoupon();
                }

                // Redirect to home after delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                if (result.requiresAuth) {
                    this.showToast('Please login to complete your order', '#f39c12');
                    this.showLoginModal();
                } else {
                    this.showToast(result.error || 'Failed to place order', '#e74c3c');
                }
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showToast('Failed to place order', '#e74c3c');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },

    /**
     * Handle service booking form submission
     * 
     * @param {HTMLFormElement} form - Booking form
     */
    async handleServiceBooking(form) {
        if (!window.BookingsService) return;

        // Check auth
        if (!this.currentUser) {
            this.showToast('Please login to book a service', '#f39c12');
            this.showLoginModal();
            return;
        }

        const submitBtn = form.querySelector('#book-service-btn, [type="submit"]');
        const originalText = submitBtn?.textContent || 'Book Service';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Booking...';
            }

            // Get form data
            const formData = new FormData(form);

            // Get service type ID from the page (stored during selection)
            const serviceTypeId = form.dataset.serviceTypeId ||
                window.selectedServiceTypeId ||
                formData.get('service-type-id');

            const bookingData = {
                serviceTypeId,
                vehicleInfo: {
                    make: formData.get('vehicle-make') || 'Toyota',
                    model: formData.get('vehicle-model') || 'Corolla',
                    year: formData.get('vehicle-year') || '',
                    licensePlate: formData.get('license-plate') || '',
                    mileage: formData.get('mileage') || ''
                },
                scheduledDate: formData.get('appointment-date') ||
                    document.getElementById('service-appointment-date')?.value,
                scheduledTime: formData.get('appointment-time') ||
                    document.getElementById('service-appointment-time')?.value || '',
                notes: formData.get('notes') || '',
                customerInfo: {
                    name: formData.get('customer-name') ||
                        document.getElementById('service-customer-name')?.value,
                    phone: formData.get('customer-phone') ||
                        document.getElementById('service-customer-phone')?.value,
                    email: formData.get('customer-email') ||
                        document.getElementById('service-customer-email')?.value
                }
            };

            const result = await window.BookingsService.createBooking(bookingData);

            if (result.success) {
                // Show success message
                form.innerHTML = `
                    <div class="success-message">
                        <strong>${result.message}</strong><br>
                        Your booking has been confirmed. We'll contact you shortly.
                    </div>
                `;

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                if (result.requiresAuth) {
                    this.showToast('Please login to book a service', '#f39c12');
                } else {
                    this.showToast(result.error || 'Failed to book service', '#e74c3c');
                }
            }
        } catch (error) {
            console.error('Booking error:', error);
            this.showToast('Failed to book service', '#e74c3c');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },

    /**
     * Handle login form submission
     * 
     * @param {HTMLFormElement} form - Login form
     */
    async handleLogin(form) {
        if (!window.AuthService) return;

        const submitBtn = form.querySelector('[type="submit"]');
        const originalText = submitBtn?.textContent || 'Login';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Logging in...';
            }

            const formData = new FormData(form);

            const result = await window.AuthService.login({
                email: formData.get('email'),
                password: formData.get('password')
            });


            if (result.success) {
                // Show standard toast removed as requested
                // this.showToast('Login successful!');

                // Show Overlay if exists (Login Page)
                const overlay = document.getElementById('login-success-overlay');
                if (overlay) {
                    overlay.classList.remove('hidden');
                    // Force reflow
                    void overlay.offsetWidth;
                    overlay.classList.remove('opacity-0');

                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                } else {
                    this.closeModal();
                    // If on login page but no overlay?
                    if (window.location.pathname.endsWith('login.html')) {
                        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
                    }
                }
            } else {
                this.showToast(result.error || 'Login failed', '#e74c3c');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed', '#e74c3c');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },

    /**
     * Handle register form submission
     * 
     * @param {HTMLFormElement} form - Register form
     */
    async handleRegister(form) {
        if (!window.AuthService) return;

        const submitBtn = form.querySelector('[type="submit"]');
        const originalText = submitBtn?.textContent || 'Register';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating account...';
            }

            const formData = new FormData(form);

            // Validate passwords match
            const password = formData.get('password');
            const confirmPassword = formData.get('confirm-password');

            if (password !== confirmPassword) {
                this.showToast('Passwords do not match', '#e74c3c');
                return;
            }

            const result = await window.AuthService.register({
                email: formData.get('email'),
                password: password,
                fullName: formData.get('full-name'),
                phone: formData.get('phone')
            });

            if (result.success) {
                this.showToast(result.message || 'Registration successful!');
                this.closeModal();
            } else {
                this.showToast(result.error || 'Registration failed', '#e74c3c');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showToast('Registration failed', '#e74c3c');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },

    /**
     * Handle forgot password form
     * 
     * @param {HTMLFormElement} form - Forgot password form
     */
    async handleForgotPassword(form) {
        if (!window.AuthService) return;

        const submitBtn = form.querySelector('[type="submit"]');
        const originalText = submitBtn?.textContent || 'Send Reset Link';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }

            const formData = new FormData(form);

            const result = await window.AuthService.forgotPassword(formData.get('email'));

            if (result.success) {
                this.showToast(result.message || 'Password reset email sent!');
                form.innerHTML = `
                    <div class="success-message">
                        Check your email for the password reset link.
                    </div>
                `;
            } else {
                this.showToast(result.error || 'Failed to send reset email', '#e74c3c');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showToast('Failed to send reset email', '#e74c3c');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },

    /**
     * Handle profile update
     * 
     * @param {HTMLFormElement} form - Profile form
     */
    async handleProfileUpdate(form) {
        if (!window.AuthService) return;

        const submitBtn = form.querySelector('[type="submit"]');
        const originalText = submitBtn?.textContent || 'Update Profile';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Updating...';
            }

            const formData = new FormData(form);

            const result = await window.AuthService.updateProfile({
                fullName: formData.get('full-name'),
                phone: formData.get('phone')
            });

            if (result.success) {
                this.showToast('Profile updated successfully!');
            } else {
                this.showToast(result.error || 'Failed to update profile', '#e74c3c');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showToast('Failed to update profile', '#e74c3c');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },

    /**
     * Handle review submission
     * 
     * @param {HTMLFormElement} form - Review form
     */
    async handleReviewSubmit(form) {
        if (!window.ReviewsService) return;

        if (!this.currentUser) {
            this.showToast('Please login to leave a review', '#f39c12');
            return;
        }

        const submitBtn = form.querySelector('[type="submit"]');
        const originalText = submitBtn?.textContent || 'Submit Review';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            const formData = new FormData(form);

            const result = await window.ReviewsService.createReview({
                productId: formData.get('product-id'),
                rating: parseInt(formData.get('rating')),
                comment: formData.get('comment')
            });

            if (result.success) {
                this.showToast('Review submitted successfully!');
                form.reset();
                // Refresh reviews section if exists
            } else {
                this.showToast(result.error || 'Failed to submit review', '#e74c3c');
            }
        } catch (error) {
            console.error('Review submit error:', error);
            this.showToast('Failed to submit review', '#e74c3c');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },

    /**
     * Handle apply coupon code
     * 
     * @param {string} code - Coupon code
     */
    async handleApplyCouponCode(code) {
        if (!window.CouponsService || !window.CartService) return;

        const subtotal = window.CartService.getCartTotals().subtotal;
        const result = await window.CouponsService.applyCoupon(code, subtotal);

        if (result.success) {
            this.showToast(result.message);
            // Update totals display
            this.updateCheckoutTotals();
        } else {
            this.showToast(result.error || 'Invalid coupon', '#e74c3c');
        }
    },

    /**
     * Handle remove coupon
     */
    handleRemoveCoupon() {
        if (!window.CouponsService) return;

        const result = window.CouponsService.removeCoupon();
        this.showToast(result.message);
        this.updateCheckoutTotals();
    },

    /**
     * Update checkout totals display
     */
    updateCheckoutTotals() {
        // This would update the cart/checkout totals if there's a coupon
        // Implementation depends on existing UI structure
    },

    /**
     * Handle user logout
     */
    async handleLogout() {
        if (!window.AuthService) return;

        try {
            const result = await window.AuthService.logout();
            if (result.success) {
                this.showToast('Logged out successfully');
                // Clear favorites
                if (window.FavoritesService) {
                    window.FavoritesService.clearFavorites();
                }
                // Redirect to home
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Failed to logout', '#e74c3c');
        }
    },

    /**
     * Called when user logs in
     */
    onUserLoggedIn() {
        // Sync any guest cart/favorites if needed
        console.log('User logged in:', this.currentUser.email);
    },

    /**
     * Called when user logs out
     */
    onUserLoggedOut() {
        console.log('User logged out');
    },


    /**
     * Show login modal
     */
    showLoginModal() {
        window.location.href = 'login.html';
    },

    /**
     * Show profile page
     */
    showProfilePage() {
        window.location.href = 'profile.html';
    },

    /**
     * Close any open modal
     */
    closeModal() {
        // Close any open modal
        const modal = document.querySelector('.modal.active, .modal-overlay');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Show toast notification
     * Uses existing showToast if available
     * 
     * @param {string} message - Message to display
     * @param {string} [bgColor='#27ae60'] - Background color
     */
    showToast(message, bgColor = '#27ae60') {
        // Use existing showToast function if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, bgColor);
            return;
        }

        // Fallback implementation
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: fadeIn 0.3s ease;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    /**
     * Bounce cart icon animation
     */
    bounceCartIcon() {
        const cartBtn = document.getElementById('cart-btn');
        if (cartBtn) {
            cartBtn.classList.add('bounce');
            setTimeout(() => {
                cartBtn.classList.remove('bounce');
            }, 500);
        }
    }
};

// Export globally
window.AppIntegration = AppIntegration;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize after a short delay to ensure all services are loaded
    setTimeout(() => {
        AppIntegration.init();
    }, 500);
});
