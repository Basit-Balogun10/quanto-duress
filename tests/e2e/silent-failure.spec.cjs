const { test } = require('@playwright/test');
const assert = require('node:assert');
const fs = require('node:fs');
const SHOTS = process.env.SCREENSHOT_DIR ?? 'test-results/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const { enterPin: enterTestPin, holdLogo, seedTestAccount, readState, waitForState } = require('./helpers.cjs');

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
}).format;

async function enterPin(page, pin) {
  await enterTestPin(page, pin);
}

async function unlockCurrent(page, pin) {
  await seedTestAccount(page);
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  await enterPin(page, pin);
  await page.getByText('Account active').waitFor();
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

async function lockUnlockHome(page, pin) {
  await lockAndUnlock(page, pin);
  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Home' })
    .click();
  await page.getByRole('heading', { name: 'Ada' }).waitFor();
}

async function state(page) {
  return readState(page);
}

async function waitActive(page, value = true) {
  await waitForState(page, value);
}

async function shake(page) {
  await page.evaluate(() => {
    for (let i = 0; i < 3; i += 1) {
      const event = new Event('devicemotion');
      Object.defineProperty(event, 'accelerationIncludingGravity', {
        value: { x: 22, y: 18, z: 12 },
      });
      window.dispatchEvent(event);
    }
  });
}

async function recover(page, pin) {
  const restore = page.getByRole('button', { name: 'Restore connection' }).first();
  const hidden = !(await restore.isVisible().catch(() => false));
  if (hidden) {
    await holdLogo(page);
  } else {
    await restore.click();
  }
  await page.getByRole('dialog', { name: 'Restore connection' }).waitFor();
  await enterPin(page, pin);
  return hidden;
}

test('silent failure triggers, recovery, and decoy history', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  let current;
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.addInitScript(() => {
    window.__vibrationPatterns = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern) => {
        window.__vibrationPatterns.push(pattern);
        return true;
      },
    });
    if (!('DeviceMotionEvent' in window)) {
      window.DeviceMotionEvent = class DeviceMotionEvent extends Event {
        constructor(type, init = {}) {
          super(type);
          this.accelerationIncludingGravity = init.accelerationIncludingGravity ?? null;
        }
      };
    }
    class MockSpeechRecognition {
      constructor() {
        this.continuous = false;
        this.interimResults = false;
        this.lang = '';
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
        window.__mockRecognition = this;
      }
      start() {
        window.__mockRecognitionStarted = true;
      }
      abort() {
        window.__mockRecognitionAborted = true;
      }
    }
    window.SpeechRecognition = MockSpeechRecognition;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          window.__microphoneRequested = true;
          return { getTracks: () => [{ stop() {} }] };
        },
      },
    });
  });

  await page.goto(BASE + '/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await unlockCurrent(page, '1234');
  await page.getByRole('heading', { name: 'Ada' }).waitFor();
  assert.strictEqual(await page.getByText('Transfers are unavailable').count(), 0);
  console.log('silent failure is opt-in and off by default');

  await gotoApp(page, '/app/settings', '1234');
  await page.getByRole('switch', { name: 'Enable duress access' }).click();
  await page.getByLabel('Duress PIN').fill('4321');
  await page.getByRole('button', { name: 'Amount', exact: true }).click();
  await page.getByLabel('Amount to show').fill('50000');
  await page.getByRole('button', { name: 'Save duress access' }).click();
  await page.getByText('Duress access updated').waitFor();

  await page.getByRole('switch', { name: 'Enable silent failure' }).click();
  await page.getByLabel('Toggle wake phrase trigger').click();
  await page.getByRole('button', { name: 'Save silent failure' }).click();
  await page.getByText('Silent failure enabled').waitFor();
  await page.waitForFunction(() => Boolean(window.__mockRecognition?.onresult));
  current = await state(page);
  assert.strictEqual(current.silentFailure.shake, true);
  assert.strictEqual(current.silentFailure.voice, true);
  assert.strictEqual(current.silentFailure.phrase, 'quanto hold');
  assert.strictEqual(current.silentFailure.recoveryUsesDuressPin, true);
  assert.strictEqual(current.silentFailure.recoveryPin, '4321');
  await page.screenshot({ path: `${SHOTS}/quanto-silent-settings.png`, fullPage: true });
  await page.getByRole('button', { name: 'Test cue' }).click();
  await page.getByTestId('silent-failure-cue').waitFor({ state: 'attached' });
  console.log('silent failure configured with shake, voice, and shared recovery PIN');

  await page.evaluate(() => {
    window.__mockRecognition.onresult({
      resultIndex: 0,
      results: [[{ transcript: 'please quanto hold now' }]],
    });
  });
  await waitActive(page, true);
  await page.waitForFunction(() => window.__vibrationPatterns?.length > 0);
  const vibrationPatterns = await page.evaluate(() => window.__vibrationPatterns);
  assert.deepStrictEqual(vibrationPatterns.at(-1), [18, 55, 18]);
  assert.strictEqual(await page.getByText('Transfers are unavailable').count(), 0);
  await page.getByText('Silent failure off').waitFor();
  await page.getByRole('heading', { name: 'Silent failure' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/quanto-silent-active.png`, fullPage: true });
  console.log('wake phrase triggers persistent failure while settings look untouched');

  await gotoApp(page, '/app/transfer', '1234');
  await page.getByRole('button', { name: /Mama Ngozi/ }).click();
  await page.getByLabel('Amount', { exact: true }).fill('10000');
  await page.getByRole('button', { name: 'Review transfer' }).click();
  await page.getByRole('button', { name: 'Confirm transfer' }).click();
  await enterPin(page, '1234');
  await page.getByText('Transfer failed').waitFor();
  current = await state(page);
  assert.strictEqual(current.balance, 842500);
  assert.strictEqual(current.transactions[0].status, 'failed');
  assert.strictEqual(current.silentFailureActive, true);
  await page.screenshot({ path: `${SHOTS}/quanto-fake-network-failure.png`, fullPage: true });
  console.log('transfer fails with fake network error and no debit');

  await recover(page, '1111');
  await page.getByText('That recovery PIN is not correct.').waitFor();
  await enterPin(page, '4321');
  await page.getByText('Connection restored. You can try this transfer again.').waitFor();
  await waitActive(page, false);
  console.log('wrong recovery PIN rejected; duress PIN restores connection');

  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('button', { name: 'Confirm transfer' }).click();
  await enterPin(page, '1234');
  await page.getByRole('dialog', { name: 'Transfer receipt' }).waitFor();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('heading', { name: 'Ada' }).waitFor();
  current = await state(page);
  assert.strictEqual(current.balance, 832500);
  console.log('retry succeeds after recovery');

  await shake(page);
  await waitActive(page, true);
  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Settings' })
    .click();
  assert.strictEqual(await page.getByText('Transfers are unavailable').count(), 0);
  await page.getByText('Silent failure off').waitFor();
  await recover(page, '4321');
  await waitActive(page, false);
  console.log('shake trigger works globally and is recoverable');

  await lockUnlockHome(page, '4321');
  current = await state(page);
  assert.strictEqual(current.duressActive, true);
  assert.strictEqual(current.duressBalance, 50000);
  assert.strictEqual(current.duressTransactions.length, 10);
  const net = current.duressTransactions
    .filter((transaction) => transaction.status === 'completed')
    .reduce(
      (total, transaction) =>
        total + (transaction.direction === 'in' ? transaction.amount : -transaction.amount),
      0,
    );
  assert.strictEqual(net, 50000);
  const decoySalary = current.duressTransactions.find(
    (transaction) => transaction.counterparty === 'Salary',
  );
  assert.ok(decoySalary);

  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Activity', exact: true })
    .click();
  await page.getByRole('heading', { name: 'Activity', exact: true }).waitFor();
  const duressBody = await page.locator('body').innerText();
  assert.ok(duressBody.includes(naira(decoySalary.amount)));
  assert.ok(!duressBody.includes(naira(650000)));
  await page.screenshot({ path: `${SHOTS}/quanto-decoy-activity.png`, fullPage: true });
  console.log('decoy ledger is realistic, balances exactly, and hides real history');

  await gotoApp(page, '/app/transfer', '4321');
  await page.getByRole('button', { name: /Mama Ngozi/ }).click();
  await page.getByLabel('Amount', { exact: true }).fill('10000');
  await page.getByRole('button', { name: 'Review transfer' }).click();
  await page.getByRole('button', { name: 'Confirm transfer' }).click();
  await enterPin(page, '4321');
  await page.getByText('Transfer failed').waitFor();
  current = await state(page);
  assert.strictEqual(current.balance, 832500);
  assert.strictEqual(current.duressBalance, 50000);
  assert.strictEqual(current.silentFailureTrigger, 'duress-pin');
  assert.strictEqual(
    current.duressTransactions.filter((transaction) => transaction.status === 'failed').length,
    1,
  );
  await recover(page, '4321');
  await waitActive(page, false);
  console.log('duress PIN at transfer triggers failure without debiting');

  await lockUnlockHome(page, '1234');
  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Settings' })
    .click();
  await page.getByRole('button', { name: /Keep real history/ }).click();
  await page.getByRole('button', { name: 'Save duress access' }).click();
  await page.getByText('Duress access updated').waitFor();
  await lockAndUnlock(page, '4321');
  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Activity', exact: true })
    .click();
  await page.getByRole('heading', { name: 'Activity', exact: true }).waitFor();
  const realBody = await page.locator('body').innerText();
  assert.ok(realBody.includes(naira(650000)));
  current = await state(page);
  assert.strictEqual(current.duress?.historyMode, 'real');
  assert.strictEqual(current.duressTransactions.length, 0);
  console.log('real-history override shows real ledger in duress mode');

  await lockAndUnlock(page, '1234');
  await page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Settings' })
    .click();
  await page.getByRole('switch', { name: 'Use duress PIN for recovery' }).click();
  await page.getByLabel('Separate recovery PIN').fill('2468');
  await page.getByRole('button', { name: 'Save silent failure' }).click();
  await page.getByText('Silent failure updated').waitFor();

  await shake(page);
  await waitActive(page, true);
  await recover(page, '4321');
  await page.getByText('That recovery PIN is not correct.').waitFor();
  await enterPin(page, '2468');
  await waitActive(page, false);
  current = await state(page);
  assert.strictEqual(current.silentFailure.recoveryUsesDuressPin, false);
  assert.strictEqual(current.silentFailure.recoveryPin, '2468');
  console.log('custom recovery PIN overrides the duress PIN');

  await page.getByRole('switch', { name: 'Enable silent failure' }).click();
  await page.getByText('Silent failure off').waitFor();
  current = await state(page);
  assert.strictEqual(current.silentFailure, null);
  assert.strictEqual(current.silentFailureActive, false);
  console.log('silent failure can be turned off');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(BASE + '/app/settings');
  await unlockCurrent(mobile, '1234');
  await mobile.getByText('Silent failure off').waitFor();
  await mobile.getByRole('switch', { name: 'Enable silent failure' }).click();
  await mobile.getByText('Finish setting up').waitFor();
  await mobile.screenshot({ path: `${SHOTS}/quanto-silent-settings-mobile.png`, fullPage: true });
  console.log('mobile silent-failure layout captured');

  assert.deepStrictEqual(errors, []);
});
