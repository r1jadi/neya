import { chromium } from "playwright-core";
import fs from "fs";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const routes = ["/", "/events", "/venues", "/artists", "/guides", "/map", "/my-night", "/regions/europe", "/countries/kosovo", "/cities/prishtina", "/login", "/register", "/forgot-password", "/submit-event", "/contact", "/terms", "/privacy", "/not-found-random-xyz"];

const slugs = { events: [], venues: [], artists: [], guides: [] };

for (const route of routes) {
  try {
    const resp = await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(900);
    const status = resp ? resp.status() : "?";
    const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")));
    for (const h of hrefs || []) {
      const m = h?.match(/^\/(events|venues|artists|guides)\/([^?#/]+)$/);
      if (m && m[2] && !m[2].startsWith("[")) slugs[m[1]].push(m[2]);
    }
    const title = await page.title();
    console.log(`${status}  ${route}  ->  ${title.slice(0, 60)}`);
  } catch (e) {
    console.log(`ERR ${route}: ${String(e).split("\n")[0].slice(0, 100)}`);
  }
}

for (const k of Object.keys(slugs)) slugs[k] = [...new Set(slugs[k])].slice(0, 4);
console.log("SLUGS:", JSON.stringify(slugs));
fs.writeFileSync(".tmp-slugs.json", JSON.stringify(slugs, null, 1));
await browser.close();