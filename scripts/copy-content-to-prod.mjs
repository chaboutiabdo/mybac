/**
 * Copies the real content from the LOCAL stack to the hosted (production)
 * project: the BAC papers (exams rows + their PDFs), the cached AI solutions
 * and the shared flashcard deck. Nothing else locally is real content — the
 * quizzes, videos, tips and users are seed placeholders or test data.
 *
 *   node --env-file=.env.prod-secrets scripts/copy-content-to-prod.mjs           dry run
 *   node --env-file=.env.prod-secrets scripts/copy-content-to-prod.mjs --apply   write
 *
 * .env.prod-secrets (gitignored by `.env.*`, never read by Vite) holds
 * PROD_SUPABASE_URL and PROD_SERVICE_ROLE_KEY. Keys are never printed.
 *
 * Exams keep their local ids, so the AI solutions (FK exam_id) link up without
 * regenerating them — that would be 114 Gemini solves. Every write is an
 * upsert and an existing PDF is skipped, so a rerun resumes safely.
 */
import { createClient } from "@supabase/supabase-js";

const LOCAL_URL = process.env.LOCAL_SUPABASE_URL ?? "http://127.0.0.1:54421";
const LOCAL_KEY =
  process.env.LOCAL_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const PROD_URL = process.env.PROD_SUPABASE_URL;
const PROD_KEY = process.env.PROD_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");
const BUCKET = "documents";

const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

if (!PROD_URL || !PROD_KEY) fail("PROD_SUPABASE_URL and PROD_SERVICE_ROLE_KEY must be set (use --env-file=.env.prod-secrets)");
if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(PROD_URL)) fail(`PROD_SUPABASE_URL is not a hosted project URL: ${PROD_URL}`);
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(LOCAL_URL)) fail(`the source must be the local stack, got ${LOCAL_URL}`);

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const local = createClient(LOCAL_URL, LOCAL_KEY, opts);
const prod = createClient(PROD_URL, PROD_KEY, opts);

/** Every row of a small table, asserting the API row cap didn't cut it short. */
async function all(db, table, columns) {
  const { data, count, error } = await db.from(table).select(columns, { count: "exact" });
  if (error) fail(`${table}: ${error.message}`);
  if (data.length !== count) fail(`${table}: fetched ${data.length} of ${count} rows (row cap?)`);
  return data;
}

async function upsert(table, rows, onConflict, size) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await prod.from(table).upsert(rows.slice(i, i + size), { onConflict });
    if (error) fail(`${table} upsert: ${error.message}`);
  }
}

/* ---------------------------------------------------------------- read */

const exams = await all(local, "exams", "id, title, subject, stream, year, exam_url, solution_url, difficulty, questions, created_at");
const solutions = await all(local, "exam_ai_solutions", "exam_id, solution, source, model, prompt_version, created_at");
const cards = await all(local, "flashcards", "id, subject, chapter, front, back, concept, source, created_at");

if (!exams.length) fail("no local exams — is the local stack running?");
const paths = [...new Set(exams.flatMap((e) => [e.exam_url, e.solution_url]).filter(Boolean))];
const odd = paths.find((p) => !p.startsWith("bac/"));
if (odd) fail(`unexpected file path ${odd} — only bac/ papers are copied`);

const prodExams = await all(prod, "exams", "id");
const localIds = new Set(exams.map((e) => e.id));
const foreign = prodExams.filter((e) => !localIds.has(e.id));
if (foreign.length) fail(`production already has ${foreign.length} exam(s) that aren't local (uploaded by hand?): ${foreign.slice(0, 5).map((e) => e.id).join(", ")}`);

console.log(`local: ${exams.length} exams, ${solutions.length} AI solutions, ${cards.length} flashcards, ${paths.length} PDFs`);
console.log(`target: ${PROD_URL} (${prodExams.length} exams there now)`);
if (!APPLY) {
  console.log("\ndry run — nothing written. Rerun with --apply.");
  process.exit(0);
}

/* ---------------------------------------------------------------- write, FK order */

await upsert("exams", exams.map((e) => ({ ...e, downloads: 0 })), "id", 50);
console.log(`✓ exams: ${exams.length}`);
await upsert("exam_ai_solutions", solutions, "exam_id,prompt_version", 20);
console.log(`✓ exam_ai_solutions: ${solutions.length}`);
await upsert("flashcards", cards, "id", 50);
console.log(`✓ flashcards: ${cards.length}`);

let uploaded = 0, skipped = 0, bytes = 0;
for (const [i, p] of paths.entries()) {
  const { data: blob, error: dlError } = await local.storage.from(BUCKET).download(p);
  if (dlError || !blob) fail(`download ${p}: ${dlError?.message ?? "empty"}`);
  const body = new Uint8Array(await blob.arrayBuffer());
  const { error } = await prod.storage.from(BUCKET).upload(p, body, { contentType: "application/pdf", upsert: false });
  if (!error) {
    uploaded++;
    bytes += body.byteLength;
  } else if (/exists|duplicate/i.test(error.message)) {
    skipped++;
  } else {
    fail(`upload ${p}: ${error.message}`);
  }
  if ((i + 1) % 20 === 0 || i === paths.length - 1) console.log(`  [${i + 1}/${paths.length}] uploaded ${uploaded}, skipped ${skipped}`);
}
console.log(`✓ PDFs: ${uploaded} uploaded (${(bytes / 1048576).toFixed(0)} MB), ${skipped} already there`);

/* ---------------------------------------------------------------- verify */

const after = {
  exams: (await all(prod, "exams", "id")).length,
  exam_ai_solutions: (await all(prod, "exam_ai_solutions", "exam_id")).length,
  flashcards: (await all(prod, "flashcards", "id")).length,
};
const want = { exams: exams.length, exam_ai_solutions: solutions.length, flashcards: cards.length };
for (const t of Object.keys(want)) {
  if (after[t] !== want[t]) fail(`${t}: production has ${after[t]}, expected ${want[t]}`);
}
console.log(`✓ production counts match: ${JSON.stringify(after)}`);
