const adSelectors = [
  "iframe[src*='ads']",
  "div[class*='ad']",
  "span[class*='ad']",
  "img[src*='ad']"
];

function removeAds() {
  adSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((ad) => ad.remove());
  });
}

const observer = new MutationObserver(() => removeAds());
observer.observe(document.body, { childList: true, subtree: true });
removeAds();
