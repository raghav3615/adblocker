const blocklist = [
  "*://*.doubleclick.net/*",
  "*://*.googlesyndication.com/*",
  "*://*.googleadservices.com/*",
  "*://*.googletagmanager.com/*",
  "*://*.googletagservices.com/*",
  "*://*.adsense.com/*",
  "*://*.adservice.google.com/*",
  "*://*.g.doubleclick.net/*",
  "*://*.googlevideo.com/*adformat=*",
  "*://*.youtube.com/api/stats/ads*",
  "*://*.youtube.com/get_midroll_info*",
  "*://*.adform.net/*",
  "*://*.zedo.com/*",
  "*://*.taboola.com/*",
  "*://*.outbrain.com/*",
  "*://*.advertising.com/*",
  "*://*.criteo.com/*",
  "*://*.amazon-adsystem.com/*",
  "*://*.moatads.com/*",
  "*://*.pubmatic.com/*",
  "*://*.rubiconproject.com/*",
  "*://*.smartadserver.com/*",
  "*://*.serving-sys.com/*",
  "*://*.adsrvr.org/*",
  "*://*.popads.net/*",
  "*://*.propellerads.com/*",
  "*://*.onclickads.net/*"
];

if (typeof self !== "undefined") {
  self.blocklist = blocklist;
}
  