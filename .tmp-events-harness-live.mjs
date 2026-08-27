// NEYA event edge-case harness: drives real server actions over HTTP and
// inspects DB state via the service role. Drop-in for testing state changes.
import fs from "fs";
import { loadEnv } from "./.tmp-env.mjs";

const env = loadEnv();
export const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
export const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
export const BASE = "https://neya.live";
const JAR = ".tmp-admin-cookies.txt";

function jarCookie() {
  // Netscape jar: URL-encoded value; decode before sending (curl does this).
  return fs
    .readFileSync(JAR, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t").slice(-2).join("="))
    .map((pair) => {
      const eq = pair.indexOf("=");
      return pair.slice(0, eq + 1) + decodeURIComponent(pair.slice(eq + 1));
    })
    .join("; ");
}

export const ACTIONS = {
  saveEvent: "40abfd8cfdb591f3f5396e783abe85c9e7a174620c",
  deleteEvent: "402ad8ac6c376d7832b4fb753a3448e9d684a2b0b2",
  saveTicket: "4054f7c3eba7c8231be27fa554edc6fad2b26753fc",
  deleteTicket: "4052ed174c3fbf636f0c56acb146acd86589ba96a4",
  updateEventSubmissionStatus: "40b022d4637612d8605f46d4295fd8814a771a52a3",
  updateReservationStatus: "40752b281466881e83fd9f5642e8910c337332de23",
  saveVenue: "40e36b7b586e6b8fb13455d7c426fea2ca0f7576b8",
  deleteVenue: "40bb5babe45bb07f2079adf2cd56f60c74cc75580c",
};

let encodeReplyCache = null;
async function getEncodeReply() {
  if (encodeReplyCache) return encodeReplyCache;
  // Shim the webpack internals the compiled client build touches at require
  // time (chunk loading is never used by encodeReply).
  globalThis.__webpack_require__ = {
    u: () => "",
    r: () => {},
    o: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop),
    d: (exports, definition) => {
      for (const k in definition) Object.defineProperty(exports, k, { get: definition[k] });
    },
    e: () => Promise.resolve(),
  };
  const mod = await import("./node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.development.js");
  encodeReplyCache = mod.encodeReply ?? mod.default?.encodeReply;
  if (!encodeReplyCache) throw new Error("encodeReply not found in compiled client");
  return encodeReplyCache;
}

export async function adminPost(actionId, fields, path = "/admin", headers = {}) {
  const encodeReply = await getEncodeReply();
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v == null) continue;
    fd.append(k, String(v));
  }
  const body = await encodeReply([fd]);
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        redirect: "manual",
        headers: {
          cookie: jarCookie(),
          "Next-Action": actionId,
          Accept: "text/x-component",
          ...headers,
        },
        body,
      });
      const location = res.headers.get("location") ?? res.headers.get("x-action-redirect")?.split(";")[0];
      const text = await res.text();
      return { status: res.status, location, text: text.slice(0, 600) };
    } catch (e) {
      lastErr = e;
      if (attempt < 4) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function pageGet(path, jar = null) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: jar ? { cookie: jarCookie() } : {},
  });
  return { status: res.status, location: res.headers.get("location"), text: await res.text() };
}

// ---- Supabase service-role access ----
const H = () => ({ apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" });

export async function db(path, opts = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H(), ...opts });
      if (!res.ok) throw new Error(`DB ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      return res.json();
    } catch (e) {
      lastErr = e;
      if (attempt < 4) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function dbInsert(table, rows) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...H(), Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`DB insert ${table}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function dbUpdate(table, patch, query) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: { ...H(), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`DB update ${table}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function dbDelete(table, query) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    method: "DELETE",
    headers: { ...H(), Prefer: "return=representation" },
  });
  if (!res.ok) throw new Error(`DB delete ${table}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// Deep-delete an event and its booking children (tickets, orders, reservations,
// payment attempts) via service-role REST. Safe to call on an event id.
export async function deleteEventDeep(eventId) {
  const tickets = await db(`tickets?select=id&event_id=eq.${eventId}`);
  const resvs = await db(`reservations?select=id&event_id=eq.${eventId}`);
  for (const t of tickets) {
    await db(`ticket_orders?select=id&ticket_id=eq.${t.id}`)
      .catch(() => [])
      .then((orders) => Promise.all(orders.map((o) => dbDelete("ticket_payment_attempts", `ticket_order_id=eq.${o.id}`).catch(() => null))));
    await dbDelete("ticket_orders", `ticket_id=eq.${t.id}`).catch(() => null);
  }
  for (const r of resvs) await dbDelete("reservation_payment_attempts", `reservation_id=eq.${r.id}`).catch(() => null);
  await dbDelete("tickets", `event_id=eq.${eventId}`).catch(() => null);
  await dbDelete("reservations", `event_id=eq.${eventId}`).catch(() => null);
  await dbDelete("events", `id=eq.${eventId}`).catch(() => null);
}

// ---- Authenticated user RPC (mimics the app's booking path) ----
export async function userRpc(fn, args, email = "agent-testing@email.com", password = "AgentTesting123") {
  const tok = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await tok.json();
  if (!tok.ok) throw new Error(`login ${email}: ${JSON.stringify(body).slice(0, 200)}`);
  const access = body.access_token;
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data, text: text.slice(0, 400) };
}

export function iso(daysFromNow = 30, hour = 20, minute = 0) {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function localInput(daysFromNow = 30, hour = 20, minute = 0) {
  // The admin form uses datetime-local in the browser's local tz; the server
  // converts with the configured CITY_TZ. Mirror lib/event-dates: build a
  // datetime-local string from a local tz offset (Europe/Belgrade = UTC+2 in
  // summer). We simply express an ISO instant in the city tz.
  const d = new Date(iso(daysFromNow, hour, minute));
  return d
    .toLocaleString("sv-SE", { timeZone: "Europe/Belgrade", hour12: false })
    .replace(" ", "T")
    .slice(0, 16);
}

export function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}