import { fetchHTML } from './network/fetcher.mjs';
import { parseHTML } from './utils/htmlProcessing.mjs';
import { renderTUI } from './renderers/tuiRenderer.mjs';
import chalk from 'chalk';

class Tab {
  constructor() {
    this.history = []; 
    this.currentIndex = -1; 
    this.currentUrl = '';
    this.currentDocument = null;
  }

  async navigate(url) {
    try {
      if (url === 'back') {
        if (this.currentIndex > 0) {
          this.currentIndex--;
          url = this.history[this.currentIndex];
        } else {
          return null; 
        }
      } else if (url === 'forward') {
        if (this.currentIndex < this.history.length - 1) {
          this.currentIndex++;
          url = this.history[this.currentIndex];
        } else {
          return null; 
        }
      } else if (url === 'reload') {
        if (!this.currentUrl) return null;
        url = this.currentUrl;
      } else {
        this.history = this.history.slice(0, this.currentIndex + 1);
        url = this.normalizeUrl(url);
        this.history.push(url);
        this.currentIndex = this.history.length - 1;
      }

      console.log(chalk.blue(`Fetching ${url}...`));
      const html = await fetchHTML(url);
      const doc = parseHTML(html);
      
      this.currentUrl = url;
      this.currentDocument = doc;
      
      return {
        document: doc,
        url: url,
        title: doc.title || url
      };
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      throw err;
    }
  }

  normalizeUrl(input) {
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      return `https://${input}`;
    }
    return input;
  }
}

class NeoBrowse {
  constructor() {
    this.tabs = [];  
    this.activeTabIndex = -1;
    this.currentScreen = null;
    this.warningTimeout = null;
    this.originalFooterContent = null;
  }

  get activeTab() {
    return this.tabs[this.activeTabIndex];
  }

  showWarning(message) {
    if (!this.currentScreen) return;
    
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }

    const footer = this.currentScreen.children.find(child => child.type === 'box' && child.position.bottom === 0);
    if (footer) {
      if (!this.originalFooterContent) {
        this.originalFooterContent = footer.content;
      }
      
      footer.setContent(chalk.bgYellow.black(`${message}`));
      this.currentScreen.render();
      
      this.warningTimeout = setTimeout(() => {
        if (this.originalFooterContent) {
          footer.setContent(this.originalFooterContent);
          this.currentScreen.render();
        }
        this.warningTimeout = null;
        this.originalFooterContent = null;
      }, 500); 
    }
  }
  
  async navigate(url) {
    try {
      const tabData = await this.activeTab.navigate(url);
      if (tabData) {  
        this.refreshUI(tabData);
        return true;
      } else {
        this.showWarning(
          url === 'back' ? "Can't go back further!" : 
          url === 'forward' ? "Can't go forward further!" : ""
        );
        return false;
      }
    } catch (err) {
      console.error(chalk.red('Navigation error:'), err.message);
      return false;
    }
  }

  async newTab(url = 'https://arungeorgesaji.is-a.dev') {
    const newTab = new Tab();
    this.tabs.push(newTab);
    this.activeTabIndex = this.tabs.length - 1;
    
    try {
      const tabData = await newTab.navigate(url);
      if (tabData) {
        this.refreshUI(tabData);
      }
    } catch (err) {
      console.error(chalk.red('Error creating new tab:'), err.message);
      this.tabs.pop();
      if (this.tabs.length > 0) {
        this.activeTabIndex = this.tabs.length - 1;
      } else {
        this.activeTabIndex = -1;
      }
    }
  }

  closeCurrentTab() {
    if (this.tabs.length <= 1) return; 
    
    if (this.currentScreen) {
      this.currentScreen.destroy();
    }
    
    this.tabs.splice(this.activeTabIndex, 1);
    if (this.activeTabIndex >= this.tabs.length) {
      this.activeTabIndex = this.tabs.length - 1;
    }
    
    const tab = this.activeTab;
    if (tab && tab.currentDocument) {
      this.refreshUI({
        document: tab.currentDocument,
        url: tab.currentUrl,
        title: tab.currentDocument?.title || tab.currentUrl || 'New Tab'
      });
    }
  }

  switchTab(index) {
    if (index >= 0 && index < this.tabs.length) {
      if (this.currentScreen) {
        this.currentScreen.destroy();
      }

      this.activeTabIndex = index;
      const tab = this.activeTab;
      if (tab && tab.currentDocument) {
        this.refreshUI({
          document: tab.currentDocument,
          url: tab.currentUrl,
          title: tab.currentDocument?.title || tab.currentUrl || 'New Tab'
        });
      }
    }
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
          active: i === this.activeTabIndex
        })),
        onNewTab: () => this.newTab(),
        onCloseTab: () => this.closeCurrentTab(),
        onSwitchTab: (index) => this.switchTab(index),
        onShowHistory: () => this.showHistory()
      }
    );
  }

  showHistory() {
    try {
      const tab = this.activeTab;
      if (!tab || tab.history.length === 0) {
        this.showWarning("No history available");
        return;
      }

      const historyOverlay = blessed.box({
        parent: this.currentScreen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bg: 'black'
      });

      const historyBox = blessed.box({
        parent: historyOverlay,
        top: 'center',
        left: 'center',
        width: '80%',
        height: '80%',
        border: { type: 'line' },
        style: {
          border: { fg: 'cyan' },
          bg: 'black'
        },
        scrollable: true,
        keys: true,
        mouse: true
      });

      let historyContent = chalk.bold('Navigation History:\n\n');
      tab.history.forEach((url, index) => {
        const prefix = index === tab.currentIndex ? chalk.green('→ ') : '  ';
        historyContent += `${prefix}${index + 1}. ${url}\n`;
      });

      historyScreen.setContent(historyContent);
      historyScreen.focus();

      historyScreen.key(['escape', 'q'], () => {
        historyOverlay.destroy();
        this.currentScreen.render();
      });

      historyScreen.key(['enter'], () => {
        const selectedIndex = blessed.getFocus(historyScreen).selected;
        if (selectedIndex >= 0 && selectedIndex < tab.history.length) {
          this.currentScreen.remove(historyScreen);
          this.navigate(tab.history[selectedIndex]);
        }
      });

      historyScreen.focus();
      this.currentScreen.render();
    } catch (err) {
      console.error('History screen error:', err);
      this.showWarning('Failed to show history');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const initialUrl = args[0] || 'https://arungeorgesaji.is-a.dev';

  const browser = new NeoBrowse();
  
  process.on('uncaughtException', (err) => {
    console.error(chalk.red('Uncaught Exception:'), err.message);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    process.exit(1);
  });

  await browser.newTab(initialUrl);
}

main();
