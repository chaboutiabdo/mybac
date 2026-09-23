/**
 * Tests for gemini-chat's model fallback and its SSRF host guard.
 *
 *   node --test scripts/gemini-chat.test.mjs
 *
 * Like latex-repair.test.mjs, the code is lifted out of the edge function at
 * run time (Node's own type stripping), so the test fails if it drifts. fetch
 * is stubbed: no call reaches Google.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(here, "..", "supabase", "functions", "gemini-chat", "index.ts"), "utf8");

const from = SRC.indexOf("async function callGemini");
const to = SRC.indexOf("async function loadExamPdf");
if (from < 0 || to < from || !SRC.slice(from, to).includes("const isPrivateHost")) {
  throw new Error("could not find callGemini and isPrivateHost in gemini-chat/index.ts");
}

let fetchImpl;
const quiet = { log() {}, error() {} };
const { callGemini, isPrivateHost } = new Function(
  "fetch",
  "console",
  stripTypeScriptTypes(SRC.slice(from, to)) + "\nreturn { callGemini, isPrivateHost };",
)((...args) => fetchImpl(...args), quiet);

/** Stubs fetch with one queue of statuses per model; records each call. */
function google(script) {
  const calls = [];
  fetchImpl = async (url, init) => {
    const model = url.match(/models\/([^:]+):/)[1];
    calls.push(model);
    const next = script[model].shift();
    if (next === "hang") {
      // Node unrefs AbortSignal.timeout's timer; hold the loop open until it fires.
      const alive = setInterval(() => {}, 1_000);
      return new Promise((_, reject) =>
        init.signal.addEventListener("abort", () => { clearInterval(alive); reject(init.signal.reason); }));
    }
    return new Response("{}", { status: next });
  };
  return calls;
}

const soon = (ms) => Date.now() + ms;

test("isPrivateHost refuses loopback, private, link-local and every IPv6 literal", () => {
  for (const u of [
    "https://[::1]/", "https://[::ffff:127.0.0.1]/", "https://[fd00::1]/",
    "https://localhost./", "https://LOCALHOST/", "https://a.localhost/", "https://metadata.internal/",
    "https://2130706433/", "https://0x7f.1/", "https://169.254.169.254/",
    "https://10.0.0.1/", "https://172.16.0.1/", "https://172.31.255.255/", "https://192.168.1.1/", "https://0.0.0.0/",
  ]) assert.equal(isPrivateHost(new URL(u).hostname), true, u);

  for (const u of ["https://example.com/", "https://www.onec.dz/", "https://172.32.0.1/", "https://8.8.8.8/"]) {
    assert.equal(isPrivateHost(new URL(u).hostname), false, u);
  }
});

test("a busy model is skipped and the next one answers", async () => {
  const calls = google({ a: [503], b: [200] });
  const { res, refundable } = await callGemini("k", "{}", soon(10_000), 1_000, ["a", "b"]);
  assert.equal(res.status, 200);
  assert.equal(refundable, false);
  assert.deepEqual(calls, ["a", "b"]);
});

test("a hopeless 400 stops the chain at once", async () => {
  const calls = google({ a: [400], b: [200] });
  const { res } = await callGemini("k", "{}", soon(10_000), 1_000, ["a", "b"]);
  assert.equal(res.status, 400);
  assert.deepEqual(calls, ["a"]);
});

test("a 5xx model gets one second pass; a 429 model does not", async () => {
  const calls = google({ a: [503, 200], b: [429] });
  const { res } = await callGemini("k", "{}", soon(10_000), 1_000, ["a", "b"]);
  assert.equal(res.status, 200);
  assert.deepEqual(calls, ["a", "b", "a"]);
});

test("all refused outright: no answer, and the slot is refundable", async () => {
  const calls = google({ a: [503, 503], b: [429] });
  const { res, refundable } = await callGemini("k", "{}", soon(10_000), 1_000, ["a", "b"]);
  assert.equal(res, null);
  assert.equal(refundable, true);
  assert.deepEqual(calls, ["a", "b", "a"]);
});

test("a timeout is not refundable: Google may have done the work", async () => {
  const calls = google({ a: ["hang"], b: [503, 503] });
  const { res, refundable } = await callGemini("k", "{}", soon(5_000), 200, ["a", "b"]);
  assert.equal(res, null);
  assert.equal(refundable, false);
  assert.deepEqual(calls, ["a", "b", "b"], "the hung model is not retried; the busy one is");
});

test("no attempt starts with less than half a turn left", async () => {
  const calls = google({ a: [200] });
  const { res } = await callGemini("k", "{}", soon(100), 1_000, ["a"]);
  assert.equal(res, null);
  assert.deepEqual(calls, []);
});
