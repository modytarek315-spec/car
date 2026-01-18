/**
 * =============================================================
 * ORDERS SERVICE
 * =============================================================
 * Handles order creation and management including:
 * - Order creation from cart
 * - Stock deduction
 * - Order history
 * 
 * Database Tables Referenced:
 * - orders: Order data (id, user_id, status, total_amount, subtotal,
 *           tax, shipping_cost, payment_status, payment_method,
 *           shipping_address, billing_address, tracking_number)
 * - order_items: Order line items (order_id, product_id, sku, title,
 *                unit_price, quantity, subtotal)
 * - products: For stock deduction
 * - inventory: For stock deduction
 * 
 * UI Hooks Used:
 * - #checkout-form: Checkout form
 * - #submit-order-btn: Submit order button
 * - #checkout-message: Order result message container
 * =============================================================
 */

const OrdersService = {

    /**
     * Create a new order from cart
     * 
     * Table: orders
     * Columns: user_id, status, total_amount, subtotal, tax, shipping_cost,
     *          payment_method, shipping_address, payment_meta
     * RLS: orders_insert_own - users can only create their own orders
     * 
     * Table: order_items
     * Columns: order_id, product_id, sku, title, unit_price, quantity, subtotal
     * 
     * Business Rules:
     * - Tax = subtotal * 0.14 (14%)
     * - Standard shipping = Free
     * - Express shipping = 50 EGP
     * - Stock is deducted after successful order
     * - Cart is cleared after successful order
     * 
     * @param {Object} orderData - Order information
     * @param {Object} orderData.shippingAddress - Shipping address object
     * @param {string} orderData.shippingAddress.fullName - Customer name
     * @param {string} orderData.shippingAddress.email - Customer email
     * @param {string} orderData.shippingAddress.phone - Customer phone
     * @param {string} orderData.shippingAddress.address - Street address
     * @param {string} [orderData.shippingAddress.city] - City
     * @param {string} [orderData.shippingAddress.postalCode] - Postal code
     * @param {string} [orderData.paymentMethod='cash'] - 'cash' or 'card'
     * @param {string} [orderData.shippingType='standard'] - 'standard' or 'express'
     * @param {string} [orderData.notes] - Order notes
     * @returns {Promise<Object>} { success, order, error }
     */
    async createOrder(orderData) {
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
                    error: 'Please login to complete your order',
                    requiresAuth: true
                };
            }

            // Get cart items
            const cart = window.CartService.getCart();
            if (cart.length === 0) {
                return { success: false, error: 'Your cart is empty' };
            }

            // Validate cart stock
            const validation = await window.CartService.validateCart();
            if (!validation.valid) {
                const errorItems = validation.errors.map(e => e.productName).join(', ');
                return {
                    success: false,
                    error: `Insufficient stock for: ${errorItems}`
                };
            }

            // Calculate totals
            const totals = window.CartService.getCartTotals(orderData.shippingType);

            // Create order record
            // Note: Schema only has total_amount and total fields
            // Breakdown (subtotal, tax, shipping) should be stored in payment_meta if needed
            const orderInsertData = {
                user_id: user.id,
                status: 'pending',
                total_amount: totals.total,
                total: totals.total,
                shipping_address: {
                    full_name: orderData.shippingAddress.fullName,
                    email: orderData.shippingAddress.email,
                    phone: orderData.shippingAddress.phone,
                    address: orderData.shippingAddress.address,
                    city: orderData.shippingAddress.city || '',
                    postal_code: orderData.shippingAddress.postalCode || ''
                },
                payment_method: orderData.paymentMethod || 'cash',
                billing_address: orderData.billingAddress || orderData.shippingAddress,
                payment_meta: orderData.paymentDetails || {},
                notes: orderData.notes || null
            };

            const { data: order, error: orderError } = await client
                .from('orders')
                .insert(orderInsertData)
                .select('id, user_id, status, total_amount, total')
                .single();

            if (orderError) throw orderError;

            // Create order items
            const orderItems = cart.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                sku: item.sku || null,
                title: item.name,
                unit_price: item.price,
                price: item.price, // Same as unit_price in this schema
                quantity: item.quantity,
                subtotal: item.price * item.quantity
            }));

            const { error: itemsError } = await client
                .from('order_items')
                .insert(orderItems);

            if (itemsError) {
                // Rollback order if items fail
                await client.from('orders').delete().eq('id', order.id);
                throw itemsError;
            }

            // Deduct stock from products table
            for (const item of cart) {
                await this.deductStock(item.productId, item.quantity);
            }

            // Clear cart after successful order
            window.CartService.clearCart();

            return {
                success: true,
                order,
                message: 'Order placed successfully!'
            };
        } catch (error) {
            console.error('Create order error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Deduct stock from product
     * 
     * Table: products (stock column)
     * Table: inventory (reserved column)
     * 
     * @param {string} productId - Product UUID
     * @param {number} quantity - Quantity to deduct
     * @returns {Promise<boolean>} Success status
     */
    async deductStock(productId, quantity) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) return false;

        try {
            // First, try to deduct from products.stock
            const { data: product, error: getError } = await client
                .from('products')
                .select('stock')
                .eq('id', productId)
                .single();

            if (getError) throw getError;

            const newStock = Math.max(0, (product.stock || 0) - quantity);

            const { error: updateError } = await client
                .from('products')
                .update({
                    stock: newStock,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);

            if (updateError) throw updateError;

            return true;
        } catch (error) {
            console.error('Deduct stock error:', error);
            return false;
        }
    },

    /**
     * Get user's order history
     * 
     * Table: orders
     * RLS: orders_select_own - users can only see their own orders
     * 
     * @param {Object} [options] - Query options
     * @param {number} [options.limit] - Maximum results
     * @param {number} [options.offset] - Offset for pagination
     * @param {string} [options.status] - Filter by status
     * @returns {Promise<Object>} { success, orders, count, error }
     */
    async getOrderHistory(options = {}) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const user = await window.CarHouseSupabase.getCurrentUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            let query = client
                .from('orders')
                .select(`
                    *,
                    items:order_items(
                        id,
                        product_id,
                        title,
                        unit_price,
                        quantity,
                        subtotal
                    )
                `, { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (options.status) {
                query = query.eq('status', options.status);
            }

            if (options.limit) {
                query = query.limit(options.limit);
            }

            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                success: true,
                orders: data,
                count
            };
        } catch (error) {
            console.error('Get orders error:', error);
            return {
                success: false,
                orders: [],
                count: 0,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Get single order by ID
     * 
     * @param {string} orderId - Order UUID
     * @returns {Promise<Object>} { success, order, error }
     */
    async getOrderById(orderId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }

        try {
            const { data, error } = await client
                .from('orders')
                .select(`
                    *,
                    items:order_items(
                        id,
                        product_id,
                        title,
                        unit_price,
                        quantity,
                        subtotal,
                        product:products(id, name, images)
                    )
                `)
                .eq('id', orderId)
                .single();

            if (error) throw error;

            return {
                success: true,
                order: data
            };
        } catch (error) {
            console.error('Get order error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Get order status display text
     * 
     * @param {string} status - Order status code
     * @returns {Object} { text, color }
     */
    getStatusDisplay(status) {
        const statusMap = {
            pending: { text: 'Pending', color: '#f39c12' },
            processing: { text: 'Processing', color: '#3498db' },
            shipped: { text: 'Shipped', color: '#9b59b6' },
            delivered: { text: 'Delivered', color: '#27ae60' },
            cancelled: { text: 'Cancelled', color: '#e74c3c' }
        };

        return statusMap[status] || { text: status, color: '#7f8c8d' };
    },

    /**
     * Get payment status display text
     * 
     * @param {string} status - Payment status code
     * @returns {Object} { text, color }
     */
    getPaymentStatusDisplay(status) {
        const statusMap = {
            pending: { text: 'Pending', color: '#f39c12' },
            paid: { text: 'Paid', color: '#27ae60' },
            failed: { text: 'Failed', color: '#e74c3c' },
            refunded: { text: 'Refunded', color: '#9b59b6' }
        };

        return statusMap[status] || { text: status, color: '#7f8c8d' };
    }
};

// Export globally
window.OrdersService = OrdersService;
