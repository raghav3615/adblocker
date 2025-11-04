importScripts("blocklist.js");

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

/**
 * Convert a blocklist entry like *://*.example.com/* to a simple domain matcher.
 * Using urlFilter keeps things fast and works for both first and third-party requests.
 */
function deriveUrlFilter(pattern) {
  if (!pattern || typeof pattern !== "string") {
    return "";
  }

  // Strip scheme wildcard and any leading wildcard subdomain.
  const withoutScheme = pattern.replace(/^\*:\/\//, "").replace(/^\*\./, "");
  const slashIndex = withoutScheme.indexOf("/");
  const hostPortion = slashIndex === -1 ? withoutScheme : withoutScheme.slice(0, slashIndex);
  return hostPortion.replace(/\*/g, "").trim();
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
chrome.runtime.onInstalled.addListener(() => {
  console.log("Ad blocker extension installed and refreshing dynamic rules.");
  refreshDynamicRules();
});

chrome.runtime.onStartup.addListener(() => {
  refreshDynamicRules();
});

// Listener for any runtime messages (optional, for future use)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getStatus") {
    sendResponse({ status: "Ad blocker is running!" });
  }
});
