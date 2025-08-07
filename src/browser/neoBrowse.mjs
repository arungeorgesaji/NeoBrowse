import { Tab } from './tab.mjs';
import { historyManager } from './historyManager.mjs';
import { bookmarkManager } from './bookmarkManager.mjs';
import { renderTUI } from '../renderers/tuiRenderer/tuiCore.mjs';
import chalk from 'chalk';
import blessed from 'blessed';

export class neoBrowse {
  constructor() {
    this.tabs = [];
    this.activeTabIndex = -1;
    this.currentScreen = null;
    this.warningTimeout = null;
    this.originalFooterContent = null;
    this.bookmarkManager = new bookmarkManager();
    this.historyManager = new historyManager(null, this);
    this.isModalOpen = false;
    this.initEventHandlers();
  }

  get activeTab() {
    return this.tabs[this.activeTabIndex] || null;
  }

  initEventHandlers() {
    process.on('SIGINT', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  cleanup() {
    if (this.currentScreen) {
      this.currentScreen.destroy();
      this.currentScreen = null;
    }
  }

  showWarning(message, duration = 2000) {
    if (!this.currentScreen || this.isModalOpen) return;

    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }

    const footer = this.currentScreen.children.find(
      child => child.type === 'box' && child.position.bottom === 0
    );

    if (footer) {
      if (!this.originalFooterContent) {
        this.originalFooterContent = footer.content;
      }

      footer.setContent(chalk.bgYellow.black(` ${message} `));
      this.currentScreen.render();

      this.warningTimeout = setTimeout(() => {
        if (this.originalFooterContent) {
          footer.setContent(this.originalFooterContent);
          this.currentScreen.render();
        }
        this.warningTimeout = null;
        this.originalFooterContent = null;
      }, duration);
    }
  }

  async navigate(url) {
    if (!this.activeTab) return false;

    try {
      const tabData = await this.activeTab.navigate(url);
      if (tabData) {
        this.refreshUI(tabData);
        return true;
      } else {
        this.showWarning(
          url === 'back' ? "Can't go back further!" :
          url === 'forward' ? "Can't go forward further!" :
          url === this.activeTab?.currentUrl ? "You're already on this page!" :
          "Navigation failed"
        );
        return false;
      }
    } catch (err) {
      console.error(chalk.red('Navigation error:'), err.message);
      this.showWarning('Navigation error');
      return false;
    }
  }

  async newTab(url = 'https://arungeorgesaji.is-a.dev') {
    const newTab = new Tab();
    this.tabs.push(newTab);
    this.tabs.forEach(tab => tab.active = false);
    newTab.active = true;
    this.activeTabIndex = this.tabs.length - 1;

    try {
      const tabData = await newTab.navigate(url);
      if (tabData) {
        this.refreshUI(tabData);
      }
      return true;
    } catch (err) {
      console.error(chalk.red('New tab error:'), err.message);
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
      this.showWarning("Can't close the last tab");
      return false;
    }

    this.tabs.splice(this.activeTabIndex, 1);
    this.activateLastTab();

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
    return false;
  }

  async showBookmarks() {
    if (this.isModalOpen) return;
    this.isModalOpen = true;

    try {
      const bookmarks = this.bookmarkManager.bookmarks;
      if (bookmarks.length === 0) {
        this.showWarning('No bookmarks saved yet');
        this.isModalOpen = false;
        return;
      }

      const screen = blessed.screen({
        smartCSR: true,
        dockBorders: true,
        fullUnicode: true
      });

      const list = blessed.list({
        items: bookmarks.map(b => `${chalk.bold(b.title)}\n${chalk.dim(b.url)}`),
        keys: true,
        vi: true,
        border: { type: 'line' },
        style: {
          border: { fg: 'cyan' },
          selected: { bg: 'blue', fg: 'white' }
        },
        width: '80%',
        height: '80%',
        top: 'center',
        left: 'center'
      });

      list.on('select', async (_, index) => {
        screen.destroy();
        this.isModalOpen = false;
        await this.navigate(bookmarks[index].url);
      });

      screen.key(['escape', 'q', 'C-c'], () => {
        screen.destroy();
        this.isModalOpen = false;
        this.currentScreen?.render();
      });

      screen.append(list);
      list.focus();
      screen.render();
    } catch (err) {
      console.error(chalk.red('Bookmarks error:'), err);
      this.isModalOpen = false;
      this.showWarning('Failed to load bookmarks');
    }
  }

  async addCurrentToBookmarks() {
    if (!this.activeTab) {
      this.showWarning('No active tab to bookmark');
      return;
    }

    const url = this.activeTab.currentUrl;
    const title = this.activeTab.currentDocument?.title || url;

    try {
      this.bookmarkManager.addBookmark(url, title);
      this.showWarning(`Bookmark added: ${title}`);
    } catch (err) {
      console.error(chalk.red('Bookmark error:'), err);
      this.showWarning('Failed to add bookmark');
    }
  }

  showHistory() {
    if (this.isModalOpen || !this.activeTab) return;
    
    this.historyManager.tab = this.activeTab;
    this.isModalOpen = true;
    
    const cleanup = () => {
      this.isModalOpen = false;
      this.currentScreen?.render();
    };

    this.historyManager.showHistory(cleanup);
  }

  refreshUI(tabData) {
    if (this.currentScreen) {
      this.currentScreen.destroy();
    }

    this.currentScreen = renderTUI(
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
      }
    );
  }
}
