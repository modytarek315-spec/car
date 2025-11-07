const { test, expect } = require('@playwright/test');

test('take screenshot of the homepage', async ({ page }) => {
  await page.goto('file:///app/index.html');
  await page.screenshot({ path: '/home/jules/verification/verification.png' });
});
