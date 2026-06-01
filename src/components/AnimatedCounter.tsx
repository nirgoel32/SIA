import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

type Props = {
  to: number;
  /** Optional display formatter — receives the integer tick value. */
  format?: (n: number) => string;
  /** Duration in ms. */
  duration?: number;
  /** Suffix appended after the formatted number (e.g. "M+"). */
  suffix?: string;
  /** Prefix prepended before the formatted number. */
  prefix?: string;
  className?: string;
};

/**
 * Counts from 0 up to `to` when the element scrolls into view. Uses an eased
 * RAF loop rather than framer-motion's animate() so we can hold the final
 * value exactly (avoids the "263.99K" rounding artifact at the end of a tween).
 */
export default function AnimatedCounter({
  to,
  format,
  duration = 1600,
  suffix = "",
  prefix = "",
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — fast start, settled finish.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  const display = format
    ? format(value)
    : Math.round(value).toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
