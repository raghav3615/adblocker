// Keep selectors conservative to avoid removing legitimate site UI (logos, badges, headers, etc.).
// Prefer network-level blocking (DNR / webRequest) and only remove DOM elements when we're fairly sure.

const strictAdSelectors = [
  // Google/AdSense
  "ins.adsbygoogle",
  "div.adsbygoogle",
  "iframe[id^='google_ads_iframe']",
  "iframe[src*='doubleclick.net']",
  "iframe[src*='googlesyndication.com']",
  "iframe[src*='googleadservices.com']",
  "iframe[src*='adservice.google.com']",
  "[data-ad-client]",
  "[data-ad-slot]",
  "[data-ad-unit]",
  // Common accessibility labels
  "[aria-label='advertisement' i]",
  "[aria-label='ads' i]"
];

const youtubeSelectors = [
  "ytd-display-ad-renderer",
  "ytd-promoted-sparkles-text-search-renderer",
  "ytd-promoted-video-renderer",
  "ytd-ad-slot-renderer",
  ".ytd-video-masthead-ad-advertiser-info-renderer",
  // Avoid removing .ytp-ad-module as it can break the player state.
  // We'll handle its children or specific ad overlays instead.
  ".ytp-ad-overlay-slot",
  ".ytp-ad-image-overlay",
  ".ytp-ad-text-overlay"
];

const YT_AD_CHECK_INTERVAL_MS = 500;
let lastPlaybackRate = null;
let lastMutedState = null;

function getYouTubePlayer() {
  return document.querySelector(".html5-video-player");
}

function isYouTubeAdShowing(player) {
  if (!player) {
    return false;
  }

  return (
    player.classList.contains("ad-showing") ||
    player.classList.contains("ad-interrupting") ||
    player.classList.contains("ad-preview")
  );
}

function trySkipYouTubeAdViaPlayerApi(player) {
  if (!player) {
    return;
  }

  const moviePlayer = document.getElementById("movie_player") || player;
  if (moviePlayer && typeof moviePlayer.skipAd === "function") {
    moviePlayer.skipAd();
  }
}

function accelerateAdPlayback(player) {
  const video = player ? player.querySelector("video") : null;
  if (!video) {
    return;
  }

  if (lastPlaybackRate === null) {
    lastPlaybackRate = video.playbackRate;
  }

  if (lastMutedState === null) {
    lastMutedState = video.muted;
  }

  if (video.playbackRate < 4) {
    video.playbackRate = 4;
  }

  if (!video.muted) {
    video.muted = true;
  }

  if (Number.isFinite(video.duration) && video.duration > 0) {
    try {
      video.currentTime = video.duration;
    } catch (err) {
      // Ignore seek errors.
    }
  }
}

function restoreYouTubePlayback(player) {
  const video = player ? player.querySelector("video") : null;
  if (!video) {
    return;
  }

  if (lastPlaybackRate !== null) {
    video.playbackRate = lastPlaybackRate;
    lastPlaybackRate = null;
  }

  if (lastMutedState !== null) {
    video.muted = lastMutedState;
    lastMutedState = null;
  }
}

// Performance notes:
// Fullscreen / theater mode transitions can cause large bursts of DOM mutations on video sites.
// Avoid scanning the entire document on every mutation; debounce and run heavy work during idle time.

const CLEANUP_DEBOUNCE_MS = 200;
const MIN_DOCUMENT_SCAN_INTERVAL_MS = 2000;
const FULLSCREEN_TRANSITION_PAUSE_MS = 900;
const MAX_PENDING_ROOTS_PER_FLUSH = 30;
const MAX_ELEMENTS_TO_SCAN_PER_ROOT = 1200;

function removeNode(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  node.remove();
}

function removeMatches(selectors, root = document) {
  selectors.forEach((selector) => {
    root.querySelectorAll(selector).forEach((node) => removeNode(node));
  });
}

function hasAdToken(value) {
  if (!value || typeof value !== "string") {
    return false;
  }
  // Token-ish match, avoids removing things like "header", "badge", "shadow".
  // Examples matched: "ad", "ads", "ad-slot", "ad_unit", "advert", "advertisement".
  return /(^|[\s_\-])ad(s|vert|vertisement)?($|[\s_\-])/i.test(value);
}

function isLikelyAdElement(element) {
  const id = element.id || "";
  const className = element.className || "";

  // Never remove video players or containers that host a video element.
  // This prevents breaking playback when players use classes like "ad-showing".
  if (
    element.tagName === "VIDEO" ||
    element.querySelector("video") ||
    element.closest(".html5-video-player, .ytp-player, .video-player")
  ) {
    return false;
  }

  if (element.matches("ins.adsbygoogle, div.adsbygoogle")) {
    return true;
  }

  if (element.matches("iframe")) {
    const src = element.getAttribute("src") || "";
    if (/doubleclick\.net|googlesyndication\.com|googleadservices\.com|adservice\.google\.com/i.test(src)) {
      return true;
    }
  }

  if (element.hasAttribute("data-ad-client") || element.hasAttribute("data-ad-slot") || element.hasAttribute("data-ad-unit")) {
    return true;
  }

  // A cautious fallback: only treat as ad if id/class contains an "ad" token AND the element looks like a typical ad slot.
  if (!(hasAdToken(id) || hasAdToken(String(className)))) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const area = rect.width * rect.height;
  // Ignore tiny elements (icons, badges) which are common false positives.
  if (area > 0 && area < 15_000) {
    return false;
  }

  return true;
}

function removeStrictAdsInRoot(root) {
  if (!root || root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  // Fast path: strict selectors.
  removeMatches(strictAdSelectors, root);
}

function removeHeuristicAdsInRoot(root) {
  if (!root || root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  // Conservative scan for likely ad placeholders.
  // Use a TreeWalker with a hard cap to avoid long main-thread stalls.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let scanned = 0;

  while (walker.nextNode()) {
    scanned++;
    if (scanned > MAX_ELEMENTS_TO_SCAN_PER_ROOT) {
      return;
    }

    const el = walker.currentNode;
    // Limit to common ad container types.
    const tag = el.tagName;
    if (tag !== "INS" && tag !== "IFRAME" && tag !== "DIV" && tag !== "ASIDE" && tag !== "SECTION") {
      continue;
    }

    if (isLikelyAdElement(el)) {
      removeNode(el);
    }
  }
}

function skipYouTubeAds() {
  const skipButtons = document.querySelectorAll(
    ".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-overlay-close-button"
  );
  skipButtons.forEach((btn) => {
    if (typeof btn.click === "function") {
      btn.click();
    }
  });

  // Remove banner ads without breaking the module.
  removeMatches(youtubeSelectors);

  const player = getYouTubePlayer();
  if (isYouTubeAdShowing(player)) {
    trySkipYouTubeAdViaPlayerApi(player);
    accelerateAdPlayback(player);
  } else {
    restoreYouTubePlayback(player);
  }
}

let cleanupTimerId = null;
let lastDocumentScanAt = 0;
let pausedUntil = 0;
const pendingRoots = new Set();

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function runInIdle(callback) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(
      () => {
        try {
          callback();
        } catch (err) {
          // Ignore content-script errors to avoid breaking page interactions.
        }
      },
      { timeout: 700 }
    );
    return;
  }

  setTimeout(() => {
    try {
      callback();
    } catch (err) {
      // Ignore.
    }
  }, 0);
}

function flushCleanup() {
  const t = nowMs();
  if (t < pausedUntil) {
    // Fullscreen/theater transition in progress; try again shortly.
    scheduleCleanup();
    return;
  }

  // Process a bounded number of mutated subtrees.
  let processed = 0;
  for (const root of pendingRoots) {
    pendingRoots.delete(root);
    if (!root || root.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    removeStrictAdsInRoot(root);
    removeMatches(youtubeSelectors, root);
    removeHeuristicAdsInRoot(root);

    processed++;
    if (processed >= MAX_PENDING_ROOTS_PER_FLUSH) {
      break;
    }
  }

  // Run a lightweight document-wide sweep at a limited rate.
  if (t - lastDocumentScanAt >= MIN_DOCUMENT_SCAN_INTERVAL_MS) {
    lastDocumentScanAt = t;
    // Avoid heuristic scanning on the full document; it can be huge on video sites.
    removeStrictAdsInRoot(document.documentElement);
    removeMatches(youtubeSelectors);
    skipYouTubeAds();
  }
}

function scheduleCleanup() {
  if (cleanupTimerId !== null) {
    return;
  }

  cleanupTimerId = setTimeout(() => {
    cleanupTimerId = null;
    runInIdle(flushCleanup);
  }, CLEANUP_DEBOUNCE_MS);
}

function bootObserver() {
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", bootObserver, { once: true });
    return;
  }

  // Initial sweep (debounced + idle).
  scheduleCleanup();

  const pauseForTransition = () => {
    pausedUntil = Math.max(pausedUntil, nowMs() + FULLSCREEN_TRANSITION_PAUSE_MS);
    scheduleCleanup();
  };

  // Fullscreen/theater toggles and resizes often produce mutation bursts.
  document.addEventListener("fullscreenchange", pauseForTransition, { passive: true });
  window.addEventListener("resize", pauseForTransition, { passive: true });

  const observer = new MutationObserver((mutations) => {
    // Only react to newly added nodes; keep per-mutation work tiny.
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          pendingRoots.add(node);
        }
      }
    }

    scheduleCleanup();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Check for video ads frequently
  setInterval(skipYouTubeAds, YT_AD_CHECK_INTERVAL_MS);
}

bootObserver();
