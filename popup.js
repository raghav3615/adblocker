const totalBlockedEl = document.getElementById("totalBlocked");
const sessionBlockedEl = document.getElementById("sessionBlocked");
const lastBlockedEl = document.getElementById("lastBlocked");
const domainListEl = document.getElementById("domainList");

function renderStats(stats) {
  totalBlockedEl.textContent = stats.totalBlocked.toLocaleString();
  sessionBlockedEl.textContent = stats.sessionBlocked.toLocaleString();
  lastBlockedEl.textContent = stats.lastBlocked || "—";

  const entries = Object.entries(stats.perDomain || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  domainListEl.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "list-empty";
    empty.textContent = "No data yet.";
    domainListEl.appendChild(empty);
    return;
  }

  for (const [domain, count] of entries) {
    const item = document.createElement("div");
    item.className = "list-item";

    const label = document.createElement("div");
    label.textContent = domain;

    const value = document.createElement("div");
    value.textContent = count.toLocaleString();

    item.appendChild(label);
    item.appendChild(value);
    domainListEl.appendChild(item);
  }
}

function requestStats() {
  chrome.runtime.sendMessage({ type: "getStats" }, (response) => {
    if (response && response.stats) {
      renderStats(response.stats);
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return;
  }

  if (
    changes.totalBlocked ||
    changes.sessionBlocked ||
    changes.perDomain ||
    changes.lastBlocked
  ) {
    requestStats();
  }
});

requestStats();
