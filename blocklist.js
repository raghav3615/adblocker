const blocklist = [
  "*://*.doubleclick.net/*",
  "*://*.googlesyndication.com/*",
  "*://*.googleadservices.com/*",
  "*://*.googletagmanager.com/*",
  "*://*.googletagservices.com/*",
  "*://*.adsense.com/*",
  "*://*.adform.net/*",
  "*://*.zedo.com/*",
  "*://*.taboola.com/*",
  "*://*.outbrain.com/*",
  "*://*.advertising.com/*",
  "*://*.criteo.com/*"
];

if (typeof self !== "undefined") {
  self.blocklist = blocklist;
}
  