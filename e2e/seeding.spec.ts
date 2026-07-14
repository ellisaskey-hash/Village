import { test, expect, type Page } from '@playwright/test';

/**
 * M2 seeding pipeline (behavioural baseline, Law 18): join Horsmonden, run fixture
 * ingestion in the seeding console, accept a business proposal, and confirm it surfaces in
 * the directory. Runs against the mock (demo admin access); fresh context = clean mock.
 */
async function joinHorsmonden(page: Page) {
  await page.goto('/welcome');
  await page.getByLabel('Your postcode').fill('TN12 8AA');
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('button', { name: /Horsmonden/ }).click();
  await page.getByLabel('Your name').fill('Founder');
  await page.getByLabel('Email').fill('founder@example.com');
  await page.getByLabel('Password').fill('password1');
  await page.getByLabel('Date of birth').fill('1980-01-01');
  await page.getByLabel('I agree to the community standard').check({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('button', { name: /good neighbour/ }).click();
  await page.getByRole('button', { name: /Enter Horsmonden/ }).click();
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();
}

test('run fixture ingestion, accept a proposal, see it in the directory', async ({ page }) => {
  await joinHorsmonden(page);

  await page.goto('/admin/seeding');
  await expect(page.getByRole('heading', { name: 'Seeding console' })).toBeVisible();

  // Queue starts empty; ingest populates it.
  await page.getByRole('button', { name: 'Run fixture ingestion' }).click();
  const acceptButtons = page.getByRole('button', { name: 'Accept' });
  await expect(acceptButtons.first()).toBeVisible();
  const before = await acceptButtons.count();
  expect(before).toBeGreaterThan(5);

  // Accept the first proposal; the queue shrinks by one.
  await acceptButtons.first().click();
  await expect(async () => {
    expect(await page.getByRole('button', { name: 'Accept' }).count()).toBe(before - 1);
  }).toPass();

  // Accept several businesses so the directory has content, then check the directory.
  for (let i = 0; i < 6; i++) {
    const btn = page.getByRole('button', { name: 'Accept' }).first();
    if (await btn.isVisible().catch(() => false)) await btn.click();
  }

  await page.goto('/explore?tab=directory');
  await page.getByRole('button', { name: /Businesses/ }).click();
  // At least one business row is present (accepted from the fixture).
  await expect(page.getByText(/Is this yours\? Claim it|Local business|Pub|Cafe|Restaurant/i).first()).toBeVisible();
});
