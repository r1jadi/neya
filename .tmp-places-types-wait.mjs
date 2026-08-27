import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim() : null;
};
const anon = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
  auth: { persistSession: false },
});

const probe = async () => {
  const { data, error } = await anon.from("venues").select("id, places_types").limit(1);
  if (error) return { applied: /places_types/.test(error.message) === false && false, message: error.message };
  return { applied: true, value: data?.[0] ?? null };
};

console.log("Polling for places_types column (up to ~10 min)...");
const start = Date.now();
while (Date.now() - start < 600_000) {
  const result = await probe();
  if (result.applied) {
    console.log(`PLACES_TYPES COLUMN PRESENT after ${Math.round((Date.now() - start) / 1000)}s`);
    console.log("Sample row places_types:", JSON.stringify(result.value ?? "no rows"));
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 10_000));
}
console.log("TIMEOUT: column not detected within 10 minutes");
process.exit(1);