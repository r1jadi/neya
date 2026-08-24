import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = {};

async function langSwitch() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("header");
  await page.waitForTimeout(1200);
  const before = await page.evaluate(() => ({ lang: document.documentElement.lang, nav: [...document.querySelectorAll("header nav a")].map(a => a.textContent.trim()).slice(0, 2) }));
  await page.locator('header [role="group"] button', { hasText: "DE" }).click();
  await page.waitForTimeout(700);
  const afterDe = await page.evaluate(() => ({ lang: document.documentElement.lang, nav: [...document.querySelectorAll("header nav a")].map(a => a.textContent.trim()).slice(0, 2), cookie: document.cookie.includes("neya_locale=de") }));
  await page.locator('header [role="group"] button', { hasText: "TR" }).click();
  await page.waitForTimeout(700);
  const afterTr = await page.evaluate(() => ({ lang: document.documentElement.lang, nav: [...document.querySelectorAll("header nav a")].map(a => a.textContent.trim()).slice(0, 2), cookie: document.cookie.includes("neya_locale=tr") }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("header");
  await page.waitForTimeout(1200);
  const afterReload = await page.evaluate(() => ({ lang: document.documentElement.lang, nav: [...document.querySelectorAll("header nav a")].map(a => a.textContent.trim()).slice(0, 2) }));
  results.langSwitch = { before, afterDe, afterTr, afterReload, errs: errs.filter(e => e.includes("Hydration")) };
  await ctx.close();
}

async function mobileMenu(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("header");
  await page.waitForTimeout(1000);
  const b = await page.$('header button[aria-controls="site-header-menu"]');
  await b.click();
  await page.waitForTimeout(700);
  const links = await page.evaluate(() => [...document.querySelectorAll("#site-header-menu a")].map(a => a.textContent.trim()));
  const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
  results[`menu-${width}`] = { links, bodyOverflow };
  await page.locator('#site-header-menu a', { hasText: "Guides" }).first().click();
  await page.waitForTimeout(900);
  results[`menu-${width}-closed`] = { url: page.url(), menuVisible: await page.$("#site-header-menu") !== null };
  await ctx.close();
}

await langSwitch();
await mobileMenu(320);
await mobileMenu(768);
await browser.close();
console.log(JSON.stringify(results, null, 1));