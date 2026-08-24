import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
for (const width of [320, 375, 1366]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/contact", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1700);
  const m = await page.evaluate(() => {
    const interactives = [...document.querySelectorAll("a, button, input, select, textarea, [role=button], [role=tab], [role=menuitem]")].filter((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
    });
    const clipped = interactives.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight + 40) return false;
      return r.right > window.innerWidth + 2 || r.left < -2;
    }).map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, text: (el.textContent || "").trim().slice(0, 28) || el.getAttribute("aria-label") || "", cls: el.className.toString().slice(0, 60), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] };
    });
    return { clipped, inputs: [...document.querySelectorAll("input")].map((i) => { const r = i.getBoundingClientRect(); return { type: i.type, cls: i.className.toString().slice(0, 50), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], w: Math.round(r.width) }; }).slice(0, 6) };
  });
  console.log(`width ${width}:`, JSON.stringify(m, null, 1));
  await ctx.close();
}
await browser.close();