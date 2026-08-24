import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), ".tmp-header-shots");
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];

async function measure(width, locale, tag) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "en-US" });
  await context.addCookies([{ name: "neya_locale", value: locale, domain: "localhost", path: "/" }]);
  const page = await context.newPage();
  try {
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("header", { timeout: 30000 });
    await page.waitForTimeout(1500);
    const metrics = await page.evaluate(() => {
      const header = document.querySelector("header");
      const bar = header?.firstElementChild;
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
      const barOverflow = bar && bar.scrollWidth > bar.clientWidth + 1;
      const colliding = [];
      const els = header ? [...header.querySelectorAll("a, button, [role=group]")] : [];
      const rects = els
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((x) => x.r.width > 0 && x.r.height > 0 && x.r.top < 72);
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i].r, b = rects[j].r;
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > 2 && overlapY > 2) {
            if (rects[i].el.contains(rects[j].el) || rects[j].el.contains(rects[i].el)) continue;
            colliding.push(`${(rects[i].el.textContent || rects[i].el.getAttribute("aria-label") || "").trim().slice(0, 18)} x ${(rects[j].el.textContent || rects[j].el.getAttribute("aria-label") || "").trim().slice(0, 18)}`);
          }
        }
      }
      const clipped = rects.filter((x) => x.r.right > window.innerWidth + 1 || x.r.left < -1)
        .map((x) => (x.el.textContent || x.el.getAttribute("aria-label") || "").trim().slice(0, 24));
      // gap audit: distance between rightmost logo edge and nav, and right cluster total width
      return { docOverflow: !!docOverflow, barOverflow: !!barOverflow, colliding: colliding.slice(0, 6), clipped: clipped.slice(0, 6) };
    });
    await page.screenshot({ path: path.join(dir, `${tag}-w${width}.jpg`), type: "jpeg", quality: 60, clip: { x: 0, y: 0, width, height: 64 } });
    return { tag, width, ...metrics };
  } catch (e) {
    return { tag, width, error: String(e).split("\n")[0].slice(0, 120) };
  } finally {
    await context.close().catch(() => {});
  }
}

const locales = ["de", "tr"];
const widths = [1280, 1366, 1440, 1536, 1920];
for (const locale of locales) {
  for (const width of widths) {
    results.push(await measure(width, locale, `hdr-${locale}`));
  }
}

console.log(JSON.stringify(results, null, 2));
const issues = results.filter((r) => r.error || r.docOverflow || r.barOverflow || r.colliding.length || r.clipped.length);
console.log("\nISSUES:", JSON.stringify(issues, null, 2));
await browser.close();
process.exitCode = issues.length ? 2 : 0;
