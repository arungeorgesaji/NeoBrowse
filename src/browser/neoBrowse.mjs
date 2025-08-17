import { Tab } from './tab.mjs';
import { LOG_KEY_BINDINGS } from '../constants/log.mjs' 
import { historyManager } from './historyManager.mjs';
import { bookmarkManager } from './bookmarkManager.mjs';
import { settingsManager } from './settingsManager.mjs';
import { renderTUI } from '../renderers/tuiRenderer/tuiCore.mjs';
import { scrollToFragment, getFragment } from '../renderers/tuiRenderer/tuiUtils.mjs'
import { debugPanel } from '../utils/debugPanel.mjs';
import chalk from 'chalk';
import blessed from 'blessed';

export class neoBrowse {
  constructor() {
    this.tabs = [];
    this.activeTabIndex = -1;
    this.currentScreen = null;
    this.contentContainer = null;
    this.warningTimeout = null;
    this.originalFooterContent = null;
    this.bookmarkManager = null;
    this.historyManager = null;
    this.settingsManager = null;
    this.isModalOpen = false;
    this.debugPanel = null;

    this.initDebugPanel();
    this.initEventHandlers();
    this.debugPanel?.info("Neobrowse instance initialized")
  }

  initDebugPanel() {
    if (this.currentScreen) {
      this.debugPanel = new debugPanel(this.currentScreen, {
        toggleKey: LOG_KEY_BINDINGS.TOGGLE,
        clearKey: LOG_KEY_BINDINGS.CLEAR,
        fullClearKey: LOG_KEY_BINDINGS.FULL_CLEAR,
        levelUpKey: LOG_KEY_BINDINGS.LEVEL_UP,   
        levelDownKey: LOG_KEY_BINDINGS.LEVEL_DOWN, 
        maxLines: 100,
        startHidden: true
      });
    }
  }

  initManagers() {
    if (!this.currentScreen) return;
    
    this.bookmarkManager = new bookmarkManager(this, this.currentScreen, this.debugPanel);
    this.historyManager = new historyManager(this, this.currentScreen, this.debugPanel);
    this.settingsManager = new settingsManager(this, this.currentScreen, this.debugPanel);
  }

  get activeTab() {
    return this.tabs[this.activeTabIndex] || null;
  }

  initEventHandlers() {
    process.on('SIGINT', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  cleanup() {
    this.debugPanel?.info("Cleaning up resources before exit");

    if (this.currentScreen) {
      this.currentScreen.destroy();
      this.currentScreen = null;
    }

    this.debugPanel?.debug("Screen destroyed, exiting...");
  }

  showWarning(message, duration = 2000) {
    if (!this.currentScreen || this.isModalOpen) return;

    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }

    const footer = this.currentScreen.children.find(
      child => child.type === 'box' && child.position.bottom === 0
    );

    if (footer) {
      if (!this.originalFooterContent && footer.content !== message) {
        this.originalFooterContent = footer.content;
      }

      footer.setContent(chalk.bgYellow.black(` ${message} `));
      this.currentScreen.render();

      this.warningTimeout = setTimeout(() => {
        if (footer && this.originalFooterContent) {
          footer.setContent(this.originalFooterContent);
          this.currentScreen.render();
        }
        this.warningTimeout = null;
        this.originalFooterContent = null;
      }, duration);
    }
  }

  async navigate(url) {
    this.debugPanel?.debug(`Navigating to: ${url}`);  
  
    if (!this.activeTab) {
      this.debugPanel?.warn("No active tab for navigation");  
      return false;
    }

    try {
      const tabData = await this.activeTab.navigate(url);
      this.debugPanel?.info(`Successfully navigated to: ${url}`);

      if (tabData) {
        this.refreshUI(tabData);
        return true;
      } else {
        this.debugPanel?.warn(`Navigation failed for: ${url}`);
        this.showWarning(
          url === 'back' ? "Can't go back further!" :
          url === 'forward' ? "Can't go forward further!" :
          url === this.activeTab?.currentUrl ? "You're already on this page!" :
          "Navigation failed"
        );
        return false;
      }
    } catch (err) {
      this.debugPanel?.error(`Navigation error: ${err.message}`);
      this.showWarning('Navigation error');
      return false;
    }
  }

  async newTab(url = 'https://arungeorgesaji.is-a.dev/NeoBrowse/') {
    const newTab = new Tab(this.debugPanel);
    this.tabs.push(newTab);
    this.tabs.forEach(tab => tab.active = false);
    newTab.active = true;
    this.activeTabIndex = this.tabs.length - 1;

    try {
      const tabData = await newTab.navigate(url);
      this.debugPanel?.info(`New tab successfully loaded: ${url}`);
      if (tabData) this.refreshUI(tabData);
      return true;
    } catch (err) {
      this.debugPanel?.error(`Failed to create new tab: ${err.message}`);
      this.tabs.pop();
      this.activateLastTab();
      this.showWarning('Failed to create new tab');
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
      this.debugPanel?.warn("Attempted to close the last tab");
      this.showWarning("Can't close the last tab");
      return false;
    }

    this.tabs.splice(this.activeTabIndex, 1);
    this.activateLastTab();

    this.debugPanel?.info(`Closed tab: ${closedUrl}`);

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
    this.debugPanel?.debug(`Switching to tab index: ${index}`);

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

    this.debugPanel?.warn(`Invalid tab index: ${index}`);
    return false;
  }


  async addCurrentToBookmarks() {
    if (!this.activeTab) {
      this.debugPanel?.warn("No active tab to bookmark");
      this.showWarning('No active tab to bookmark');
      return;
    }

    const url = this.activeTab.currentUrl;
    const title = this.activeTab.currentDocument?.title || url;

    try {
      this.bookmarkManager.addBookmark(url, title);
      this.debugPanel?.info(`Bookmark added: ${title} (${url})`);
    } catch (err) {
      this.debugPanel?.error(`Bookmark error: ${err.message}`);
      this.showWarning('Failed to add bookmark');
    }
  }

  showHistory() {
    if (this.isModalOpen || !this.activeTab) {
      this.debugPanel?.warn("Cannot open history (modal already open or no active tab)");
      return;
    } 
    
    this.isModalOpen = true;
    this.debugPanel?.debug("Opening history modal");
    
    const cleanup = () => {
      this.isModalOpen = false;
      this.debugPanel?.debug("Closed history modal");
      this.currentScreen?.render();
    };

    this.historyManager.showHistory(cleanup);
  }

  refreshUI(tabData) {
    this.debugPanel?.debug("Refreshing UI with new tab data");

    if (this.currentScreen) {
      this.currentScreen.destroy();
    }

    const fragment = getFragment(tabData.url, this.debugPanel); 
    this.debugPanel?.info(`Rendering UI for: ${tabData.title || tabData.url}`);

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
        onShowBookmarks: () => this.bookmarkManager.showBookmarks(),
        onShowSettings: () => this.settingsManager.showSettings(),
        initialFragment: fragment,
      },
      this.debugPanel
    );

    this.currentScreen = screen;
    this.contentContainer = container;

    if (fragment) {
      scrollToFragment(fragment, container, screen, this.debugPanel);
    }

    this.initManagers();
  }
}
