export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getPlayerState(): number;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}

export interface YouTubePlayerEvent {
  target: YouTubePlayer;
}

export interface YouTubePlayerStateEvent extends YouTubePlayerEvent {
  data: number;
}

export interface YouTubePlayerErrorEvent extends YouTubePlayerEvent {
  data: number;
}

export interface YouTubePlayerOptions {
  width?: number | string;
  height?: number | string;
  videoId?: string;
  host?: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerStateEvent) => void;
    onError?: (event: YouTubePlayerErrorEvent) => void;
    onAutoplayBlocked?: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubeApi {
  Player: new (
    element: string | HTMLElement,
    options: YouTubePlayerOptions,
  ) => YouTubePlayer;
}

type YouTubeWindow = Window & {
  YT?: YouTubeApi;
  onYouTubeIframeAPIReady?: () => void;
};

const API_URL = "https://www.youtube.com/iframe_api";
const LOAD_TIMEOUT_MS = 12_000;
let apiPromise: Promise<YouTubeApi> | undefined;

/** Call from a client effect, and create players only after this resolves. */
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube player requires a browser."));
  }

  const browser = window as YouTubeWindow;
  if (typeof browser.YT?.Player === "function") {
    return Promise.resolve(browser.YT);
  }
  if (apiPromise) return apiPromise;

  const attempt = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = browser.onYouTubeIframeAPIReady;
    let script: HTMLScriptElement | undefined;
    let timeout: number | undefined;
    let settled = false;

    function cleanup() {
      browser.clearTimeout(timeout);
      script?.removeEventListener("error", onScriptError);
      script?.removeEventListener("load", resolveWhenReady);
      // Another consumer may have installed a later callback; leave it intact.
      if (browser.onYouTubeIframeAPIReady === onApiReady) {
        if (previousReady) browser.onYouTubeIframeAPIReady = previousReady;
        else delete browser.onYouTubeIframeAPIReady;
      }
    }

    function resolveWhenReady() {
      if (settled || typeof browser.YT?.Player !== "function") return;
      settled = true;
      cleanup();
      resolve(browser.YT);
    }

    function fail(error: Error) {
      if (settled) return;
      settled = true;
      cleanup();
      // A failed or stalled script must not prevent a later explicit retry.
      script?.remove();
      reject(error);
    }

    function onScriptError() {
      fail(new Error("The YouTube player could not be loaded."));
    }

    function onApiReady() {
      try {
        previousReady?.call(browser);
      } finally {
        resolveWhenReady();
      }
    }

    try {
      script = Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"))
        .find((candidate) => {
          try {
            const url = new URL(candidate.src, document.baseURI);
            return url.origin === "https://www.youtube.com" && url.pathname === "/iframe_api";
          } catch {
            return false;
          }
        });
      const needsScript = !script;
      script ??= document.createElement("script");
      browser.onYouTubeIframeAPIReady = onApiReady;
      script.addEventListener("error", onScriptError);
      script.addEventListener("load", resolveWhenReady);
      timeout = browser.setTimeout(() => {
        resolveWhenReady();
        if (!settled) fail(new Error("The YouTube player took too long to load."));
      }, LOAD_TIMEOUT_MS);

      resolveWhenReady();
      if (!settled && needsScript) {
        script.src = API_URL;
        script.async = true;
        (document.head ?? document.body ?? document.documentElement).appendChild(script);
      }
    } catch (error) {
      fail(error instanceof Error ? error : new Error("The YouTube player could not be loaded."));
    }
  });

  apiPromise = attempt.catch((error: unknown) => {
    apiPromise = undefined;
    throw error;
  });
  return apiPromise;
}
