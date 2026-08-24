import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function probe(label, setup) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + String(e).slice(0, 200)));
  try {
    await setup(context, page);
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector("header");
    await page.waitForTimeout(2500);
    const html = await page.evaluate(() => document.documentElement.lang);
    const navText = await page.evaluate(() => [...document.querySelectorAll("header nav a")].map(a => a.textContent.trim()).slice(0, 3));
    await page.screenshot({ path: `.tmp-header-shot-live-${label}.jpg`, type: "jpeg", quality: 80 });
    console.log(`[${label}] html.lang=${html} nav0..2=${JSON.stringify(navText)}`);
    const hydration = consoleErrors.filter(e => e.includes("Hydration") || e.includes("didn't match") || e.includes("hydration"));
    console.log(`[${label}] console errors: ${consoleErrors.length}, hydration-related: ${hydration.length}`, hydration.slice(0, 2));
  } finally {
    await context.close().catch(() => {});
  }
}

await probe("cookie-de", async (ctx) => {
  await ctx.addCookies([{ name: "neya_locale", value: "de", domain: "localhost", path: "/" }]);
});
await probe("cookie-none", async () => {});
await probe("click-de", async (ctx, page) => {
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('header [role="group"]');
  const deBtn = page.locator('header [role="group"] button', { hasText: "DE" });
  await deBtn.click();
  await page.waitForTimeout(800);
});
await probe("click-tr", async (ctx, page) => {
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('header [role="group"]');
  const trBtn = page.locator('header [role="group"] button', { hasText: "TR" });
  await trBtn.click();
  await page.waitForTimeout(800);
});
await browser.close();