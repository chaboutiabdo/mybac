/**
 * Solves every paper ahead of time, so students open a cached AI solution
 * instantly instead of waiting up to two minutes on the free Gemini tier.
 *
 *   node scripts/prewarm-exam-solutions.mjs              everything still unsolved
 *   node scripts/prewarm-exam-solutions.mjs --limit 5    at most 5 papers this run
 *
 * It goes through gemini-chat like a student would, signed in as an admin
 * (admins have no daily ceiling), so the prompt, the checks and the cache are
 * exactly the ones students get. No service key. The database is the state:
 * a rerun picks up where the last one stopped.
 *
 * To do: papers with no solution for the current SOLVE_PROMPT_VERSION, plus
 * 'derived' solutions whose official correction has since been uploaded.
 * Papers with an official correction go first (cheaper and more accurate).
 *
 * Google's free tier is often saturated. A busy paper is retried after 30 s
 * and 60 s; after three busy papers in a row the run stops by itself. Every
 * solve spends the same free quota students use.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54421";
const LOCAL = URL.includes("127.0.0.1") || URL.includes("localhost");
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
if (!LOCAL && !(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.SUPABASE_ANON_KEY)) {
  console.error("refusing a non-local project without ADMIN_EMAIL, ADMIN_PASSWORD and SUPABASE_ANON_KEY:", URL);
  process.exit(1);
}
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@mybac.test";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "Test1234!";

const args = process.argv.slice(2);
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

// Read from the function itself so the two can never drift.
const here = path.dirname(fileURLToPath(import.meta.url));
const FN = fs.readFileSync(path.join(here, "..", "supabase", "functions", "gemini-chat", "index.ts"), "utf8");
const PROMPT_VERSION = Number(FN.match(/const SOLVE_PROMPT_VERSION = (\d+);/)?.[1]);
if (!PROMPT_VERSION) throw new Error("SOLVE_PROMPT_VERSION not found in gemini-chat/index.ts");

const WAITS_S = [30, 60];          // between the tries of one busy paper
const BETWEEN_PAPERS_S = 10;
const GIVE_UP_AFTER = 3;           // busy papers in a row
const BUSY = new Set([503, 504, 546]);
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

const client = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: signInError } = await client.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (signInError) throw new Error(`admin sign-in failed for ${EMAIL}: ${signInError.message}`);

const { data: exams, error: examsError } = await client.from("exams")
  .select("id, subject, stream, year, exam_url, solution_url");
if (examsError) throw examsError;
// Admins can read this table; students cannot (see attack-suite "AI exam solver").
const { data: solved, error: solvedError } = await client.from("exam_ai_solutions")
  .select("exam_id, source").eq("prompt_version", PROMPT_VERSION);
if (solvedError) throw solvedError;
const have = new Map(solved.map((s) => [s.exam_id, s.source]));

const todo = exams
  .filter((e) => e.exam_url || e.solution_url)
  .filter((e) => !have.has(e.id) || (have.get(e.id) === "derived" && e.solution_url))
  .sort((a, b) => Number(!!b.solution_url) - Number(!!a.solution_url) || b.year - a.year)
  .slice(0, LIMIT);

console.log(`${exams.length} papers, ${have.size} solved for prompt v${PROMPT_VERSION}, ${todo.length} to do this run`);

/** One request, exactly as the page makes it. Returns the HTTP status (0 = network/timeout). */
async function solveOnce(examId) {
  const { data } = await client.auth.getSession();   // refreshes an expired token
  try {
    const res = await fetch(`${URL}/functions/v1/gemini-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${data.session?.access_token}`,
      },
      body: JSON.stringify({ mode: "solve_exam", exam_id: examId }),
      signal: AbortSignal.timeout(170_000),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: { error: e.message } };
  }
}

const done = [];
const failed = [];
let busyStreak = 0;
let stopped = null;

for (const [i, exam] of todo.entries()) {
  const label = `${exam.subject}/${exam.stream}/${exam.year}`;
  let r;
  for (let attempt = 0; ; attempt++) {
    const t = Date.now();
    r = await solveOnce(exam.id);
    const secs = Math.round((Date.now() - t) / 1000);
    const detail = r.status === 200
      ? `${r.body.solution?.length} questions, ${r.body.source}${r.body.cached ? ", already cached" : ""}`
      : r.body.error ?? "";
    console.log(`[${i + 1}/${todo.length}] ${label}  ${r.status || "network"} in ${secs} s  ${detail}`);
    if (!(BUSY.has(r.status) || r.status === 0) || attempt >= WAITS_S.length) break;
    await sleep(WAITS_S[attempt]);
  }

  if (r.status === 200) {
    done.push(label);
    busyStreak = 0;
  } else if (r.status === 429 || r.status === 401 || r.status === 403) {
    stopped = `${r.status}: ${r.body.error} — is ${EMAIL} still an admin?`;
    break;
  } else {
    failed.push(`${label}: ${r.status || "network"} ${r.body.error ?? ""}`);
    if (BUSY.has(r.status) || r.status === 0) {
      if (++busyStreak >= GIVE_UP_AFTER) {
        stopped = `Google stayed busy for ${GIVE_UP_AFTER} papers in a row — rerun later`;
        break;
      }
    } else {
      busyStreak = 0;
    }
  }
  if (i < todo.length - 1) await sleep(BETWEEN_PAPERS_S);
}

console.log(`\nsolved ${done.length}, failed ${failed.length}, not reached ${todo.length - done.length - failed.length}`);
for (const f of failed) console.log(`  ✗ ${f}`);
if (stopped) console.log(`stopped: ${stopped}`);
process.exit(stopped && !stopped.startsWith("Google") ? 1 : 0);
