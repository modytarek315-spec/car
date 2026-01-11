/**
 * =============================================================
 * FAVORITES SERVICE (SUPABASE VERSION)
 * =============================================================
 * Handles user wishlist/favorites operations directly via Supabase.
 * Synced with 'favorites' table.
 * =============================================================
 */

const FavoritesService = {
    // Cache for quick synchronous checks (isFavorite)
    _favoritesCache: [],
    _initialized: false,

    /**
     * Initialize favorites from Supabase
     */
    async init() {
        if (this._initialized) return;

        const isAuth = await window.CarHouseSupabase.isAuthenticated();
        if (isAuth) {
            await this.syncWithSupabase();
        }
        this._initialized = true;
    },

    /**
     * Fetch favorites from Supabase and update cache
     */
    async syncWithSupabase() {
        try {
            const supabase = window.CarHouseSupabase.getClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                this._favoritesCache = [];
                return;
            }

            const { data, error } = await supabase
                .from('favorites')
                .select('product_id, created_at')
                .eq('user_id', user.id);

            this._favoritesCache = (data || []).map(f => ({
                productId: f.product_id,
                addedAt: f.created_at
            }));

            this.dispatchFavoritesEvent(this._favoritesCache);
        } catch (error) {
            console.warn('Favorites sync failed (Check if favorites table exists):', error);
            this._favoritesCache = [];
            this.dispatchFavoritesEvent([]);
        }
    },

    /**
     * Get all favorites
     * 
     * @returns {Array} Array of favorite minimalist objects
     */
    getFavorites() {
        return this._favoritesCache;
    },

    /**
     * Check if a product is in favorites (Synchronous using cache)
     * 
     * @param {string} productId - Product UUID
     * @returns {boolean} True if in favorites
     */
    isFavorite(productId) {
        return this._favoritesCache.some(fav => fav.productId === productId);
    },

    /**
     * Add product to favorites in Supabase
     * 
     * @param {Object} product - Product object
     * @returns {Promise<Object>} { success, message, error }
     */
    async addFavorite(product) {
        if (!product || !product.id || product.id === 'null' || product.id === 'undefined') {
            return { success: false, error: 'Invalid product ID' };
        }
        try {
            const isAuth = await window.CarHouseSupabase.isAuthenticated();
            if (!isAuth) {
                return {
                    success: false,
                    error: 'Please login to save favorites',
                    requiresAuth: true
                };
            }

            const supabase = window.CarHouseSupabase.getClient();
            const { data: { user } } = await supabase.auth.getUser();

            // Double check cache to prevent duplicate request
            if (this.isFavorite(product.id)) {
                return {
                    success: true, // Treat as success if already there
                    message: 'Already in favorites'
                };
            }

            const { error } = await supabase
                .from('favorites')
                .insert({
                    user_id: user.id,
                    product_id: product.id
                });

            if (error) {
                if (error.code === '23505') { // Unique violation
                    await this.syncWithSupabase(); // Re-sync if out of sync
                    return { success: true, message: 'Already in favorites' };
                }
                throw error;
            }

            // Update cache immediately for better UX
            this._favoritesCache.push({
                productId: product.id,
                addedAt: new Date().toISOString()
            });

            this.dispatchFavoritesEvent(this._favoritesCache);

            return {
                success: true,
                message: 'Added to favorites!'
            };
        } catch (error) {
            console.error('Add favorite error:', error);
            // Re-sync in case local cache is out of sync with DB
            await this.syncWithSupabase();
            return {
                success: false,
                error: window.CarHouseSupabase?.formatError ? window.CarHouseSupabase.formatError(error) : (error.message || 'Failed to add to favorites')
            };
        }
    },

    /**
     * Remove product from favorites in Supabase
     * 
     * @param {string} productId - Product UUID
     * @returns {Promise<Object>} { success, message }
     */
    async removeFavorite(productId) {
        try {
            const isAuth = await window.CarHouseSupabase.isAuthenticated();
            if (!isAuth) return { success: false, error: 'Auth required' };

            const supabase = window.CarHouseSupabase.getClient();
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', productId);

            if (error) throw error;

            // Update cache
            this._favoritesCache = this._favoritesCache.filter(fav => fav.productId !== productId);
            this.dispatchFavoritesEvent(this._favoritesCache);

            return {
                success: true,
                message: 'Removed from favorites'
            };
        } catch (error) {
            console.error('Remove favorite error:', error);
            return {
                success: false,
                error: 'Failed to remove from favorites'
            };
        }
    },

    /**
     * Toggle favorite status
     */
    async toggleFavorite(product) {
        if (this.isFavorite(product.id)) {
            const result = await this.removeFavorite(product.id);
            return {
                ...result,
                isFavorite: false
            };
        } else {
            const result = await this.addFavorite(product);
            return {
                ...result,
                isFavorite: result.success
            };
        }
    },

    /**
     * Get favorites with full details (for Favorites page)
     */
    async getFavoritesWithDetails() {
        try {
            const isAuth = await window.CarHouseSupabase.isAuthenticated();
            if (!isAuth) return { success: false, error: 'Please login', favorites: [] };

            const supabase = window.CarHouseSupabase.getClient();
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('favorites')
                .select(`
                    id,
                    product_id,
                    created_at,
                    product:products (
                        *,
                        category:categories(name, slug),
                        images:product_images(url, position)
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return {
                success: true,
                favorites: data || []
            };
        } catch (error) {
            console.error('Get favorites details error:', error);
            return {
                success: false,
                favorites: [],
                error: 'Failed to load favorites'
            };
        }
    },

    /**
     * Clear local favorites (on logout)
     */
    clearFavorites() {
        this._favoritesCache = [];
        this.dispatchFavoritesEvent([]);
    },

    /**
     * Get favorites count
     */
    getFavoritesCount() {
        return this._favoritesCache.length;
    },

    /**
     * Dispatch event for UI updates
     */
    dispatchFavoritesEvent(favorites) {
        window.dispatchEvent(new CustomEvent('favoritesUpdated', {
            detail: {
                favorites,
                count: favorites.length
            }
        }));
    },

    /**
     * Move from favorites to cart
     */
    async moveToCart(productId) {
        try {
            const productResult = await window.ProductsService.getProductById(productId);
            if (!productResult.success) throw new Error('Product not found');

            const cartResult = await window.CartService.addToCart(productResult.product);
            if (cartResult.success) {
                await this.removeFavorite(productId);
                return { success: true, message: 'Moved to cart!' };
            }
            return cartResult;
        } catch (error) {
            console.error('Move to cart error:', error);
            return { success: false, error: 'Failed' };
        }
    }
};

// Export globally
window.FavoritesService = FavoritesService;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // AppIntegration handles initialization of services in its init()
});
