import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The landing page's motion primitives. No animation library: an
 * IntersectionObserver flips `data-shown`, and landing.css does the rest.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia(REDUCED).matches);
  useEffect(() => {
    const mq = window.matchMedia(REDUCED);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * True once the element's top has come 10% into the viewport, then stays
 * true. Threshold 0, not a fraction: a block taller than the screen would
 * otherwise never reach it and stay invisible.
 */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView] as const;
}

type RevealTag = "div" | "section" | "article" | "li" | "p" | "span" | "header";

/** Fades a block in (from below, a side, or a slight scale) when it scrolls into view. */
export function Reveal({
  as = "div",
  from = "up",
  delay = 0,
  className,
  style,
  children,
  id,
  labelledBy,
}: {
  as?: RevealTag;
  from?: "up" | "start" | "end" | "pop";
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  id?: string;
  labelledBy?: string;
}) {
  const [ref, shown] = useInView<HTMLElement>();
  return createElement(
    as,
    {
      ref,
      id,
      "aria-labelledby": labelledBy,
      className: cn("reveal", className),
      "data-from": from,
      "data-shown": shown ? "" : undefined,
      style: { "--d": `${delay}ms`, ...style } as CSSProperties,
    },
    children,
  );
}

/** A number that counts up once, when it first scrolls into view. Latin digits, like the app. */
export function CountUp({
  to,
  decimals = 0,
  duration = 1500,
  suffix = "",
  className,
}: {
  to: number;
  decimals?: number;
  duration?: number;
  /** kept in the same text as the digits: a separate span let "%" drift to the other side in Arabic text */
  suffix?: string;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const reduced = useReducedMotion();
  // under reduced motion the final number is there from the start
  const [value, setValue] = useState(reduced ? to : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, to, duration]);

  const final = to.toFixed(decimals);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      {/* screen readers get the real number, not every frame of the count */}
      <span aria-hidden>
        {value.toFixed(decimals)}
        {suffix}
      </span>
      <span className="sr-only">
        {final}
        {suffix}
      </span>
    </span>
  );
}

/** Cycles through words with a rise; holds still on hover and under reduced motion. */
export function RotatingWord({ words, interval = 2600, className }: { words: string[]; interval?: number; className?: string }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [reduced, paused, words.length, interval]);

  return (
    <span className={className} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <span key={index} className="word-in">
        {words[index]}
      </span>
    </span>
  );
}

/**
 * An endless ribbon. The track holds the content twice and slides by half its
 * width, so the loop has no seam. Laid out left to right on purpose: the
 * arithmetic is the same in either direction, and the chips keep their own dir.
 */
export function Marquee({ children, reverse = false, duration = 60 }: { children: ReactNode; reverse?: boolean; duration?: number }) {
  return (
    <div className="marquee" dir="ltr">
      <div className={cn("marquee-track", reverse && "reverse")} style={{ "--dur": `${duration}s` } as CSSProperties}>
        <div className="flex shrink-0 gap-3 pe-3">{children}</div>
        <div className="flex shrink-0 gap-3 pe-3" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Soft pastel shapes floating near a heading — the reference's hexagons, in the app's rounded squares. */
export function Floaters({ shapes }: { shapes: { className: string; delay?: number; rotate?: number; duration?: number }[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {shapes.map((s, i) => (
        <span
          key={i}
          className={cn("drift absolute rounded-[30%]", s.className)}
          style={{ "--d": `${s.delay ?? 0}ms`, "--r": `${s.rotate ?? 0}deg`, "--dur": `${s.duration ?? 14}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}
