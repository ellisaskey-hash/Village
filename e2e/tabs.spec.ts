import { test, expect, type Page } from '@playwright/test';

// M8 per-tab happy path: sign up, then visit every tab and the global search, asserting each
// surface renders. Guards against a route/shell regression in any tab. Mock build.

async function signUp(page: Page, email: string) {
  await page.goto('/welcome');
  await page.getByLabel('Your postcode').fill('DV1 1AA');
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('button', { name: /Dev Village/ }).click();
  await page.getByLabel('Your name').fill('Tab Walker');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password1');
  await page.getByLabel('Date of birth').fill('1990-06-06');
  await page.getByLabel('I agree to the community standard').check({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('button', { name: /good neighbour/ }).click();
  await page.getByRole('button', { name: /Enter Dev Village/ }).click();
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();
}

test('every tab renders and search opens', async ({ page }) => {
  await signUp(page, 'tabs@example.com');

  // Explore
  await page.getByRole('link', { name: 'Explore', exact: true }).first().click();
  await expect(page).toHaveURL(/\/explore/);

  // Inbox
  await page.getByRole('link', { name: 'Inbox', exact: true }).first().click();
  await expect(page).toHaveURL(/\/inbox/);

  // Me
  await page.getByRole('link', { name: 'Me', exact: true }).first().click();
  await expect(page).toHaveURL(/\/me/);
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();

  // Back Home
  await page.getByRole('link', { name: 'Home', exact: true }).first().click();
  await expect(page).toHaveURL(/\/home/);

  // Global search
  await page.getByRole('button', { name: 'Search' }).first().click();
  await expect(page.getByPlaceholder(/Search/)).toBeVisible();
});
