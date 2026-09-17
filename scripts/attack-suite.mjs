/**
 * Adversarial security suite — runs real attacks against the local stack as
 * real signed-in users.
 *
 * Every test is written from the attacker's point of view: it PASSES when the
 * attack is blocked. A failure here is a live vulnerability.
 *
 *   node scripts/seed-test-users.mjs      # 55 users first
 *   node --test scripts/attack-suite.mjs
 */
import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54421";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const PASSWORD = "SecTest1234!";
const DOMAIN = "sectest.local";

const anonClient = () => createClient(URL, ANON, { auth: { persistSession: false } });
const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });

async function signIn(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return { client: c, user: data.user };
}

/** All 24 public tables, for the blanket anon / cross-user sweeps. */
const TABLES = [
  "admin_advice", "advice_tips", "ai_learning_conversations", "alumni",
  "alumni_advice", "alumni_files", "alumni_resources", "bookings",
  "exam_activity_logs", "exam_progress", "exams", "points_transactions",
  "profiles", "questions_import", "quiz_attempts", "quiz_question_results",
  "quizzes", "school_students", "schools", "student_questions_log",
  "support_requests", "video_activity_logs", "video_progress", "videos",
];

let A, B, PREM, ADMIN;      // attacker, victim, premium, admin
let studentEmails = [];

before(async () => {
  studentEmails = Array.from({ length: 40 }, (_, i) =>
    `sec-student-${String(i + 1).padStart(2, "0")}@${DOMAIN}`);
  A = await signIn(studentEmails[0]);
  B = await signIn(studentEmails[1]);
  PREM = await signIn(`sec-premium-01@${DOMAIN}`);
  ADMIN = await signIn(`sec-admin-01@${DOMAIN}`);
});

/* ═══════════════════════════════════════════ 1. privilege escalation ══ */
describe("privilege escalation", () => {
  test("student cannot promote self to admin", async () => {
    await A.client.from("profiles").update({ role: "admin" }).eq("user_id", A.user.id);
    const { data } = await A.client.from("profiles").select("role").eq("user_id", A.user.id).single();
    assert.equal(data?.role, "student", "ROLE ESCALATION: student became admin");
  });

  test("student cannot promote self to premium", async () => {
    await A.client.from("profiles").update({ role: "premium" }).eq("user_id", A.user.id);
    const { data } = await A.client.from("profiles").select("role").eq("user_id", A.user.id).single();
    assert.equal(data?.role, "student");
  });

  test("student cannot set subscription_status directly", async () => {
    await A.client.from("profiles").update({ subscription_status: "premium" }).eq("user_id", A.user.id);
    const { data } = await A.client.from("profiles")
      .select("subscription_status").eq("user_id", A.user.id).single();
    assert.notEqual(data?.subscription_status, "premium",
      "SUBSCRIPTION BYPASS: student self-granted premium");
  });

  test("student cannot inflate own total_score", async () => {
    await A.client.from("profiles").update({ total_score: 999999 }).eq("user_id", A.user.id);
    const { data } = await A.client.from("profiles")
      .select("total_score").eq("user_id", A.user.id).single();
    assert.notEqual(data?.total_score, 999999, "SCORE FORGERY via profiles.total_score");
  });

  test("whole-row update does not smuggle a role change", async () => {
    // several admin screens send the whole row back; make sure a student doing
    // the same cannot carry role along with a legitimate field
    await A.client.from("profiles")
      .update({ name: "Renamed", role: "admin", total_score: 5000 })
      .eq("user_id", A.user.id);
    const { data } = await A.client.from("profiles")
      .select("role, total_score, name").eq("user_id", A.user.id).single();
    assert.equal(data?.role, "student", "ROLE ESCALATION via whole-row update");
    assert.notEqual(data?.total_score, 5000);
  });

  test("student cannot promote another user", async () => {
    await A.client.from("profiles").update({ role: "admin" }).eq("user_id", B.user.id);
    const { data } = await svc.from("profiles").select("role").eq("user_id", B.user.id).single();
    assert.equal(data?.role, "student", "CROSS-USER ROLE ESCALATION");
  });

  test("premium cannot escalate to admin", async () => {
    await PREM.client.from("profiles").update({ role: "admin" }).eq("user_id", PREM.user.id);
    const { data } = await PREM.client.from("profiles")
      .select("role").eq("user_id", PREM.user.id).single();
    assert.equal(data?.role, "premium");
  });

  test("student cannot insert a second profile row for themselves as admin", async () => {
    const { error } = await A.client.from("profiles").insert({
      user_id: A.user.id, name: "Shadow", email: `shadow@${DOMAIN}`, role: "admin",
    });
    const { data } = await svc.from("profiles").select("role").eq("user_id", A.user.id);
    const roles = (data ?? []).map((r) => r.role);
    assert.ok(!roles.includes("admin"), "ROLE ESCALATION via duplicate profile insert");
    assert.ok(error || roles.length === 1);
  });
});

/* ════════════════════════════════════════════════ 2. points forgery ══ */
describe("points and score forgery", () => {
  test("RPC rejects awarding points to another user", async () => {
    const { error } = await A.client.rpc("record_points_transaction", {
      p_student_id: B.user.id, p_points: 100000, p_source_type: "quiz",
      p_source_description: "attack",
    });
    assert.ok(error, "POINTS FORGERY: awarded points to another user");
  });

  test("RPC rejects a huge self-award... or at least records it honestly", async () => {
    const before = await svc.from("profiles").select("total_score").eq("user_id", A.user.id).single();
    await A.client.rpc("record_points_transaction", {
      p_student_id: A.user.id, p_points: 1000000, p_source_type: "quiz",
      p_source_description: "self-inflate",
    });
    const after = await svc.from("profiles").select("total_score").eq("user_id", A.user.id).single();
    const gain = (after.data?.total_score ?? 0) - (before.data?.total_score ?? 0);
    assert.ok(gain < 1000000, `SCORE FORGERY: self-awarded ${gain} points via RPC`);
  });

  test("direct INSERT into points_transactions for another user is blocked", async () => {
    const { error } = await A.client.from("points_transactions").insert({
      student_id: B.user.id, points: 50000, source_type: "quiz",
      source_description: "cross-user insert",
    });
    assert.ok(error, "POINTS FORGERY: direct cross-user insert allowed");
  });

  test("direct INSERT into own points_transactions cannot mint points", async () => {
    const before = await svc.from("profiles").select("total_score").eq("user_id", A.user.id).single();
    await A.client.from("points_transactions").insert({
      student_id: A.user.id, points: 99999, source_type: "quiz",
      source_description: "self mint",
    });
    const after = await svc.from("profiles").select("total_score").eq("user_id", A.user.id).single();
    const gain = (after.data?.total_score ?? 0) - (before.data?.total_score ?? 0);
    assert.ok(gain < 99999, `SCORE FORGERY: minted ${gain} points by direct insert`);
  });

  test("student cannot UPDATE an existing points_transactions row", async () => {
    const { data: row } = await svc.from("points_transactions")
      .insert({ student_id: A.user.id, points: 5, source_type: "quiz", source_description: "seed" })
      .select().single();
    if (!row) return;
    await A.client.from("points_transactions").update({ points: 99999 }).eq("id", row.id);
    const { data } = await svc.from("points_transactions").select("points").eq("id", row.id).single();
    assert.equal(data?.points, 5, "POINTS FORGERY: student edited a points row");
  });

  test("student cannot DELETE another user's points", async () => {
    const { data: row } = await svc.from("points_transactions")
      .insert({ student_id: B.user.id, points: 7, source_type: "quiz", source_description: "victim" })
      .select().single();
    if (!row) return;
    await A.client.from("points_transactions").delete().eq("id", row.id);
    const { data } = await svc.from("points_transactions").select("id").eq("id", row.id);
    assert.equal(data?.length, 1, "TAMPERING: deleted another user's points row");
  });
});

/* ══════════════════════════════════════════════════════════ 3. IDOR ══ */
describe("IDOR — cross-user reads and writes", () => {
  test("anon cannot read the student roster", async () => {
    const c = anonClient();
    const { data } = await c.from("profiles").select("email, name, user_id");
    assert.equal(data?.length ?? 0, 0, "PII LEAK: roster readable with the anon key");
  });

  test("student cannot read other students' emails", async () => {
    const { data } = await A.client.from("profiles").select("email").neq("user_id", A.user.id);
    assert.equal(data?.length ?? 0, 0, `PII LEAK: student read ${data?.length} other emails`);
  });

  test("leaderboard exposes no email or user_id", async () => {
    const { data } = await A.client.from("leaderboard").select("*").limit(5);
    assert.ok(data && data.length > 0, "leaderboard returned nothing");
    for (const row of data) {
      assert.ok(!("email" in row), "PII LEAK: leaderboard exposes email");
      assert.ok(!("user_id" in row), "leaderboard exposes user_id");
    }
  });

  test("student cannot read another student's quiz attempts", async () => {
    await svc.from("quiz_attempts").insert({ student_id: B.user.id, score: 42 });
    const { data } = await A.client.from("quiz_attempts").select("*").eq("student_id", B.user.id);
    assert.equal(data?.length ?? 0, 0, "IDOR: read another student's quiz attempts");
  });

  test("student cannot UPDATE another student's quiz attempt", async () => {
    const { data: row } = await svc.from("quiz_attempts")
      .insert({ student_id: B.user.id, score: 10 }).select().single();
    if (!row) return;
    await A.client.from("quiz_attempts").update({ score: 999 }).eq("id", row.id);
    const { data } = await svc.from("quiz_attempts").select("score").eq("id", row.id).single();
    assert.equal(data?.score, 10, "IDOR: edited another student's score");
  });

  test("student cannot read another student's question results", async () => {
    const { data } = await A.client.from("quiz_question_results").select("*").eq("student_id", B.user.id);
    assert.equal(data?.length ?? 0, 0, "IDOR: read another student's answers");
  });

  test("student cannot read another student's points ledger", async () => {
    const { data } = await A.client.from("points_transactions").select("*").eq("student_id", B.user.id);
    assert.equal(data?.length ?? 0, 0, "IDOR: read another student's points");
  });

  test("student cannot read support_requests (contains PII + phone)", async () => {
    await svc.from("support_requests").insert({
      name: "Victim", email: `victim@${DOMAIN}`, phone: "+213555000000",
      message: "receipt", type: "premium_subscription",
    });
    const { data } = await A.client.from("support_requests").select("*");
    assert.equal(data?.length ?? 0, 0, "PII LEAK: support requests readable by students");
  });

  test("student cannot read other users' AI conversations", async () => {
    const { data } = await A.client.from("ai_learning_conversations")
      .select("*").neq("student_id", A.user.id);
    assert.equal(data?.length ?? 0, 0, "IDOR: read another student's AI conversations");
  });

  test("student cannot write another user's video_progress", async () => {
    const { data: vid } = await svc.from("videos").select("id").limit(1).single();
    if (!vid) return;
    const { error } = await A.client.from("video_progress")
      .insert({ student_id: B.user.id, video_id: vid.id, watched: true });
    assert.ok(error, "IDOR: wrote another user's video progress");
  });

  test("student cannot write another user's exam_progress", async () => {
    const { data: ex } = await svc.from("exams").select("id").limit(1).single();
    if (!ex) return;
    const { error } = await A.client.from("exam_progress")
      .insert({ student_id: B.user.id, exam_id: ex.id, viewed_exam: true });
    assert.ok(error, "IDOR: wrote another user's exam progress");
  });
});

/* ════════════════════════════════════════ 4. admin-only write surface ══ */
describe("admin-only tables are not student-writable", () => {
  const adminTables = [
    ["exams", { title: "hax", subject: "Math", stream: "S", year: 2025 }],
    ["videos", { title: "hax", subject: "Math", type: "youtube", url: "http://x" }],
    ["quizzes", { subject: "Math", type: "daily", date: "2026-01-01", questions: [], max_score: 100 }],
    ["schools", { name: "hax", city: "Algiers" }],
    ["advice_tips", { title: "hax", content: "hax", is_public: true }],
    ["admin_advice", { title: "hax", content: "hax", is_pinned: true }],
    ["alumni", { name: "hax", bac_score: 20 }],
  ];

  for (const [table, row] of adminTables) {
    test(`student cannot INSERT into ${table}`, async () => {
      const { error } = await A.client.from(table).insert(row);
      assert.ok(error, `PRIVILEGE: student inserted into ${table}`);
    });

    test(`student cannot DELETE from ${table}`, async () => {
      const { data: existing } = await svc.from(table).select("id").limit(1);
      if (!existing?.length) return;
      await A.client.from(table).delete().eq("id", existing[0].id);
      const { data } = await svc.from(table).select("id").eq("id", existing[0].id);
      assert.equal(data?.length, 1, `PRIVILEGE: student deleted from ${table}`);
    });
  }
});

/* ═══════════════════════════════════════════ 5. anon blanket sweep ══ */
describe("anonymous access sweep", () => {
  for (const table of TABLES) {
    test(`anon SELECT on ${table}`, async () => {
      const c = anonClient();
      const { data } = await c.from(table).select("*").limit(3);
      const n = data?.length ?? 0;
      // As of 20260917000000 no table is readable with only the anon key.
      // `quizzes` is the one that mattered: its `questions` jsonb carries the
      // `correct` index, so this was the whole answer key, unauthenticated.
      assert.equal(n, 0, `ANON READ: ${table} exposed ${n} rows to the anon key`);
    });
  }

  test("anon cannot INSERT into profiles", async () => {
    const c = anonClient();
    const { error } = await c.from("profiles")
      .insert({ user_id: crypto.randomUUID(), name: "anon", email: `a@${DOMAIN}`, role: "admin" });
    assert.ok(error, "ANON WRITE: profiles insertable anonymously");
  });

  test("anon cannot call the points RPC", async () => {
    const c = anonClient();
    const { error } = await c.rpc("record_points_transaction", {
      p_student_id: A.user.id, p_points: 999, p_source_type: "quiz",
      p_source_description: "anon",
    });
    assert.ok(error, "ANON RPC: points RPC callable without auth");
  });
});

/* ═══════════════════════════════════════════ 6. answer-key exposure ══ */
describe("quiz answer key", () => {
  test("the answer key is not readable WITHOUT a session", async () => {
    const c = anonClient();
    const { data } = await c.from("quizzes").select("questions").limit(1);
    assert.equal(data?.length ?? 0, 0,
      "ANSWER KEY LEAK: quizzes readable with only the publishable key");
  });

  test("a signed-in student cannot read the answer key either", async () => {
    // quizzes is admin-only now; students read quizzes_public, which strips
    // `correct` from every question.
    const { data: base } = await A.client.from("quizzes").select("questions").limit(1);
    assert.equal(base?.length ?? 0, 0, "ANSWER KEY LEAK: students can read quizzes");

    const { data: pub } = await A.client.from("quizzes_public").select("questions").limit(1);
    assert.ok((pub?.length ?? 0) > 0, "quizzes_public returned nothing to a student");
    const first = Array.isArray(pub[0].questions) ? pub[0].questions[0] : null;
    assert.ok(first && !("correct" in first), "ANSWER KEY LEAK: quizzes_public exposes `correct`");
  });

  test("student cannot edit a quiz's questions", async () => {
    const { data: quiz } = await svc.from("quizzes").select("id").limit(1).single();
    if (!quiz) return;
    await A.client.from("quizzes").update({ max_score: 1 }).eq("id", quiz.id);
    const { data } = await svc.from("quizzes").select("max_score").eq("id", quiz.id).single();
    assert.notEqual(data?.max_score, 1, "TAMPERING: student edited a quiz");
  });
});

/* ══════════════════════════════════════════════ 7. premium gating ══ */
describe("premium gating is enforced server-side", () => {
  test("free student cannot read premium video file paths", async () => {
    await svc.from("videos").insert({
      title: "PREMIUM SEC TEST", subject: "Math", type: "premium",
      file_path: "premium/secret.mp4", url: null,
    });
    const { data } = await A.client.from("videos")
      .select("title, file_path").eq("title", "PREMIUM SEC TEST");
    assert.equal(data?.length ?? 0, 0,
      "PREMIUM BYPASS: free student can read premium video rows");
  });

  test("premium user CAN read premium videos", async () => {
    const { data } = await PREM.client.from("videos")
      .select("title").eq("title", "PREMIUM SEC TEST");
    assert.ok((data?.length ?? 0) > 0, "premium user is wrongly denied premium content");
  });

  test("gemini-chat rejects an unauthenticated call", async () => {
    const res = await fetch(`${URL}/functions/v1/gemini-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: JSON.stringify({ question: "hi", subject: "Math" }),
    });
    assert.ok(res.status === 401 || res.status === 403,
      `AI ABUSE: unauthenticated call returned ${res.status}`);
  });

  test("gemini-chat rejects a free student", async () => {
    const { data: sess } = await A.client.auth.getSession();
    const res = await fetch(`${URL}/functions/v1/gemini-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON,
        Authorization: `Bearer ${sess.session?.access_token}`,
      },
      body: JSON.stringify({ question: "hi", subject: "Math" }),
    });
    assert.ok(res.status === 401 || res.status === 403,
      `AI ABUSE: free student billed the Gemini key (${res.status})`);
  });
});

/* ═══════════════════════════════════════════════════ 8. storage ══ */
describe("storage buckets", () => {
  test("private documents bucket is not anonymously listable", async () => {
    const c = anonClient();
    const { data, error } = await c.storage.from("documents").list();
    assert.ok(error || (data?.length ?? 0) === 0,
      "STORAGE LEAK: documents bucket listable anonymously");
  });

  test("student cannot upload into the documents bucket", async () => {
    const { error } = await A.client.storage
      .from("documents")
      .upload(`attack-${Date.now()}.txt`, new Blob(["x"]));
    assert.ok(error, "STORAGE: student can write to the documents bucket");
  });
});

/* ═══════════════════════════════════════ 9. enumeration at scale ══ */
describe("enumeration across the whole cohort", () => {
  test("no student can see any other profile row", async () => {
    // sample 10 of the 40 students; each should see exactly its own row
    const sample = studentEmails.slice(0, 10);
    for (const email of sample) {
      const s = await signIn(email);
      const { data } = await s.client.from("profiles").select("user_id");
      assert.equal(data?.length ?? 0, 1,
        `PII LEAK: ${email} can see ${data?.length} profile rows`);
      assert.equal(data?.[0].user_id, s.user.id);
    }
  });

  test("admins can see the full roster (expected)", async () => {
    const { data } = await ADMIN.client.from("profiles").select("user_id");
    assert.ok((data?.length ?? 0) >= 55,
      `admin sees only ${data?.length} rows — admin read is broken`);
  });
});

/* ═════════════════════════════ 10. findings from the code audit ══ */
describe("audit findings — regression tests", () => {
  test("anon cannot call calculate_user_score on any user", async () => {
    // was: SECURITY DEFINER with default EXECUTE TO PUBLIC, so an anonymous
    // POST rewrote any user's total_score (HTTP 200)
    const c = anonClient();
    const { error } = await c.rpc("calculate_user_score", { user_id_param: B.user.id });
    assert.ok(error, "SCORE FORGERY: calculate_user_score callable anonymously");
  });

  test("anon cannot call the score-recalculation helpers", async () => {
    const c = anonClient();
    for (const fn of ["update_user_score", "recalculate_all_user_scores"]) {
      const { error } = await c.rpc(fn, {});
      assert.ok(error, `SCORE FORGERY: ${fn} callable anonymously`);
    }
  });

  test("points amount is derived server-side, not taken from the caller", async () => {
    const before = await svc.from("profiles").select("total_score").eq("user_id", A.user.id).single();
    await A.client.rpc("record_points_transaction", {
      p_student_id: A.user.id, p_points: 1_000_000, p_source_type: "quiz",
      p_quiz_type: "daily", p_source_description: "mint attempt",
    });
    const after = await svc.from("profiles").select("total_score").eq("user_id", A.user.id).single();
    const gain = (after.data?.total_score ?? 0) - (before.data?.total_score ?? 0);
    assert.equal(gain, 25, `POINTS FORGERY: asked for 1,000,000 and banked ${gain}`);
  });

  test("REGRESSION: legitimately earned points reach profiles.total_score", async () => {
    // 20251121000002's guard reverted total_score on EVERY non-admin write,
    // including the SECURITY DEFINER trigger that banks points. Scores were
    // frozen at 0 and the leaderboard never moved.
    const before = await svc.from("profiles").select("total_score").eq("user_id", B.user.id).single();
    await B.client.rpc("record_points_transaction", {
      p_student_id: B.user.id, p_source_type: "video", p_points: 5,
      p_source_description: "watched a lesson",
    });
    const after = await svc.from("profiles").select("total_score").eq("user_id", B.user.id).single();
    assert.equal(
      (after.data?.total_score ?? 0) - (before.data?.total_score ?? 0), 5,
      "SCORING BROKEN: earned points do not reach total_score"
    );
  });

  test("the same answer cannot be banked twice", async () => {
    const attempt = crypto.randomUUID();
    const row = {
      student_id: A.user.id, quiz_attempt_id: attempt, question_id: "dupe",
      question_text: "x", correct_answer: "A", is_correct: true,
    };
    await A.client.from("quiz_question_results").insert(row);
    const { error } = await A.client.from("quiz_question_results").insert(row);
    assert.ok(error, "REPLAY: the same question banked twice");
  });

  test("anon cannot upload to the avatars bucket", async () => {
    const c = anonClient();
    const { error } = await c.storage
      .from("avatars")
      .upload(`anon-${Date.now()}.html`, new Blob(["<h1>hi</h1>"]), { contentType: "text/html" });
    assert.ok(error, "STORAGE: anonymous upload to avatars accepted");
  });

  test("a student cannot assert their own is_correct", async () => {
    const { error } = await A.client.from("quiz_question_results").insert({
      student_id: A.user.id, quiz_attempt_id: crypto.randomUUID(),
      question_id: "forge-probe", question_text: "x", correct_answer: "A", is_correct: true,
    });
    assert.ok(error, "SCORE FORGERY: client can still write is_correct");
  });

  test("a student cannot PATCH their own quiz score", async () => {
    const { data: quiz } = await svc.from("quizzes").select("id").limit(1).single();
    const { data: row } = await svc.from("quiz_attempts")
      .insert({ student_id: A.user.id, quiz_id: quiz?.id, score: 0 }).select().single();
    if (!row) return;
    await A.client.from("quiz_attempts").update({ score: 999999 }).eq("id", row.id);
    const { data } = await svc.from("quiz_attempts").select("score").eq("id", row.id).single();
    assert.notEqual(data?.score, 999999, "SCORE FORGERY: student edited quiz_attempts.score");
    await svc.from("quiz_attempts").delete().eq("id", row.id);
  });

  test("grading is server-side and records completion", async () => {
    const { data: quiz } = await svc.from("quizzes").select("id, questions").limit(1).single();
    if (!quiz) return;
    await svc.from("quiz_attempts").delete().eq("student_id", B.user.id);
    const { data: att } = await svc.from("quiz_attempts")
      .insert({ student_id: B.user.id, quiz_id: quiz.id, score: 0 }).select().single();

    const answers = {};
    quiz.questions.forEach((q, i) => { answers[q.id ?? `q_${i + 1}`] = "ABCD"[q.correct]; });

    const { data: res, error } = await B.client.rpc("submit_quiz_attempt", {
      p_attempt_id: att.id, p_answers: answers,
    });
    assert.ok(!error, `grading RPC failed: ${error?.message}`);
    const out = Array.isArray(res) ? res[0] : res;
    assert.equal(out.correct_count, out.total_questions, "all-correct answers were not all marked correct");

    const { data: after } = await svc.from("quiz_attempts")
      .select("completed_at, submitted").eq("id", att.id).single();
    assert.ok(after?.completed_at, "completed_at was not recorded");
    assert.equal(after?.submitted, true, "submitted was not recorded");

    const { error: dup } = await B.client.rpc("submit_quiz_attempt", {
      p_attempt_id: att.id, p_answers: answers,
    });
    assert.ok(dup, "REPLAY: the same attempt was submitted twice");
  });
});
