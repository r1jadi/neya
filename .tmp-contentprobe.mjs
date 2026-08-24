import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const route of ["/events", "/artists", "/guides", "/map", "/my-night", "/cities/prishtina"]) {
  await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")).filter(Boolean);
    const cards = document.querySelectorAll("a[href^='/events/'], a[href^='/venues/'], a[href^='/artists/'], a[href^='/guides/']").length;
    const mainText = (document.querySelector("main")?.innerText || "").slice(0, 400);
    return { cards, sampleLinks: [...new Set(links)].filter(h => h.startsWith("/events") || h.startsWith("/artists") || h.startsWith("/guides")).slice(0, 8), mainText: mainText.replace(/\n+/g, " | ").slice(0, 300) };
  });
  console.log(`--- ${route}`);
  console.log("  cards:", info.cards, "links:", JSON.stringify(info.sampleLinks));
  console.log("  text:", info.mainText);
}
await browser.close();