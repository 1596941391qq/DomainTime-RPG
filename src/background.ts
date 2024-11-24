import { DomainStats } from './types';

let currentDomain: string | null = null;
let startTime: number = Date.now();
let updateInterval: number;

async function updateDomainStats(forceSave: boolean = false) {
  if (!currentDomain) return;

  const { domains = {} } = await chrome.storage.local.get('domains') as { domains: Record<string, DomainStats> };
  const timeSpent = Date.now() - startTime;

  const existingStats = domains[currentDomain] || {
    domain: currentDomain,
    timeSpent: 0,
    level: 1,
    experience: 0,
    lastVisit: Date.now()
  };

  const newTimeSpent = existingStats.timeSpent + (forceSave ? timeSpent : 0);
  const { level, experience } = calculateLevel(newTimeSpent + (forceSave ? 0 : timeSpent));

  domains[currentDomain] = {
    ...existingStats,
    timeSpent: newTimeSpent,
    level,
    experience,
    lastVisit: Date.now()
  };

  if (forceSave) {
    startTime = Date.now();
  }

  await chrome.storage.local.set({ domains });

  // Broadcast the update to any open popups
  chrome.runtime.sendMessage({
    type: 'domainUpdate',
    data: {
      domain: currentDomain,
      stats: {
        ...domains[currentDomain],
        timeSpent: domains[currentDomain].timeSpent + (Date.now() - startTime)
      }
    }
  });
}

function calculateLevel(timeSpent: number): { level: number; experience: number } {
  const baseXP = 300;
  const totalXP = Math.floor(timeSpent / 1000);
  const level = Math.floor(Math.log2(totalXP / baseXP + 1)) + 1;
  const experience = totalXP - (Math.pow(2, level - 1) - 1) * baseXP;

  return { level, experience };
}

// Start periodic updates
function startPeriodicUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  // Update stats every second without saving
  updateInterval = setInterval(() => {
    updateDomainStats(false);
  }, 1000) as unknown as number;
}

// Stop periodic updates
function stopPeriodicUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = 0;
  }
}

async function handleTabChange(url: string) {
  if (currentDomain) {
    await updateDomainStats(true); // Save current domain stats
  }

  try {
    currentDomain = new URL(url).hostname;
    startTime = Date.now();
    startPeriodicUpdates();
  } catch (e) {
    currentDomain = null;
    stopPeriodicUpdates();
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    await handleTabChange(tab.url);
  }
});

chrome.tabs.onUpdated.addListener(async (_, changeInfo) => {
  if (changeInfo.url) {
    await handleTabChange(changeInfo.url);
  }
});

// Handle browser shutdown
chrome.runtime.onSuspend.addListener(async () => {
  if (currentDomain) {
    await updateDomainStats(true);
  }
  stopPeriodicUpdates();
});

// Initialize tracking for current tab
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  if (tabs[0]?.url) {
    await handleTabChange(tabs[0].url);
  }
});