"use client";

import Image from "next/image";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { VideoSmoke } from "@/components/video-smoke";
import { loadYouTubeApi, type YouTubePlayer } from "@/lib/youtube-player";
import styles from "./live-performance.module.css";

const videoId = "kC2sZCyF41k";
const videoTitle = "I Put a Spell on You — The Jim Atkinson Band live";
const videoHref = `https://www.youtube.com/watch?v=${videoId}`;
type Playback = "loading" | "playing" | "buffering" | "paused" | "blocked" | "error";

export function LivePerformance() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const playerReady = useRef(false);
  const visible = useRef(false);
  const automaticPause = useRef(false);
  const manualPause = useRef(false);
  const autoplayBlocked = useRef(false);
  const reduced = useReducedMotion();
  const nearby = useInView(section, { margin: "300px 0px", once: true });
  const inView = useInView(frame, { amount: 0.6 });
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playback, setPlayback] = useState<Playback>("loading");
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [compact, setCompact] = useState(false);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.16, 0.38, 0.58, 0.82, 1], [0.56, 0.68, 1, 1, 0.84, 0.76]);
  const mobileScale = useTransform(scrollYProgress, [0, 0.58, 0.86, 1], [1, 1, 0.95, 0.94]);
  const rotateX = useTransform(scrollYProgress, [0, 0.38, 0.68, 1], [12, 0, 0, -4]);
  const rise = useTransform(scrollYProgress, [0, 0.38, 0.7, 1], [48, 0, 0, -18]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const pauseAndMute = useCallback(() => {
    if (!playerReady.current || !player.current) return;
    automaticPause.current = true;
    player.current.pauseVideo();
    player.current.mute();
    setMuted(true);
    setPlayback("paused");
  }, []);

  const toggleSound = () => {
    const current = player.current;
    if (!playerReady.current || !current || !visible.current) return;
    if (!current.isMuted() && current.getVolume() > 0) {
      current.mute();
      setMuted(true);
      return;
    }
    if (current.getVolume() === 0) current.setVolume(80);
    manualPause.current = false;
    autoplayBlocked.current = false;
    current.unMute();
    current.playVideo();
    setMuted(false);
  };

  useEffect(() => {
    if (!ready || !inView || !pageVisible) return;
    // Native keyboard shortcuts can also change the player's volume.
    const syncSound = () => {
      if (!playerReady.current || !player.current) return;
      setMuted(player.current.isMuted() || player.current.getVolume() === 0);
    };
    syncSound();
    const timer = window.setInterval(syncSound, 500);
    return () => window.clearInterval(timer);
  }, [ready, inView, pageVisible]);

  useEffect(() => {
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    visible.current = inView && pageVisible;
    if (!ready) return;
    if (!visible.current || reduced) {
      pauseAndMute();
    } else if (!reduced && !manualPause.current && !autoplayBlocked.current) {
      player.current?.playVideo();
    }
  }, [inView, pageVisible, ready, reduced, pauseAndMute]);

  useEffect(() => {
    if (!nearby || !mount.current) return;
    let disposed = false;
    let failed = false;
    let readyTimeout: ReturnType<typeof setTimeout> | undefined;
    const host = mount.current;
    const target = document.createElement("div");
    host.appendChild(target);

    const fail = (error?: unknown) => {
      if (disposed || failed) return;
      failed = true;
      clearTimeout(readyTimeout);
      autoplayBlocked.current = true;
      if (playerReady.current) {
        player.current?.pauseVideo();
        player.current?.mute();
      }
      playerReady.current = false;
      player.current?.destroy();
      player.current = null;
      setReady(false);
      setMuted(true);
      setErrorCode(typeof error === "number" ? error : null);
      setPlayback("error");
    };

    loadYouTubeApi().then((api) => {
      if (disposed) return;
      player.current = new api.Player(target, {
        host: "https://www.youtube.com",
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 0, playsinline: 1, controls: 0, rel: 0, origin: window.location.origin },
        events: {
          onReady: (event) => {
            if (disposed || failed) return;
            clearTimeout(readyTimeout);
            player.current = event.target;
            playerReady.current = true;
            event.target.mute();
            setMuted(true);
            const iframe = event.target.getIframe();
            iframe.title = videoTitle;
            iframe.referrerPolicy = "strict-origin-when-cross-origin";
            iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
            setReady(true);
            setPlayback("paused");
          },
          onStateChange: (event) => {
            if (disposed || failed) return;
            if (event.data === 1) {
              if (!visible.current) {
                pauseAndMute();
                return;
              }
              manualPause.current = false;
              automaticPause.current = false;
              autoplayBlocked.current = false;
              setPlayback("playing");
            } else if (event.data === 2) {
              if (visible.current && !automaticPause.current) manualPause.current = true;
              setPlayback("paused");
            } else if (event.data === 0) {
              manualPause.current = true;
              event.target.mute();
              setMuted(true);
              setPlayback("paused");
            } else if (event.data === 3) {
              setPlayback("buffering");
            } else if (event.data === -1 || event.data === 5) {
              setPlayback(event.data === -1 ? "loading" : "paused");
            }
          },
          onAutoplayBlocked: () => {
            if (disposed || failed) return;
            autoplayBlocked.current = true;
            player.current?.mute();
            setMuted(true);
            setPlayback("blocked");
          },
          onError: (event) => fail(event.data),
        },
      });
      const iframe = player.current.getIframe();
      iframe.title = videoTitle;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      readyTimeout = setTimeout(() => {
        if (!playerReady.current) fail();
      }, 12_000);
    }).catch(fail);

    return () => {
      disposed = true;
      clearTimeout(readyTimeout);
      playerReady.current = false;
      player.current?.destroy();
      player.current = null;
      host.replaceChildren();
    };
  }, [nearby, pauseAndMute]);

  return (
    <section ref={section} id="watch" aria-labelledby="watch-title" className={styles.section} data-unavailable={playback === "error"} data-video-error={errorCode ?? undefined}>
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>THE BAND, LIVE</p>
          <h2 id="watch-title">Feel it live.</h2>
        </div>
        {playback === "error" ? (
          <a href={videoHref} target="_blank" rel="noopener noreferrer" className={styles.fallback}>Watch on YouTube <Icon name="arrowUpRight" size={18} /><span className="sr-only"> (opens in a new tab)</span></a>
        ) : (
          <span className={styles.scrollHint}><span className={styles.scrollHintLabel}>SCROLL TO EXPAND</span><Icon name="arrowDown" size={15} /></span>
        )}
      </div>
      <div ref={track} className={styles.track}>
      <div className={styles.stage}>
        <motion.div ref={frame} className={styles.screenShell} style={reduced ? { scale: 1, rotateX: 0, y: 0 } : compact ? { scale: mobileScale, rotateX: 0, y: 0 } : { scale, rotateX, y: rise }} data-playback={playback}>
          <VideoSmoke active={ready && playback === "playing" && inView && pageVisible && !reduced} />
          <div className={styles.screen}>
            <Image src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="The Jim Atkinson Band performing live on a brick-walled stage under warm lights" fill unoptimized sizes="100vw" className={styles.poster} />
            <div ref={mount} className={styles.player} hidden={playback === "error"} />
          </div>
        </motion.div>
        {playback !== "error" && (
          <div className={styles.soundBar}>
            <button
              type="button"
              className={styles.soundToggle}
              onClick={toggleSound}
              disabled={!ready || !inView || !pageVisible}
              aria-pressed={!muted}
              title={muted ? "Turn sound on" : "Turn sound off"}
            >
              {muted ? <SpeakerSlash size={17} weight="light" aria-hidden="true" /> : <SpeakerHigh size={17} weight="light" aria-hidden="true" />}
              <span>{muted ? "Sound on" : "Sound off"}</span>
            </button>
          </div>
        )}
      </div>
      </div>
      <div className={styles.outro} aria-hidden="true" />
      {playback === "error" && <p className="sr-only" role="status">{errorCode === 101 || errorCode === 150 ? "This video is available to watch on YouTube." : "This video couldn’t load here. Watch the performance on YouTube."}</p>}
    </section>
  );
}
