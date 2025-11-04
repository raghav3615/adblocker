const adSelectors = [
  "iframe[src*='ads']",
  "iframe[src*='adservice']",
  "div[id*='ad-']",
  "div[class*='-ad']",
  "div[class*='ad-']",
  "div[class*='adwrapper']",
  "div[class*='adsbygoogle']",
  "span[class*='ad']",
  "section[class*='ad']",
  "img[src*='ad']",
  "ins[class*='adsbygoogle']"
];

function removeAds() {
  adSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((ad) => ad.remove());
  });
}

function bootObserver() {
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", bootObserver, { once: true });
    return;
  }

  removeAds();

  const observer = new MutationObserver(() => removeAds());
  observer.observe(document.body, { childList: true, subtree: true });
}

bootObserver();
