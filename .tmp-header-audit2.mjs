import { chromium } from "playwright-core";
import fs from "fs";

const dir = ".tmp-header-shots-2";
fs.mkdirSync(dir, { recursive: true });

const widths = [320, 360, 375, 390, 414, 480, 560, 640, 768, 820, 900, 1024, 1100, 1152, 1200, 1240, 1280, 1340, 1366, 1440, 1536, 1600, 1728, 1920];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];

async function audit(width, opts = {}) {
  const { menu = false, locale = "en", authed = false } = opts;
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  if (locale !== "en") await context.addCookies([{ name: "neya_locale", value: locale, domain: "localhost", path: "/" }]);
  if (authed && fs.existsSync(".tmp-header-auth.json")) {
    await context.addCookies(JSON.parse(fs.readFileSync(".tmp-header-auth.json", "utf8")).cookies.filter(c => !c.name.startsWith("neya_")));
  }
  const page = await context.newPage();
  try {
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector("header", { timeout: 30000 });
    await page.waitForTimeout(1600);
    if (menu) {
      const btn = await page.$('header button[aria-controls="site-header-menu"]');
      if (btn) { await btn.click(); await page.waitForTimeout(800); }
    }
    const m = await page.evaluate(() => {
      const header = document.querySelector("header");
      const h = header.getBoundingClientRect();
      const bar = header.firstElementChild;
      const nav = header.querySelector("nav");
      const rightCluster = [...header.querySelectorAll("a, button, [role=group]")]
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom <= h.height + 4 && r.top >= 0; });
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
      const barOverflow = bar && bar.scrollWidth > bar.clientWidth + 1;

      // Collisions between visible interactive elements on the same row
      const colliding = [];
      const interactives = [...header.querySelectorAll("a, button, [role=group], [role=menu]")]
        .filter(el => {
          const s = getComputedStyle(el); const r = el.getBoundingClientRect();
          return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0 && r.top < h.height + 4 && r.bottom > 0;
        });
      for (let i = 0; i < interactives.length; i++) for (let j = i + 1; j < interactives.length; j++) {
        const a = interactives[i].getBoundingClientRect(), b = interactives[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 1 && oy > 1) {
          const nested = interactives[i].contains(interactives[j]) || interactives[j].contains(interactives[i]);
          if (nested) continue;
          colliding.push(`${(interactives[i].textContent.trim() || interactives[i].getAttribute("aria-label") || interactives[i].tagName).slice(0, 20)} x ${(interactives[j].textContent.trim() || interactives[j].getAttribute("aria-label") || interactives[j].tagName).slice(0, 20)}`);
        }
      }

      // Horizontal clip check on bar children
      const clipped = [...bar.children].filter(c => {
        const r = c.getBoundingClientRect();
        return (r.right > window.innerWidth + 1 || r.left < -1) && r.width > 0;
      }).map(c => (c.textContent.trim() || c.className).slice(0, 24));

      // Vertical alignment of bar children (centers should be within 1px)
      const centers = [...bar.children].filter(c => { const r = c.getBoundingClientRect(); return r.width > 0 && getComputedStyle(c).display !== "none"; })
        .map(c => Math.round(c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2));
      const barCenter = Math.round(h.height / 2);
      const offCenter = Math.max(...centers.map(v => Math.abs(v - barCenter)));

      // Info about right cluster sizes
      const w = (el) => Math.round(el.getBoundingClientRect().width);
      const sizes = {};
      for (const el of header.querySelectorAll("a, button, [role=group]")) {
        if (el.getBoundingClientRect().bottom > 72) continue;
        const aria = el.getAttribute("aria-label") || "";
        const txt = (el.textContent || "").trim();
        if (el.getAttribute("aria-controls") === "site-header-menu") sizes.hamburger = w(el);
        else if (el.querySelector("svg") && aria.includes("Search")) sizes.search = w(el);
        else if (aria.includes("theme")) sizes.theme = w(el);
        else if (el.getAttribute("role") === "group") sizes.lang = w(el);
        else if (txt === "Log in" || txt === "Anmelden") sizes.login = w(el);
        else if (txt === "Register" || txt === "Registrieren") sizes.register = w(el);
        else if (txt.startsWith("NEYA") && txt.length < 20) sizes.logo = w(el);
        else if (el.closest("nav")) sizes.nav = (sizes.nav || 0) + w(el);
      }
      return {
        headerH: Math.round(h.height),
        docOverflow, barOverflow, colliding: [...new Set(colliding)].slice(0, 6), clipped,
        maxOffCenter: offCenter, centers,
        navVisible: nav ? getComputedStyle(nav).display !== "none" : false,
        navLeft: nav ? Math.round(nav.getBoundingClientRect().left) : null,
        navRight: nav ? Math.round(nav.getBoundingClientRect().right) : null,
        sizes,
        langSwitcherVisible: !!header.querySelector('[role="group"]'),
      };
    });
    if (opts.authed) {
      await page.screenshot({ path: `${dir}/authed-w${width}.jpg`, type: "jpeg", quality: 55, clip: { x: 0, y: 0, width, height: m.headerH } });
    } else if (menu) {
      await page.screenshot({ path: `${dir}/w${width}-menu-${locale}.jpg`, type: "jpeg", quality: 55, clip: { x: 0, y: 0, width, height: m.headerH } });
    } else {
      await page.screenshot({ path: `${dir}/w${width}-${locale}.jpg`, type: "jpeg", quality: 55, clip: { x: 0, y: 0, width, height: m.headerH } });
    }
    results.push({ width, menu, locale, ...m });
  } catch (e) {
    results.push({ width, menu, locale, error: String(e).split("\n")[0].slice(0, 140) });
  } finally {
    await context.close().catch(() => {});
  }
}

for (const width of widths) {
  await audit(width, {});
  if (width < 1280) await audit(width, { menu: true });
}
await browser.close();
console.log(JSON.stringify(results, null, 1));
const issues = results.filter(r => r.error || r.docOverflow || r.barOverflow || (r.colliding && r.colliding.length) || (r.clipped && r.clipped.length) || (r.offCenter ?? 0) > 2);
console.log("\n=== ISSUES ===");
console.log(JSON.stringify(issues, null, 1));
process.exitCode = issues.length ? 2 : 0;