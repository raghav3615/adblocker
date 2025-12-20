const adSelectors = [
  "iframe[src*='ads']",
  "iframe[src*='adservice']",
  "iframe[src*='doubleclick']",
  "div[id*='ad-']",
  "div[class*='-ad']",
  "div[class*='ad-']",
  "div[class*='adwrapper']",
  "div[class*='adsbygoogle']",
  "span[class*='ad']",
  "section[class*='ad']",
  "img[src*='ad']",
  "ins[class*='adsbygoogle']",
  "[aria-label*='advert']",
  "[data-ad]",
  "[data-ad-slot]",
  "[data-ad-client]"
];

const overlaySelectors = [
  "div[id*='popup']",
  "div[class*='popup']",
  "div[class*='modal-backdrop']",
  "div[class*='overlay']",
  "div[class*='interstitial']",
  "div[class*='toast']"
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

function removeMatches(selectors) {
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => node.remove());
  });
}

function skipYouTubeAds() {
  const skipButtons = document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-overlay-close-button");
  skipButtons.forEach((btn) => btn.click());
  removeMatches(youtubeSelectors);
}

function removeAdsAndPopups() {
  removeMatches(adSelectors);
  removeMatches(overlaySelectors);
  skipYouTubeAds();
}

function bootObserver() {
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", bootObserver, { once: true });
    return;
  }

  removeAdsAndPopups();

  const observer = new MutationObserver(() => removeAdsAndPopups());
  observer.observe(document.body, { childList: true, subtree: true });
}

bootObserver();
