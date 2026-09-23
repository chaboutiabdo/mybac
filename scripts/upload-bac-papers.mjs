/**
 * Uploads the BAC past-paper archive (exam + official solution per subject,
 * stream and year) into the `documents` bucket and the `exams` table.
 * Local stack only — it refuses to run against anything that is not 127.0.0.1.
 *
 *   node scripts/upload-bac-papers.mjs --dry-run          what would happen, writes nothing
 *   node scripts/upload-bac-papers.mjs --only "Math/Mathématiques/2025"
 *   node scripts/upload-bac-papers.mjs                    everything, then --verify
 *   node scripts/upload-bac-papers.mjs --verify           reconcile disk, storage, DB, student read
 *   node scripts/upload-bac-papers.mjs --undo [--dry-run] remove every row and file it owns
 *
 * Expects BAC_DIR/<Subject>/<Stream>/<Year>/{Exam,Solution}.pdf, where Subject
 * and Stream are the exact `value`s from src/lib/bac.ts. Folders starting with
 * "_" (rejected files, audits) are ignored.
 *
 * One row per (subject, stream, year). A rerun finds its own rows and skips or
 * refreshes them; a seed placeholder for the same key (no file attached) is
 * taken over rather than duplicated. A row with somebody else's file is never
 * overwritten — the run stops and lists it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54421";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const BAC_DIR = process.env.BAC_DIR ?? "D:/BAC-Papers-2008-2026";
// the drive holding Docker's disk image — uploads land inside it
const DOCKER_DISK = process.env.DOCKER_DISK ?? "D:/";
const MIN_FREE = Number(process.env.MIN_FREE_GB ?? 3) * 1024 ** 3;
const BUCKET = "documents";
const PREFIX = "bac/";

if (!URL.includes("127.0.0.1") && !URL.includes("localhost")) {
  console.error("refusing to upload to a non-local project:", URL);
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1]?.normalize("NFC") : null;
const MODE = args.includes("--undo") ? "undo" : args.includes("--verify") ? "verify" : "upload";

const svc = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const bucket = svc.storage.from(BUCKET);

/* ---------------------------------------------------------------- vocabulary */

// Read the labels from src/lib/bac.ts at run time, so a renamed stream can
// never drift from what the app filters on (same approach as latex-repair.test.mjs).
const here = path.dirname(fileURLToPath(import.meta.url));
const BAC_TS = fs.readFileSync(path.join(here, "..", "src", "lib", "bac.ts"), "utf8");
const LABEL = new Map([...BAC_TS.matchAll(/value: "([^"]+)", label: "([^"]+)"/g)].map((m) => [m[1], m[2]]));

const slug = (s) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

/* ------------------------------------------------------------------ the tree */

function walk() {
  const combos = [];
  const dirs = (p) =>
    fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("_"));
  for (const s of dirs(BAC_DIR)) {
    const subject = s.name.normalize("NFC");
    if (!LABEL.has(subject)) fail(`unknown subject folder "${subject}" — not a value in src/lib/bac.ts`);
    for (const st of dirs(path.join(BAC_DIR, s.name))) {
      const stream = st.name.normalize("NFC");
      if (!LABEL.has(stream)) fail(`unknown stream folder "${stream}" — not a value in src/lib/bac.ts`);
      for (const y of dirs(path.join(BAC_DIR, s.name, st.name))) {
        const year = Number(y.name);
        if (!Number.isInteger(year) || year < 2008 || year > new Date().getFullYear())
          fail(`bad year folder "${y.name}" under ${subject}/${stream}`);
        const dir = path.join(BAC_DIR, s.name, st.name, y.name);
        const base = `${PREFIX}${slug(subject)}/${slug(stream)}/${year}`;
        const file = (name) => {
          const local = path.join(dir, `${name}.pdf`);
          if (!fs.existsSync(local)) fail(`missing ${name}.pdf in ${subject}/${stream}/${year}`);
          return { local, remote: `${base}/${name.toLowerCase()}.pdf`, size: fs.statSync(local).size };
        };
        combos.push({
          key: `${subject}/${stream}/${year}`,
          subject,
          stream,
          year,
          dir: base,
          exam: file("Exam"),
          solution: file("Solution"),
          title: `${LABEL.get(subject)} — بكالوريا ${year} — ${LABEL.get(stream)}`,
        });
      }
    }
  }
  return combos.sort((a, b) => a.key.localeCompare(b.key));
}

const isPdf = (file) => {
  const fd = fs.openSync(file, "r");
  const head = Buffer.alloc(5);
  fs.readSync(fd, head, 0, 5, 0);
  fs.closeSync(fd);
  return head.toString("latin1") === "%PDF-";
};

const freeBytes = () => {
  const s = fs.statfsSync(DOCKER_DISK);
  return s.bavail * s.bsize;
};

const gb = (n) => `${(n / 1024 ** 3).toFixed(2)} GB`;
const mb = (n) => `${(n / 1024 ** 2).toFixed(1)}MB`;

/* ---------------------------------------------------------------- preflight */

async function preflight(all) {
  const paths = all.flatMap((c) => [c.exam.remote, c.solution.remote]);
  if (new Set(paths).size !== paths.length) fail("two files map to the same storage path");
  const unsafe = paths.find((p) => !/^[a-z0-9/._-]+$/.test(p));
  if (unsafe) fail(`storage path is not plain ASCII: ${unsafe}`);

  const { data: b, error: be } = await svc.storage.getBucket(BUCKET);
  if (be) fail(`bucket "${BUCKET}" unreachable: ${be.message}`);
  if (b.public) fail(`bucket "${BUCKET}" is public — refusing to upload into it`);
  if (b.allowed_mime_types && !b.allowed_mime_types.includes("application/pdf"))
    fail(`bucket "${BUCKET}" does not accept application/pdf`);

  for (const c of all)
    for (const f of [c.exam, c.solution]) {
      if (!isPdf(f.local)) fail(`not a PDF: ${f.local}`);
      if (b.file_size_limit && f.size > b.file_size_limit) fail(`over the bucket limit: ${f.local} (${mb(f.size)})`);
    }

  const { data: rows, error } = await svc
    .from("exams")
    .select("id, title, subject, stream, year, exam_url, solution_url");
  if (error) fail(`exams table unreachable: ${error.message}`);

  const conflicts = [];
  for (const c of all) {
    const same = rows.filter((r) => r.subject === c.subject && r.stream === c.stream && r.year === c.year);
    if (same.length === 0) c.state = "NEW";
    else if (same.length > 1) conflicts.push(`${c.key}: ${same.length} rows already exist for this paper`);
    else if (same[0].exam_url === c.exam.remote) Object.assign(c, { state: "DONE", row: same[0] });
    else if (same[0].exam_url === null) Object.assign(c, { state: "ADOPT", row: same[0] });
    else conflicts.push(`${c.key}: row ${same[0].id} already has a different file (${same[0].exam_url})`);
  }
  if (conflicts.length) fail(`rows this script does not own:\n  ${conflicts.join("\n  ")}\nResolve them by hand first.`);
  return rows;
}

/* ------------------------------------------------------------------- upload */

async function upload(all) {
  const todo = ONLY ? all.filter((c) => c.key === ONLY) : all;
  if (ONLY && !todo.length) fail(`--only "${ONLY}" matches nothing`);

  const pending = todo.reduce((n, c) => n + c.exam.size + c.solution.size, 0);
  const free = freeBytes();
  console.log(`${todo.length} papers, up to ${mb(pending)} to upload, ${gb(free)} free on ${DOCKER_DISK}`);
  if (free - pending < MIN_FREE) fail(`not enough room: keep ${gb(MIN_FREE)} free on ${DOCKER_DISK}`);

  if (DRY) {
    const count = (s) => todo.filter((c) => c.state === s).length;
    for (const c of todo) console.log(`  ${c.state.padEnd(5)} ${c.key}`);
    console.log(`\ndry run: ${count("NEW")} new, ${count("ADOPT")} placeholders taken over, ${count("DONE")} already done`);
    return;
  }

  let i = 0;
  for (const c of todo) {
    i++;
    if (freeBytes() < MIN_FREE) fail(`stopped at ${c.key}: under ${gb(MIN_FREE)} free on ${DOCKER_DISK}. Rerun resumes.`);

    const { data: listed, error: le } = await bucket.list(c.dir);
    if (le) fail(`${c.key}: listing ${c.dir} failed: ${le.message}`);
    const remoteSize = (name) => listed?.find((o) => o.name === name)?.metadata?.size;

    const done = [];
    for (const f of [c.exam, c.solution]) {
      if (remoteSize(path.posix.basename(f.remote)) === f.size) {
        done.push(`${path.posix.basename(f.remote)} ${mb(f.size)} skip`);
        continue;
      }
      const { error } = await bucket.upload(f.remote, fs.readFileSync(f.local), {
        contentType: "application/pdf",
        upsert: true,
      });
      if (error) fail(`${c.key}: uploading ${f.remote} failed: ${error.message}`);
      done.push(`${path.posix.basename(f.remote)} ${mb(f.size)} up`);
    }

    // The row goes in last, so it never points at a file that isn't there.
    const fields = { title: c.title, exam_url: c.exam.remote, solution_url: c.solution.remote };
    let action;
    if (c.state === "NEW") {
      const { error } = await svc.from("exams").insert({
        ...fields,
        subject: c.subject,
        stream: c.stream,
        year: c.year,
        questions: 0,
        difficulty: null, // no honest per-paper signal; the cards hide the chip when it is null
      });
      if (error) fail(`${c.key}: insert failed: ${error.message}`);
      action = "row insert";
    } else if (c.state === "ADOPT") {
      const { error } = await svc
        .from("exams")
        .update({ ...fields, questions: 0, difficulty: null })
        .eq("id", c.row.id);
      if (error) fail(`${c.key}: taking over placeholder failed: ${error.message}`);
      action = "row adopted";
    } else if (c.row.title !== c.title || c.row.solution_url !== c.solution.remote) {
      const { error } = await svc.from("exams").update(fields).eq("id", c.row.id);
      if (error) fail(`${c.key}: refresh failed: ${error.message}`);
      action = "row refreshed";
    } else action = "row ok";

    console.log(`[${String(i).padStart(3)}/${todo.length}] ${c.key}  ${done.join(" · ")} · ${action} · ${gb(freeBytes())} free`);
  }
}

/* ------------------------------------------------------------ reconciliation */

async function listAll(prefix) {
  // storage lists one level at a time
  const out = [];
  const walkDir = async (dir) => {
    const { data, error } = await bucket.list(dir, { limit: 1000 });
    if (error) fail(`listing ${dir} failed: ${error.message}`);
    for (const o of data) {
      const p = `${dir}/${o.name}`;
      if (o.id === null) await walkDir(p); // a folder
      else out.push({ path: p, size: o.metadata?.size });
    }
  };
  await walkDir(prefix.replace(/\/$/, ""));
  return out;
}

async function verify(all) {
  let ok = true;
  const line = (label, pass, detail) => {
    console.log(`${pass ? "✓" : "✗"} ${label.padEnd(9)} ${detail}`);
    ok &&= pass;
  };

  const files = all.flatMap((c) => [c.exam, c.solution]);
  const bytes = files.reduce((n, f) => n + f.size, 0);
  line("source", true, `${all.length} papers, ${files.length} files, ${mb(bytes)}`);

  const objects = await listAll(PREFIX);
  const byPath = new Map(objects.map((o) => [o.path, o.size]));
  const missing = files.filter((f) => !byPath.has(f.remote)).length;
  const mismatch = files.filter((f) => byPath.has(f.remote) && byPath.get(f.remote) !== f.size).length;
  const wanted = new Set(files.map((f) => f.remote));
  const orphans = objects.filter((o) => !wanted.has(o.path)).length;
  line("storage", !missing && !mismatch && !orphans,
    `${objects.length} objects under ${PREFIX}  missing ${missing}  size-mismatch ${mismatch}  orphans ${orphans}`);

  const { data: rows, error } = await svc.from("exams").select("id, subject, stream, year, exam_url, solution_url, title");
  if (error) fail(`exams table unreachable: ${error.message}`);
  const ours = rows.filter((r) => r.exam_url?.startsWith(PREFIX));
  const keys = new Map();
  for (const r of rows) {
    const k = `${r.subject}/${r.stream}/${r.year}`;
    keys.set(k, (keys.get(k) ?? 0) + 1);
  }
  const dupes = [...keys.values()].filter((n) => n > 1).length;
  const wrong = all.filter((c) => {
    const r = ours.find((x) => x.subject === c.subject && x.stream === c.stream && x.year === c.year);
    return !r || r.exam_url !== c.exam.remote || r.solution_url !== c.solution.remote;
  }).length;
  const others = rows.length - ours.length;
  const junk = rows.filter((r) => r.title?.startsWith("sec-")).length;
  line("db", ours.length === all.length && !dupes && !wrong,
    `${ours.length} rows with ${PREFIX} files  duplicate keys ${dupes}  wrong paths ${wrong}  other rows ${others} (sec- test junk ${junk})`);

  // Read every file back the way a student does: signed in, through RLS.
  const student = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: se } = await student.auth.signInWithPassword({ email: "student@mybac.test", password: "Test1234!" });
  if (se) {
    line("student", false, `could not sign in as student@mybac.test: ${se.message}`);
  } else {
    let good = 0;
    for (const f of files) {
      const { data, error: ue } = await student.storage.from(BUCKET).createSignedUrl(f.remote, 60);
      if (ue) continue;
      const res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-4" } });
      const head = Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString("latin1");
      if (res.ok && head === "%PDF-") good++;
    }
    line("student", good === files.length, `${good}/${files.length} files open through a signed URL as a signed-in student`);
  }

  console.log(ok ? "\nall reconciled" : "\nNOT reconciled — see the ✗ lines");
  if (!ok) process.exitCode = 1;
}

/* --------------------------------------------------------------------- undo */

async function undo() {
  const { data: rows, error } = await svc.from("exams").select("id").like("exam_url", `${PREFIX}%`);
  if (error) fail(`exams table unreachable: ${error.message}`);
  const objects = await listAll(PREFIX);
  console.log(`would remove ${rows.length} rows and ${objects.length} files under ${PREFIX}`);
  if (DRY) return;

  const ids = rows.map((r) => r.id);
  if (ids.length) {
    // exam_activity_logs has no foreign key to exams, so it would keep orphans
    const { error: le } = await svc.from("exam_activity_logs").delete().in("exam_id", ids);
    if (le) fail(`removing activity logs failed: ${le.message}`);
    // exam_progress and exam_ai_solutions go with the rows (ON DELETE CASCADE)
    const { error: de } = await svc.from("exams").delete().in("id", ids);
    if (de) fail(`removing rows failed: ${de.message}`);
  }
  // rows first, files second: an interrupted undo never leaves a row without its file
  for (let i = 0; i < objects.length; i += 100) {
    const { error: re } = await bucket.remove(objects.slice(i, i + 100).map((o) => o.path));
    if (re) fail(`removing files failed: ${re.message}`);
  }
  console.log(`removed ${rows.length} rows and ${objects.length} files`);
}

/* --------------------------------------------------------------------- main */

if (MODE === "undo") {
  await undo();
} else {
  const all = walk();
  if (!ONLY && all.length !== 114) console.warn(`note: expected 114 papers, found ${all.length}`);
  await preflight(all);
  if (MODE === "upload") await upload(all);
  if (MODE === "verify" || (MODE === "upload" && !DRY && !ONLY)) await verify(all);
}
