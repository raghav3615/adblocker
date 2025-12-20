A simple ad blocker extension for Chrome and Firefox.

Chrome / Edge (Manifest V3)
- Load the folder as an unpacked extension. The MV3 manifest uses declarativeNetRequest.

Firefox (Manifest V2)
- Use manifest.firefox.json when packaging or loading temporarily. Firefox uses webRequest/webRequestBlocking.
- In about:debugging, "Load Temporary Add-on" and select manifest.firefox.json.

Notes
- background.js auto-detects whether declarativeNetRequest is available and falls back to webRequest blocking for non-Chromium browsers.
- Blocklists and DOM removal run in both builds; if a site breaks, tell us the domain so we can relax a rule.
