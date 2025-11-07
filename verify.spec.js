const { test, expect } = require('@playwright/test');

test.describe('Car House E-commerce Site', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local HTML file
    await page.goto('file:///app/index.html', { waitUntil: 'networkidle' });
  });

  test('should load the homepage and display categories and featured products', async ({ page }) => {
    // Check for the store name and tagline
    await expect(page.locator('#store-name')).toHaveText('Car House 🚗');
    await expect(page.locator('#store-tagline')).toHaveText('Quality Parts for Your Vehicle');

    // Check if the main categories are visible
    await expect(page.locator('.category-card[data-category="engine"]')).toBeVisible();
    await expect(page.locator('.category-card[data-category="brakes"]')).toBeVisible();
    await expect(page.locator('.category-card[data-category="suspension"]')).toBeVisible();

    // Check for the "Featured Products" section
    await expect(page.locator('.section-title')).toHaveText('Featured Products');
    const featuredProducts = await page.locator('.products-grid .product-card').count();
    expect(featuredProducts).toBeGreaterThan(0);
  });

  test('should navigate to a category page and display products', async ({ page }) => {
    // Click on the 'Engine Parts' category
    await page.click('.category-card[data-category="engine"]');
    await page.waitForTimeout(100); // Add a small delay

    // Check for the category title
    await expect(page.locator('.page-title')).toHaveText('Engine Parts');

    // Check that product cards are displayed
    const productCards = await page.locator('.product-card').count();
    expect(productCards).toBeGreaterThan(0);
  });

  test('should display product details in-page', async ({ page }) => {
    // Click on the "View Details" button for a featured product
    await page.click('.product-card:first-child .view-details-btn');

    // Check that the product detail view is displayed
    await expect(page.locator('.product-detail-view')).toBeVisible();
    await expect(page.locator('.product-detail-view h2')).toBeVisible();

    // Click the "Back" button and verify that we are back on the home page
    await page.click('.product-detail-view .back-btn');
    await expect(page.locator('.category-grid')).toBeVisible();
  });

  test('should add a product to the cart with a "fly-to-cart" animation', async ({ page }) => {
    // Add a product to the cart
    await page.click('.product-card:first-child .add-to-cart-btn');

    // Check for the success toast message
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toHaveText('Added to cart!');

    // Check if the cart count is updated
    await expect(page.locator('#cart-count')).toHaveText('1');

    // Check for the "fly-to-cart" animation (we can't easily test the animation itself, but we can check if the cart icon bounces)
    await expect(page.locator('#cart-btn')).toHaveClass(/bounce/);
  });

  test('should display items correctly in the cart page', async ({ page }) => {
    // Add a product to the cart first
    await page.click('.product-card:first-child .add-to-cart-btn');

    // Click on the cart button
    await page.click('#cart-btn');

    // Check that the cart page is displayed
    await expect(page.locator('.page-title')).toHaveText('Shopping Cart');

    // Verify the item is in the cart
    await expect(page.locator('.cart-item-name')).toBeVisible();
    await expect(page.locator('.qty-display:has-text("1")')).toBeVisible();
  });

  test('should take a screenshot of the final state', async ({ page }) => {
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'final-screenshot.png' });
  });
});
