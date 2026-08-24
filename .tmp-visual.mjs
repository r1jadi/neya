import { chromium } from "playwright-core";
import fs from "fs";

const dir = ".tmp-shots";
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });

const shots = [
  ["/", 375, "home-375"],
  ["/", 768, "home-768"],
  ["/", 1440, "home-1440"],
  ["/events", 375, "events-375"],
  ["/events", 1024, "events-1024"],
  ["/events", 1440, "events-1440"],
  ["/venues", 375, "venues-375"],
  ["/venues", 1024, "venues-1024"],
  ["/venues/anzo-25f610dc", 375, "venue-375"],
  ["/venues/anzo-25f610dc", 1024, "venue-1024"],
  ["/venues/anzo-25f610dc", 1440, "venue-1440"],
  ["/map", 375, "map-375"],
  ["/map", 1024, "map-1024"],
  ["/map", 1440, "map-1440"],
  ["/guides", 375, "guides-375"],
  ["/guides", 1440, "guides-1440"],
  ["/artists", 375, "artists-375"],
  ["/my-night", 375, "mynight-375"],
  ["/login", 375, "login-375"],
  ["/register", 375, "register-375"],
  ["/login", 1024, "login-1024"],
  ["/login", 1440, "login-1440"],
  ["/cities/prishtina", 375, "city-375"],
  ["/cities/prishtina", 1024, "city-1024"],
  ["/submit-event", 375, "submit-375"],
  ["/contact", 375, "contact-375"],
  ["/terms", 375, "terms-375"],
  ["/checkout/failure", 375, "cofail-375"],
  ["/onboarding", 375, "onboarding-375"],
];

for (const [route, width, label] of shots) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
    const h = await page.evaluate(() => Math.min(document.documentElement.scrollHeight, 2500));
    await page.screenshot({ path: `${dir}/${label}.png`, fullPage: h > 900, clip: h > 900 ? undefined : { x: 0, y: 0, width, height: 900 } });
  } catch (e) {
    console.log("ERR", label, String(e).split("\n")[0].slice(0, 100));
  }
  await ctx.close();
}
await browser.close();
console.log("done");