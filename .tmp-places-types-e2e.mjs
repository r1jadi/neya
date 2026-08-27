import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim() : null;
};
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const anon = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
  auth: { persistSession: false },
});

// Clean leftovers from previous runs
const clean = async () => {
  const { data } = await admin.from("venues").select("id").ilike("name", "Placetype Test%");
  if (data?.length) {
    await admin.from("venues").delete().in("id", data.map((v) => v.id));
    console.log(`Cleaned ${data.length} leftover test venues`);
  }
};
await clean();

// ── Wait for the places_types column ──────────────────────────────────────
console.log("Waiting for venues.places_types column...");
const applied = await (async () => {
  const start = Date.now();
  while (Date.now() - start < 540_000) {
    const { error } = await anon.from("venues").select("id, places_types").limit(1);
    if (!error) return true;
    await new Promise((r) => setTimeout(r, 8_000));
  }
  return false;
})();
if (!applied) {
  console.log("ABORT: places_types column never appeared. Run the migration, then re-run this script.");
  process.exit(1);
}
console.log("Column present ✓");

// ── Helpers ───────────────────────────────────────────────────────────────
const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

const PLACES_TYPES = ["breakfast", "coffee", "lunch", "work_study", "dinner", "drinks", "nightlife"];

function venuePayload(name, overrides = {}) {
  return {
    name,
    slug: `placetype-test-${randomUUID().slice(0, 8)}`,
    city_slug: "prishtina",
    category: "cafe",
    description: "Placetype verification venue",
    address: "Test Street 1",
    image_url: null,
    gallery_urls: [],
    music_genres: [],
    day_parts: [],
    social_links: {},
    price_level: 2,
    approved: true,
    rejected: false,
    is_featured: false,
    is_trending: false,
    ...overrides,
  };
}

const getPlacesHtml = async () => (await fetch("http://localhost:3000/places")).text();

// Counts how many Places sections a venue name is rendered under (default
// grouped view renders the venue once per section it belongs to).
const sectionCount = (html, name) => {
  const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  return (html.match(re) ?? []).length;
};

// ── Test 1: venue assigned Lunch + Drinks ─────────────────────────────────
const { data: v1 } = await admin
  .from("venues")
  .insert(venuePayload("Placetype Test Multi", { places_types: ["lunch", "drinks"] }))
  .select("id, places_types")
  .single();
let html = await getPlacesHtml();
check("multi: venue with lunch+drinks renders in 2 sections", sectionCount(html, "Placetype Test Multi") === 2, `rendered ${sectionCount(html, "Placetype Test Multi")}x`);

// ── Test 2: edit → change selections (breakfast + coffee + dinner + nightlife) ──
await admin
  .from("venues")
  .update({ places_types: ["breakfast", "coffee", "dinner", "nightlife"], updated_at: new Date().toISOString() })
  .eq("id", v1.id);
html = await getPlacesHtml();
check("edit: updated selections (4 types) render in 4 sections", sectionCount(html, "Placetype Test Multi") === 4, `rendered ${sectionCount(html, "Placetype Test Multi")}x`);

// ── Test 3: venue with 3+ types (lunch + drinks + nightlife) ──────────────
const { data: v2 } = await admin
  .from("venues")
  .insert(venuePayload("Placetype Test Triple", { places_types: ["lunch", "drinks", "nightlife"] }))
  .select("id")
  .single();
html = await getPlacesHtml();
check("triple: lunch+drinks+nightlife renders in 3 sections", sectionCount(html, "Placetype Test Triple") === 3, `rendered ${sectionCount(html, "Placetype Test Triple")}x`);

// ── Test 4: unassigned venue keeps legacy inference (no random classification) ──
// category=cafe, no day_parts → legacy map: breakfast, coffee, lunch (3 sections),
// and categorically NOT nightlife/drinks.
const { data: v3 } = await admin
  .from("venues")
  .insert(venuePayload("Placetype Test Unassigned", { places_types: [] }))
  .select("id")
  .single();
html = await getPlacesHtml();
const unassignedCount = sectionCount(html, "Placetype Test Unassigned");
check("unassigned: venue does NOT get random classification", unassignedCount === 3, `rendered ${unassignedCount}x (cafe legacy = breakfast/coffee/lunch)`);
check("unassigned: DB value is empty array (not defaulted)", ((await admin.from("venues").select("places_types").eq("id", v3.id).single()).data.places_types ?? []).length === 0);

// ── Test 5: refresh → classifications persist from Supabase ───────────────
html = await getPlacesHtml();
check("refresh: selections persist (4/3/3 section render)", sectionCount(html, "Placetype Test Multi") === 4 && sectionCount(html, "Placetype Test Triple") === 3);

// ── Test 6: invalid values are rejected by the DB check constraint ────────
const { error: invalidErr } = await admin
  .from("venues")
  .insert(venuePayload("Placetype Test Invalid", { places_types: ["lunch", "brunch"] }));
check("integrity: invalid places type rejected by DB constraint", Boolean(invalidErr), invalidErr?.message ?? "");

// ── Cleanup ───────────────────────────────────────────────────────────────
await clean();

// ── Summary ───────────────────────────────────────────────────────────────
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) process.exit(1);