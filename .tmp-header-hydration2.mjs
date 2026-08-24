import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies([{ name: "neya_locale", value: "de", domain: "localhost", path: "/" }]);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const resp = await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
const html = await resp.text();
await page.waitForSelector("header");
await page.waitForTimeout(2000);
// What ended up in the DOM (client-corrected)?
const after = await page.evaluate(() => document.querySelector("header nav a")?.textContent.trim());
// What did the server send in the HTML?
const serverHtml = html.slice(0, 200000);
const m = serverHtml.match(/<nav[\s\S]{0,4000}?<a[^>]*>([^<]*)</);
console.log("server nav first link:", m ? m[1] : "not found");
console.log("client DOM nav first link:", after);
const hf = errors.find((e) => e.includes("Hydration"));
if (hf) {
  const i = hf.indexOf("+ ");
  console.log("---DIFF---");
  console.log(hf.slice(Math.max(0, i - 600), i + 900));
}
await browser.close();