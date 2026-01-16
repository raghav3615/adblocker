// Check if importScripts is defined (Service Worker context)
if (typeof importScripts === "function") {
  importScripts("blocklist.js");
}

const BASE_DYNAMIC_RULE_ID = 1000;
const RESOURCE_TYPES_TO_BLOCK = [
  "main_frame",
  "sub_frame",
  "script",
  "xmlhttprequest",
  "image",
  "media",
  "websocket",
  "font",
  "stylesheet",
  "ping",
  "other"
];

const supportsDNR = !!(chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateDynamicRules);
const supportsWebRequestBlocking = !!(chrome.webRequest && chrome.webRequest.onBeforeRequest && chrome.webRequest.onBeforeRequest.addListener);

const DEFAULT_STATS = {
  totalBlocked: 0,
  sessionBlocked: 0,
  perDomain: {},
  lastBlocked: null,
  lastUpdatedAt: null
};

function loadStats(callback) {
  chrome.storage.local.get(DEFAULT_STATS, (data) => {
    callback({
      totalBlocked: data.totalBlocked || 0,
      sessionBlocked: data.sessionBlocked || 0,
      perDomain: data.perDomain || {},
      lastBlocked: data.lastBlocked || null,
      lastUpdatedAt: data.lastUpdatedAt || null
    });
  });
}

function saveStats(stats) {
  chrome.storage.local.set({
    totalBlocked: stats.totalBlocked,
    sessionBlocked: stats.sessionBlocked,
    perDomain: stats.perDomain,
    lastBlocked: stats.lastBlocked,
    lastUpdatedAt: stats.lastUpdatedAt
  });
}

function extractHostname(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname || "unknown";
  } catch (err) {
    return "unknown";
  }
}

function incrementStats(matchedUrl) {
  loadStats((stats) => {
    const hostname = extractHostname(matchedUrl);
    stats.totalBlocked += 1;
    stats.sessionBlocked += 1;
    stats.perDomain[hostname] = (stats.perDomain[hostname] || 0) + 1;
    stats.lastBlocked = hostname;
    stats.lastUpdatedAt = Date.now();
    saveStats(stats);
  });
}

function deriveUrlFilter(pattern) {
  if (!pattern || typeof pattern !== "string") {
    return "";
  }

  // Keep paths when present (for granular matches like YouTube ad endpoints).
  const withoutScheme = pattern.replace(/^\*:\/\//, "");
  const withoutWildcardSubdomain = withoutScheme.startsWith("*.")
    ? withoutScheme.slice(2)
    : withoutScheme;

  return withoutWildcardSubdomain.replace(/\*/g, "").trim();
}

function buildDynamicRules() {
  if (!Array.isArray(blocklist)) {
    console.error("Blocklist is not available; dynamic rules cannot be generated.");
    return [];
  }

  const seenFilters = new Set();

  return blocklist
    .map((pattern, index) => {
      const urlFilter = deriveUrlFilter(pattern);
      if (!urlFilter || seenFilters.has(urlFilter)) {
        return null;
      }

      seenFilters.add(urlFilter);

      return {
        id: BASE_DYNAMIC_RULE_ID + index,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter,
          resourceTypes: RESOURCE_TYPES_TO_BLOCK
        }
      };
    })
    .filter(Boolean);
}

function refreshDynamicRules() {
  if (!supportsDNR) {
    return;
  }

  const newRules = buildDynamicRules();
  const maxRuleId = BASE_DYNAMIC_RULE_ID + newRules.length + 1000;

  chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
    const removeRuleIds = existingRules
      .filter((rule) => rule.id >= BASE_DYNAMIC_RULE_ID && rule.id <= maxRuleId)
      .map((rule) => rule.id);

    chrome.declarativeNetRequest.updateDynamicRules(
      {
        removeRuleIds,
        addRules: newRules
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Failed to update dynamic ad blocking rules:", chrome.runtime.lastError.message);
          return;
        }

        console.log(`Loaded ${newRules.length} dynamic ad blocking rules.`);
      }
    );
  });
}

// Refresh rules when the extension is installed or Chrome is starting up.
function legacyBlockListener(details) {
  if (details && details.url) {
    incrementStats(details.url);
  }
  return { cancel: true };
}

function enableLegacyWebRequestBlocking() {
  if (!supportsWebRequestBlocking || !Array.isArray(blocklist) || blocklist.length === 0) {
    return;
  }

  try {
    chrome.webRequest.onBeforeRequest.removeListener(legacyBlockListener);
  } catch (err) {
    // No-op; listener may not have been registered yet.
  }

  chrome.webRequest.onBeforeRequest.addListener(legacyBlockListener, { urls: blocklist }, ["blocking"]);
  console.log(`Legacy webRequest blocking enabled for ${blocklist.length} patterns.`);
}

function initializeBlocking() {
  if (supportsDNR) {
    refreshDynamicRules();
  } else {
    enableLegacyWebRequestBlocking();
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Ad blocker extension installed; initializing blocking.");
  chrome.storage.local.set({
    totalBlocked: 0,
    sessionBlocked: 0,
    perDomain: {},
    lastBlocked: null,
    lastUpdatedAt: Date.now()
  });
  initializeBlocking();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ sessionBlocked: 0 });
  initializeBlocking();
});

if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    if (info && info.request && info.request.url) {
      incrementStats(info.request.url);
    }
  });
}

// Listener for any runtime messages (optional, for future use)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getStatus") {
    sendResponse({ status: "Ad blocker is running!" });
  }
  if (message.type === "getStats") {
    loadStats((stats) => sendResponse({ stats }));
    return true;
  }
});
