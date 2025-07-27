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

class TextBrowser {
  constructor() {
    this.tabs = [];  
    this.activeTabIndex = -1;
    this.currentScreen = null;
  }

  get activeTab() {
    return this.tabs[this.activeTabIndex];
  }

  showWarning(message) {
    if (!this.currentScreen) return;
    const footer = this.currentScreen.children.find(child => child.type === 'box' && child.position.bottom === 0);
    if (footer) {
      const originalContent = footer.content;
      footer.setContent(chalk.yellow(message));
      this.currentScreen.render();
      setTimeout(() => {
        footer.setContent(originalContent);
        this.currentScreen.render();
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
        onSwitchTab: (index) => this.switchTab(index)
      }
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const initialUrl = args[0] || 'https://arungeorgesaji.is-a.dev';

  const browser = new TextBrowser();
  
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
