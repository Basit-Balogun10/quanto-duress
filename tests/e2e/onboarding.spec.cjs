const { test } = require('@playwright/test');
const assert = require('node:assert');
const fs = require('node:fs');
const SHOTS = process.env.SCREENSHOT_DIR ?? 'test-results/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';

async function enterPin(page, pin) {
  const first = page.locator('input[aria-label="PIN digit 1"]').last();
  await first.waitFor({ state: 'visible' });
  await first.click();
  await page.keyboard.type(pin, { delay: 30 });
}

async function createAccount(page, { name, email, pin }) {
  await page.getByRole('heading', { name: 'Open your account' }).waitFor();
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Create a 4-digit PIN').fill(pin);
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function lockApp(page) {
  await page.getByRole('navigation', { name: /Main navigation|Mobile navigation/ })
    .getByRole('link', { name: 'Settings', exact: true })
    .click();
  await page.getByRole('button', { name: 'Lock app' }).click();
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
}

async function switchAccount(page) {
  await page.getByRole('navigation', { name: /Main navigation|Mobile navigation/ })
    .getByRole('link', { name: 'Settings', exact: true })
    .click();
  await page.getByRole('button', { name: 'Switch account' }).click();
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
}

test('signup, test funding, lock, and account switching', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(BASE + '/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('heading', { name: 'Open your account' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/quanto-signup-mobile.png`, fullPage: true });

  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'No account yet' }).waitFor();
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByRole('heading', { name: 'Open your account' }).waitFor();

  await createAccount(page, {
    name: 'Ngozi Eze',
    email: 'ngozi@example.com',
    pin: '1234',
  });
  await page.getByRole('heading', { name: 'Ngozi', exact: true }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('₦0'));

  await page.getByRole('button', { name: 'Add test money' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add test money' });
  await dialog.waitFor();
  await dialog.getByLabel('Test funding amount').fill('50000');
  await dialog.getByRole('button', { name: 'Add test money' }).click();
  await page.getByRole('dialog', { name: 'Add test money' }).waitFor({ state: 'detached' });
  await page.getByText('₦50,000', { exact: false }).first().waitFor();
  await page.screenshot({ path: `${SHOTS}/quanto-funded-mobile.png`, fullPage: true });

  await lockApp(page);
  await page.getByRole('button', { name: 'Create another account' }).click();
  await createAccount(page, {
    name: 'Tunde Bello',
    email: 'tunde@example.com',
    pin: '5678',
  });
  await page.getByRole('heading', { name: 'Tunde', exact: true }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('₦0'));

  await switchAccount(page);
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  await page.getByRole('button', { name: /Ngozi Eze/ }).click();
  await enterPin(page, '1234');
  await page.getByRole('heading', { name: 'Ngozi', exact: true }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('₦50,000'));

  await switchAccount(page);
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
  await page.getByRole('button', { name: /Tunde Bello/ }).click();
  await enterPin(page, '5678');
  await page.getByRole('heading', { name: 'Tunde', exact: true }).waitFor();
  assert.ok((await page.locator('body').innerText()).includes('₦0'));
  await page.screenshot({ path: `${SHOTS}/quanto-account-switch-mobile.png`, fullPage: true });

  assert.deepStrictEqual(errors, []);
});
