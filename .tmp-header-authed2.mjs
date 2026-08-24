import { chromium } from "playwright-core";
import fs from "fs";

const dir = ".tmp-header-shots-png";
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });

for (const width of [1280, 1440, 1920]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("header");
  await page.waitForTimeout(1600);
  const h = await page.evaluate(() => Math.round(document.querySelector("header").getBoundingClientRect().height));
  await page.screenshot({ path: `${dir}/authed2-w${width}.png`, clip: { x: 0, y: 0, width, height: h } });
  const acc = await page.$('header button[aria-haspopup="menu"]');
  if (acc) { await acc.click(); await page.waitForTimeout(700); }
  await page.screenshot({ path: `${dir}/authed2-w${width}-menu.png`, clip: { x: 0, y: 0, width, height: h + 340 } });
  await ctx.close();
}

// mobile + menu with authed
for (const width of [375, 768]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("header");
  await page.waitForTimeout(1400);
  const btn = await page.$('header button[aria-controls="site-header-menu"]');
  if (btn) { await btn.click(); await page.waitForTimeout(800); }
  const h = await page.evaluate(() => Math.round(document.querySelector("header").getBoundingClientRect().height));
  await page.screenshot({ path: `${dir}/authed2-w${width}-drawer.png`, clip: { x: 0, y: 0, width, height: h } });
  await ctx.close();
}
await browser.close();
console.log("done");