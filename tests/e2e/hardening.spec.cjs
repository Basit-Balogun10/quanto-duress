const { test } = require('@playwright/test');
const assert = require('node:assert');
const fs = require('node:fs');
const SHOTS = process.env.SCREENSHOT_DIR ?? 'test-results/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const { enterPin: enterTestPin, holdLogo, seedTestAccount, readState, waitForState } = require('./helpers.cjs');

async function enterPin(page, pin) {
  await enterTestPin(page, pin);
}

async function unlockCurrent(page, pin) {
  await seedTestAccount(page);
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  await enterPin(page, pin);
  await page.getByText('Account active').waitFor();
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

async function setIdle(page, hidden) {
  await page.evaluate((nextHidden) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (nextHidden ? 'hidden' : 'visible'),
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => nextHidden,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
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
  if (hidden) {
    await waitActive(page, false);
    await page.getByRole('dialog', { name: 'Restore connection' }).waitFor({ state: 'detached' });
  } else {
    await page.getByText('Connection restored').waitFor();
    await waitActive(page, false);
  }
}

async function configure(page, { shakeOn = true, micAllowed = true, motionAllowed = true }) {
  await page.goto(BASE + '/app/settings');
  await unlockCurrent(page, '1234');
  await page.evaluate(
    ({ mic, motion }) => {
      window.__microphoneRequested = 0;
      window.__allowMicrophone = mic;
      window.__motionPermission = motion ? 'granted' : 'denied';
    },
    { mic: micAllowed, motion: motionAllowed },
  );
  await page.getByText('Silent failure off').waitFor();
  await page.getByRole('switch', { name: 'Enable silent failure' }).click();
  await page.getByText('Finish setting up').waitFor();
  if (shakeOn) {
    const shakeSwitch = page.getByRole('switch', { name: 'Toggle shake trigger' });
    if ((await shakeSwitch.getAttribute('aria-checked')) === 'false') {
      await shakeSwitch.click();
    }
  } else {
    const shakeSwitch = page.getByRole('switch', { name: 'Toggle shake trigger' });
    if ((await shakeSwitch.getAttribute('aria-checked')) === 'true') {
      await shakeSwitch.click();
    }
  }
  const voiceSwitch = page.getByRole('switch', { name: 'Toggle wake phrase trigger' });
  if ((await voiceSwitch.getAttribute('aria-checked')) === 'false') {
    await voiceSwitch.click();
  }
  await page.getByLabel('Separate recovery PIN').fill('2468');
}

test('silent failure hardening and permissions', async ({ browser }) => {
  const errors = [];

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await context.addInitScript(() => {
    class MockMotionEvent extends Event {
      constructor(type, init = {}) {
        super(type);
        this.accelerationIncludingGravity = init.accelerationIncludingGravity ?? null;
      }
      static async requestPermission() {
        return window.__motionPermission ?? 'granted';
      }
    }
    Object.defineProperty(window, 'DeviceMotionEvent', {
      configurable: true,
      value: MockMotionEvent,
    });

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
          window.__microphoneRequested += 1;
          if (!window.__allowMicrophone) {
            const error = new Error('Permission denied');
            error.name = 'NotAllowedError';
            throw error;
          }
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

  await configure(page, { shakeOn: true, micAllowed: true, motionAllowed: true });
  await page.getByRole('button', { name: 'Save silent failure' }).click();
  await page.getByText('Silent failure enabled').waitFor();
  await page.getByText('Granted', { exact: true }).first().waitFor();
  assert.strictEqual(await page.getByText('Granted', { exact: true }).count(), 2);
  assert.strictEqual(
    await page.evaluate(() => window.__microphoneRequested),
    1,
  );
  assert.strictEqual((await state(page)).silentFailure.voice, true);
  console.log('explicit motion and microphone permissions are granted and shown');

  await page.reload();
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  const logo = page.locator('a[aria-label="Quanto home"]:visible').first();
  await logo.click();
  await page.waitForTimeout(250);
  assert.strictEqual((await state(page)).silentFailureActive, false);
  console.log('a normal logo click does not trigger silent failure');

  const box = await logo.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await waitActive(page, true);
  await page.mouse.up();
  const heldState = await state(page);
  assert.strictEqual(heldState.silentFailureTrigger, 'logo-hold');
  console.log('holding the lock-screen logo triggers silent failure');

  await page.goto(BASE + '/app/settings');
  await unlockCurrent(page, '1234');
  assert.strictEqual(await page.getByText('Transfers are unavailable').count(), 0);
  await page.getByText('Silent failure off').waitFor();
  await recover(page, '2468');

  await setIdle(page, true);
  await page.waitForTimeout(500);
  console.log('visibility after hide:', await page.evaluate(() => document.visibilityState));
  await shake(page);
  await page.waitForTimeout(500);
  assert.strictEqual((await state(page)).silentFailureActive, false);
  console.log('shake is ignored while the page is in the background');

  await setIdle(page, false);
  await page.waitForTimeout(150);
  await shake(page);
  await waitActive(page, true);
  await recover(page, '2468');
  console.log('shake resumes when the page returns to the foreground');

  const micContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const micPage = await micContext.newPage();
  micPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  micPage.on('pageerror', (error) => errors.push(error.message));
  await micContext.addInitScript(() => {
    class MockMotionEvent extends Event {
      constructor(type, init = {}) {
        super(type);
        this.accelerationIncludingGravity = init.accelerationIncludingGravity ?? null;
      }
      static async requestPermission() {
        return window.__motionPermission ?? 'granted';
      }
    }
    Object.defineProperty(window, 'DeviceMotionEvent', {
      configurable: true,
      value: MockMotionEvent,
    });

    class MockSpeechRecognition {
      constructor() {
        this.continuous = false;
        this.interimResults = false;
        this.lang = '';
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
      }
      start() {}
      abort() {}
    }
    window.SpeechRecognition = MockSpeechRecognition;

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          window.__microphoneRequested += 1;
          if (!window.__allowMicrophone) {
            const error = new Error('Permission denied');
            error.name = 'NotAllowedError';
            throw error;
          }
          return { getTracks: () => [{ stop() {} }] };
        },
      },
    });
  });

  await micPage.goto(BASE + '/');
  await micPage.evaluate(() => localStorage.clear());
  await micPage.reload();
  await unlockCurrent(micPage, '1234');
  await configure(micPage, { shakeOn: true, micAllowed: false, motionAllowed: false });

  await micPage.getByRole('button', { name: 'Save silent failure' }).click();
  await micPage.getByText('Motion access was denied').waitFor();
  await micPage.getByText('Denied', { exact: true }).first().waitFor();
  assert.strictEqual((await state(micPage))?.silentFailure ?? null, null);

  await micPage.evaluate(() => {
    window.__motionPermission = 'granted';
  });
  await micPage.getByRole('button', { name: 'Save silent failure' }).click();
  await micPage.getByText('Microphone access was denied').waitFor();
  assert.strictEqual((await state(micPage))?.silentFailure ?? null, null);
  assert.strictEqual(await micPage.getByText('Denied', { exact: true }).count(), 1);
  console.log('denied motion and microphone access block setup with clear states');

  await micPage.evaluate(() => {
    window.__allowMicrophone = true;
  });
  await micPage.getByRole('button', { name: 'Save silent failure' }).click();
  await micPage.getByText('Silent failure enabled').waitFor();
  assert.strictEqual((await state(micPage)).silentFailure.voice, true);
  assert.strictEqual(await micPage.getByText('Granted', { exact: true }).count(), 2);
  await micPage.screenshot({
    path: `${SHOTS}/quanto-hardening-settings-mobile.png`,
    fullPage: true,
  });
  console.log('permission retry configures silent failure and shows both granted');

  assert.deepStrictEqual(errors, []);
});
