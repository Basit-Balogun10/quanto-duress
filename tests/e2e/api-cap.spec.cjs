const { test } = require('@playwright/test');
const assert = require('node:assert');
const fs = require('node:fs');
const SHOTS = process.env.SCREENSHOT_DIR ?? 'test-results/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
async function enterPin(page, pin) {
  const first = page.locator('input[aria-label="PIN digit 1"]');
  await first.waitFor({ state: 'visible' });
  await first.click();
  await page.keyboard.type(pin, { delay: 35 });
}
test('transfer API enforces duress caps and PINs', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto(BASE + '/');
  await enterPin(page, '1234');
  await page.getByRole('heading', { name: 'Ada' }).waitFor();
  await page.goto(BASE + '/app/settings');
  await enterPin(page, '1234');
  await page.getByText('Duress access off').waitFor();
  await page.getByRole('switch', { name: 'Enable duress access' }).click();
  await page.getByLabel('Duress PIN').fill('4321');
  await page.getByRole('button', { name: 'Amount', exact: true }).click();
  await page.getByLabel('Amount to show').fill('50000');
  await page.getByRole('button', { name: 'Save duress access' }).click();
  await page.getByText('Duress access updated').waitFor();
  await page.goto(BASE + '/app');
  await enterPin(page, '4321');
  await page.getByRole('heading', { name: 'Ada' }).waitFor();

  const result = await page.evaluate(async () => {
    const { useBankingStore } = await import('/src/lib/store.ts');
    const { submitTransfer } = await import('/src/lib/api.ts');
    const state = useBankingStore.getState();
    const beneficiary = state.beneficiaries[0];
    const errors = {};
    try {
      await submitTransfer({ beneficiary, amount: 50001, note: '', pin: '4321' });
    } catch (error) {
      errors.overCap = error.message;
    }
    try {
      await submitTransfer({ beneficiary, amount: 1, note: '', pin: '0000' });
    } catch (error) {
      errors.badPin = error.message;
    }
    const settled = useBankingStore.getState();
    return { active: state.duressActive, duressBalance: state.duressBalance, errors, after: { balance: settled.balance, duressBalance: settled.duressBalance } };
  });
  assert.strictEqual(result.active, true);
  assert.strictEqual(result.duressBalance, 50000);
  assert.match(result.errors.overCap, /above your available balance/);
  assert.match(result.errors.badPin, /PIN is not correct/);
  assert.strictEqual(result.after.balance, 842500);
  assert.strictEqual(result.after.duressBalance, 50000);
  console.log('api cap + pin enforcement ok');
});
