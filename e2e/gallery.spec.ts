import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Gallery baseline (M0 acceptance): full-page screenshot in dark + light, plus an axe
 * a11y sweep. The theme and reduced-motion axes are pinned via localStorage before load
 * (the cold-boot script reads them) so the capture is deterministic.
 *
 * Two axe rules are disabled, both with cause:
 *  - `color-contrast`: cannot compute contrast over the translucent hearth-ambient
 *    background; AA is enforced instead by tests/tokens.contrast.test.ts.
 *  - `region`: a best-practice (not WCAG) landmark-completeness heuristic. The gallery is
 *    a dev harness whose top-level skip-link and aria-live announcer sit outside landmarks;
 *    the real landmarked app shell lands in M1.
 */
for (const theme of ['dark', 'light'] as const) {
  test(`gallery — ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('local:theme', t);
      localStorage.setItem('local:motion', 'reduce');
    }, theme);

    await page.goto('/dev/gallery?dev=1');
    await page.waitForSelector('#main');
    await page.waitForTimeout(400);

    await expect(page).toHaveScreenshot(`gallery-${theme}.png`, {
      fullPage: true,
      animations: 'disabled',
    });

    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast', 'region'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
