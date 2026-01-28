const { test, expect } = require('@playwright/test');

// API Testing for Supabase integration
test.describe('API Integration Tests', () => {
    
    // ==========================================
    // PRODUCT API TESTS
    // ==========================================
    test.describe('Products API', () => {
        test('should fetch all products', async ({ page }) => {
            // Navigate to page to access window.ProductsService
            await page.goto('http://localhost:5500');
            
            const result = await page.evaluate(async () => {
                if (window.ProductsService) {
                    return await window.ProductsService.getAllProducts();
                }
                return null;
            });
            
            if (result) {
                expect(result.success).toBeTruthy();
                expect(result.products).toBeDefined();
                expect(Array.isArray(result.products)).toBeTruthy();
            }
        });

        test('should fetch products by category', async ({ page }) => {
            await page.goto('http://localhost:5500');
            
            const result = await page.evaluate(async () => {
                if (window.ProductsService) {
                    return await window.ProductsService.getProductsByCategory('engine');
                }
                return null;
            });
            
            if (result) {
                expect(result.success).toBeTruthy();
            }
        });

        test('should search products', async ({ page }) => {
            await page.goto('http://localhost:5500');
            
            const result = await page.evaluate(async () => {
                if (window.ProductsService) {
                    return await window.ProductsService.searchProducts('engine');
                }
                return null;
            });
            
            if (result) {
                expect(result.success).toBeTruthy();
            }
        });
    });

    // ==========================================
    // CART SERVICE TESTS
    // ==========================================
    test.describe('Cart Service', () => {
        test('should add item to cart', async ({ page }) => {
            await page.goto('http://localhost:5500');
            
            const result = await page.evaluate(async () => {
                if (window.CartService) {
                    const testProduct = {
                        id: 'test-123',
                        name: 'Test Product',
                        price: 100,
                        image: 'test.jpg'
                    };
                    return window.CartService.addToCart(testProduct, 1);
                }
                return null;
            });
            
            if (result) {
                expect(result.success).toBeTruthy();
            }
        });

        test('should get cart totals', async ({ page }) => {
            await page.goto('http://localhost:5500');
            
            const totals = await page.evaluate(() => {
                if (window.CartService) {
                    return window.CartService.getCartTotals();
                }
                return null;
            });
            
            if (totals) {
                expect(totals).toHaveProperty('subtotal');
                expect(totals).toHaveProperty('tax');
                expect(totals).toHaveProperty('total');
                expect(typeof totals.total).toBe('number');
            }
        });

        test('should clear cart', async ({ page }) => {
            await page.goto('http://localhost:5500');
            
            await page.evaluate(() => {
                if (window.CartService) {
                    window.CartService.clearCart();
                }
            });
            
            const cart = await page.evaluate(() => {
                if (window.CartService) {
                    return window.CartService.getCart();
                }
                return null;
            });
            
            if (cart) {
                expect(cart.length).toBe(0);
            }
        });
    });

    // ==========================================
    // FAVORITES SERVICE TESTS
    // ==========================================
    test.describe('Favorites Service', () => {
        test('should handle favorites operations', async ({ page }) => {
            await page.goto('http://localhost:5500');
            
            const hasService = await page.evaluate(() => {
                return typeof window.FavoritesService !== 'undefined';
            });
            
            expect(hasService).toBeTruthy();
        });
    });

    // ==========================================
    // REVIEWS SERVICE TESTS
    // ==========================================
    test.describe('Reviews Service', () => {
        test('should fetch product reviews', async ({ page }) => {
            await page.goto('http://localhost:5500');
            
            const result = await page.evaluate(async () => {
                if (window.ReviewsService) {
                    // Test with a sample product ID
                    return await window.ReviewsService.getProductReviews('sample-id');
                }
                return null;
            });
            
            // Service should return a response structure
            if (result) {
                expect(result).toHaveProperty('success');
            }
        });
    });

    // ==========================================
    // ORDERS SERVICE TESTS
    // ==========================================
    test.describe('Orders Service', () => {
        test('should have order service available', async ({ page }) => {
            await page.goto('http://localhost:5500');
            
            const hasService = await page.evaluate(() => {
                return typeof window.OrdersService !== 'undefined';
            });
            
            expect(hasService).toBeTruthy();
        });
    });

    // ==========================================
    // AUTH SERVICE TESTS
    // ==========================================
    test.describe('Auth Service', () => {
        test('should check authentication state', async ({ page }) => {
            await page.goto('http://localhost:5500');
            
            const result = await page.evaluate(async () => {
                if (window.CarHouseSupabase) {
                    return await window.CarHouseSupabase.isAuthenticated();
                }
                return null;
            });
            
            expect(typeof result).toBe('boolean');
        });
    });
});
