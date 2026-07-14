import { test, expect } from '@playwright/test';

/**
 * M1 happy path (behavioural baseline, Law 18): discover a community by postcode, sign up,
 * onboard, land on a populated Home. Runs against the in-memory mock (no DB); each test gets
 * a fresh browser context, so the mock starts clean.
 */
test('welcome → sign up → onboarding → home', async ({ page }) => {
  await page.goto('/welcome');

  await page.getByLabel('Your postcode').fill('DV1 1AA');
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('button', { name: /Dev Village/ }).click();

  // sign-up
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByLabel('Your name').fill('Sam Fletcher');
  await page.getByLabel('Email').fill('sam@example.com');
  await page.getByLabel('Password').fill('password1');
  await page.getByLabel('Date of birth').fill('1990-04-01');
  await page.getByLabel('I agree to the community standard').check({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();

  // onboarding — community standard step, then setup
  await expect(page.getByRole('heading', { name: /Welcome to Dev Village/ })).toBeVisible();
  await page.getByRole('button', { name: /good neighbour/ }).click();
  await page.getByRole('button', { name: /Enter Dev Village/ }).click();

  // home (in the app shell)
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Post' })).toBeVisible();
});

test('a member is bounced from /welcome to home', async ({ page }) => {
  // Sign up first
  await page.goto('/welcome');
  await page.getByLabel('Your postcode').fill('DV1 1AA');
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('button', { name: /Dev Village/ }).click();
  await page.getByLabel('Your name').fill('Mem Ber');
  await page.getByLabel('Email').fill('mem@example.com');
  await page.getByLabel('Password').fill('password1');
  await page.getByLabel('Date of birth').fill('1988-02-02');
  await page.getByLabel('I agree to the community standard').check({ force: true });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByRole('button', { name: /good neighbour/ }).click();
  await page.getByRole('button', { name: /Enter Dev Village/ }).click();
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();

  // Now visiting /welcome should redirect home
  await page.goto('/welcome');
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();
});
