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

async function unlockCurrent(page, pin) {
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  await enterPin(page, pin);
  await page.getByRole('navigation', { name: 'Main navigation' }).waitFor();
}

async function gotoApp(page, path, pin) {
  await page.goto(BASE + path);
  const lock = page.getByRole('heading', { name: 'Unlock your account' });
  if (await lock.isVisible().catch(() => false)) await unlockCurrent(page, pin);
}

async function lockAndUnlock(page, pin) {
  await page.reload();
  await unlockCurrent(page, pin);
}

async function storedState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('quanto-banking-demo-v1') || '{}').state);
}

test('duress access, caps, and decoy history', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(BASE + '/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/quanto-lock.png`, fullPage: true });

  await enterPin(page, '1234');
  await page.getByRole('heading', { name: 'Ada' }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('₦842,500'));
  console.log('normal unlock ok');

  await page.reload();
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  await enterPin(page, '9111');
  await page.getByText('That PIN is not correct. Try again.').waitFor();
  await enterPin(page, '1234');
  await page.getByRole('navigation', { name: 'Main navigation' }).waitFor();
  console.log('duress is opt-in and has no default PIN');

  await gotoApp(page, '/app/settings', '1234');
  await page.getByText('Duress access off').waitFor();
  assert.strictEqual(await page.getByLabel('Duress PIN').count(), 0);
  await page.screenshot({ path: `${SHOTS}/quanto-settings-duress-off.png`, fullPage: true });

  await page.getByRole('switch', { name: 'Enable duress access' }).click();
  await page.getByLabel('Duress PIN').fill('4321');
  await page.getByRole('button', { name: 'Amount', exact: true }).click();
  await page.getByLabel('Amount to show').fill('50000');
  await page.getByRole('button', { name: 'Save duress access' }).click();
  await page.getByText('Duress access updated').waitFor();
  await page.getByText('Duress access enabled').waitFor();
  await page.screenshot({ path: `${SHOTS}/quanto-settings-duress.png`, fullPage: true });
  console.log('amount duress config saved through opt-in');

  await gotoApp(page, '/app', '4321');
  assert.ok((await page.locator('body').innerText()).includes('₦50,000'));
  let state = await storedState(page);
  assert.strictEqual(state.duressActive, true);
  assert.strictEqual(state.duressBalance, 50000);
  assert.strictEqual(state.balance, 842500);
  await page.screenshot({ path: `${SHOTS}/quanto-duress-dashboard.png`, fullPage: true });
  console.log('duress activation + decoy balance ok');

  await gotoApp(page, '/app/settings', '4321');
  assert.strictEqual(await page.getByRole('heading', { name: 'Duress access' }).count(), 0);
  assert.strictEqual(await page.getByRole('heading', { name: 'Transfer PIN' }).count(), 0);
  assert.strictEqual(await page.getByRole('heading', { name: 'Reset app data' }).count(), 0);
  console.log('duress settings hidden while active');

  await gotoApp(page, '/app/transfer', '4321');
  await page.getByRole('button', { name: /Mama Ngozi/ }).click();
  await page.getByLabel('Amount', { exact: true }).fill('60000');
  await page.getByText('That is more than your available balance.').waitFor();
  assert.ok(await page.getByRole('button', { name: 'Review transfer' }).isDisabled());
  await page.getByLabel('Amount', { exact: true }).fill('20000');
  await page.getByRole('button', { name: 'Review transfer' }).click();
  await page.getByRole('button', { name: 'Confirm transfer' }).click();
  await enterPin(page, '4321');
  await page.getByRole('dialog', { name: 'Transfer receipt' }).waitFor();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('heading', { name: 'Ada' }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('₦30,000'));
  state = await storedState(page);
  assert.strictEqual(state.duressBalance, 30000);
  assert.strictEqual(state.balance, 822500);
  await page.screenshot({ path: `${SHOTS}/quanto-duress-after-transfer.png`, fullPage: true });
  console.log('duress transfer cap + real balance deduction ok');

  await page.reload();
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  assert.strictEqual(await page.getByText(/^PIN: /).count(), 0);
  await unlockCurrent(page, '4321');
  await page.getByRole('heading', { name: 'Ada' }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('₦30,000'));
  state = await storedState(page);
  assert.strictEqual(state.duressActive, true);
  assert.strictEqual(state.duressBalance, 30000);
  console.log('duress state persists across reload');

  await lockAndUnlock(page, '1234');
  assert.ok((await page.locator('body').innerText()).includes('₦822,500'));
  state = await storedState(page);
  assert.strictEqual(state.duressActive, false);
  assert.strictEqual(state.duressBalance, 0);
  console.log('normal unlock clears duress');

  await gotoApp(page, '/app/settings', '1234');
  await page.getByRole('switch', { name: 'Enable duress access' }).click();
  await page.getByText('Duress access off').waitFor();
  assert.strictEqual((await storedState(page)).duress, null);
  await page.reload();
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  await enterPin(page, '4321');
  await page.getByText('That PIN is not correct. Try again.').waitFor();
  await enterPin(page, '1234');
  await page.getByRole('navigation', { name: 'Main navigation' }).waitFor();
  console.log('turning duress off removes the PIN');

  await gotoApp(page, '/app/settings', '1234');
  await page.getByRole('switch', { name: 'Enable duress access' }).click();
  await page.getByLabel('Duress PIN').fill('9111');
  await page.getByRole('button', { name: 'Percentage', exact: true }).click();
  await page.getByLabel('Percentage to show').fill('0');
  await page.getByRole('button', { name: 'Save duress access' }).click();
  await page.getByText('Duress access updated').waitFor();
  await gotoApp(page, '/app', '9111');
  assert.ok((await page.locator('body').innerText()).includes('₦0'));
  await gotoApp(page, '/app/transfer', '9111');
  await page.getByRole('button', { name: /Mama Ngozi/ }).click();
  await page.getByLabel('Amount', { exact: true }).fill('1');
  await page.getByText('This account has no money available to send.').waitFor();
  assert.ok(await page.getByRole('button', { name: 'Review transfer' }).isDisabled());
  await page.screenshot({ path: `${SHOTS}/quanto-duress-zero.png`, fullPage: true });
  console.log('zero duress balance blocks all transfers');

  await gotoApp(page, '/app', '1234');
  await page.getByRole('heading', { name: 'Ada' }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('₦822,500'));
  await gotoApp(page, '/app/settings', '1234');
  await page.getByLabel('Duress PIN').fill('9111');
  await page.getByLabel('Percentage to show').fill('25');
  await page.getByRole('button', { name: 'Save duress access' }).click();
  await page.getByText('Duress access updated').waitFor();
  await gotoApp(page, '/app', '9111');
  assert.ok((await page.locator('body').innerText()).includes('₦205,625'));
  console.log('percentage duress balance ok');
  await gotoApp(page, '/app', '1234');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on('pageerror', e => errors.push(e.message));
  await mobile.goto(BASE + '/');
  await mobile.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  await mobile.screenshot({ path: `${SHOTS}/quanto-lock-mobile.png`, fullPage: true });
  await enterPin(mobile, '1234');
  await mobile.getByRole('heading', { name: 'Ada' }).waitFor();
  await mobile.goto(BASE + '/app/settings');
  await mobile.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  await enterPin(mobile, '1234');
  await mobile.getByText('Duress access off').waitFor();
  await mobile.getByRole('switch', { name: 'Enable duress access' }).click();
  await mobile.getByLabel('Duress PIN').waitFor();
  await mobile.screenshot({ path: `${SHOTS}/quanto-settings-duress-mobile.png`, fullPage: true });
  console.log('mobile layouts captured');

  assert.deepStrictEqual(errors, []);
});
