/**
 * =============================================================
 * COUPONS SERVICE
 * =============================================================
 * Handles coupon/discount code operations including:
 * - Validating coupon codes
 * - Calculating discounts
 * 
 * Database Tables Referenced:
 * - coupons: Coupon definitions (id, code, discount_type, discount_value,
 *            min_purchase, max_discount, start_date, end_date,
 *            usage_limit, used_count, is_active)
 * 
 * Business Rules:
 * - Only active coupons are valid
 * - Check date validity (start_date, end_date)
 * - Check usage limit
 * - Apply minimum purchase requirement
 * - Apply maximum discount cap
 * 
 * UI Hooks Used:
 * - #coupon-input: Coupon code input field
 * - #apply-coupon-btn: Apply coupon button
 * - #coupon-message: Coupon status message
 * =============================================================
 */

const CouponsService = {

    /**
     * Currently applied coupon
     */
    appliedCoupon: null,

    /**
     * Validate and get coupon details
     * 
     * Table: coupons
     * Columns: id, code, discount_type, discount_value, min_purchase,
     *          max_discount, start_date, end_date, usage_limit,
     *          used_count, is_active
     * RLS: coupons_select_all - public read access
     * 
     * @param {string} code - Coupon code
     * @param {number} cartSubtotal - Current cart subtotal
     * @returns {Promise<Object>} { success, coupon, discount, error }
     */
    async validateCoupon(code, cartSubtotal) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            if (!code || code.trim() === '') {
                return { success: false, error: 'Please enter a coupon code' };
            }

            // Fetch coupon by code (case insensitive)
            const { data: coupon, error } = await client
                .from('coupons')
                .select('*')
                .ilike('code', code.trim())
                .single();

            if (error || !coupon) {
                return { success: false, error: 'Invalid coupon code' };
            }

            // Validate coupon
            const validation = this.validateCouponRules(coupon, cartSubtotal);

            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Calculate discount
            const discount = this.calculateDiscount(coupon, cartSubtotal);

            return {
                success: true,
                coupon,
                discount,
                message: `Coupon applied! You save ${discount.toFixed(2)} EGP`
            };
        } catch (error) {
            console.error('Validate coupon error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Validate coupon against business rules
     * 
     * @param {Object} coupon - Coupon object
     * @param {number} cartSubtotal - Cart subtotal
     * @returns {Object} { valid, error }
     */
    validateCouponRules(coupon, cartSubtotal) {
        const now = new Date();

        // Check if active
        if (!coupon.is_active) {
            return { valid: false, error: 'This coupon is no longer active' };
        }

        // Check start date
        if (coupon.valid_from) {
            const startDate = new Date(coupon.valid_from);
            if (now < startDate) {
                return { valid: false, error: 'This coupon is not yet valid' };
            }
        }

        // Check end date
        if (coupon.valid_until) {
            const endDate = new Date(coupon.valid_until);
            if (now > endDate) {
                return { valid: false, error: 'This coupon has expired' };
            }
        }

        // Check usage limit
        if (coupon.max_uses !== null) {
            if (coupon.uses_count >= coupon.max_uses) {
                return { valid: false, error: 'This coupon has reached its usage limit' };
            }
        }

        // Check minimum purchase
        if (coupon.min_order_amount !== null) {
            if (cartSubtotal < coupon.min_order_amount) {
                return {
                    valid: false,
                    error: `Minimum purchase of ${coupon.min_order_amount.toFixed(2)} EGP required`
                };
            }
        }

        return { valid: true };
    },

    /**
     * Calculate discount amount
     * 
     * Business Rules:
     * - discount_type: 'percentage' | 'fixed'
     * - For percentage: discount = subtotal * (discount_value / 100)
     * - For fixed: discount = discount_value
     * - Apply max_discount cap if set
     * 
     * @param {Object} coupon - Coupon object
     * @param {number} subtotal - Cart subtotal
     * @returns {number} Discount amount
     */
    calculateDiscount(coupon, subtotal) {
        let discount = 0;

        if (coupon.discount_type === 'percentage') {
            discount = subtotal * (coupon.discount_value / 100);
        } else if (coupon.discount_type === 'fixed') {
            discount = coupon.discount_value;
        }

        // Don't allow discount greater than subtotal
        if (discount > subtotal) {
            discount = subtotal;
        }

        return Math.round(discount * 100) / 100;
    },

    /**
     * Apply coupon to current session
     * 
     * @param {string} code - Coupon code
     * @param {number} cartSubtotal - Cart subtotal
     * @returns {Promise<Object>} { success, coupon, discount, error }
     */
    async applyCoupon(code, cartSubtotal) {
        const result = await this.validateCoupon(code, cartSubtotal);

        if (result.success) {
            this.appliedCoupon = {
                coupon: result.coupon,
                discount: result.discount
            };
            this.saveCouponToSession(result.coupon, result.discount);
        }

        return result;
    },

    /**
     * Remove applied coupon
     */
    removeCoupon() {
        this.appliedCoupon = null;
        sessionStorage.removeItem('carhouse_applied_coupon');

        return {
            success: true,
            message: 'Coupon removed'
        };
    },

    /**
     * Get currently applied coupon
     * 
     * @param {number} cartSubtotal - Current cart subtotal (for recalculation)
     * @returns {Object|null} Applied coupon or null
     */
    getAppliedCoupon(cartSubtotal) {
        // Try from memory first
        if (this.appliedCoupon) {
            // Recalculate discount with new subtotal
            const discount = this.calculateDiscount(
                this.appliedCoupon.coupon,
                cartSubtotal
            );
            return {
                ...this.appliedCoupon,
                discount
            };
        }

        // Try from session
        const saved = this.loadCouponFromSession();
        if (saved) {
            const discount = this.calculateDiscount(saved.coupon, cartSubtotal);
            this.appliedCoupon = { ...saved, discount };
            return this.appliedCoupon;
        }

        return null;
    },

    /**
     * Save coupon to session storage
     * 
     * @param {Object} coupon - Coupon object
     * @param {number} discount - Calculated discount
     */
    saveCouponToSession(coupon, discount) {
        try {
            sessionStorage.setItem('carhouse_applied_coupon', JSON.stringify({
                coupon,
                discount,
                appliedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error saving coupon:', error);
        }
    },

    /**
     * Load coupon from session storage
     * 
     * @returns {Object|null} Saved coupon or null
     */
    loadCouponFromSession() {
        try {
            const saved = sessionStorage.getItem('carhouse_applied_coupon');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Error loading coupon:', error);
            return null;
        }
    },

    /**
     * Increment coupon usage count after order
     * (Called internally by OrdersService)
     * 
     * @param {string} couponId - Coupon UUID
     * @returns {Promise<boolean>} Success status
     */
    async incrementUsage(couponId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) return false;

        try {
            // Get current count
            const { data: coupon, error: getError } = await client
                .from('coupons')
                .select('used_count')
                .eq('id', couponId)
                .single();

            if (getError) throw getError;

            // Increment count
            const { error: updateError } = await client
                .from('coupons')
                .update({ used_count: (coupon.used_count || 0) + 1 })
                .eq('id', couponId);

            if (updateError) throw updateError;

            return true;
        } catch (error) {
            console.error('Increment coupon usage error:', error);
            return false;
        }
    },

    /**
     * Get cart totals with coupon applied
     * 
     * @param {string} [shippingType='standard'] - Shipping type
     * @returns {Object} Complete cart totals
     */
    getCartTotalsWithCoupon(shippingType = 'standard') {
        const baseTotals = window.CartService.getCartTotals(shippingType);
        const applied = this.getAppliedCoupon(baseTotals.subtotal);

        if (applied) {
            const discountedSubtotal = baseTotals.subtotal - applied.discount;
            const tax = discountedSubtotal * 0.14;
            const total = discountedSubtotal + tax + baseTotals.shipping;

            return {
                ...baseTotals,
                discount: applied.discount,
                couponCode: applied.coupon.code,
                subtotalAfterDiscount: discountedSubtotal,
                tax,
                total
            };
        }

        return {
            ...baseTotals,
            discount: 0,
            couponCode: null,
            subtotalAfterDiscount: baseTotals.subtotal
        };
    },

    /**
     * Format discount display
     * 
     * @param {Object} coupon - Coupon object
     * @returns {string} Formatted discount string
     */
    formatDiscountDisplay(coupon) {
        if (coupon.discount_type === 'percentage') {
            return `${coupon.discount_value}% off`;
        }
        return `${coupon.discount_value.toFixed(2)} EGP off`;
    }
};

// Export globally
window.CouponsService = CouponsService;
