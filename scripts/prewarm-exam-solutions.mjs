/**
 * Solves every paper ahead of time, so students open a cached AI solution
 * instantly instead of waiting up to two minutes on the free Gemini tier, and
 * copies each solved question's wording from the paper, so the solution page
 * can show the question above its steps.
 *
 *   node scripts/prewarm-exam-solutions.mjs              everything still to do
 *   node scripts/prewarm-exam-solutions.mjs --limit 5    at most 5 papers per phase
 *
 * It goes through gemini-chat like a student would, signed in as an admin
 * (admins have no daily ceiling), so the prompt, the checks and the cache are
 * exactly the ones students get. No service key. The database is the state:
 * a rerun picks up where the last one stopped.
 *
 * Phase 1, solve: papers with no solution for the current SOLVE_PROMPT_VERSION,
 * plus 'derived' solutions whose official correction has since been uploaded.
 * Papers with an official correction go first (cheaper and more accurate).
 * Phase 2, questions (mode extract_questions, admin only): solved papers whose
 * questions have no question_text yet. It adds text, never changes a solution.
 *
 * Google's free tier is often saturated. A busy paper is retried after 30 s
 * and 60 s; after three busy papers in a row the run stops by itself. Every
 * call spends the same free quota students use — if this key shares a Google
 * project with the live site's key, run it when students are asleep.
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

/** Admins can read this table; students cannot (see attack-suite "AI exam solver"). */
async function solutions() {
  const { data, error } = await client.from("exam_ai_solutions")
    .select("exam_id, source, solution").eq("prompt_version", PROMPT_VERSION);
  if (error) throw error;
  return new Map(data.map((s) => [s.exam_id, s]));
}

/** One request, exactly as the page makes it. Returns the HTTP status (0 = network/timeout). */
async function callOnce(mode, examId) {
  const { data } = await client.auth.getSession();   // refreshes an expired token
  try {
    const res = await fetch(`${URL}/functions/v1/gemini-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${data.session?.access_token}`,
      },
      body: JSON.stringify({ mode, exam_id: examId }),
      signal: AbortSignal.timeout(170_000),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: { error: e.message } };
  }
}

/** Runs one mode over a list of papers with the busy backoff. Returns why it stopped early, if it did. */
async function phase(name, mode, todo, describe) {
  console.log(`\n${name}: ${todo.length} to do this run`);
  const done = [];
  const failed = [];
  let busyStreak = 0;
  let stopped = null;

  for (const [i, exam] of todo.entries()) {
    const label = `${exam.subject}/${exam.stream}/${exam.year}`;
    let r;
    for (let attempt = 0; ; attempt++) {
      const t = Date.now();
      r = await callOnce(mode, exam.id);
      const secs = Math.round((Date.now() - t) / 1000);
      const detail = r.status === 200 ? describe(r.body) : r.body.error ?? "";
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

  console.log(`${name}: done ${done.length}, failed ${failed.length}, not reached ${todo.length - done.length - failed.length}`);
  for (const f of failed) console.log(`  ✗ ${f}`);
  if (stopped) console.log(`stopped: ${stopped}`);
  return stopped;
}

let have = await solutions();
console.log(`${exams.length} papers, ${have.size} solved for prompt v${PROMPT_VERSION}`);

const toSolve = exams
  .filter((e) => e.exam_url || e.solution_url)
  .filter((e) => !have.has(e.id) || (have.get(e.id).source === "derived" && e.solution_url))
  .sort((a, b) => Number(!!b.solution_url) - Number(!!a.solution_url) || b.year - a.year)
  .slice(0, LIMIT);
let stopped = await phase("solve", "solve_exam", toSolve,
  (b) => `${b.solution?.length} questions, ${b.source}${b.cached ? ", already cached" : ""}`);

if (!stopped) {
  have = await solutions();
  const lacksText = (s) => !Array.isArray(s?.solution) || s.solution.some((q) => !q.question_text);
  const toCopy = exams
    .filter((e) => e.exam_url && have.has(e.id) && lacksText(have.get(e.id)))
    .sort((a, b) => b.year - a.year)
    .slice(0, LIMIT);
  stopped = await phase("questions", "extract_questions", toCopy,
    (b) => `${b.questions} question texts${b.cached ? ", already there" : ""}`);
}

process.exit(stopped && !stopped.startsWith("Google") ? 1 : 0);
