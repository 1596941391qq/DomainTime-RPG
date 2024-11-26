import { DomainStats } from './types';
import './style.css';

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  return savedTheme;
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

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

function calculateTimeToNextLevel(stats: DomainStats): string {
  const baseXP = 300 * Math.pow(2, stats.level - 1);
  const remainingXP = baseXP - stats.experience;
  const secondsNeeded = remainingXP;
  return formatTime(secondsNeeded * 1000);
}

function createTooltipContent(stats: DomainStats): string {
  const timeToNext = calculateTimeToNextLevel(stats);
  const todayTime = stats.todayTimeSpent || 0;
  const xpGainedToday = Math.floor(todayTime / 1000);

  return `
    <div class="tooltip-content">
      <div class="tooltip-header">今日战报</div>
      <div class="tooltip-row">
        <span>战斗时间:</span>
        <span>${formatTime(todayTime)}</span>
      </div>
      <div class="tooltip-row">
        <span>经验获得:</span>
        <span>${xpGainedToday} XP</span>
      </div>
      <div class="tooltip-divider"></div>
      <div class="tooltip-row highlight">
        <span>下一级需要:</span>
        <span>${timeToNext}</span>
      </div>
    </div>
  `;
}

async function handleRename(domain: string, currentDisplayName: string | undefined) {
  const newName = prompt('Enter new name for ' + domain, currentDisplayName || domain);
  if (newName === null) return;

  const { domains = {} } = await chrome.storage.local.get('domains') as { domains: Record<string, DomainStats> };
  if (domains[domain]) {
    domains[domain].displayName = newName.trim() || undefined;
    await chrome.storage.local.set({ domains });
    updatePopup();
  }
}

function getFavicon(domain: string) {
  return `https://${domain}/favicon.ico`;
}

function createDomainElement(stats: DomainStats): HTMLDivElement {
  const container = document.createElement('div');
  container.className = `domain-container ${stats.isActive ? 'active' : ''}`;
  container.dataset.domain = stats.domain;

  const levelBar = document.createElement('div');
  levelBar.className = 'level-bar';

  const baseXP = 300 * Math.pow(2, stats.level - 1);
  const progress = (stats.experience / baseXP) * 100;

  const faviconImg = document.createElement('img');
  faviconImg.className = 'domain-favicon';
  faviconImg.alt = `${stats.domain} icon`;
  faviconImg.style.backgroundColor = '#FFFFFF';
  const faviconUrl = getFavicon(stats.domain);
  faviconImg.src = faviconUrl;

  levelBar.innerHTML = `
  <div class="domain-info">
    <div class="domain-name-container">
        ${faviconImg.outerHTML}
      <div class="domain-name-wrapper">
          <span class="domain-name">${stats.displayName || stats.domain}</span>
        <span class="domain-original">${stats.displayName ? stats.domain : ''}</span>
      </div>
      <button class="rename-btn" title="Rename domain">✏️</button>
    </div>
    <span class="domain-level">Level ${stats.level}</span>
  </div>
  <div class="progress-bar">
    <div class="progress" style="width: ${progress}%">
      <div class="progress-glow"></div>
      <div class="progress-shine"></div>
    </div>
  </div>
  <div class="stats">
    <span>Total: ${formatTime(stats.timeSpent)}</span>
    <span>XP: ${stats.experience}/${baseXP}</span>
  </div>
   <div class="tooltip">${createTooltipContent(stats)}</div>
`;

  faviconImg.onerror = () => {
    console.log(`无图标 for ${stats.domain}`);
    faviconImg.src = 'icons/icon.png'
    levelBar.innerHTML = `
      <div class="domain-name-container">
        ${faviconImg.outerHTML}
        <div class="domain-name-wrapper">
            <span class="domain-name">${stats.displayName || stats.domain}</span>
          <span class="domain-original">${stats.displayName ? stats.domain : ''}</span>
        </div>
        <button class="rename-btn" title="Rename domain">✏️</button>
      </div>
      <span class="domain-level">Level ${stats.level}</span>
    </div>
    <div class="progress-bar">
      <div class="progress" style="width: ${progress}%">
        <div class="progress-glow"></div>
        <div class="progress-shine"></div>
      </div>
    </div>
    <div class="stats">
      <span>Total: ${formatTime(stats.timeSpent)}</span>
      <span>XP: ${stats.experience}/${baseXP}</span>
    </div>
     <div class="tooltip">${createTooltipContent(stats)}</div>
    `;
    const renameBtn = levelBar.querySelector('.rename-btn');
    if (renameBtn) {
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRename(stats.domain, stats.displayName);
      });
    }


  };

  const renameBtn = levelBar.querySelector('.rename-btn');
  if (renameBtn) {
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRename(stats.domain, stats.displayName);
    });
  }

  container.appendChild(levelBar);
  return container;
}

async function updatePopup() {
  const container = document.getElementById('domains-container');
  if (!container) return;

  try {
    const { domains = {} } = await chrome.storage.local.get('domains') as { domains: Record<string, DomainStats> };

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
      .sort((a: DomainStats, b: DomainStats) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return b.level - a.level;
      });

    sortedDomains.forEach((stats: DomainStats) => {
      const existingElement = container.querySelector(`[data-domain="${stats.domain}"]`);
      if (existingElement) {
        existingElement.replaceWith(createDomainElement(stats));
      } else {
        container.appendChild(createDomainElement(stats));
      }
    });

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

// Initialize popup and theme
document.addEventListener('DOMContentLoaded', () => {
  // Add theme toggle button
  const header = document.querySelector('.container');
  if (header) {
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = '🌓';
    themeToggle.addEventListener('click', toggleTheme);
    header.appendChild(themeToggle);
  }

  initTheme();
  updatePopup();
});

// Listen for domain updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'domainUpdate') {
    const container = document.getElementById('domains-container');
    if (!container) return;

    const { domain, stats } = message.data;
    const existingElement = container.querySelector(`[data-domain="${domain}"]`);
    if (existingElement) {
      existingElement.replaceWith(createDomainElement(stats));
    } else {
      updatePopup();
    }
  }
});