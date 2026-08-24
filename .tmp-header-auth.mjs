import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), ".tmp-header-shots");
fs.mkdirSync(dir, { recursive: true });

const email = `hdr-test-${Date.now()}@neya-test.dev`;
const password = "TestHeader123!";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto("http://localhost:3000/register", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("form");
const emailInput = page.locator('input[type="email"]').first();
const passInputs = page.locator('input[type="password"]');
console.log("password fields:", await passInputs.count());
await emailInput.fill(email);
const n = await passInputs.count();
for (let i = 0; i < n; i++) await passInputs.nth(i).fill(password);
await page.locator('button[type="submit"]').first().click();
await page.waitForLoadState("domcontentloaded").catch(() => {});
await page.waitForTimeout(4000);
console.log("after register URL:", page.url());
console.log("page text snippet:", (await page.evaluate(() => document.body.innerText)).slice(0, 300));

// Try login explicitly in case register redirected to login/confirm
if (page.url().includes("/login") || page.url().includes("register")) {
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("form");
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  console.log("after login URL:", page.url());
  console.log("page text snippet:", (await page.evaluate(() => document.body.innerText)).slice(0, 300));
}

await context.storageState({ path: ".tmp-header-auth.json" });
await browser.close();
