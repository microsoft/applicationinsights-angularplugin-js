import { expect, test } from '@playwright/test';

test.describe('Getting Started', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the telemetry actions', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'List' })).toBeVisible();
    await expect(page.getByRole('button')).toHaveCount(7);
    await expect(page.getByRole('button', { name: 'Track Event' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Track Trace' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Track Exception' })).toBeVisible();
  });

  test('should navigate between the account and list pages', async ({ page }) => {
    await page.getByRole('link', { name: /Account/ }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();

    await page.getByRole('link', { name: /Home/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'List' })).toBeVisible();
  });
});
