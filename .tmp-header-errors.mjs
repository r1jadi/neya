import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.waitForSelector("header");
await page.waitForTimeout(2500);
await browser.close();