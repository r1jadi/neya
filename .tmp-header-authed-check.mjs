import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ storageState: ".tmp-header-auth.json", viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const header = document.querySelector("header");
  const links = [...header.querySelectorAll("a")].map((a) => (a.textContent || "").trim()).filter(Boolean);
  return { url: location.href, links };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
