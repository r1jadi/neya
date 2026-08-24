import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), ".tmp-header-shots");
fs.mkdirSync(dir, { recursive: true });

const widths = [320, 375, 390, 414, 480, 640, 768, 820, 1024, 1100, 1280, 1366, 1440, 1536, 1920];

const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
let failCount = 0;

async function measureWidth(width, variant) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("header", { timeout: 30000 });
    await page.waitForTimeout(1500);
    if (variant === "menu") {
      const btn = await page.$('header button[aria-controls="site-header-menu"]');
      if (btn) await btn.click();
      await page.waitForTimeout(700);
    }
    const metrics = await page.evaluate(() => {
      const header = document.querySelector("header");
      const bar = header?.firstElementChild;
      const headerOverflow = header && header.scrollWidth > header.clientWidth + 1;
      const barOverflow = bar && bar.scrollWidth > bar.clientWidth + 1;
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
      const colliding = [];
      const els = header ? [...header.querySelectorAll("a, button, [role=group]")] : [];
      const rects = els
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((x) => x.r.width > 0 && x.r.height > 0 && x.r.top < 72);
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i].r;
          const b = rects[j].r;
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > 2 && overlapY > 2) {
            const nested = rects[i].el.contains(rects[j].el) || rects[j].el.contains(rects[i].el);
            if (nested) continue;
            colliding.push(
              `${(rects[i].el.textContent || rects[i].el.getAttribute("aria-label") || "").trim().slice(0, 18)} x ${(rects[j].el.textContent || rects[j].el.getAttribute("aria-label") || "").trim().slice(0, 18)}`,
            );
          }
        }
      }
      const clipped = rects
        .filter((x) => x.r.right > window.innerWidth + 1 || x.r.left < -1)
        .map((x) => (x.el.textContent || x.el.getAttribute("aria-label") || "").trim().slice(0, 24));
      return {
        headerH: header ? Math.round(header.getBoundingClientRect().height) : 0,
        headerOverflow: !!headerOverflow,
        barOverflow: !!barOverflow,
        docOverflow: !!docOverflow,
        colliding: colliding.slice(0, 8),
        clipped: clipped.slice(0, 8),
      };
    });
    await page.screenshot({ path: path.join(dir, `w${width}${variant === "menu" ? "-menu" : ""}.jpg`), type: "jpeg", quality: 60, clip: { x: 0, y: 0, width, height: Math.min(600, metrics.headerH) } });
    return { width, variant, ...metrics };
  } catch (e) {
    return { width, variant, error: String(e).split("\n")[0].slice(0, 120) };
  } finally {
    await page.close().catch(() => {});
  }
}

for (const width of widths) {
  const r = await measureWidth(width, "closed");
  results.push(r);
  if (width < 1280) {
    results.push(await measureWidth(width, "menu"));
  }
}

const issues = results.filter((r) => r.error || r.docOverflow || r.headerOverflow || r.barOverflow || r.colliding.length || r.clipped.length);
console.log(JSON.stringify(results, null, 2));
console.log("\n=== ISSUES SUMMARY ===");
console.log(JSON.stringify(issues, null, 2));
if (issues.length) failCount = issues.length;
await browser.close();
process.exitCode = issues.length ? 2 : 0;
console.log("failCount", failCount);
