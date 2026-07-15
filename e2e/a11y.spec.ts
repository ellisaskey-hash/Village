import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// M8 accessibility pass: axe sweep across the core screens, plus a keyboard-only check that the
// skip-link and the primary create action work without a mouse. Every WCAG A/AA rule is enforced.
// Two rules are waived, both with cause (same as gallery.spec):
//  - color-contrast: translucent hearth surfaces defeat axe's sampling; AA is enforced instead
//    by tests/tokens.contrast.test.ts.
//  - region: a best-practice (not WCAG) landmark-completeness heuristic. The skip-to-content
//    link and the sr-only aria-live route announcer legitimately sit outside landmarks.

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).disableRules(['color-contrast', 'region']).analyze();
  expect(results.violations).toEqual([]);
}

async function signUp(page: Page, email: string) {
  await page.goto('/welcome');
  await page.getByLabel('Your postcode').fill('DV1 1AA');
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('button', { name: /Dev Village/ }).click();
  await page.getByLabel('Your name').fill('Access Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password1');
  await page.getByLabel('Date of birth').fill('1990-08-08');
  await page.getByLabel('I agree to the community standard').check({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('button', { name: /good neighbour/ }).click();
  await page.getByRole('button', { name: /Enter Dev Village/ }).click();
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();
}

test('public landing has no axe violations', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#main');
  await axe(page);
});

test('core signed-in screens have no axe violations', async ({ page }) => {
  await signUp(page, 'a11y@example.com');
  for (const path of ['/home', '/explore', '/inbox', '/me', '/me/settings', '/admin']) {
    await page.goto(path);
    await page.waitForSelector('#main');
    await page.waitForTimeout(200);
    await axe(page);
  }
});

test('keyboard-only: skip-link focuses first, and the Post action opens with the keyboard', async ({ page }) => {
  await signUp(page, 'kbd@example.com');
  await page.goto('/home');

  // First Tab lands on the skip-to-content link.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /Skip to content/i })).toBeFocused();

  // The primary create action opens via keyboard (focus + Enter), and Escape closes it.
  await page.getByRole('button', { name: 'Post' }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Post to your community' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Post to your community' })).toBeHidden();
});
