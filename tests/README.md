# Car House - Automation Tests

This directory contains automated tests for the Car House e-commerce application.

## Test Files

- **e2e.spec.js** - End-to-end tests covering all major user flows
- **api.spec.js** - API integration tests for Supabase services
- **screenshot.spec.js** - Visual regression tests

## Test Coverage

### E2E Tests
- ✅ Home page loading
- ✅ Authentication (login/register)
- ✅ Product browsing and filtering
- ✅ Search functionality
- ✅ Shopping cart operations (add, update, remove)
- ✅ Favorites management
- ✅ Checkout process (shipping + payment)
- ✅ Service booking
- ✅ Product reviews
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Navigation flows
- ✅ Performance checks

### API Tests
- ✅ Products API (fetch, search, filter)
- ✅ Cart Service (add, update, clear)
- ✅ Favorites Service
- ✅ Reviews Service
- ✅ Orders Service
- ✅ Auth Service

## Running Tests

### Prerequisites
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in UI Mode
```bash
npm run test:ui
```

### Run Tests in Headed Mode (see browser)
```bash
npm run test:headed
```

### Run Tests in Debug Mode
```bash
npm run test:debug
```

### Run Specific Browser Tests
```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### Run Mobile Tests Only
```bash
npm run test:mobile
```

### Run Specific Test Suite
```bash
npm run test:e2e
npm run test:api
```

### View Test Report
```bash
npm run test:report
```

## Test Configuration

Configuration is in `playwright.config.js`:
- **Base URL**: http://localhost:5500
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Reports**: HTML, JSON, JUnit
- **Screenshots**: On failure
- **Videos**: On failure
- **Retries**: 2 on CI, 0 locally

## CI/CD Integration

The tests are configured to run in CI/CD pipelines with:
- Automatic retries on failure
- Parallel execution disabled on CI
- Multiple report formats for integration with CI tools

## Writing New Tests

1. Add test files to the `/tests` directory
2. Follow the existing test structure
3. Use descriptive test names
4. Group related tests with `test.describe()`
5. Use proper assertions with `expect()`

### Example Test
```javascript
test.describe('Feature Name', () => {
    test('should do something', async ({ page }) => {
        await page.goto('http://localhost:5500');
        await expect(page.locator('.element')).toBeVisible();
    });
});
```

## Troubleshooting

### Tests Failing Locally
1. Ensure the dev server is running on port 5500
2. Check that Supabase credentials are configured
3. Clear browser cache and storage
4. Run with `--headed` flag to see what's happening

### Timeout Issues
- Increase timeout in `playwright.config.js`
- Add explicit waits: `await page.waitForSelector()`
- Use `page.waitForLoadState('networkidle')`

### Flaky Tests
- Add proper wait conditions
- Avoid fixed timeouts
- Check for race conditions
- Use retry logic for network-dependent tests

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clear state between tests
3. **Selectors**: Use data-testid attributes when possible
4. **Assertions**: Be specific with expectations
5. **Error Handling**: Test both success and error cases
6. **Performance**: Keep tests fast and focused

## Maintenance

- Review and update tests when features change
- Remove obsolete tests
- Keep selectors up to date
- Monitor test execution time
- Regularly check test coverage
