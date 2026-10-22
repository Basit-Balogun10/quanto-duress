const { test } = require('@playwright/test');
const assert = require('node:assert');
const fs = require('node:fs');
const SHOTS = process.env.SCREENSHOT_DIR ?? 'test-results/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';

async function enterPin(page, pin = '1234') {
  const first = page.locator('input[aria-label="PIN digit 1"]').last();
  await first.waitFor({ state: 'visible' });
  await first.click();
  await page.keyboard.type(pin, { delay: 25 });
  await page.getByText('Account active').waitFor();
}

async function unlockIfNeeded(page) {
  const lock = page.getByRole('heading', { name: 'Unlock your account', exact: true });
  if (await lock.isVisible().catch(() => false)) await enterPin(page);
}

async function noOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  assert.ok(
    metrics.scrollWidth <= metrics.innerWidth,
    `${label} overflows: ${metrics.scrollWidth} > ${metrics.innerWidth}`,
  );
}

test('responsive UI and navigation', async ({ browser }) => {
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(BASE + '/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await enterPin(page);
  await page.getByRole('heading', { name: 'Ada', exact: true }).waitFor();
  await page.screenshot({ path: `${SHOTS}/quanto-ui-dashboard-desktop.png`, fullPage: true });

  assert.strictEqual(await page.getByRole('button', { name: 'Lock app' }).count(), 0);
  await page.getByText('Services', { exact: true }).waitFor();
  for (const service of ['Airtime', 'Data', 'Electricity', 'Cable TV']) {
    await page.getByText(service, { exact: true }).first().waitFor();
  }
  assert.strictEqual(await page.getByText('Quick Send', { exact: true }).count(), 0);
  assert.strictEqual(await page.getByText('Favorites', { exact: true }).count(), 0);
  assert.strictEqual(await page.getByText('Quanto · 0123456789', { exact: true }).count(), 0);
  assert.ok((await page.locator('body').innerText()).includes('0123456789'));

  const servicesBox = await page.getByText('Services', { exact: true }).boundingBox();
  const spendingBox = await page.getByText('This month', { exact: true }).boundingBox();
  assert.ok(servicesBox.y < spendingBox.y, 'services card should sit above spending');

  await page.evaluate(() => document.fonts.ready);
  assert.strictEqual(
    await page.evaluate(() => document.fonts.check('16px "JetBrains Mono Nerd Font"')),
    true,
  );
  const fontRequests = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.includes('jetbrains-mono-nerd')),
  );
  assert.ok(fontRequests.length > 0, 'bundled Nerd Font should be requested');

  const aside = page.locator('aside');
  const expandedWidth = (await aside.boundingBox()).width;
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  const collapsedWidth = (await aside.boundingBox()).width;
  assert.ok(collapsedWidth < expandedWidth, 'sidebar should collapse');
  await page.waitForTimeout(300);
  assert.strictEqual(await page.getByText('Keep your PIN private.', { exact: false }).count(), 0);
  assert.strictEqual(
    await page.evaluate(() => localStorage.getItem('quanto-sidebar-collapsed')),
    'true',
  );
  await page.screenshot({ path: `${SHOTS}/quanto-ui-dashboard-collapsed.png`, fullPage: true });
  await page.getByRole('button', { name: 'Expand sidebar' }).click();

  const pages = [
    ['/app/settings', 'Settings', `${SHOTS}/quanto-ui-settings-desktop.png`],
    ['/app/activity', 'Activity', `${SHOTS}/quanto-ui-activity-desktop.png`],
  ];
  for (const [, heading, screenshot] of pages) {
    await page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: heading, exact: true })
      .click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    assert.strictEqual(await page.getByText(/\bDemo\b/).count(), 0);
    await noOverflow(page, `${heading} desktop`);
    await page.screenshot({ path: screenshot, fullPage: true });
  }
  await page.goto(BASE + '/app/transfer');
  await unlockIfNeeded(page);
  await page.getByRole('heading', { name: 'Send money', exact: true }).waitFor();
  assert.strictEqual(await page.getByText(/\bDemo\b/).count(), 0);
  await noOverflow(page, 'Send money desktop');
  await page.screenshot({ path: `${SHOTS}/quanto-ui-transfer-desktop.png`, fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(BASE + '/');
  await enterPin(mobile);
  await mobile.getByRole('heading', { name: 'Ada', exact: true }).waitFor();
  await noOverflow(mobile, 'dashboard mobile 390');
  await mobile.screenshot({ path: `${SHOTS}/quanto-ui-dashboard-mobile.png`, fullPage: true });

  const mobileNav = mobile.getByRole('navigation', { name: 'Mobile navigation' });
  assert.ok((await mobileNav.boundingBox()).height <= 68, 'mobile nav should stay compact');

  for (const [heading, screenshot] of [
    ['Settings', `${SHOTS}/quanto-ui-settings-mobile.png`],
    ['Activity', `${SHOTS}/quanto-ui-activity-mobile.png`],
  ]) {
    await mobileNav.getByRole('link', { name: heading, exact: true }).click();
    await mobile.getByRole('heading', { name: heading, exact: true }).waitFor();
    await noOverflow(mobile, `${heading} mobile 390`);
    await mobile.screenshot({ path: screenshot, fullPage: true });
  }
  await mobile.goto(BASE + '/app/transfer');
  await unlockIfNeeded(mobile);
  await mobile.getByRole('heading', { name: 'Send money', exact: true }).waitFor();
  await noOverflow(mobile, 'Send money mobile 390');
  await mobile.screenshot({ path: `${SHOTS}/quanto-ui-transfer-mobile.png`, fullPage: true });

  const small = await browser.newPage({ viewport: { width: 320, height: 720 } });
  small.on('pageerror', (error) => errors.push(error.message));
  await small.goto(BASE + '/');
  await enterPin(small);
  await small.getByRole('heading', { name: 'Ada', exact: true }).waitFor();
  await noOverflow(small, 'dashboard mobile 320');
  await small.screenshot({ path: `${SHOTS}/quanto-ui-dashboard-320.png`, fullPage: true });
  await small.getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Settings', exact: true })
    .click();
  await small.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
  await noOverflow(small, 'settings mobile 320');
  await small.screenshot({ path: `${SHOTS}/quanto-ui-settings-320.png`, fullPage: true });

  const sectionFont = await small
    .getByRole('heading', { name: 'Transfer PIN', exact: true })
    .evaluate((node) => getComputedStyle(node).fontSize);
  assert.strictEqual(sectionFont, '20px');

  assert.deepStrictEqual(errors, []);
});
