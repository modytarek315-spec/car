/**
 * =============================================================
 * CART SERVICE
 * =============================================================
 * Handles shopping cart operations using localStorage for
 * guest users and Supabase for authenticated users.
 * 
 * Note: Since there's no dedicated 'carts' table in database.sql,
 * cart is managed client-side with localStorage, and converted
 * to orders upon checkout.
 * 
 * UI Hooks Used:
 * - #cart-count: Cart item count badge
 * - #cart-btn: Cart button in header
 * - .cart-page: Cart page container
 * - .cart-item: Individual cart items
 * =============================================================
 */

const CartService = {
    STORAGE_KEY: 'carhouse_cart',

    /**
     * Get current cart items from localStorage
     * 
     * @returns {Array} Cart items array
     */
    getCart() {
        try {
            const cart = localStorage.getItem(this.STORAGE_KEY);
            return cart ? JSON.parse(cart) : [];
        } catch (error) {
            console.error('Error reading cart:', error);
            return [];
        }
    },

    /**
     * Save cart to localStorage
     * 
     * @param {Array} cart - Cart items array
     */
    saveCart(cart) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
            this.updateCartUI();
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    },

    /**
     * Add item to cart
     * Checks stock availability before adding
     * 
     * @param {Object} product - Product object
     * @param {string} product.id - Product UUID
     * @param {string} product.name - Product name
     * @param {number} product.price - Product price
     * @param {string} product.brand - Product brand
     * @param {string} [product.image] - Product image URL
     * @param {number} [quantity=1] - Quantity to add
     * @returns {Promise<Object>} { success, message, error }
     */
    async addToCart(product, quantity = 1) {
        try {
            // Check if authenticated (optional for cart, but needed for checkout)
            const isAuth = await window.CarHouseSupabase.isAuthenticated();

            // Check stock availability
            const stockResult = await window.ProductsService.getAvailableStock(product.id);
            const availableStock = stockResult.success ? stockResult.availableStock : product.stock || 0;

            const cart = this.getCart();
            const existingItem = cart.find(item => item.productId === product.id);
            const currentQty = existingItem ? existingItem.quantity : 0;

            // Validate stock
            if (currentQty + quantity > availableStock) {
                return {
                    success: false,
                    error: availableStock === 0
                        ? 'This product is out of stock'
                        : `Only ${availableStock} items available`
                };
            }

            if (existingItem) {
                // Update existing item quantity
                existingItem.quantity += quantity;
            } else {
                // Add new item
                cart.push({
                    id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    productId: product.id,
                    name: product.name || product.title,
                    price: product.price,
                    brand: product.brand,
                    image: product.image || product.icon || (product.images?.[0]?.url),
                    quantity,
                    addedAt: new Date().toISOString()
                });
            }

            this.saveCart(cart);

            return {
                success: true,
                message: existingItem ? 'Cart updated!' : 'Added to cart!',
                requiresAuth: !isAuth
            };
        } catch (error) {
            console.error('Add to cart error:', error);
            return {
                success: false,
                error: 'Failed to add item to cart'
            };
        }
    },

    /**
     * Update item quantity in cart
     * 
     * @param {string} cartItemId - Cart item ID
     * @param {number} quantity - New quantity (0 to remove)
     * @returns {Promise<Object>} { success, error }
     */
    async updateQuantity(cartItemId, quantity) {
        try {
            const cart = this.getCart();
            const itemIndex = cart.findIndex(item => item.id === cartItemId);

            if (itemIndex === -1) {
                return { success: false, error: 'Item not found in cart' };
            }

            if (quantity <= 0) {
                // Remove item
                cart.splice(itemIndex, 1);
            } else {
                // Check stock
                const item = cart[itemIndex];
                const stockResult = await window.ProductsService.getAvailableStock(item.productId);
                const availableStock = stockResult.success ? stockResult.availableStock : 999;

                if (quantity > availableStock) {
                    return {
                        success: false,
                        error: `Only ${availableStock} items available`
                    };
                }

                cart[itemIndex].quantity = quantity;
            }

            this.saveCart(cart);

            return { success: true };
        } catch (error) {
            console.error('Update quantity error:', error);
            return {
                success: false,
                error: 'Failed to update quantity'
            };
        }
    },

    /**
     * Remove item from cart
     * 
     * @param {string} cartItemId - Cart item ID
     * @returns {Object} { success }
     */
    removeFromCart(cartItemId) {
        const cart = this.getCart();
        const newCart = cart.filter(item => item.id !== cartItemId);
        this.saveCart(newCart);
        return { success: true };
    },

    /**
     * Clear all items from cart
     */
    clearCart() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.updateCartUI();
    },

    /**
     * Get cart totals including tax and shipping
     * 
     * Business rules:
     * - Tax = 14%
     * - Standard Shipping = Free
     * - Express Shipping = 50 EGP
     * 
     * @param {string} [shippingType='standard'] - 'standard' or 'express'
     * @returns {Object} { subtotal, tax, shipping, total, itemCount }
     */
    getCartTotals(shippingType = 'standard') {
        const cart = this.getCart();

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.14; // 14% tax
        const shipping = shippingType === 'express' ? 50 : 0; // Express = 50 EGP, Standard = Free
        const total = subtotal + tax + shipping;
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

        return {
            subtotal,
            tax,
            shipping,
            total,
            itemCount
        };
    },

    /**
     * Update cart count badge in UI
     * 
     * UI Hook: #cart-count element
     */
    updateCartUI() {
        const cart = this.getCart();
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

        const cartCountEl = document.getElementById('cart-count');
        if (cartCountEl) {
            cartCountEl.textContent = itemCount;
        }

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { cart, itemCount }
        }));
    },

    /**
     * Validate cart before checkout
     * Checks stock for all items
     * 
     * @returns {Promise<Object>} { valid, errors }
     */
    async validateCart() {
        const cart = this.getCart();
        const errors = [];

        for (const item of cart) {
            const stockResult = await window.ProductsService.getAvailableStock(item.productId);

            if (!stockResult.success || stockResult.availableStock < item.quantity) {
                errors.push({
                    productId: item.productId,
                    productName: item.name,
                    requested: item.quantity,
                    available: stockResult.availableStock || 0
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Get cart items with full product details
     * Useful for cart page rendering
     * 
     * @returns {Promise<Object>} { success, items, error }
     */
    async getCartWithDetails() {
        const cart = this.getCart();

        if (cart.length === 0) {
            return { success: true, items: [] };
        }

        try {
            const itemsWithDetails = [];

            for (const item of cart) {
                const productResult = await window.ProductsService.getProductById(item.productId);

                itemsWithDetails.push({
                    ...item,
                    product: productResult.success ? productResult.product : null,
                    inStock: productResult.success && productResult.product?.stock > 0
                });
            }

            return {
                success: true,
                items: itemsWithDetails
            };
        } catch (error) {
            console.error('Get cart details error:', error);
            return {
                success: false,
                items: [],
                error: 'Failed to load cart details'
            };
        }
    }
};

// Export globally
window.CartService = CartService;

// Initialize cart UI on load
document.addEventListener('DOMContentLoaded', () => {
    CartService.updateCartUI();
});
