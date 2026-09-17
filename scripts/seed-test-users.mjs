/**
 * Seeds 55 test users across all roles, for adversarial security testing.
 *
 *   sec-student-01..40   student  (free)
 *   sec-premium-01..10   premium
 *   sec-admin-01..05     admin
 *
 * All share the password below. Local stack only — it refuses to run against
 * anything that is not 127.0.0.1.
 *
 *   node scripts/seed-test-users.mjs
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54421";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const PASSWORD = "SecTest1234!";
export const DOMAIN = "sectest.local";

if (!URL.includes("127.0.0.1") && !URL.includes("localhost")) {
  console.error("refusing to seed a non-local project:", URL);
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const COHORT = [
  ...Array.from({ length: 40 }, (_, i) => ({
    email: `sec-student-${String(i + 1).padStart(2, "0")}@${DOMAIN}`,
    role: "student",
    name: `Student ${i + 1}`,
    stream: ["Sciences Expérimentales", "Mathématiques", "Technique Mathématiques"][i % 3],
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    email: `sec-premium-${String(i + 1).padStart(2, "0")}@${DOMAIN}`,
    role: "premium",
    name: `Premium ${i + 1}`,
    stream: "Sciences Expérimentales",
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    email: `sec-admin-${String(i + 1).padStart(2, "0")}@${DOMAIN}`,
    role: "admin",
    name: `Admin ${i + 1}`,
    stream: null,
  })),
];

async function main() {
  console.log(`seeding ${COHORT.length} users against ${URL}`);

  // wipe any previous run so the script is idempotent
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const stale = (existing?.users ?? []).filter((u) => u.email?.endsWith(`@${DOMAIN}`));
  for (const u of stale) await admin.auth.admin.deleteUser(u.id);
  if (stale.length) console.log(`  removed ${stale.length} users from a previous run`);

  let ok = 0;
  const created = [];

  for (const spec of COHORT) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: spec.name },
    });
    if (error) {
      console.error(`  FAIL ${spec.email}: ${error.message}`);
      continue;
    }

    // the handle_new_user trigger creates the profile row; set role + stream
    const { error: upErr } = await admin
      .from("profiles")
      .update({ role: spec.role, stream: spec.stream, name: spec.name })
      .eq("user_id", data.user.id);
    if (upErr) console.error(`  role FAIL ${spec.email}: ${upErr.message}`);

    created.push({ ...spec, id: data.user.id });
    ok++;
  }

  const counts = created.reduce((a, u) => ({ ...a, [u.role]: (a[u.role] ?? 0) + 1 }), {});
  console.log(`seeded ${ok}/${COHORT.length}:`, counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
