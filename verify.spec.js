const { test, expect } = require('@playwright/test');

test.describe('Car House E-commerce Site', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local HTML file
    await page.goto('file:///app/index.html', { waitUntil: 'networkidle' });
  });

  test('should load the homepage and display categories', async ({ page }) => {
    // Check for the store name and tagline
    await expect(page.locator('#store-name')).toHaveText('Car House 🚗');
    await expect(page.locator('#store-tagline')).toHaveText('Quality Parts for Your Vehicle');

    // Check if the main categories are visible
    await expect(page.locator('.category-card[data-category="engine"]')).toBeVisible();
    await expect(page.locator('.category-card[data-category="brakes"]')).toBeVisible();
    await expect(page.locator('.category-card[data-category="suspension"]')).toBeVisible();
    await expect(page.locator('.category-card[data-category="maintenance"]')).toBeVisible();
    await expect(page.locator('.category-card[data-category="fluids"]')).toBeVisible();
    await expect(page.locator('.category-card[data-category="service"]')).toBeVisible();

    // Ensure no translation-related elements are present
    await expect(page.locator('#language-switcher')).toHaveCount(0);
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

    // Verify a specific product is visible
    await expect(page.locator('.product-name:has-text("cylinder head")')).toBeVisible();
  });

  test('should add a product to the cart and update the cart count', async ({ page }) => {
    // Navigate to the 'Engine Parts' category
    await page.click('.nav-links button[data-category="engine"]');

    // Add 'cylinder head' to the cart
    await page.click('.product-card:has-text("cylinder head") .add-to-cart-btn');

    // Check for the success toast message
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toHaveText('Added to cart!');

    // Check if the cart count is updated
    await expect(page.locator('#cart-count')).toHaveText('1');

    // Add the same product again to check quantity update
    await page.click('.product-card:has-text("cylinder head") .add-to-cart-btn');
    await expect(page.locator('.toast')).toHaveText('Updated quantity in cart!');
    await expect(page.locator('#cart-count')).toHaveText('2');
  });

  test('should display items correctly in the cart page', async ({ page }) => {
    // Add a product to the cart first
    await page.click('.nav-links button[data-category="brakes"]');
    await page.click('.product-card:has-text("Front Brake Pad") .add-to-cart-btn');

    // Click on the cart button
    await page.click('#cart-btn');

    // Check that the cart page is displayed
    await expect(page.locator('.page-title')).toHaveText('Shopping Cart');

    // Verify the item is in the cart
    await expect(page.locator('.cart-item-name:has-text("Front Brake Pad")')).toBeVisible();
    await expect(page.locator('.qty-display:has-text("1")')).toBeVisible();

    // Check the total price
    await expect(page.locator('.summary-row.total span:nth-child(2)')).toContainText('4560.00'); // 4000 + 14% tax
  });

  test('should remove translation-related elements and text', async ({ page }) => {
    // Ensure the language switcher button is not present
    await expect(page.locator('#language-switcher')).toHaveCount(0);

    // Check a few key elements to ensure their text is in English and not using translation keys
    await expect(page.locator('#search-btn')).toHaveText('Search');
    await expect(page.locator('#nav-home')).toHaveText('Home');

    // Check search history recent searches text is not present
    await expect(page.locator('span:has-text("Recent Searches")')).toHaveCount(0);

  });

  test('should take a screenshot of the final state', async ({ page }) => {
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'final-screenshot.png' });
  });
});
