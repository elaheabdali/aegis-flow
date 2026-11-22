import { expect, test } from '@playwright/test';

test.describe('AegisFlow Iranian FinTech Workbench E2E', () => {
  test('defaults to Persian (RTL), toggles Toman/Rial, switches to EN (LTR), and toggles theme', async ({
    page,
  }) => {
    await page.goto('/fa');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'fa');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Toggle currency from Toman to Rial
    const rialBtn = page.getByRole('button', { name: 'ریال' });
    await rialBtn.click();
    await expect(rialBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch to English (LTR)
    await page.getByRole('button', { name: 'EN' }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(html).toHaveAttribute('dir', 'ltr');

    // Switch back to Persian (RTL)
    await page.getByRole('button', { name: 'فا' }).click();
    await expect(page).toHaveURL(/\/fa$/);
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Toggle Theme
    const themeBtn = page.getByRole('button', {
      name: 'تغییر تم روشن و تاریک',
    });
    await themeBtn.click();
    await expect(html).toHaveClass(/light/);
  });

  test('freezes stream on inspection, logs PII reveal, and verifies FIU SAR rollback on 500 error', async ({
    page,
  }) => {
    await page.goto('/fa');

    const firstRow = page.locator('[role="grid"] [role="row"][aria-rowindex="1"]');
    await expect(firstRow).toBeVisible({ timeout: 15_000 });

    // Click first transaction to freeze stream and open CaseDrawer
    await firstRow.click();

    const drawer = page.getByRole('dialog', {
      name: 'پرونده جرم‌شناسی مالی و انطباق مقررات',
    });
    await expect(drawer).toBeVisible();

    // Reveal masked Shetab PAN, IBAN & National ID and verify Audit Log entry
    await drawer
      .getByRole('button', { name: /نمایش اطلاعات محرمانه/i })
      .click();
    await expect(drawer.getByText('PII_UNMASKED')).toBeVisible();

    // Launch 4-step FIU SAR Wizard
    await drawer
      .getByRole('button', { name: /شروع فرآیند تعلیق تسویه و گزارش به FIU/i })
      .click();

    const wizard = page.getByRole('dialog', {
      name: /تعلیق تسویه شاپرکی و ارسال گزارش معاملات مشکوک/i,
    });
    await expect(wizard).toBeVisible();

    // Step 1: Confirm telemetry evidence
    await wizard.locator('input[type="checkbox"]').check();
    await wizard.getByRole('button', { name: 'ادامه' }).click();

    // Step 2: Fill narrative
    await wizard
      .locator('#notes-input')
      .fill(
        'بررسی تراکنش‌های خردشده نزدیک به سقف ۱۰ میلیون تومان و مغایرت استعلام شاهکار انجام شد.'
      );
    await wizard.getByRole('button', { name: 'ادامه' }).click();

    // Step 3: Check all 3 CBI/Shaparak compliance attestations
    const checkboxes = wizard.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    await wizard.getByRole('button', { name: 'ادامه' }).click();

    // Step 4: Inject 500 Server Error to verify Optimistic Rollback
    await wizard.locator('#fault-select').selectOption('server_error');
    await wizard.locator('#signature-input').fill('الهه ابدالی');
    await wizard
      .getByRole('button', { name: /تأیید و ارسال نهایی گزارش/i })
      .click();

    // Verify rollback alert toast appears
    await expect(
      page.getByText(/تغییرات Optimistic UI به‌صورت خودکار به حالت قبل بازگشت/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});