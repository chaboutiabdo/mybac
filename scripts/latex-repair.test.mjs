/**
 * Regression test for the LaTeX-escape repair in gemini-chat.
 *
 *   node --test scripts/latex-repair.test.mjs
 *
 * Gemini's JSON mode single-escapes backslashes, so a LaTeX command arrives as
 * a JSON escape: \times is sent as \t + "imes" and JSON.parse turns it into a
 * literal TAB. Live cards in this project were corrupted exactly this way --
 * \times, \frac, \neq and \text all became control characters, and the maths
 * rendered as garbage for students.
 *
 * The implementation is lifted out of the edge function at run time rather
 * than copied, so this test fails if the shipped version ever drifts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(here, "..", "supabase", "functions", "gemini-chat", "index.ts"), "utf8");

const block = SRC.slice(SRC.indexOf("const CONTROL_TO_LETTER"), SRC.indexOf("const countOf"));
if (!block) throw new Error("could not find the repair helpers in gemini-chat/index.ts");

const js = block
  .replace(/: Record<string, string>/g, "")
  .replace(/: string\b/g, "")
  .replace(/: unknown\b/g, "")
  .replace(/: boolean\b/g, "");

const { repairLatex, hasControlChars, deepRepair } = await import(
  "data:text/javascript," +
    encodeURIComponent(js + "\nexport { repairLatex, hasControlChars, deepRepair };")
);

const TAB = "\u0009";
const FF = "\u000C";
const LF = "\u000A";
const CR = "\u000D";
const VT = "\u000B";
const BS = "\u0008";

test("restores the LaTeX commands seen corrupted on live cards", () => {
  assert.equal(repairLatex(`u_q = u_p ${TAB}imes q^{q-p}`), "u_q = u_p \\times q^{q-p}");
  assert.equal(repairLatex(`${FF}rac{1 - q}{1 - q}`), "\\frac{1 - q}{1 - q}");
  assert.equal(repairLatex(`q ${LF}eq 1`), "q \\neq 1");
  assert.equal(repairLatex(`${TAB}ext{الحد الأول}`), "\\text{الحد الأول}");
  assert.equal(repairLatex(`${VT}ec{F}`), "\\vec{F}");
  assert.equal(repairLatex(`${CR}ightarrow`), "\\rightarrow");
  assert.equal(repairLatex(`${BS}eta`), "\\beta");
});

test("leaves legitimate text alone", () => {
  // A real paragraph break in Arabic prose is followed by an Arabic letter or
  // a space, never by [a-zA-Z] -- that is what makes the repair unambiguous.
  assert.equal(repairLatex(`السطر الأول${LF}السطر الثاني`), `السطر الأول${LF}السطر الثاني`);
  assert.equal(repairLatex(`first line${LF} second`), `first line${LF} second`);
  assert.equal(repairLatex("نص عادي بلا رموز"), "نص عادي بلا رموز");
  assert.equal(repairLatex("\\( x_0 \\)"), "\\( x_0 \\)");
});

test("flags anything the repair could not account for", () => {
  assert.equal(hasControlChars("clean text"), false);
  assert.equal(hasControlChars(`bad${FF}!`), true);
  assert.equal(hasControlChars(`newlines are fine${LF}here`), false);
});

test("deepRepair walks a parsed solution tree", () => {
  const solved = deepRepair({
    question_number: "1",
    steps: [{ step: 1, explanation: `نستعمل ${TAB}imes`, formula: `${FF}rac{a}{b}` }],
    final_answer: `x ${LF}eq 0`,
  });
  assert.equal(solved.steps[0].explanation, "نستعمل \\times");
  assert.equal(solved.steps[0].formula, "\\frac{a}{b}");
  assert.equal(solved.final_answer, "x \\neq 0");
  assert.equal(solved.steps[0].step, 1, "non-string values pass through untouched");
});
