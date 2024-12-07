// Listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Ad blocker extension installed and active!");

  // Update rules for declarativeNetRequest
  chrome.declarativeNetRequest.updateDynamicRules(
    {
      // Clear any existing rules
      removeRuleIds: [1, 2], 
      // Add new rules
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: "block"
          },
          condition: {
            urlFilter: "doubleclick.net",
            resourceTypes: ["script", "image", "sub_frame"]
          }
        },
        {
          id: 2,
          priority: 1,
          action: {
            type: "block"
          },
          condition: {
            urlFilter: "adsense.com",
            resourceTypes: ["script", "image", "sub_frame"]
          }
        }
      ]
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to update rules:", chrome.runtime.lastError.message);
      } else {
        console.log("Ad blocking rules updated successfully!");
      }
    }
  );
});

// Listener for any runtime messages (optional, for future use)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getStatus") {
    sendResponse({ status: "Ad blocker is running!" });
  }
});

// Debugging to monitor events
chrome.declarativeNetRequest.getDynamicRules((rules) => {
  console.log("Current dynamic rules:", rules);
});
