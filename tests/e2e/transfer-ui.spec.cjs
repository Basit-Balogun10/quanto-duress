const { test } = require('@playwright/test');
const assert = require('node:assert');
const fs = require('node:fs');
const SHOTS = process.env.SCREENSHOT_DIR ?? 'test-results/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const { enterPin: enterTestPin } = require('./helpers.cjs');
async function enterPin(page){await enterTestPin(page,'1234');await page.getByText('Account active').waitFor();}
test('transfer amount and review layout', async ({ browser }) => {
 const errors=[];
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'/'); await page.evaluate(()=>localStorage.clear()); await page.reload(); await enterPin(page);
 await page.getByRole('link',{name:'Send money'}).click();
 await page.getByRole('heading',{name:'Send money',exact:true}).waitFor();
 await page.getByRole('button',{name:/Mama Ngozi/}).click();
 await page.getByLabel('Amount',{exact:true}).waitFor();
 const amountSize=await page.getByLabel('Amount',{exact:true}).evaluate(n=>getComputedStyle(n).fontSize);
 assert.strictEqual(amountSize,'36px');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.screenshot({path:`${SHOTS}/quanto-ui-transfer-amount-mobile.png`,fullPage:true});
 await page.getByLabel('Amount',{exact:true}).fill('25000');
 await page.getByRole('button',{name:'Review transfer'}).click();
 await page.getByRole('heading',{name:'Review and confirm',exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.screenshot({path:`${SHOTS}/quanto-ui-transfer-review-mobile.png`,fullPage:true});
 assert.deepStrictEqual(errors, []);
});
