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

        // Get product card element for animation
        const productCard = button.closest('.product-card');
        
        // Disable button with loading state
        const originalText = button.textContent;
        const originalHTML = button.innerHTML;
        button.disabled = true;
        button.classList.add('loading');
        button.innerHTML = `
            <svg class="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="33 11" />
            </svg>
            <span>Adding...</span>
        `;

        try {
            // Get product details from Supabase
            const productResult = await window.ProductsService.getProductById(productId);

            if (!productResult.success) {
                // Fallback: try to get from existing data
                this.showToast(productResult.error || window.AppConstants.MESSAGES.ERROR.GENERIC, '#e74c3c', { type: 'error' });
                return;
            }

            const product = productResult.product;

            // Check stock
            if (product.stock <= 0) {
                this.showToast(window.AppConstants.MESSAGES.ERROR.OUT_OF_STOCK, '#e74c3c', { type: 'error' });
                return;
            }

            // Add to cart
            const result = await window.CartService.addToCart(product);

            if (result.success) {
                // Success feedback
                button.classList.add('success');
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                    <span>Added!</span>
                `;
                
                // Update cart UI and count
                if (window.CartService) {
                    window.CartService.updateCartUI();
                }
                
                // Flying animation to cart
                if (productCard) {
                    this.flyToCart(productCard);
                }
                
                // Bounce cart icon
                this.bounceCartIcon();
                
                // Show mini cart preview
                this.showMiniCart(product);
                
                // Confetti effect
                this.createConfetti(button);
                
                // Toast notification
                this.showToast(window.AppConstants.MESSAGES.SUCCESS.CART_ADDED, '#27ae60', { type: 'success' });
                
                // Reset button after delay
                setTimeout(() => {
                    button.classList.remove('success');
                    button.innerHTML = originalHTML;
                }, 2000);
            } else {
                if (result.requiresAuth) {
                    this.showToast(window.AppConstants.MESSAGES.WARNING.LOGIN_REQUIRED, '#f39c12', { type: 'warning' });
                } else {
                    this.showToast(result.error || window.AppConstants.MESSAGES.ERROR.CART_FAILED, '#e74c3c', { type: 'error' });
                }
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            this.showToast(window.AppConstants.MESSAGES.ERROR.CART_FAILED, '#e74c3c', { type: 'error' });
        } finally {
            button.disabled = false;
            button.classList.remove('loading');
            if (!button.classList.contains('success')) {
                button.innerHTML = originalHTML;
            }
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
            this.showToast(window.AppConstants.MESSAGES.WARNING.LOGIN_REQUIRED, '#f39c12', { type: 'warning' });
            return;
        }

        try {
            // Get product info if available
            const product = { id: productId };

            const result = await window.FavoritesService.toggleFavorite(product);

            if (result.success) {
                // Toggle active class on button
                button.classList.toggle('active', result.isFavorite);
                const message = result.isFavorite ? window.AppConstants.MESSAGES.SUCCESS.FAVORITE_ADDED : window.AppConstants.MESSAGES.SUCCESS.FAVORITE_REMOVED;
                this.showToast(message, result.isFavorite ? '#27ae60' : '#3498db', { type: result.isFavorite ? 'success' : 'info' });
            } else {
                if (result.requiresAuth) {
                    this.showToast(window.AppConstants.MESSAGES.WARNING.LOGIN_REQUIRED, '#f39c12', { type: 'warning' });
                } else {
                    this.showToast(result.error || window.AppConstants.MESSAGES.ERROR.FAVORITE_FAILED, '#e74c3c', { type: 'error' });
                }
            }
        } catch (error) {
            console.error('Toggle favorite error:', error);
            this.showToast(window.AppConstants.MESSAGES.ERROR.FAVORITE_FAILED, '#e74c3c', { type: 'error' });
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
            this.showToast(window.AppConstants.MESSAGES.WARNING.LOGIN_REQUIRED, '#f39c12', { type: 'warning' });
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
                    window.location.href = window.getPagePath('index');
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
                    window.location.href = window.getPagePath('index');
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
     * Show mini cart preview
     */
    showMiniCart(product) {
        const existing = document.querySelector('.mini-cart-preview');
        if (existing) existing.remove();

        const cart = window.CartService.getCart();
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const miniCart = document.createElement('div');
        miniCart.className = 'mini-cart-preview';
        miniCart.innerHTML = `
            <div class="mini-cart-header">
                <h4>🛒 Cart Updated</h4>
                <button class="mini-cart-close" onclick="this.closest('.mini-cart-preview').remove()">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
            </div>
            <div class="mini-cart-item">
                <img src="${product.image_url || product.icon || (product.images?.[0]?.url)}" alt="${product.name}" onerror="this.style.display='none'">
                <div class="mini-cart-item-details">
                    <div class="mini-cart-item-name">${product.name || product.title}</div>
                    <div class="mini-cart-item-price">${product.price.toFixed(2)} EGP</div>
                </div>
            </div>
            <div class="mini-cart-footer">
                <div class="mini-cart-summary">
                    <span>${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
                    <span class="mini-cart-total">${total.toFixed(2)} EGP</span>
                </div>
                <button class="mini-cart-view-btn" onclick="window.location.href=window.getPagePath('cart')">
                    View Cart
                </button>
            </div>
        `;

        document.body.appendChild(miniCart);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (miniCart.parentElement) {
                miniCart.classList.add('mini-cart-exit');
                setTimeout(() => miniCart.remove(), 300);
            }
        }, 5000);
    },

    /**
     * Create confetti effect
     */
    createConfetti(element) {
        const colors = ['#FFC700', '#27ae60', '#3498db', '#e74c3c', '#9b59b6'];
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 20; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = centerX + 'px';
            confetti.style.top = centerY + 'px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            const angle = (Math.random() * 360) * (Math.PI / 180);
            const velocity = 100 + Math.random() * 100;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity - 50;
            
            confetti.style.setProperty('--tx', tx + 'px');
            confetti.style.setProperty('--ty', ty + 'px');
            confetti.style.setProperty('--r', Math.random() * 360 + 'deg');
            
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 1000);
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
                // Show success toast notification
                this.showToast('Login successful! Welcome back!', '#27ae60', { type: 'success' });

                // Show Overlay if exists (Login Page)
                const overlay = document.getElementById('login-success-overlay');
                if (overlay) {
                    overlay.classList.remove('hidden');
                    // Force reflow
                    void overlay.offsetWidth;
                    overlay.classList.remove('opacity-0');

                    setTimeout(() => {
                        window.location.href = window.getPagePath('index');
                    }, 2000);
                } else {
                    this.closeModal();
                    // If on login page but no overlay?
                    if (window.location.pathname.includes('login')) {
                        setTimeout(() => { window.location.href = window.getPagePath('index'); }, 1000);
                    }
                }
            } else {
                this.showToast(result.error || 'Login failed. Please check your credentials.', '#e74c3c', { type: 'error' });
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed. Please try again.', '#e74c3c', { type: 'error' });
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
                this.showToast('Passwords do not match. Please try again.', '#e74c3c', { type: 'error' });
                return;
            }

            const result = await window.AuthService.register({
                email: formData.get('email'),
                password: password,
                fullName: formData.get('full-name'),
                phone: formData.get('phone')
            });

            if (result.success) {
                this.showToast(result.message || 'Account created successfully! Welcome to Car House!', '#27ae60', { type: 'success' });
                
                // Show success overlay if exists
                const overlay = document.getElementById('register-success-overlay');
                if (overlay) {
                    overlay.classList.remove('hidden');
                    void overlay.offsetWidth;
                    overlay.classList.remove('opacity-0');
                    
                    setTimeout(() => {
                        window.location.href = window.getPagePath('login');
                    }, 2500);
                } else {
                    this.closeModal();
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = window.getPagePath('login');
                    }, 1500);
                }
            } else {
                this.showToast(result.error || 'Registration failed. Please try again.', '#e74c3c', { type: 'error' });
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showToast('Registration failed. Please try again.', '#e74c3c', { type: 'error' });
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
                window.location.href = window.getPagePath('index');
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
        window.location.href = window.getPagePath('login');
    },

    /**
     * Show profile page
     */
    showProfilePage() {
        window.location.href = window.getPagePath('profile');
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
     * Uses the enhanced UI.showToast if available
     * 
     * @param {string} message - Message to display
     * @param {string} [bgColor='#27ae60'] - Background color
     * @param {Object} [options] - Additional options
     */
    showToast(message, bgColor = '#27ae60', options = {}) {
        // Use the enhanced UI.showToast
        if (window.UI && typeof window.UI.showToast === 'function') {
            window.UI.showToast(message, bgColor, options);
            return;
        }

        // Fallback to basic toast if UI not available
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
