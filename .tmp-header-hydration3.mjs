import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies([{ name: "neya_locale", value: "de", domain: "localhost", path: "/" }]);
const page = await context.newPage();
const resp = await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
const body = await resp.text();
const langMatch = body.match(/<html[^>]*lang="([^"]+)"/);
console.log("SSR <html lang>:", langMatch ? langMatch[1] : "n/a");
const navMatch = body.match(/<nav[^>]*>([\s\S]{0,1500}?)<\/nav>/);
if (navMatch) {
  const labels = [...navMatch[1].matchAll(/<a[^>]*>([^<]{1,40})</g)].map((m) => m[1].trim());
  console.log("SSR nav labels:", JSON.stringify(labels));
}
await browser.close();