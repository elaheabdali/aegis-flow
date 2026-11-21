import { expect, test } from '@playwright/test';

test.describe('AegisFlow Telemetry Workbench E2E', () => {
  test('switches between EN (LTR) and FA (RTL) and toggles Dark/Light theme', async ({
    page,
  }) => {
    await page.goto('/en');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(html).toHaveAttribute('dir', 'ltr');

    // Switch to Persian (RTL)
    await page.getByRole('button', { name: 'فا' }).click();
    await expect(page).toHaveURL(/\/fa$/);
    await expect(html).toHaveAttribute('lang', 'fa');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Switch back to English (LTR)
    await page.getByRole('button', { name: 'EN' }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(html).toHaveAttribute('dir', 'ltr');

    // Toggle Theme
    const themeBtn = page.getByRole('button', { name: 'Toggle color theme' });
    await themeBtn.click();
    await expect(html).toHaveClass(/light/);
  });

  test('freezes stream on inspection, logs PII reveal, and verifies SAR rollback on 500 error', async ({
    page,
  }) => {
    await page.goto('/en');

    // Wait for virtualized rows to render
    const firstRow = page.locator('[role="grid"] [role="row"][aria-rowindex="1"]');
    await expect(firstRow).toBeVisible({ timeout: 15_000 });

    // Click first transaction to freeze stream and open CaseDrawer
    await firstRow.click();

    const drawer = page.getByRole('dialog', {
      name: 'Case Investigation Workbench',
    });
    await expect(drawer).toBeVisible();

    // Reveal masked PII and verify Audit Log entry
    await drawer
      .getByRole('button', { name: /Reveal Full PAN/i })
      .click();
    await expect(drawer.getByText('PII_UNMASKED')).toBeVisible();

    // Launch 4-step SAR Wizard
    await drawer
      .getByRole('button', { name: /Initiate SAR & Freeze Workflow/i })
      .click();

    const wizard = page.getByRole('dialog', {
      name: /Suspicious Activity Report/i,
    });
    await expect(wizard).toBeVisible();

    // Step 1: Confirm telemetry evidence
    await wizard.locator('input[type="checkbox"]').check();
    await wizard.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Fill narrative
    await wizard
      .locator('#notes-input')
      .fill('Verified impossible travel anomaly and high-value crypto transfer.');
    await wizard.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Check all 3 compliance attestations
    const checkboxes = wizard.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    await wizard.getByRole('button', { name: 'Continue' }).click();

    // Step 4: Inject 500 Server Error to verify Optimistic Rollback
    await wizard.locator('#fault-select').selectOption('server_error');
    await wizard.locator('#signature-input').fill('Elahe Abdali');
    await wizard
      .getByRole('button', { name: /Authorize & Submit SAR/i })
      .click();

    // Verify rollback alert toast appears
    await expect(
      page.getByText(/Optimistic UI changes have been safely rolled back/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});