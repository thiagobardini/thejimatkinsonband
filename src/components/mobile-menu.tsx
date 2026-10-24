"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { band } from "@/lib/band";
import { Icon } from "./icon";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    }
    function handleOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handleOutside);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handleOutside);
    };
  }, [open]);

  return (
    <div ref={root} className="mobile-navigation relative lg:hidden">
      <button ref={toggle} type="button" className="menu-toggle flex size-11 items-center justify-center" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((previous) => !previous)}>
        <Icon name={open ? "close" : "menu"} size={24} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.nav id="mobile-menu" aria-label="Mobile navigation" className="mobile-menu" initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }} transition={{ type: "spring", stiffness: 100, damping: 20 }} onClick={() => setOpen(false)}>
            <a href="#the-band">The band <Icon name="arrowDown" size={18} /></a>
            <a href="#history">Our history <Icon name="arrowDown" size={18} /></a>
            <a href={band.events} target="_blank" rel="noopener noreferrer">Live shows <Icon name="arrowUpRight" size={18} /></a>
            <a href="#contact">Get in touch <Icon name="arrowDown" size={18} /></a>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
