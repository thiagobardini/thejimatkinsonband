"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";

export function MagneticLink({ children, className, ...props }: ComponentPropsWithoutRef<"a">) {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 100, damping: 20 });
  const springY = useSpring(y, { stiffness: 100, damping: 20 });

  function handleMove(event: MouseEvent<HTMLSpanElement>) {
    if (reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.1);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.15);
  }

  function reset() { x.set(0); y.set(0); }

  return (
    <span className="inline-flex" onMouseMove={handleMove} onMouseLeave={reset}>
      <motion.span className="inline-flex" style={{ x: springX, y: springY }}>
        <a className={className} {...props}>{children}</a>
      </motion.span>
    </span>
  );
}
