import { DomainStats } from './types';
import './style.css';

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function createDomainElement(stats: DomainStats): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'domain-container';
  container.dataset.domain = stats.domain;

  const levelBar = document.createElement('div');
  levelBar.className = 'level-bar';

  const baseXP = 300 * Math.pow(2, stats.level - 1);
  const progress = (stats.experience / baseXP) * 100;

  levelBar.innerHTML = `
    <div class="domain-info">
      <span class="domain-name">${stats.domain}</span>
      <span class="domain-level">Level ${stats.level}</span>
    </div>
    <div class="progress-bar">
      <div class="progress" style="width: ${progress}%"></div>
    </div>
    <div class="stats">
      <span>Total: ${formatTime(stats.timeSpent)}</span>
      <span>XP: ${stats.experience}/${baseXP}</span>
    </div>
  `;

  container.appendChild(levelBar);
  return container;
}

async function updatePopup() {
  const container = document.getElementById('domains-container');
  if (!container) return;

  try {
    const { domains = {} } = await chrome.storage.local.get('domains') as { domains: Record<string, DomainStats> };

    // If no domains exist, add a message
    if (Object.keys(domains).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No domains tracked yet.</p>
          <p class="text-sm text-gray-400">Start browsing to level up your domains!</p>
        </div>
      `;
      return;
    }

    const sortedDomains = Object.values(domains)
      .sort((a: DomainStats, b: DomainStats) => b.level - a.level);

    // Update existing elements or create new ones
    sortedDomains.forEach((stats: DomainStats) => {
      const existingElement = container.querySelector(`[data-domain="${stats.domain}"]`);
      if (existingElement) {
        existingElement.replaceWith(createDomainElement(stats));
      } else {
        container.appendChild(createDomainElement(stats));
      }
    });

    // Remove elements for domains that no longer exist
    const existingDomains = new Set(sortedDomains.map(d => d.domain));
    container.querySelectorAll('.domain-container').forEach((el) => {
      const domain = (el as HTMLElement).dataset.domain;
      if (domain && !existingDomains.has(domain)) {
        el.remove();
      }
    });

  } catch (error) {
    console.error('Error updating popup:', error);
    container.innerHTML = `
      <div class="error-state">
        <p class="text-red-500">Error loading domain data</p>
        <p class="text-sm text-gray-400">Please try again later</p>
      </div>
    `;
  }
}

// Listen for domain updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'domainUpdate') {
    const container = document.getElementById('domains-container');
    if (!container) return;

    const { domain, stats } = message.data;
    const existingElement = container.querySelector(`[data-domain="${domain}"]`);
    if (existingElement) {
      existingElement.replaceWith(createDomainElement(stats));
    } else {
      updatePopup(); // Full refresh if domain not found
    }
  }
});

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  updatePopup();
});