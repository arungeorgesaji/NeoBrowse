import { Tab } from './tab.mjs';
import { LOG_KEY_BINDINGS } from '../constants/log.mjs' 
import { historyManager } from './historyManager.mjs';
import { bookmarkManager } from './bookmarkManager.mjs';
import { settingsManager } from './settings/settingsManager.mjs';
import { renderTUI } from '../renderers/tuiRenderer/tuiCore.mjs';
import { createFooter } from '../renderers/tuiRenderer/tuiComponents.mjs';
import { scrollToFragment, getFragment } from '../renderers/tuiRenderer/tuiUtils.mjs'
import { getLogger } from '../utils/logger.mjs'; 
import { debugPanel } from '../utils/debugPanel.mjs'; 
import { warningManager } from '../utils/warningManager.mjs';
import chalk from 'chalk';
import blessed from 'blessed';

export class neoBrowse {
  constructor() {
    this.tabs = [];
    this.activeTabIndex = -1;
    this.currentScreen = blessed.screen({ smartCSR: true });
    this.contentContainer = null;
    this.warningTimeout = null;
    this.originalFooterContent = null;
    this.bookmarkManager = null;
    this.historyManager = null;
    this.settingsManager = null;
    this.isModalOpen = false;
    this.logger = getLogger();
    this.debugPanel = new debugPanel(this.currentScreen);
    this.currentPageType = 'main';
    this.warningManager = new warningManager(this.currentScreen, { pageTypeGetter: () => this.currentPageType });

    this.initManagers();
    this.initEventHandlers();
    this.logger?.info("Neobrowse instance initialized")
  }

  initManagers() {
    if (!this.currentScreen) return;
    
    this.bookmarkManager = new bookmarkManager(this, this.currentScreen);
    this.historyManager = new historyManager(this, this.currentScreen);
    this.settingsManager = new settingsManager(this, this.currentScreen);
  }

  get activeTab() {
    return this.tabs[this.activeTabIndex] || null;
  }

  initEventHandlers() {
    process.on('SIGINT', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  cleanup() {
    this.logger?.info("Cleaning up resources before exit");

    if (this.currentScreen) {
      this.currentScreen.destroy();
      this.currentScreen = null;
    }

    this.logger?.debug("Screen destroyed, exiting...");
  }

  async navigate(url) {
    this.logger?.debug(`Navigating to: ${url}`);  
  
    if (!this.activeTab) {
      this.logger?.warn("No active tab for navigation");  
      return false;
    }

    try {
      const tabData = await this.activeTab.navigate(url);
      this.logger?.info(`Successfully navigated to: ${url}`);

      if (tabData) {
        this.refreshUI(tabData);
        return true;
      } else {
        this.logger?.warn(`Navigation failed for: ${url}`);
        this.warningManager.showWarning(
          url === 'back' ? "Can't go back further!" :
          url === 'forward' ? "Can't go forward further!" :
          url.startsWith('file:///') ? "Cannot open local file. Please check the logs for more info." :
          url === this.activeTab?.currentUrl ? "You're already on this page!" :
          "Navigation failed"
        );
        return false;
      }
    } catch (err) {
      this.logger?.error(`Navigation error: ${err.message}`);
      this.warningManager.showWarning('Navigation error');
      return false;
    }
  }

  async newTab(url = 'https://arungeorgesaji.is-a.dev/NeoBrowse/') {
    const newTab = new Tab();
    this.tabs.push(newTab);
    this.tabs.forEach(tab => tab.active = false);
    newTab.active = true;
    this.activeTabIndex = this.tabs.length - 1;

    try {
      const tabData = await newTab.navigate(url);
      this.logger?.info(`New tab successfully loaded: ${url}`);
      if (tabData) this.refreshUI(tabData);
      return true;
    } catch (err) {
      this.logger?.error(`Failed to create new tab: ${err.message}`);
      this.tabs.pop();
      this.activateLastTab();
      this.warningManager.showWarning('Failed to create new tab');
      return false;
    }
  }

  activateLastTab() {
    if (this.tabs.length > 0) {
      this.activeTabIndex = this.tabs.length - 1;
      this.tabs[this.activeTabIndex].active = true;
    } else {
      this.activeTabIndex = -1;
    }
  }

  closeCurrentTab() {
    if (this.tabs.length <= 1) {
      this.logger?.warn("Attempted to close the last tab");
      this.warningManager.showWarning("Can't close the last tab");
      return false;
    }

    const closedTab = this.tabs[this.activeTabIndex];
    const closedUrl = closedTab.currentUrl || 'New Tab';
    this.tabs.splice(this.activeTabIndex, 1);
    this.activateLastTab();

    this.logger?.info(`Closed tab: ${closedUrl}`);

    if (this.activeTab) {
      this.refreshUI({
        document: this.activeTab.currentDocument,
        url: this.activeTab.currentUrl,
        title: this.activeTab.currentDocument?.title || this.activeTab.currentUrl || 'New Tab'
      });
    }
    return true;
  }

  switchTab(index) {
    this.logger?.debug(`Switching to tab index: ${index}`);

    if (index >= 0 && index < this.tabs.length) {
      this.tabs.forEach(tab => tab.active = false);
      this.tabs[index].active = true;
      this.activeTabIndex = index;

      this.refreshUI({
        document: this.activeTab.currentDocument,
        url: this.activeTab.currentUrl,
        title: this.activeTab.currentDocument?.title || this.activeTab.currentUrl || 'New Tab'
      });
      return true;
    }

    this.logger?.warn(`Invalid tab index: ${index}`);
    return false;
  }

  async addCurrentToBookmarks() {
    if (!this.activeTab) {
      this.logger?.warn("No active tab to bookmark");
      this.warningManager.showWarning('No active tab to bookmark');
      return;
    }

    const url = this.activeTab.currentUrl;
    const title = this.activeTab.currentDocument?.title || url;

    try {
      this.bookmarkManager.addBookmark(url, title);
      this.logger?.info(`Bookmark added: ${title} (${url})`);
    } catch (err) {
      this.logger?.error(`Bookmark error: ${err.message}`);
      this.warningManager.showWarning('Failed to add bookmark');
    }
  }

  showHistory() {
    if (this.isModalOpen || !this.activeTab) {
      this.logger?.warn("Cannot open history (modal already open or no active tab)");
      return;
    } 
    
    this.currentPageType = 'history'; 
    this.logger?.debug("Opening history modal");
    
    const cleanup = () => {
      this.isModalOpen = false;
      this.currentPageType = 'main';
      this.logger?.debug("Closed history modal");
      this.currentScreen?.render();
    };

    this.historyManager.showHistory(cleanup);
  }

  showBookmarks() {
    if (this.isModalOpen) {
      this.logger?.warn("Cannot open bookmarks (modal already open)");
      return;
    }
    
    this.currentPageType = 'bookmarks'; 
    this.logger?.debug("Opening bookmarks modal");
    
    const cleanup = () => {
      this.isModalOpen = false;
      this.currentPageType = 'main';
      this.logger?.debug("Closed bookmarks modal");
      this.currentScreen?.render();
    };

    this.bookmarkManager.showBookmarks(cleanup);
  }

  showSettings() {
    if (this.isModalOpen) {
      this.logger?.warn("Cannot open settings (modal already open)");
      return;
    }
    
    this.currentPageType = 'settings';
    this.logger?.debug("Opening settings modal");
    
    const cleanup = () => {
      this.isModalOpen = false;
      this.currentPageType = 'main';
      this.logger?.debug("Closed settings modal");
      this.currentScreen?.render();
    };

    this.settingsManager.showSettings(cleanup);
  }

  refreshUI(tabData) {
    this.logger?.debug("Refreshing UI with new tab data");

    this.isModalOpen = false;
    this.currentPageType = 'main';

    const wasDebugPanelVisible = this.debugPanel?.panel.hidden === false;
    const hadWarning = this.warningManager.hasActiveWarning();

    if (this.currentScreen) {
      this.currentScreen.destroy();
    }

    const fragment = getFragment(tabData.url); 
    this.logger?.info(`Rendering UI for: ${tabData.title || tabData.url}`);

    const { screen, container } = renderTUI(
      tabData.document,
      tabData.title,
      (newUrl) => this.navigate(newUrl),
      {
        tabs: this.tabs.map((tab, i) => ({
          title: tab.currentDocument?.title || tab.currentUrl || 'New Tab',
          active: i === this.activeTabIndex,
          currentUrl: tab.currentUrl,
        })),
        onNewTab: () => this.newTab(),
        onCloseTab: () => this.closeCurrentTab(),
        onSwitchTab: (index) => this.switchTab(index),
        onShowHistory: () => this.showHistory(),
        onShowBookmarks: () => this.showBookmarks(),
        onShowSettings: () => this.showSettings(),
        browseInstance: this
      }
    );

    this.currentScreen = screen;
    this.contentContainer = container;

    this.footer = createFooter(); 
    this.currentScreen.append(this.footer);   

    this.debugPanel = new debugPanel(this.currentScreen);

    this.warningManager = new warningManager(this.currentScreen, { pageTypeGetter: () => this.currentPageType });

    if (hadWarning) {
      this.warningManager.showWarning(hadWarning.message, hadWarning.remainingTime);
    }

    if (wasDebugPanelVisible) {
      this.debugPanel.show();
    }

    this.bookmarkManager = new bookmarkManager(this, this.currentScreen);
    this.historyManager = new historyManager(this, this.currentScreen);
    this.settingsManager = new settingsManager(this, this.currentScreen);

    this.logger?.info("Screen Initialized");

    if (fragment) {
      scrollToFragment(fragment, container, screen);
    }
  }
}
