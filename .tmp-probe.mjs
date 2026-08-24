import { chromium } from "playwright-core";
import fs from "fs";

const browser = await chromium.launch({ channel: "msedge", headless: true });
fs.mkdirSync(".tmp-shots", { recursive: true });

async function probe(route, width, label) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const out = {};
    // 1) clipped interactives detail
    const iel = [...document.querySelectorAll("a, button, input, select, textarea")].filter((el) => {
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      return s.display !== "none" && r.width > 0;
    });
    const clipped = iel.filter((el) => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 2 && r.top < window.innerHeight; })
      .map((el) => {
        const r = el.getBoundingClientRect();
        const a = [];
        let p = el;
        while (p && a.length < 6) { const s = getComputedStyle(p); const pr = p.getBoundingClientRect(); a.push(`${p.tagName}.${(p.className||"").toString().split(" ").slice(0,2).join(".")} o=${s.overflowX} w=${Math.round(pr.width)}`); p = p.parentElement; }
        return { text: (el.textContent||"").trim().slice(0,20), w: Math.round(r.width), right: Math.round(r.right), vw: window.innerWidth, ancestors: a };
      });
    out.clipped = clipped.slice(0, 6);
    // 2) venue card collision detail: find the ANZO/Add to My Night overlap
    const pair = [];
    const els = [...document.querySelectorAll("a, button")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    for (let i = 0; i < els.length && pair.length < 3; i++) {
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i], b = els[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ox > 3 && oy > 3) {
          const za = getComputedStyle(a).zIndex, zb = getComputedStyle(b).zIndex;
          const pa = getComputedStyle(a.parentElement).position, pb = getComputedStyle(b.parentElement).position;
          pair.push({ a: (a.textContent||"").trim().slice(0,16), b: (b.textContent||"").trim().slice(0,16), aRect: [Math.round(ra.left), Math.round(ra.top), Math.round(ra.right), Math.round(ra.bottom)], bRect: [Math.round(rb.left), Math.round(rb.top), Math.round(rb.right), Math.round(rb.bottom)], za, zb, aParent: `${a.parentElement.tagName}.${(a.parentElement.className||"").toString().slice(0,40)}`, bParent: `${b.parentElement.tagName}.${(b.parentElement.className||"").toString().slice(0,40)}` });
        }
      }
    }
    out.pairs = pair.slice(0, 3);
    return out;
  });
  console.log(`\n### ${label} (${width}) ${route}`);
  console.log(JSON.stringify(info, null, 1).slice(0, 3500));
  await page.screenshot({ path: `.tmp-shots/${label}-w${width}.png`, clip: { x: 0, y: 0, width, height: 900 } });
  await ctx.close();
}

await probe("/", 375, "home");
await probe("/events", 375, "events");
await probe("/venues", 375, "venues");
await probe("/contact", 320, "contact");
await probe("/venues/anzo-25f610dc", 375, "venue");
await browser.close();