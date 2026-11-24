import { expect, test } from '@playwright/test';

test.describe('ALJABR AI Command Center E2E', () => {
  test('renders unified platform shell, streams chat, filters AI tasks, and blocks ?embed bypass after sign out', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByText('ALJABR')).toBeVisible();
    await expect(page.getByText('AI Command Center')).toBeVisible();

    // Create a new chat and send a streaming message
    await page.getByRole('button', { name: /Yangi suhbat|New Chat/i }).first().click();
    const composer = page.locator('textarea');
    await composer.fill('Toshkent ombori uchun SLA jadvalini tuz');
    await composer.press('Enter');

    await expect(page.getByText('Toshkent ombori uchun SLA jadvalini tuz')).toBeVisible();

    // Navigate to AI Tasks and inspect task awaiting approval
    await page.getByRole('button', { name: 'AI Tasks' }).click();
    await expect(page.getByText('TSK-2041')).toBeVisible();

    // Sign out and verify ?embed=1 does NOT bypass authentication
    await page.getByRole('button', { name: /Chiqish|Sign Out/i }).click();
    await page.goto('/?embed=1');
    await expect(
      page.getByRole('button', { name: /sessiyasini tiklash|Restore Frontend 1 Session/i }),
    ).toBeVisible();
  });
});
