import { chromium } from "playwright-core";
import fs from "fs";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const sizes = [320, 375, 414, 560, 640, 768, 820, 1024, 1100, 1280, 1366, 1440, 1536, 1920];

const routes = [
  "/",
  "/events",
  "/venues",
  "/venues/anzo-25f610dc",
  "/venues/boujee-1651fd7a",
  "/artists",
  "/guides",
  "/map",
  "/my-night",
  "/cities/prishtina",
  "/countries/kosovo",
  "/login",
  "/register",
  "/forgot-password",
  "/update-password",
  "/submit-event",
  "/contact",
  "/terms",
  "/privacy",
  "/checkout/cancel",
  "/checkout/failure",
  "/onboarding",
  "/auth/auth-code-error",
  "/definitely-not-a-page",
];

const results = [];
let counter = 0;
const IGNORED_ERR = /Failed to load resource|404|favicon/i;

const jobs = [];
for (const width of sizes) for (const route of routes) jobs.push({ route, width });

async function auditJob({ route, width }) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  try {
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 260)); });
    page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + String(e).slice(0, 260)));
    await page.goto(`https://neya.live${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1700);
    const m = await page.evaluate(() => {
      const dedupe = (arr) => [...new Map(arr.map((x) => [JSON.stringify(x), x])).values()];
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth > window.innerWidth + 1;
      const overflowAmt = doc.scrollWidth - window.innerWidth;
      const interactives = [...document.querySelectorAll("a, button, input, select, textarea, [role=button], [role=tab], [role=menuitem]")].filter((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
      });
      const clipped = interactives.filter((el) => {
        const r = el.getBoundingClientRect();
        // only elements near or inside the current viewport to avoid flagging below-the-fold content
        if (r.top > window.innerHeight + 40) return false;
        return r.right > window.innerWidth + 2 || r.left < -2;
      }).map((el) => ({ tag: el.tagName, text: (el.textContent || "").trim().slice(0, 28) || el.getAttribute("aria-label") || el.className.toString().slice(0, 24) })).slice(0, 10);
      const colliding = [];
      for (let i = 0; i < interactives.length; i++) {
        for (let j = i + 1; j < interactives.length; j++) {
          const a = interactives[i], b = interactives[j];
          if (a.contains(b) || b.contains(a)) continue;
          const at = (a.textContent || "").trim();
          const bt = (b.textContent || "").trim();
          if (/Tanstack|devtools|React Query/i.test(at + bt)) continue;
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (ox > 3 && oy > 3) {
            colliding.push([(a.textContent || "").trim().slice(0, 20) || a.getAttribute("aria-label") || a.tagName, (b.textContent || "").trim().slice(0, 20) || b.getAttribute("aria-label") || b.tagName]);
          }
        }
      }
      const imgIssues = [...document.querySelectorAll("img")].filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width > window.innerWidth + 2 && r.width > 0;
      }).length;
      // elements that would cause horizontal page scroll (layout shift): off-screen right with no scrollable ancestor
      const hardClip = interactives.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.right <= window.innerWidth + 2 && r.left >= -2) return false;
        if (r.top > window.innerHeight + 40) return false;
        // honeypot / off-screen a11y helpers positioned far left are intentional
        if (r.left < -500) return false;
        // has a scrollable ancestor that contains it horizontally?
        let p = el.parentElement;
        while (p) {
          const s = getComputedStyle(p);
          if ((s.overflowX === "auto" || s.overflowX === "scroll") && p.scrollWidth > p.clientWidth + 2) return false;
          p = p.parentElement;
        }
        return true;
      }).map((el) => ({ tag: el.tagName, text: (el.textContent || "").trim().slice(0, 28) || el.getAttribute("aria-label") || el.className.toString().slice(0, 24) })).slice(0, 10);
      return {
        overflowX: !!overflowX,
        overflowAmt,
        clipped: dedupe(clipped),
        hardClip: dedupe(hardClip),
        colliding: dedupe(colliding).slice(0, 8),
        imgIssues,
      };
    });
    const errs = [...new Set(consoleErrors.map((e) => e.split("\n")[0].slice(0, 140)))].filter((e) => !IGNORED_ERR.test(e));
    return { route, width, ...m, consoleErrors: errs.slice(0, 5) };
  } catch (e) {
    return { route, width, error: String(e).split("\n")[0].slice(0, 140) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

const POOL = 6;
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const job = jobs[next++];
    const r = await auditJob(job);
    results.push(r);
    counter++;
    if (counter % 30 === 0) {
      fs.writeFileSync(".tmp-audit-results.json", JSON.stringify(results, null, 1));
      console.log(`progress ${counter}/${jobs.length}`);
    }
  }
}

await Promise.all(Array.from({ length: POOL }, () => worker()));
fs.writeFileSync(".tmp-audit-results.json", JSON.stringify(results, null, 1));
const bad = results.filter((r) => r.overflowX || (r.hardClip || []).length || (r.colliding || []).length || r.imgIssues > 0 || (r.consoleErrors || []).length || r.error);
console.log("TOTAL ROWS:", results.length, "FAILING:", bad.length);
await browser.close();
process.exitCode = bad.length ? 2 : 0;