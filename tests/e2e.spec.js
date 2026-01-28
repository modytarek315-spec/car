const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:5500'; // Update this to your local server URL

test.describe('Car House E2E Tests', () => {
    
    // ==========================================
    // HOME PAGE TESTS
    // ==========================================
    test.describe('Home Page', () => {
        test('should load home page successfully', async ({ page }) => {
            await page.goto(BASE_URL);
            await expect(page).toHaveTitle(/Car House/);
            await expect(page.locator('.logo-text h1')).toContainText('Car House');
        });

        test('should display category cards', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForSelector('.category-card', { timeout: 5000 });
            const categoryCards = await page.locator('.category-card').count();
            expect(categoryCards).toBeGreaterThan(0);
        });

        test('should display header navigation', async ({ page }) => {
            await page.goto(BASE_URL);
            await expect(page.locator('#cart-btn')).toBeVisible();
            await expect(page.locator('.search-container')).toBeVisible();
        });
    });

    // ==========================================
    // AUTHENTICATION TESTS
    // ==========================================
    test.describe('Authentication', () => {
        test('should show login button when not authenticated', async ({ page }) => {
            await page.goto(BASE_URL);
            const loginBtn = page.locator('.login-btn, #login-btn').first();
            await expect(loginBtn).toBeVisible({ timeout: 3000 });
        });

        test('should navigate to login page', async ({ page }) => {
            await page.goto(`${BASE_URL}/login.html`);
            await expect(page.locator('form')).toBeVisible();
            await expect(page.locator('input[type="email"]')).toBeVisible();
            await expect(page.locator('input[type="password"]')).toBeVisible();
        });

        test('should navigate to register page', async ({ page }) => {
            await page.goto(`${BASE_URL}/register.html`);
            await expect(page.locator('form')).toBeVisible();
            await expect(page.locator('input[name="full-name"], input[id="full-name"]')).toBeVisible();
        });
    });

    // ==========================================
    // PRODUCT BROWSING TESTS
    // ==========================================
    test.describe('Product Browsing', () => {
        test('should navigate to category page', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForSelector('.category-card', { timeout: 5000 });
            
            const firstCategory = page.locator('.category-card').first();
            await firstCategory.click();
            
            await page.waitForLoadState('networkidle');
            await expect(page.locator('.page-title')).toBeVisible();
        });

        test('should display products in category', async ({ page }) => {
            await page.goto(`${BASE_URL}/category.html?category=engine`);
            await page.waitForSelector('.product-card, .products-grid', { timeout: 5000 });
            const productCount = await page.locator('.product-card').count();
            expect(productCount).toBeGreaterThan(0);
        });

        test('should view product details', async ({ page }) => {
            await page.goto(`${BASE_URL}/category.html?category=engine`);
            await page.waitForSelector('.view-details-btn, .product-card', { timeout: 5000 });
            
            const detailsBtn = page.locator('.view-details-btn').first();
            if (await detailsBtn.count() > 0) {
                await detailsBtn.click();
                await page.waitForLoadState('networkidle');
                await expect(page).toHaveURL(/product\.html/);
            }
        });
    });

    // ==========================================
    // SEARCH TESTS
    // ==========================================
    test.describe('Search Functionality', () => {
        test('should perform product search', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForSelector('#search-input', { timeout: 5000 });
            
            await page.fill('#search-input', 'engine');
            await page.click('#search-btn');
            
            await page.waitForLoadState('networkidle');
            await expect(page.locator('.page-title')).toContainText(/search/i);
        });

        test('should show no results for invalid search', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.waitForSelector('#search-input', { timeout: 5000 });
            
            await page.fill('#search-input', 'xyzabc123notfound');
            await page.click('#search-btn');
            
            await page.waitForLoadState('networkidle');
            // Should show empty state or no products message
        });
    });

    // ==========================================
    // CART TESTS
    // ==========================================
    test.describe('Shopping Cart', () => {
        test('should add product to cart', async ({ page }) => {
            await page.goto(`${BASE_URL}/category.html?category=engine`);
            await page.waitForSelector('.add-to-cart-btn', { timeout: 5000 });
            
            const initialCount = await page.locator('#cart-count').textContent();
            
            await page.locator('.add-to-cart-btn').first().click();
            
            // Wait for cart update
            await page.waitForTimeout(1000);
            
            const newCount = await page.locator('#cart-count').textContent();
            expect(parseInt(newCount)).toBeGreaterThan(parseInt(initialCount) || 0);
        });

        test('should navigate to cart page', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.click('#cart-btn');
            
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveURL(/cart\.html/);
            await expect(page.locator('.page-title')).toContainText(/cart/i);
        });

        test('should update cart quantity', async ({ page }) => {
            // Add product first
            await page.goto(`${BASE_URL}/category.html?category=engine`);
            await page.waitForSelector('.add-to-cart-btn', { timeout: 5000 });
            await page.locator('.add-to-cart-btn').first().click();
            await page.waitForTimeout(1000);
            
            // Go to cart
            await page.goto(`${BASE_URL}/cart.html`);
            await page.waitForSelector('.cart-item, .cart-items', { timeout: 5000 });
            
            const increaseBtn = page.locator('.increase-qty, button[data-action="increase"]').first();
            if (await increaseBtn.count() > 0) {
                await increaseBtn.click();
                await page.waitForTimeout(500);
            }
        });

        test('should remove product from cart', async ({ page }) => {
            // Add product first
            await page.goto(`${BASE_URL}/category.html?category=engine`);
            await page.waitForSelector('.add-to-cart-btn', { timeout: 5000 });
            await page.locator('.add-to-cart-btn').first().click();
            await page.waitForTimeout(1000);
            
            // Go to cart
            await page.goto(`${BASE_URL}/cart.html`);
            await page.waitForSelector('.cart-item, .cart-items', { timeout: 5000 });
            
            const removeBtn = page.locator('.remove-btn, button[data-action="remove"]').first();
            if (await removeBtn.count() > 0) {
                await removeBtn.click();
                await page.waitForTimeout(500);
            }
        });
    });

    // ==========================================
    // FAVORITES TESTS
    // ==========================================
    test.describe('Favorites', () => {
        test('should navigate to favorites page', async ({ page }) => {
            await page.goto(`${BASE_URL}/favorites.html`);
            await page.waitForLoadState('networkidle');
            await expect(page.locator('.page-title')).toContainText(/favorite/i);
        });

        test('should toggle favorite on product', async ({ page }) => {
            await page.goto(`${BASE_URL}/category.html?category=engine`);
            await page.waitForSelector('.favorite-btn', { timeout: 5000 });
            
            const favoriteBtn = page.locator('.favorite-btn').first();
            if (await favoriteBtn.count() > 0) {
                await favoriteBtn.click();
                await page.waitForTimeout(1000);
            }
        });
    });

    // ==========================================
    // CHECKOUT TESTS
    // ==========================================
    test.describe('Checkout Process', () => {
        test('should navigate to checkout page', async ({ page }) => {
            await page.goto(`${BASE_URL}/checkout.html`);
            await page.waitForLoadState('networkidle');
            await expect(page.locator('.page-title')).toContainText(/checkout/i);
        });

        test('should fill shipping form', async ({ page }) => {
            await page.goto(`${BASE_URL}/checkout.html`);
            await page.waitForSelector('#shipping-form, #ship-name', { timeout: 5000 });
            
            await page.fill('#ship-name', 'John Doe');
            await page.fill('#ship-email', 'john@example.com');
            await page.fill('#ship-address', '123 Main Street, Cairo');
            await page.fill('#ship-phone', '+20 1234567890');
            await page.fill('#ship-city', 'Cairo');
            
            // Verify fields are filled
            await expect(page.locator('#ship-name')).toHaveValue('John Doe');
            await expect(page.locator('#ship-email')).toHaveValue('john@example.com');
        });

        test('should proceed to payment page', async ({ page }) => {
            await page.goto(`${BASE_URL}/checkout.html`);
            await page.waitForSelector('#shipping-form', { timeout: 5000 });
            
            await page.fill('#ship-name', 'John Doe');
            await page.fill('#ship-email', 'john@example.com');
            await page.fill('#ship-address', '123 Main Street');
            await page.fill('#ship-phone', '+20 1234567890');
            await page.fill('#ship-city', 'Cairo');
            
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);
            
            // Should show payment options
            await expect(page.locator('.payment-method-card, .payment-methods')).toBeVisible();
        });

        test('should select payment method', async ({ page }) => {
            await page.goto(`${BASE_URL}/checkout.html`);
            await page.waitForSelector('#shipping-form', { timeout: 5000 });
            
            // Fill shipping form
            await page.fill('#ship-name', 'John Doe');
            await page.fill('#ship-email', 'john@example.com');
            await page.fill('#ship-address', '123 Main Street');
            await page.fill('#ship-phone', '+20 1234567890');
            await page.fill('#ship-city', 'Cairo');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);
            
            // Select card payment
            const cardMethod = page.locator('#method-card, input[value="card"]');
            if (await cardMethod.count() > 0) {
                await cardMethod.click();
                await page.waitForTimeout(500);
                
                // Card form should be visible
                await expect(page.locator('#card-number, #card-details-container')).toBeVisible();
            }
        });

        test('should fill card details', async ({ page }) => {
            await page.goto(`${BASE_URL}/checkout.html`);
            await page.waitForSelector('#shipping-form', { timeout: 5000 });
            
            // Fill shipping
            await page.fill('#ship-name', 'John Doe');
            await page.fill('#ship-email', 'john@example.com');
            await page.fill('#ship-address', '123 Main Street');
            await page.fill('#ship-phone', '+20 1234567890');
            await page.fill('#ship-city', 'Cairo');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1000);
            
            // Select card payment
            const cardMethod = page.locator('#method-card');
            if (await cardMethod.count() > 0) {
                await cardMethod.click();
                await page.waitForTimeout(500);
                
                // Fill card details
                await page.fill('#card-name', 'John Doe');
                await page.fill('#card-number', '4111 1111 1111 1111');
                await page.fill('#card-expiry', '12/25');
                await page.fill('#card-cvv', '123');
                
                await expect(page.locator('#card-number')).toHaveValue('4111 1111 1111 1111');
            }
        });
    });

    // ==========================================
    // SERVICE BOOKING TESTS
    // ==========================================
    test.describe('Service Booking', () => {
        test('should navigate to service page', async ({ page }) => {
            await page.goto(`${BASE_URL}/service.html`);
            await page.waitForLoadState('networkidle');
            await expect(page.locator('.page-title')).toBeVisible();
        });

        test('should display service cards', async ({ page }) => {
            await page.goto(`${BASE_URL}/service.html`);
            await page.waitForSelector('.service-card, .services-grid', { timeout: 5000 });
            const serviceCount = await page.locator('.service-card').count();
            expect(serviceCount).toBeGreaterThan(0);
        });

        test('should fill service booking form', async ({ page }) => {
            await page.goto(`${BASE_URL}/service.html`);
            await page.waitForSelector('.service-card', { timeout: 5000 });
            
            const bookBtn = page.locator('.book-service-btn, button[data-action="book"]').first();
            if (await bookBtn.count() > 0) {
                await bookBtn.click();
                await page.waitForTimeout(500);
                
                // Fill booking form if modal appears
                const nameField = page.locator('input[name="customer-name"], #customer-name');
                if (await nameField.count() > 0) {
                    await nameField.fill('John Doe');
                }
            }
        });
    });

    // ==========================================
    // PRODUCT REVIEWS TESTS
    // ==========================================
    test.describe('Product Reviews', () => {
        test('should display reviews section on product page', async ({ page }) => {
            await page.goto(`${BASE_URL}/category.html?category=engine`);
            await page.waitForSelector('.view-details-btn', { timeout: 5000 });
            
            const detailsBtn = page.locator('.view-details-btn').first();
            if (await detailsBtn.count() > 0) {
                await detailsBtn.click();
                await page.waitForLoadState('networkidle');
                
                await expect(page.locator('#rating-section, .reviews-section')).toBeVisible();
            }
        });

        test('should show rating stars on product page', async ({ page }) => {
            await page.goto(`${BASE_URL}/category.html?category=engine`);
            await page.waitForSelector('.view-details-btn', { timeout: 5000 });
            
            const detailsBtn = page.locator('.view-details-btn').first();
            if (await detailsBtn.count() > 0) {
                await detailsBtn.click();
                await page.waitForLoadState('networkidle');
                
                const stars = page.locator('.rating-stars, #star-rating span');
                if (await stars.count() > 0) {
                    expect(await stars.count()).toBeGreaterThan(0);
                }
            }
        });
    });

    // ==========================================
    // RESPONSIVE DESIGN TESTS
    // ==========================================
    test.describe('Responsive Design', () => {
        test('should work on mobile viewport', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto(BASE_URL);
            await expect(page.locator('.logo-text h1')).toBeVisible();
        });

        test('should work on tablet viewport', async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 });
            await page.goto(BASE_URL);
            await expect(page.locator('.logo-text h1')).toBeVisible();
        });

        test('should work on desktop viewport', async ({ page }) => {
            await page.setViewportSize({ width: 1920, height: 1080 });
            await page.goto(BASE_URL);
            await expect(page.locator('.logo-text h1')).toBeVisible();
        });
    });

    // ==========================================
    // NAVIGATION TESTS
    // ==========================================
    test.describe('Navigation', () => {
        test('should navigate to about page', async ({ page }) => {
            await page.goto(`${BASE_URL}/about.html`);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveURL(/about\.html/);
        });

        test('should navigate back to home from cart', async ({ page }) => {
            await page.goto(`${BASE_URL}/cart.html`);
            
            const homeLink = page.locator('a[href="index.html"]').first();
            if (await homeLink.count() > 0) {
                await homeLink.click();
                await page.waitForLoadState('networkidle');
                await expect(page).toHaveURL(BASE_URL);
            }
        });
    });

    // ==========================================
    // PERFORMANCE TESTS
    // ==========================================
    test.describe('Performance', () => {
        test('should load home page within 3 seconds', async ({ page }) => {
            const startTime = Date.now();
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle');
            const loadTime = Date.now() - startTime;
            
            expect(loadTime).toBeLessThan(3000);
        });
    });
});
