/**
 * Saves the PostgREST OpenAPI spec as a signed-in student sees it, for
 * stackhawk.yml. PostgREST serves a per-role spec: fetched anonymously it
 * hides every student RPC, so HawkScan would never attack them.
 *
 *   npm run scan:api
 */
import { writeFileSync } from "node:fs";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54421";

if (!URL.includes("127.0.0.1") && !URL.includes("localhost")) {
  console.error("refusing to scan a non-local project:", URL);
  process.exit(1);
}

const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: process.env.SCAN_USERNAME ?? "student@mybac.test",
    password: process.env.SCAN_PASSWORD ?? "Test1234!",
  }),
});
const { access_token } = await login.json();
if (!access_token) throw new Error(`student login failed: HTTP ${login.status}`);

const res = await fetch(`${URL}/rest/v1/`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
const spec = await res.json();
writeFileSync("stackhawk-openapi.json", JSON.stringify(spec));
console.log(`stackhawk-openapi.json: ${Object.keys(spec.paths).length} paths`);
