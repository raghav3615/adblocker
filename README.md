## Ad-Blocker

Lightweight ad-blocking browser extension for Chromium and Firefox. Designed to block common ad networks, skip or hide video overlays safely, and provide simple stats.

Quick features
- Blocks network requests for common ad providers using `declarativeNetRequest` (MV3) or `webRequest` (MV2/Firefox).
- Conservative DOM removal to avoid breaking site UI and video players.
- Popup UI with dark, minimal theme showing stats: total blocked, session blocked, last blocked host, and top domains.

How to load (developer)

- Chrome / Edge (Manifest V3)
	1. Open `chrome://extensions` (or Edge extensions page), enable *Developer mode*.
	2. Click *Load unpacked* and select this repository folder (`adblocker`).

- Firefox (Temporary install using MV2 manifest)
	1. Open `about:debugging#/runtime/this-firefox`.
	2. Click *Load Temporary Add-on* and select `manifest.firefox.json` from this folder.

What the popup shows

- `Total blocked`: All-time total (stored in extension local storage).
- `Session blocked`: Counter reset on browser start.
- `Last blocked`: Hostname of the last blocked request.
- `Top domains`: Top 5 domains by blocked count.

Developer notes

- The MV3 entry point is `background.js` (service worker). It loads `blocklist.js` (list of patterns) and registers dynamic rules when supported.
- The content script `content.js` performs cautious DOM removal and contains YouTube-specific selectors. We intentionally avoid removing the player container.
- Rules are defined in `rules.json` and dynamic rules are generated from `blocklist.js`.

Permissions

- `declarativeNetRequest`, `declarativeNetRequestFeedback`, `storage` (Chrome MV3)
- `webRequest`, `webRequestBlocking`, `storage` (Firefox MV2)

Testing & debugging

- After loading the extension, open the Extensions page and click *Service worker* (Chrome) to inspect background logs. Look for messages about rules loaded and stats updates.
- Open DevTools on a site with video playback and check the Console for content script errors. Reload the page after making code changes.
- Use the popup (click the extension icon) to view live stats. The popup reads data from `chrome.storage.local` and updates when the background increments counters.

Contributing

We welcome contributions. Suggested workflow:

1. Fork the repository and create a feature branch: `git checkout -b feat/your-change`.
2. Make changes, keep them focused and well-tested in the browser.
3. Commit and push, then open a Pull Request describing the change and why it helps.

Please include:
- The target browser (Chrome/Edge/Firefox) and version.
- Steps to reproduce if you are fixing a bug (URL, expected vs actual behavior).

Code style and tests

- Keep changes small and avoid broad DOM removals that can break site UI.
- There is no automated test harness in this repo; test changes manually by loading the unpacked extension.

Privacy & license

- This extension runs locally and stores only simple counters in extension storage; it does not transmit user browsing to external servers.
- License: add your chosen license file or update `LICENSE` as needed.

If a site breaks after enabling the extension, open an issue with the domain and a short description and we'll relax selectors or rules.

Files of interest

- `background.js` — service worker / rule manager and stats collector.
- `blocklist.js` — list of patterns used to build dynamic rules.
- `content.js` — DOM heuristics and YouTube-specific handling.
- `rules.json` — static declarativeNetRequest rules shipped with the extension.
- `popup.html`, `popup.js`, `popup.css` — the popup UI.

Enjoy — and thank you for helping make the web less noisy!
