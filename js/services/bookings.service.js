/**
 * =============================================================
 * BOOKINGS SERVICE
 * =============================================================
 * Handles workshop/service booking operations including:
 * - Service type listing
 * - Booking creation
 * - Booking history
 * 
 * Database Tables Referenced:
 * - service_types: Service definitions (name, description, estimated_duration,
 *                  base_price, icon, is_active, position)
 * - workshop_bookings: Booking records (user_id, service_type_id, service_type,
 *                      vehicle_info, scheduled_date, status, notes)
 * - service_type_products: Products linked to services
 * 
 * UI Hooks Used:
 * - .service-page: Service listing page
 * - .service-card: Individual service cards
 * - #service-booking-form: Booking form
 * - #book-service-btn: Book service button
 * =============================================================
 */

const BookingsService = {

    /**
     * Get all active service types
     * 
     * Table: service_types
     * Columns: id, name, description, estimated_duration, base_price, 
     *          icon, is_active, position
     * RLS: service_types_select_all - public read access
     * 
     * Business Rule: Only show services where is_active = true
     * 
     * @returns {Promise<Object>} { success, services, error }
     */
    async getServiceTypes() {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }



        try {
            // 1. Fetch Service Types with relations in ONE query
            const { data: serviceTypes, error: typesError } = await client
                .from('service_types')
                .select(`
                    *,
                    service_type_products (
                        id,
                        quantity,
                        product:products (
                            id,
                            name,
                            brand,
                            price,
                            stock,
                            images:product_images(url, position)
                        )
                    )
                `)
                .eq('is_active', true)
                .order('position', { ascending: true });

            if (typesError) throw typesError;

            // 2. Map relations to the expected 'items' and 'service_type_products' keys
            if (serviceTypes) {
                serviceTypes.forEach(service => {
                    service.items = service.service_type_products || [];
                    // Map to a simpler products array for UI compatibility
                    service.products = service.items.map(item => {
                        if (item.product) {
                            // Extract icon from first image
                            if (item.product.images && item.product.images.length > 0) {
                                item.product.icon = item.product.images.sort((a, b) => a.position - b.position)[0].url;
                            }
                            return item.product;
                        }
                        return null;
                    }).filter(p => p !== null);
                });
            }

            return {
                success: true,
                services: serviceTypes || []
            };

        } catch (error) {
            console.error('Get service types error:', JSON.stringify(error, null, 2));
            return {
                success: false,
                services: [],
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Get a single service type with its products
     * 
     * Tables: service_types, service_type_products
     * 
     * @param {string} serviceId - Service type UUID
     * @returns {Promise<Object>} { success, service, error }
     */
    async getServiceTypeById(serviceId) {
        const client = window.CarHouseSupabase.getClient();
        if (!client) {
            return { success: false, error: 'Supabase client not initialized' };
        }


        try {
            // 1. Fetch Service Type with relations in ONE query
            const { data: service, error: typeError } = await client
                .from('service_types')
                .select(`
                    *,
                    service_type_products (
                        id,
                        quantity,
                        product:products (
                            id,
                            name,
                            brand,
                            price,
                            stock,
                            images:product_images(url, position)
                        )
                    )
                `)
                .eq('id', serviceId)
                .eq('is_active', true)
                .single();

            if (typeError) throw typeError;

            // 2. Map relations
            if (service) {
                service.items = service.service_type_products || [];
                // Map to a simpler products array for UI compatibility
                service.products = service.items.map(p => {
                    if (p.product) {
                        if (p.product.images && p.product.images.length > 0) {
                            p.product.icon = p.product.images.sort((a, b) => a.position - b.position)[0].url;
                        }
                        return p.product;
                    }
                    return null;
                }).filter(p => p !== null);
            }

            return {
                success: true,
                service: service
            };
        } catch (error) {
            console.error('Get service type error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Create a new workshop booking
     * 
     * Table: workshop_bookings
     * Columns: user_id, service_type_id, service_type, vehicle_info,
     *          scheduled_date, status, notes
     * RLS: bookings_insert_any_auth - authenticated users can create
     * 
     * @param {Object} bookingData - Booking information
     * @param {string} bookingData.serviceTypeId - Service type UUID
     * @param {Object} bookingData.vehicleInfo - Vehicle information
     * @param {string} bookingData.vehicleInfo.make - Vehicle make
     * @param {string} bookingData.vehicleInfo.model - Vehicle model
     * @param {string} [bookingData.vehicleInfo.year] - Vehicle year
     * @param {string} [bookingData.vehicleInfo.licensePlate] - License plate
     * @param {string} [bookingData.vehicleInfo.vin] - VIN number
     * @param {string} bookingData.scheduledDate - ISO date string
     * @param {string} [bookingData.scheduledTime] - Time string (HH:MM)
     * @param {string} [bookingData.notes] - Additional notes
     * @param {Object} [bookingData.customerInfo] - Customer contact info
     * @returns {Promise<Object>} { success, booking, error }
     */
    async createBooking(bookingData) {
        if (!bookingData.serviceTypeId || bookingData.serviceTypeId === 'null' || bookingData.serviceTypeId === 'undefined') {
            return { success: false, error: 'Invalid service type select' };
        }
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
                    error: 'Please login to book a service',
                    requiresAuth: true
                };
            }

            // Get service type name for fallback
            const { data: serviceType, error: svcError } = await client
                .from('service_types')
                .select('name')
                .eq('id', bookingData.serviceTypeId)
                .single();

            if (svcError) throw svcError;

            // Combine date and time
            let scheduledDate = bookingData.scheduledDate;
            if (bookingData.scheduledTime) {
                scheduledDate = `${bookingData.scheduledDate}T${bookingData.scheduledTime}:00`;
            }

            // Create booking
            const { data: booking, error } = await client
                .from('workshop_bookings')
                .insert({
                    user_id: user.id,
                    service_type_id: bookingData.serviceTypeId,
                    service_type: serviceType.name, // Fallback text
                    vehicle_info: {
                        make: bookingData.vehicleInfo.make || '',
                        model: bookingData.vehicleInfo.model || '',
                        year: bookingData.vehicleInfo.year || '',
                        license_plate: bookingData.vehicleInfo.licensePlate || '',
                        vin: bookingData.vehicleInfo.vin || '',
                        mileage: bookingData.vehicleInfo.mileage || ''
                    },
                    scheduled_date: scheduledDate,
                    status: 'scheduled',
                    notes: bookingData.notes || null
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                booking,
                message: 'Service appointment booked successfully!'
            };
        } catch (error) {
            console.error('Create booking error:', error);
            return {
                success: false,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Get user's booking history
     * 
     * Table: workshop_bookings
     * RLS: bookings_select_own - users can only see their own bookings
     * 
     * @param {Object} [options] - Query options
     * @param {number} [options.limit] - Maximum results
     * @param {number} [options.offset] - Offset for pagination
     * @param {string} [options.status] - Filter by status
     * @returns {Promise<Object>} { success, bookings, count, error }
     */
    async getBookingHistory(options = {}) {
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
                .from('workshop_bookings')
                .select(`
                    *,
                    service:service_types(id, name, description, base_price, icon)
                `, { count: 'exact' })
                .eq('user_id', user.id)
                .order('scheduled_date', { ascending: false });

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
                bookings: data,
                count
            };
        } catch (error) {
            console.error('Get bookings error:', error);
            return {
                success: false,
                bookings: [],
                count: 0,
                error: window.CarHouseSupabase.formatError(error)
            };
        }
    },

    /**
     * Get booking status display text
     * 
     * @param {string} status - Booking status code
     * @returns {Object} { text, color }
     */
    getStatusDisplay(status) {
        const statusMap = {
            scheduled: { text: 'Scheduled', color: '#3498db' },
            pending: { text: 'Pending', color: '#f39c12' },
            in_progress: { text: 'In Progress', color: '#9b59b6' },
            completed: { text: 'Completed', color: '#27ae60' },
            cancelled: { text: 'Cancelled', color: '#e74c3c' }
        };

        return statusMap[status] || { text: status, color: '#7f8c8d' };
    }
};

// Export globally
window.BookingsService = BookingsService;
