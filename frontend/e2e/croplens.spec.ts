import { test, expect } from '@playwright/test';

test.describe('CropLens AI E2E User Journeys', () => {
  test('Landing page loads successfully and displays branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CropLens AI/i);
    await expect(page.locator('text=CropLens AI')).toBeVisible();
  });

  test('Guest exploration navigates to Kisan Hub dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // Click explore platform / guest button
    const guestBtn = page.locator('text=Explore Platform');
    if (await guestBtn.isVisible()) {
      await guestBtn.click();
      await expect(page).toHaveURL(/\/app/);
    }
  });
});
