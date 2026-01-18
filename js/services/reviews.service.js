/**
 * =============================================================
 * REVIEWS SERVICE
 * =============================================================
 * Handles product reviews operations including:
 * - Fetching reviews for products
 * - Creating new reviews (authenticated users only)
 * 
 * Database Tables Referenced:
 * - reviews: Review data (id, user_id, product_id, rating, comment,
 *            is_visible, is_verified_purchase)
 * - profiles: For reviewer info (full_name, avatar_url)
 * 
 * Business Rules:
 * - Only show reviews where is_visible = true
 * - Users can only create one review per product
 * - is_verified_purchase: true if user has ordered the product
 * 
 * UI Hooks Used:
 * - .reviews-section: Reviews container on product page
 * - .review-form: Review submission form
 * =============================================================
 */

const ReviewsService = {

    /**
     * Get reviews for a product
     * 
     * Table: reviews
     * Columns: id, user_id, product_id, rating, comment, is_visible,
     *          is_verified_purchase, created_at
     * RLS: reviews_select_all - public read access
     * 
     * Business Rule: Only show reviews where is_visible = true
     * 
     * @param {string} productId - Product UUID
     * @param {Object} [options] - Query options
     * @param {number} [options.limit] - Maximum results
     * @param {number} [options.offset] - Offset for pagination
     * @returns {Promise<Object>} { success, reviews, count, averageRating, error }
     */
    async getProductReviews(productId, options = {}) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            let query = client
                .from('reviews')
                .select(`
                    *,
                    reviewer:profiles(id, full_name, email, avatar_url)
                `, { count: 'exact' })
                .eq('product_id', productId)
                .eq('is_visible', true) // Business rule: only visible reviews
                .order('created_at', { ascending: false });

            if (options.limit) {
                query = query.limit(options.limit);
            }

            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            // Calculate average rating
            const totalRating = data.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = data.length > 0 ? totalRating / data.length : 0;

            return {
                success: true,
                reviews: data,
                count,
                averageRating: Math.round(averageRating * 10) / 10
            };
        } catch (error) {
            console.error('Get reviews error:', error);
            return {
                success: false,
                reviews: [],
                count: 0,
                averageRating: 0,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Create a new review
     * 
     * Table: reviews
     * RLS: reviews_insert_limit - authenticated users can create
     * 
     * @param {Object} reviewData - Review information
     * @param {string} reviewData.productId|reviewData.product_id - Product UUID
     * @param {number} reviewData.rating - Rating (1-5)
     * @param {string} [reviewData.comment] - Review comment
     * @returns {Promise<Object>} { success, review, error }
     */
    async createReview(reviewData) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            // Check authentication
            const user = await window.CarHouseSupabase.getCurrentUser();
            if (!user) {
                return {
                    success: false,
                    error: 'Please login to leave a review',
                    requiresAuth: true
                };
            }

            // Support both naming conventions
            const productId = reviewData.product_id || reviewData.productId;
            
            if (!productId) {
                return { success: false, error: 'Product ID is required' };
            }

            // Validate rating
            if (reviewData.rating < 1 || reviewData.rating > 5) {
                return { success: false, error: 'Rating must be between 1 and 5' };
            }

            // Check for existing review
            const { data: existingReview } = await client
                .from('reviews')
                .select('id')
                .eq('product_id', productId)
                .eq('user_id', user.id)
                .single();

            if (existingReview) {
                return {
                    success: false,
                    error: 'You have already reviewed this product'
                };
            }

            // Create review
            const { data: review, error } = await client
                .from('reviews')
                .insert({
                    user_id: user.id,
                    product_id: productId,
                    rating: reviewData.rating,
                    comment: reviewData.comment || null,
                    is_visible: true
                })
                .select()
                .single();

            if (error) throw error;

            // Update product average rating
            await this.updateProductRating(productId);

            return {
                success: true,
                review,
                message: 'Review submitted successfully!'
            };
        } catch (error) {
            console.error('Create review error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Check if user has purchased the product
     * Note: is_verified_purchase field doesn't exist in schema.
     * This is a runtime check only.
     * 
     * @param {string} userId - User UUID
     * @param {string} productId - Product UUID
     * @returns {Promise<boolean>} True if user has purchased
     */
    async checkVerifiedPurchase(userId, productId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) return false;

        try {
            const { data, error } = await client
                .from('order_items')
                .select(`
                    id,
                    order:orders!inner(user_id, status)
                `)
                .eq('product_id', productId)
                .eq('order.user_id', userId)
                .eq('order.status', 'delivered')
                .limit(1);

            return !error && data && data.length > 0;
        } catch (error) {
            console.error('Check purchase error:', error);
            return false;
        }
    },

    /**
     * Update product's average rating
     * 
     * Table: products (rating, rating_count, total_ratings columns)
     * 
     * @param {string} productId - Product UUID
     */
    async updateProductRating(productId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) return;

        try {
            // Get all visible reviews for the product
            const { data: reviews, error: reviewsError } = await client
                .from('reviews')
                .select('rating')
                .eq('product_id', productId)
                .eq('is_visible', true);

            if (reviewsError) throw reviewsError;

            if (reviews && reviews.length > 0) {
                const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                const averageRating = totalRating / reviews.length;
                const ratingCount = reviews.length;

                // Round to 1 decimal place
                const roundedRating = Math.round(averageRating * 10) / 10;

                // Update product rating with new schema fields
                await client
                    .from('products')
                    .update({
                        rating: roundedRating,
                        rating_count: ratingCount,
                        total_ratings: totalRating,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', productId);
            } else {
                // Reset rating if no reviews
                await client
                    .from('products')
                    .update({
                        rating: 0,
                        rating_count: 0,
                        total_ratings: 0,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', productId);
            }
        } catch (error) {
            console.error('Update product rating error:', error);
        }
    },

    /**
     * Check if current user can review a product
     * 
     * @param {string} productId - Product UUID
     * @returns {Promise<Object>} { canReview, hasReviewed, hasPurchased }
     */
    async canReviewProduct(productId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { canReview: false, hasReviewed: false, hasPurchased: false };
        }

        try {
            const user = await window.CarHouseSupabase.getCurrentUser();
            if (!user) {
                return { canReview: false, hasReviewed: false, hasPurchased: false };
            }

            // Check for existing review
            const { data: existingReview } = await client
                .from('reviews')
                .select('id')
                .eq('product_id', productId)
                .eq('user_id', user.id)
                .single();

            const hasReviewed = !!existingReview;
            const hasPurchased = await this.checkVerifiedPurchase(user.id, productId);

            return {
                canReview: !hasReviewed,
                hasReviewed,
                hasPurchased
            };
        } catch (error) {
            console.error('Check can review error:', error);
            return { canReview: false, hasReviewed: false, hasPurchased: false };
        }
    },

    /**
     * Get rating distribution for a product
     * 
     * @param {string} productId - Product UUID
     * @returns {Promise<Object>} { success, distribution, error }
     */
    async getRatingDistribution(productId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await client
                .from('reviews')
                .select('rating')
                .eq('product_id', productId)
                .eq('is_visible', true);

            if (error) throw error;

            // Calculate distribution
            const distribution = {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0
            };

            data.forEach(review => {
                if (distribution[review.rating] !== undefined) {
                    distribution[review.rating]++;
                }
            });

            const total = data.length;

            return {
                success: true,
                distribution,
                total,
                percentages: {
                    1: total > 0 ? Math.round((distribution[1] / total) * 100) : 0,
                    2: total > 0 ? Math.round((distribution[2] / total) * 100) : 0,
                    3: total > 0 ? Math.round((distribution[3] / total) * 100) : 0,
                    4: total > 0 ? Math.round((distribution[4] / total) * 100) : 0,
                    5: total > 0 ? Math.round((distribution[5] / total) * 100) : 0
                }
            };
        } catch (error) {
            console.error('Get distribution error:', error);
            return {
                success: false,
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Format rating as stars
     * 
     * @param {number} rating - Rating value (0-5)
     * @returns {string} Star representation
     */
    formatStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;

        return '★'.repeat(fullStars) +
            (halfStar ? '½' : '') +
            '☆'.repeat(emptyStars);
    }
};

// Export globally
window.ReviewsService = ReviewsService;
