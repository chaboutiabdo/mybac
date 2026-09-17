import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 up to `value` once, for the dashboard stat tiles.
 *
 * Honours `prefers-reduced-motion` by jumping straight to the value — the
 * global reduce-motion rule in index.css only covers CSS animations, not a
 * JS-driven one.
 */
export function useCountUp(value: number, durationMs = 900): number {
  const [display, setDisplay] = useState(value);
  const frame = useRef<number>();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === 0) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutExpo — fast then settling, which reads as confident
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return display;
}
