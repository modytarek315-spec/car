/**
 * =============================================================
 * PRODUCTS & CATEGORIES SERVICE
 * =============================================================
 * Handles all product and category operations including:
 * - Fetching products with filters
 * - Fetching categories
 * - Product images
 * - Featured/Popular/Top rated products
 * 
 * Database Tables Referenced:
 * - products: Product data (id, sku, name, title, description, price, 
 *             compare_at_price, stock, category_id, brand, car_model,
 *             year_compatibility, rating, is_active, is_featured, images)
 * - categories: Category data (id, name, slug, description, image_url, icon)
 * - product_images: Product images (id, product_id, url, alt, position, is_primary)
 * - inventory: Stock data (product_id, quantity, reserved)
 * 
 * UI Hooks Used:
 * - #products-grid: Product listing container
 * - .product-card: Individual product cards
 * - .category-grid: Categories container
 * =============================================================
 */

const ProductsService = {

    /**
     * Fetch all active categories
     * 
     * Table: categories
     * Columns: id, name, slug, description, image_url, icon, parent_id
     * RLS: categories_select_all - public read access
     * 
     * @returns {Promise<Object>} { success, categories, error }
     */
    async getCategories() {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await client
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;

            return {
                success: true,
                categories: data
            };
        } catch (error) {
            console.error('Get categories error:', error);
            return {
                success: false,
                categories: [],
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Fetch category by slug
     * 
     * @param {string} slug - Category slug
     * @returns {Promise<Object>} { success, category, error }
     */
    async getCategoryBySlug(slug) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await client
                .from('categories')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error) throw error;

            return {
                success: true,
                category: data
            };
        } catch (error) {
            console.error('Get category error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Fetch products with optional filters
     * 
     * Table: products
     * Columns: id, sku, name, title, description, price, compare_at_price,
     *          stock, category_id, brand, car_model, year_compatibility,
     *          rating, is_active, is_featured, images, specifications
     * RLS: products_select_all - public read access
     * 
     * Business Rule: Only show products where is_active = true
     * 
     * @param {Object} options - Filter options
     * @param {string} [options.categoryId] - Filter by category UUID
     * @param {string} [options.brand] - Filter by brand
     * @param {number} [options.minPrice] - Minimum price
     * @param {number} [options.maxPrice] - Maximum price
     * @param {string} [options.search] - Search term (name, brand, sku, car_model)
     * @param {string} [options.sortBy] - Sort field (popular, newest, price_asc, price_desc, rating)
     * @param {number} [options.limit] - Results limit
     * @param {number} [options.offset] - Results offset for pagination
     * @returns {Promise<Object>} { success, products, count, error }
     */
    async getProducts(options = {}) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            // Use inner join when filtering by slug to properly filter parent rows
            const useSlugFilter = options.categorySlug && !options.categoryId;
            const categoryJoin = useSlugFilter ? 'categories!inner(id, name, slug)' : 'categories(id, name, slug)';

            let query = client
                .from('products')
                .select(`
                    *,
                    ${categoryJoin},
                    product_images(url)
                `, { count: 'exact' });

            // Filters - prefer categoryId over categorySlug when both exist
            if (options.productId) query = query.eq('id', options.productId);
            if (options.categoryId) {
                query = query.eq('category_id', options.categoryId);
            } else if (options.categorySlug) {
                query = query.eq('categories.slug', options.categorySlug);
            }
            if (options.brand) query = query.eq('brand', options.brand);

            // Text Search (Matches: name, brand, sku, car_model)
            if (options.search) {
                query = query.or(`name.ilike.%${options.search}%,brand.ilike.%${options.search}%,sku.ilike.%${options.search}%,car_model.ilike.%${options.search}%`);
            }

            query = query.eq('is_active', true);

            // Sorting
            const sortField = options.sortBy === 'price_asc' ? 'price' : (options.sortBy === 'price_desc' ? 'price' : 'name');
            const sortOrder = options.sortBy === 'price_desc' ? false : true;
            query = query.order(sortField, { ascending: sortOrder });

            // Pagination (Crucial for Speed)
            const limit = options.limit || 24;
            const offset = options.offset || 0;
            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) {

                // First, resolve categorySlug to categoryId if needed
                let categoryId = options.categoryId;
                if (!categoryId && options.categorySlug) {
                    const catRes = await client
                        .from('categories')
                        .select('id')
                        .eq('slug', options.categorySlug)
                        .single();
                    if (catRes.data) {
                        categoryId = catRes.data.id;
                    }
                }

                let fallbackQuery = client
                    .from('products')
                    .select('*', { count: 'exact' })
                    .eq('is_active', true)
                    .range(offset, offset + limit - 1);

                if (categoryId) fallbackQuery = fallbackQuery.eq('category_id', categoryId);

                const { data: productsData, error: productsError } = await fallbackQuery;
                if (productsError) throw productsError;

                if (productsData && productsData.length > 0) {
                    const productIds = productsData.map(p => p.id);
                    const [imagesRes, categoriesRes] = await Promise.all([
                        client.from('product_images').select('product_id, url').in('product_id', productIds),
                        client.from('categories').select('id, name, slug')
                    ]);

                    const hydrated = productsData.map(p => ({
                        ...p,
                        product_images: (imagesRes.data || []).filter(img => img.product_id === p.id),
                        categories: (categoriesRes.data || []).find(c => c.id === p.category_id)
                    }));

                    return { success: true, products: hydrated, count: count || hydrated.length };
                }
                return { success: true, products: [], count: 0 };
            }

            return { success: true, products: data || [], count: count || 0 };

        } catch (error) {
            console.error('Get products error:', JSON.stringify(error, null, 2));
            return {
                success: false,
                products: [],
                count: 0,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Fetch a single product by ID
     * 
     * @param {string} productId - Product UUID
     * @returns {Promise<Object>} { success, product, error }
     */
    async getProductById(productId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await client
                .from('products')
                .select(`
                    *,
                    category:categories(id, name, slug),
                    images:product_images(id, url, alt, position)
                `)
                .eq('id', productId)
                .eq('is_active', true)
                .single();

            if (error) throw error;

            if (data.images) {
                data.images.sort((a, b) => a.position - b.position);
            }

            return {
                success: true,
                product: data
            };
        } catch (error) {
            console.error('Get product error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Fetch reviews for a product
     * 
     * Table: reviews
     * Columns: user_id, product_id, rating, comment, is_visible, created_at
     * 
     * @param {string} productId - Product UUID
     * @returns {Promise<Object>} { success, reviews, error }
     */
    async getProductReviews(productId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) return { success: false, error: 'Supabase client not initialized' };

        try {
            const { data, error } = await client
                .from('reviews')
                .select(`
                    *,
                    profile:profiles(full_name, avatar_url)
                `)
                .eq('product_id', productId)
                .eq('is_visible', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, reviews: data };
        } catch (error) {
            console.error('Get reviews error:', error);
            return { success: false, error: window.CarHouseSupabase.formatError(error) };
        }
    },

    /**
     * Fetch featured products
     * 
     * Products where is_featured = true
     * 
     * @param {number} [limit=10] - Maximum results
     * @returns {Promise<Object>} { success, products, error }
     */
    async getFeaturedProducts(limit = 10) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await client
                .from('products')
                .select(`
                    *,
                    category:categories(id, name, slug),
                    images:product_images(id, url, alt, position)
                `)
                .eq('is_active', true)
                .eq('is_featured', true) // Business rule: featured products
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return {
                success: true,
                products: data
            };
        } catch (error) {
            console.error('Get featured products error:', error);
            return {
                success: false,
                products: [],
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Fetch popular products
     * 
     * Products with rating between 4.4 – 4.6
     * 
     * @param {number} [limit=10] - Maximum results
     * @returns {Promise<Object>} { success, products, error }
     */
    async getPopularProducts(limit = 10) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await client
                .from('products')
                .select(`
                    *,
                    category:categories(id, name, slug),
                    images:product_images(id, url, alt, position)
                `)
                .eq('is_active', true)
                .gte('rating', 4.4) // Popular: rating 4.4 - 4.6
                .lte('rating', 4.6)
                .order('rating', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return {
                success: true,
                products: data
            };
        } catch (error) {
            console.error('Get popular products error:', error);
            return {
                success: false,
                products: [],
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Fetch top rated products
     * 
     * Products with rating between 4.7 – 5.0
     * 
     * @param {number} [limit=10] - Maximum results
     * @returns {Promise<Object>} { success, products, error }
     */
    async getTopRatedProducts(limit = 10) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await client
                .from('products')
                .select(`
                    *,
                    category:categories(id, name, slug),
                    images:product_images(id, url, alt, position)
                `)
                .eq('is_active', true)
                .gte('rating', 4.7) // Top rated: rating 4.7 - 5.0
                .lte('rating', 5.0)
                .order('rating', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return {
                success: true,
                products: data
            };
        } catch (error) {
            console.error('Get top rated products error:', error);
            return {
                success: false,
                products: [],
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Get available stock for a product
     * 
     * Table: inventory
     * Business rule: Available = quantity - reserved
     * 
     * @param {string} productId - Product UUID
     * @returns {Promise<Object>} { success, availableStock, error }
     */
    async getAvailableStock(productId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            // First try inventory table
            const { data: inventory, error: invError } = await client
                .from('inventory')
                .select('quantity, reserved')
                .eq('product_id', productId);

            if (!invError && inventory && inventory.length > 0) {
                // Sum up inventory from all stores
                const totalAvailable = inventory.reduce((sum, inv) => {
                    return sum + (inv.quantity - inv.reserved);
                }, 0);

                return {
                    success: true,
                    availableStock: totalAvailable
                };
            }

            // Fallback to products.stock
            const { data: product, error: prodError } = await client
                .from('products')
                .select('stock')
                .eq('id', productId)
                .single();

            if (prodError) throw prodError;

            return {
                success: true,
                availableStock: product?.stock || 0
            };
        } catch (error) {
            console.error('Get stock error:', error);
            return {
                success: false,
                availableStock: 0,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Get unique brands for a category
     * 
     * @param {string} [categoryId] - Optional category filter
     * @returns {Promise<Object>} { success, brands, error }
     */
    async getBrands(categoryId = null) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            let query = client
                .from('products')
                .select('brand')
                .eq('is_active', true)
                .not('brand', 'is', null);

            if (categoryId) {
                query = query.eq('category_id', categoryId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Get unique brands
            const brands = [...new Set(data.map(p => p.brand))].sort();

            return {
                success: true,
                brands
            };
        } catch (error) {
            console.error('Get brands error:', error);
            return {
                success: false,
                brands: [],
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    }
};

// Export globally
window.ProductsService = ProductsService;
