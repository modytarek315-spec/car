
const { test, expect } = require('@playwright/test');

test.describe('Car House Website', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file:///app/index.html');
  });

  test('should display the main title', async ({ page }) => {
    await expect(page.locator('h1.page-title')).toHaveText('Welcome to Car House 🚗');
  });

  test('should display category cards', async ({ page }) => {
    await expect(page.locator('.category-card')).toHaveCount(6);
  });

  test('should navigate to engine parts category', async ({ page }) => {
    await page.click('div.category-card[data-category="engine"]');
    await expect(page.locator('h1.page-title')).toHaveText('Engine Parts');
    await expect(page.locator('.product-card').first()).toBeVisible();
  });

  test('should add a product to the cart', async ({ page }) => {
    await page.click('div.category-card[data-category="engine"]');
    await page.locator('.add-to-cart-btn').first().click();
    await expect(page.locator('#cart-count')).toHaveText('1');
  });

  test('should navigate to the cart page', async ({ page }) => {
    await page.click('div.category-card[data-category="engine"]');
    await page.locator('.add-to-cart-btn').first().click();
    await page.click('#cart-btn');
    await expect(page.locator('h1.page-title')).toHaveText('Shopping Cart');
    await expect(page.locator('.cart-item')).toHaveCount(1);
  });

  test('should perform a search', async ({ page }) => {
    await page.fill('#search-input', 'head');
    await page.click('#search-btn');
    await expect(page.locator('h1.page-title')).toHaveText('Search Results');
    await expect(page.locator('.product-card').first()).toBeVisible();
    await expect(page.locator('.product-name').first()).toContainText('cylinder head');
  });

  test('should show product details', async ({ page }) => {
    await page.click('div.category-card[data-category="engine"]');
    await page.locator('.view-details-btn').first().click();
    await expect(page.locator('.product-details-modal')).toBeVisible();
    await expect(page.locator('.product-details-content h2')).toContainText('Alternator');
    await page.click('.close-modal');
    await expect(page.locator('.product-details-modal')).not.toBeVisible();
  });

  test('should navigate to service booking page', async ({ page }) => {
    await page.click('div.category-card[data-category="service"]');
    await expect(page.locator('h1.page-title')).toHaveText('Toyota Corolla Service Booking');
    await expect(page.locator('.service-card').first()).toBeVisible();
  });

  test.skip('should show service details', async ({ page }) => {
    test.setTimeout(60000);
    await page.click('div.category-card[data-category="service"]');
    await page.waitForSelector('.service-card', { state: 'visible' });

    await page.click('.service-card[data-service-index="0"]');

    await page.waitForSelector('.service-details-page', { state: 'visible' });

    await expect(page.locator('h1.page-title')).toContainText('10,000 KM Service');
    await expect(page.locator('.service-table')).toBeVisible();
  });
});
