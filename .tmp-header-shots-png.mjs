import { chromium } from "playwright-core";
import fs from "fs";

const dir = ".tmp-header-shots-png";
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });

const widths = [320, 375, 414, 560, 640, 768, 820, 1024, 1100, 1200, 1270, 1280, 1340, 1360, 1440, 1536, 1920];

for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 760 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("header");
  await page.waitForTimeout(1400);
  const h = await page.evaluate(() => Math.round(document.querySelector("header").getBoundingClientRect().height));
  await page.screenshot({ path: `${dir}/w${width}.png`, clip: { x: 0, y: 0, width, height: h } });
  await ctx.close();
}

// Mobile menu open states
for (const width of [320, 414, 768, 1024]) {
  const ctx = await browser.newContext({ viewport: { width, height: 760 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("header");
  await page.waitForTimeout(1200);
  const btn = await page.$('header button[aria-controls="site-header-menu"]');
  if (btn) await btn.click();
  await page.waitForTimeout(900);
  const h = await page.evaluate(() => Math.round(document.querySelector("header").getBoundingClientRect().height));
  await page.screenshot({ path: `${dir}/w${width}-menu.png`, clip: { x: 0, y: 0, width, height: h } });
  await ctx.close();
}

// Authed state
if (fs.existsSync(".tmp-header-auth.json")) {
  const state = JSON.parse(fs.readFileSync(".tmp-header-auth.json", "utf8"));
  for (const width of [1280, 1440, 1920]) {
    const ctx = await browser.newContext({ viewport: { width, height: 760 }, storageState: ".tmp-header-auth.json" });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("header");
    await page.waitForTimeout(1400);
    const h = await page.evaluate(() => Math.round(document.querySelector("header").getBoundingClientRect().height));
    await page.screenshot({ path: `${dir}/authed-w${width}.png`, clip: { x: 0, y: 0, width, height: h } });
    // account menu open
    const acc = await page.$('header button[aria-haspopup="menu"]');
    if (acc) await acc.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/authed-w${width}-menu.png`, clip: { x: 0, y: 0, width, height: h + 320 } });
    await ctx.close();
  }
}

await browser.close();
console.log("done");