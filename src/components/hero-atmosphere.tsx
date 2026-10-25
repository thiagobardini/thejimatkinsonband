"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import styles from "./hero-atmosphere.module.css";

const StageLight = dynamic(
  () => import("gradflow").then(({ GradFlow }) => GradFlow),
  { ssr: false },
);

const stagePalette = {
  type: "smoke" as const,
  color1: "#176981",
  color2: "#06121d",
  color3: "#496f7d",
  speed: 0.42,
  scale: 1.4,
  noise: 0.035,
};

export function HeroAtmosphere() {
  const [ready, setReady] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncPreferences = () => {
      setMotionAllowed(!motion.matches);
      setInteractive(pointer.matches && !motion.matches);
    };
    syncPreferences();
    motion.addEventListener("change", syncPreferences);
    pointer.addEventListener("change", syncPreferences);

    // Let the band photograph and page content finish loading first.
    let cancelStart: (() => void) | undefined;
    const start = () => {
      if ("requestIdleCallback" in window) {
        const idle = window.requestIdleCallback(() => setReady(true), { timeout: 1500 });
        cancelStart = () => window.cancelIdleCallback(idle);
      } else {
        const timer = setTimeout(() => setReady(true), 200);
        cancelStart = () => clearTimeout(timer);
      }
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelStart?.();
      window.removeEventListener("load", start);
      motion.removeEventListener("change", syncPreferences);
      pointer.removeEventListener("change", syncPreferences);
    };
  }, []);

  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <div className={styles.still} />
      {ready && motionAllowed && (
        <div className={styles.field}>
          <StageLight config={stagePalette} interactive={interactive} />
        </div>
      )}
    </div>
  );
}
