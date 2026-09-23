import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";

/**
 * A field that is nothing but a formula comes back bare: the exam solver's
 * `formula`, and final answers such as `a_0 = -g`. Undelimited, it printed as
 * raw LaTeX. Anything with Arabic in it is prose and is left alone.
 */
const asMath = (s: string): string =>
  !/\\\(|\\\[|\$/.test(s) && !/[؀-ۿ]/.test(s) && /\\[a-zA-Z]+|[_^=]/.test(s) ? `\\[${s}\\]` : s;

/**
 * gemini-2.5-flash writes Markdown although every prompt forbids it (2 of 13
 * answers on 23 Sep 2026), and it printed as literal ** and #. Bold markers,
 * headings, rules and "* " bullets go; none of them occurs in LaTeX.
 */
const plain = (s: string): string =>
  s
    .replace(/\*\*/g, "")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*-{3,}[ \t]*$/gm, "")
    .replace(/^[ \t]*\*[ \t]+/gm, "• ");

/** Renders an AI answer: LaTeX between \( \) / \[ \] (or $ / $$) as KaTeX, the rest as text. */
export function AnswerText({ content }: { content: string }) {
  return (
    <div className="max-w-none text-base leading-relaxed">
      {asMath(plain(content))
        // \[..\] and $$..$$ are blocks, \(..\) and $..$ inline;
        // the prompt asks for \( \) but some models write $ anyway,
        // and a block formula often spans several lines
        .split(/(\\\[[\s\S]+?\\\]|\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/)
        .map((part, partIndex) => {
          // split() with one capture group puts every formula at an odd index
          if (partIndex % 2 === 1) {
            const cut = part.startsWith("$") && !part.startsWith("$$") ? 1 : 2;
            const math = part.slice(cut, -cut);
            return part.startsWith("\\[") || part.startsWith("$$") ? (
              <BlockMath key={partIndex}>{math}</BlockMath>
            ) : (
              <InlineMath key={partIndex}>{math}</InlineMath>
            );
          }
          return (
            <span key={partIndex} className="whitespace-pre-wrap">
              {part}
            </span>
          );
        })}
    </div>
  );
}
