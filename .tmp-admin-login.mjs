// Signs into the NEYA dev instance and writes a Netscape cookie jar for curl.
import fs from "fs";
import { loadEnv } from "./.tmp-env.mjs";

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.argv[2] ?? "agent-testing@email.com";
const password = process.argv[3] ?? "AgentTesting123";
const jarPath = process.argv[4] ?? ".tmp-admin-cookies.txt";

const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: {
    apikey: anon,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password }),
});
const body = await res.json();
if (!res.ok || !body.access_token) {
  console.error("LOGIN FAILED", res.status, JSON.stringify(body).slice(0, 300));
  process.exit(1);
}
const ref = new URL(url).hostname.split(".")[0];
const cookie = JSON.stringify({
  access_token: body.access_token,
  refresh_token: body.refresh_token,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: "bearer",
});
const lines = [
  "# Netscape HTTP Cookie File",
  `localhost\tFALSE\t/\tFALSE\t2147483647\tsb-${ref}-auth-token\t${encodeURIComponent(cookie)}`,
  `127.0.0.1\tFALSE\t/\tFALSE\t2147483647\tsb-${ref}-auth-token\t${encodeURIComponent(cookie)}`,
];
fs.writeFileSync(jarPath, lines.join("\n") + "\n");
console.log(`OK user=${body.user?.email} ref=${ref} jar=${jarPath}`);