import { test, expect, type Page } from '@playwright/test';

// M8 offline drill: compose while offline → the OfflinePill shows → reconnect → hard refresh →
// the in-progress draft is still there (nothing lost). Runs against the mock build.

async function signUp(page: Page, email: string) {
  await page.goto('/welcome');
  await page.getByLabel('Your postcode').fill('DV1 1AA');
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('button', { name: /Dev Village/ }).click();
  await page.getByLabel('Your name').fill('Draft Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password1');
  await page.getByLabel('Date of birth').fill('1990-05-05');
  await page.getByLabel('I agree to the community standard').check({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('button', { name: /good neighbour/ }).click();
  await page.getByRole('button', { name: /Enter Dev Village/ }).click();
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();
}

async function openRequestComposer(page: Page) {
  await page.getByRole('button', { name: 'Post' }).first().click();
  await page.getByRole('radio', { name: /Request help/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Ask for a hand' })).toBeVisible();
}

test('compose offline, reconnect, refresh — the draft survives', async ({ page, context }) => {
  await signUp(page, 'draft@example.com');

  await openRequestComposer(page);
  const text = 'Borrow a wheelbarrow for the weekend';

  // Go offline and type — the OfflinePill should appear and the field should accept input.
  await context.setOffline(true);
  await expect(page.getByText(/Offline, showing your latest/)).toBeVisible();
  await page.getByLabel('What do you need?').fill(text);

  // Reconnect, then hard refresh.
  await context.setOffline(false);
  await expect(page.getByText(/Offline, showing your latest/)).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();

  // Reopen the composer — the draft typed while offline is restored.
  await openRequestComposer(page);
  await expect(page.getByLabel('What do you need?')).toHaveValue(text);
});
