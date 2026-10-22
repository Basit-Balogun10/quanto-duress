const ACCOUNTS_KEY = 'quanto-accounts-v1';
const ACTIVE_ACCOUNT_KEY = 'quanto-active-account-v1';
const STATE_PREFIX = 'quanto-account-state-v1:';
const TEST_ACCOUNT_ID = 'test-ada';

const profile = {
  id: TEST_ACCOUNT_ID,
  email: 'ada@example.com',
  createdAt: '2026-10-01T00:00:00.000Z',
  owner: {
    name: 'Ada Okafor',
    firstName: 'Ada',
    accountNumber: '0123456789',
    bank: 'Quanto',
    initials: 'AO',
  },
};

const beneficiaries = [
  {
    id: 'ben_mama',
    name: 'Mama Ngozi',
    bank: 'GTBank',
    accountNumber: '0123456789',
    initials: 'MN',
    favorite: true,
  },
  {
    id: 'ben_tunde',
    name: 'Tunde Bello',
    bank: 'Access Bank',
    accountNumber: '0987654321',
    initials: 'TB',
    favorite: true,
  },
];

const transactions = [
  {
    id: 'tx_seed_salary',
    direction: 'in',
    amount: 650000,
    counterparty: 'Salary',
    bank: 'Quanto',
    description: 'October salary',
    category: 'income',
    createdAt: '2026-10-10T09:00:00.000Z',
    status: 'completed',
    reference: 'QX-SEED1',
  },
];

function stateKey(accountId = TEST_ACCOUNT_ID) {
  return `${STATE_PREFIX}${accountId}`;
}

function seedState() {
  return {
    owner: profile.owner,
    balance: 842500,
    pin: '1234',
    monthlyBudget: 300000,
    beneficiaries,
    transactions,
    duress: null,
    duressActive: false,
    duressBalance: 0,
    duressTransactions: [],
    silentFailure: null,
    silentFailureActive: false,
    silentFailureTrigger: null,
    silentFailureAt: null,
  };
}

async function hasStoredAccount(page) {
  try {
    return await page.evaluate(
      (key) => Boolean(localStorage.getItem(key)),
      ACCOUNTS_KEY,
    );
  } catch {
    await page.waitForLoadState('load').catch(() => {});
    return page.evaluate(
      (key) => Boolean(localStorage.getItem(key)),
      ACCOUNTS_KEY,
    );
  }
}

async function writeSeedData(page) {
  const payload = {
    accountsKey: ACCOUNTS_KEY,
    activeKey: ACTIVE_ACCOUNT_KEY,
    key: stateKey(),
    account: profile,
    state: seedState(),
  };
  const write = ({ accountsKey, activeKey, key, account, state }) => {
    localStorage.clear();
    localStorage.setItem(accountsKey, JSON.stringify([account]));
    localStorage.setItem(activeKey, account.id);
    localStorage.setItem(key, JSON.stringify({ version: 4, state }));
  };

  try {
    await page.evaluate(write, payload);
  } catch {
    await page.waitForLoadState('load').catch(() => {});
    await page.evaluate(write, payload);
  }
}

async function seedTestAccountIfNeeded(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  if (await hasStoredAccount(page)) return false;

  await writeSeedData(page);
  await page.reload();
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
  return true;
}

async function seedTestAccount(page) {
  await seedTestAccountIfNeeded(page);
  await page.getByRole('heading', { name: 'Unlock your account' }).waitFor();
}

async function enterPin(page, pin = '1234') {
  await seedTestAccountIfNeeded(page);
  const first = page.locator('input[aria-label="PIN digit 1"]').last();
  await first.waitFor({ state: 'visible' });
  await first.click();
  await page.keyboard.type(pin, { delay: 30 });
}

async function holdLogo(page, duration = 2600) {
  const logo = page.locator('a[aria-label="Quanto home"]:visible').first();
  const box = await logo.boundingBox();
  if (!box) throw new Error('Visible Quanto logo not found');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(duration);
  await page.mouse.up();
}

async function readState(page) {
  return page.evaluate(
    ({ activeKey, prefix }) => {
      const active = localStorage.getItem(activeKey);
      if (!active) return null;
      const raw = localStorage.getItem(`${prefix}${active}`);
      return raw ? JSON.parse(raw).state : null;
    },
    { activeKey: ACTIVE_ACCOUNT_KEY, prefix: STATE_PREFIX },
  );
}

async function waitForState(page, expected = true) {
  await page.waitForFunction(
    ({ activeKey, prefix, expectedValue }) => {
      const active = localStorage.getItem(activeKey);
      if (!active) return false;
      const raw = localStorage.getItem(`${prefix}${active}`);
      if (!raw) return false;
      const current = JSON.parse(raw).state;
      return current?.silentFailureActive === expectedValue;
    },
    { activeKey: ACTIVE_ACCOUNT_KEY, prefix: STATE_PREFIX, expectedValue: expected },
  );
}

module.exports = {
  ACCOUNTS_KEY,
  ACTIVE_ACCOUNT_KEY,
  STATE_PREFIX,
  TEST_ACCOUNT_ID,
  stateKey,
  seedTestAccountIfNeeded,
  seedTestAccount,
  enterPin,
  holdLogo,
  readState,
  waitForState,
};
