"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, X } from "@phosphor-icons/react";
import { getEventLocation } from "@/lib/event-location";
import styles from "./event-location.module.css";

export function EventLocation({ venue, location }: { venue?: string | null; location?: string | null }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const chooser = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 16, left: 16 });
  const place = getEventLocation({ venue, location });

  useEffect(() => {
    if (!open) return;
    // Dismiss rather than leave the floating choices detached from their address.
    const dismiss = () => chooser.current?.hidePopover();
    window.addEventListener("resize", dismiss);
    document.addEventListener("scroll", dismiss, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", dismiss);
      document.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  function positionChoices() {
    const address = trigger.current?.getBoundingClientRect();
    if (!address) return;
    const width = Math.min(280, window.innerWidth - 32);
    const height = chooser.current?.offsetHeight || 224;
    const below = address.bottom + 8;
    setPosition({
      left: Math.max(16, Math.min(address.left, window.innerWidth - width - 16)),
      top: Math.max(16, Math.min(below + height <= window.innerHeight - 16 ? below : address.top - height - 8, window.innerHeight - height - 16)),
    });
  }

  if (!place) return null;

  return <>
    <button ref={trigger} className={styles.trigger} type="button" popoverTarget={id}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      aria-label={`Choose a map app for ${place.label}`} onClick={positionChoices}>{place.label}</button>
    <span ref={chooser} id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`}
      className={styles.chooser} style={position} onToggle={(event) => {
        const expanded = event.newState === "open";
        if (expanded) positionChoices();
        setOpen(expanded);
      }}>
      <span className={styles.header}>
        <span id={`${id}-title`}>Open in maps</span>
        <button type="button" className={styles.close} popoverTarget={id} popoverTargetAction="hide"
          aria-label="Close map choices"><X size={17} weight="light" aria-hidden="true" /></button>
      </span>
      <span className={styles.options}>
        {place.links.map((map) => <a key={map.name} href={map.href} target="_blank" rel="noopener noreferrer"
          aria-label={`Open ${place.label} in ${map.name} (opens in a new tab)`}
          onClick={() => chooser.current?.hidePopover()}>
          {map.name}<ArrowUpRight size={16} weight="light" aria-hidden="true" />
        </a>)}
      </span>
      <span className={styles.note}>Opens in a new tab or your map app.</span>
    </span>
  </>;
}
