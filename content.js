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
  ".ytp-ad-module",
  ".ytp-ad-overlay-slot",
  ".ytp-ad-image-overlay",
  ".ytp-ad-text-overlay"
];

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

function removeLikelyAdsInRoot(root) {
  if (!root || root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  // Fast path: strict selectors.
  removeMatches(strictAdSelectors, root);

  // Conservative scan for likely ad placeholders.
  const candidates = root.querySelectorAll("ins, iframe, div, aside, section");
  for (const el of candidates) {
    if (isLikelyAdElement(el)) {
      removeNode(el);
    }
  }
}

function skipYouTubeAds() {
  const skipButtons = document.querySelectorAll(
    ".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-overlay-close-button"
  );
  skipButtons.forEach((btn) => btn.click());
  removeMatches(youtubeSelectors);
}

let scheduled = false;
function scheduleCleanup() {
  if (scheduled) {
    return;
  }
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    removeLikelyAdsInRoot(document);
    skipYouTubeAds();
  });
}

function bootObserver() {
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", bootObserver, { once: true });
    return;
  }

  scheduleCleanup();

  const observer = new MutationObserver((mutations) => {
    // Only react to newly added nodes; keeps us from repeatedly scanning the whole DOM.
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          removeLikelyAdsInRoot(node);
        }
      }
    }

    // Also handle YouTube overlays/skip buttons.
    scheduleCleanup();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

bootObserver();
