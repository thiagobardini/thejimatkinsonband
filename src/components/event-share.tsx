"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChatCircleText, Copy, InstagramLogo, ShareNetwork, WhatsappLogo, X } from "@phosphor-icons/react";
import { getShareLinks, type EventShareData } from "@/lib/event-sharing";
import styles from "./event-share.module.css";

export function EventShare({ share, imagePath, coverUrl }: { share: EventShareData; imagePath: string; coverUrl: string | null }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const keyboardInteraction = useRef(false);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [pointerRestored, setPointerRestored] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);
  const [ios, setIos] = useState(false);
  const [poster, setPoster] = useState<File | null>(null);
  const [posterState, setPosterState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const links = getShareLinks(share, ios);

  useEffect(() => {
    setNativeShare(typeof navigator.share === "function");
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setPoster(null);
    setPosterState("loading");
    async function preparePoster() {
      try {
        const response = await fetch(imagePath, { signal: controller.signal });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Poster unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        setPoster(new File([blob], "jim-atkinson-band-show.png", { type: "image/png" }));
        setPosterState("ready");
      } catch {
        if (!controller.signal.aborted) setPosterState("error");
      }
    }
    void preparePoster();
    return () => controller.abort();
  }, [open, imagePath]);

  function close() { dialog.current?.close(); }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(share.url);
      setMessage("Event link copied.");
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      setMessage("Select and copy the event link below.");
    }
  }

  async function shareWithApps(withPoster = false) {
    if (busy) return;
    setMessage("");
    setBusy(true);
    try {
      if (withPoster && poster && navigator.canShare?.({ files: [poster] })) {
        await navigator.share({ title: share.title, text: `${share.text}\n${share.url}`, files: [poster] });
      } else if (!withPoster && navigator.share) {
        await navigator.share(share);
      } else {
        setMessage(withPoster ? "Save the poster below, then add it to your Instagram story with the event link." : "Choose WhatsApp, SMS, or copy the event link.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("Sharing couldn’t open. You can still copy the link or save the poster.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button ref={trigger} className={styles.trigger} type="button" aria-label={`Share ${share.title}`} aria-haspopup="dialog"
      data-pointer-restored={pointerRestored || undefined}
      onBlur={() => setPointerRestored(false)} onKeyDown={() => setPointerRestored(false)} onClick={(event) => {
      keyboardInteraction.current = event.detail === 0;
      setPointerRestored(false);
      setMessage(""); setOpen(true);
      // Safari taps do not always focus buttons; establish the dialog's return target explicitly.
      event.currentTarget.focus({ preventScroll: true });
      dialog.current?.showModal();
      (keyboardInteraction.current ? closeButton.current : heading.current)?.focus({ preventScroll: true });
    }}><ShareNetwork size={16} weight="light" aria-hidden="true" /> Share</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
      onPointerDownCapture={() => { keyboardInteraction.current = false; }}
      onKeyDownCapture={() => { keyboardInteraction.current = true; }}
      onClose={() => {
        setOpen(false); setMessage("");
        setPointerRestored(!keyboardInteraction.current);
        trigger.current?.focus({ preventScroll: true });
      }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className={styles.panel}>
        <button ref={closeButton} className={styles.close} type="button" aria-label="Close sharing" onClick={close}><X size={20} weight="light" aria-hidden="true" /></button>
        <p className={styles.eyebrow}><span className="accent-dot" aria-hidden="true" /> BRING SOMEONE ALONG</p>
        <h2 ref={heading} id={titleId} tabIndex={-1}>Share this show.</h2>
        <div className={styles.preview}>
          {coverUrl && <img src={coverUrl} alt="" width={120} height={63} referrerPolicy="no-referrer" />}
          <div><p className={styles.eventTitle}>{share.title}</p><p className={styles.eventDate}>{share.text}</p></div>
        </div>
        <div className={styles.options}>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={22} weight="light" aria-hidden="true" /><span>WhatsApp</span></a>
          <a href={links.sms}><ChatCircleText size={22} weight="light" aria-hidden="true" /><span>SMS / Messages</span></a>
          <button type="button" disabled={busy || posterState !== "ready"} onClick={() => void shareWithApps(true)}><InstagramLogo size={22} weight="light" aria-hidden="true" /><span>Instagram<span className={styles.optionNote}>{posterState === "loading" ? "Preparing poster…" : "Share the poster"}</span></span></button>
          {nativeShare && <button type="button" disabled={busy} onClick={() => void shareWithApps()}><ShareNetwork size={22} weight="light" aria-hidden="true" /><span>More apps<span className={styles.optionNote}>Share the event link</span></span></button>}
        </div>
        <p className={styles.hint}>For Instagram, share or save the poster, then add this event link to your story.</p>
        <a className={styles.savePoster} href={imagePath} download="jim-atkinson-band-show.png">Save poster</a>
        {posterState === "error" && <p className={styles.hint}>The poster couldn’t load. The event link is ready to share.</p>}
        <div className={styles.copyRow}>
          <label className="sr-only" htmlFor={`${titleId}-url`}>Event link</label>
          <input ref={linkInput} id={`${titleId}-url`} value={share.url} readOnly onFocus={(event) => event.currentTarget.select()} />
          <button type="button" onClick={() => void copyLink()}><Copy size={16} weight="light" aria-hidden="true" /> Copy link</button>
        </div>
        <p className={styles.status} role="status" aria-live="polite">{message}</p>
      </div>
    </dialog>
  </>;
}
