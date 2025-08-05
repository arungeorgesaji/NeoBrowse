import { Tab } from './tab.mjs';
import { historyManager } from './historyManager.mjs';
import { bookmarkManager } from './bookmarkManager.mjs';
import { renderTUI } from '../renderers/tuiRenderer/tuiCore.mjs';
import chalk from 'chalk';

export class neoBrowse {
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

    this.tabs.forEach(tab => tab.active = false);

    newTab.active = true;
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

    if (this.tabs.length > 0) {
      this.activeTabIndex = this.tabs.length - 1;
      this.tabs[this.activeTabIndex].active = true;
    } else {
      this.activeTabIndex = -1;
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

      this.tabs.forEach(tab => tab.active = false);

      this.tabs[index].active = true;

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


