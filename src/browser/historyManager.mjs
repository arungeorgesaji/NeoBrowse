import blessed from 'blessed';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs'
import { getLogger } from '../utils/logger.mjs'; 
import { createFooter } from '../renderers/tuiRenderer/tuiComponents.mjs';
import { warningManager } from '../utils/warningManager.mjs';

export class historyManager {
  constructor(browseInstance, screen) {
    this.browser = browseInstance;
    this.screen = screen;
    this.logger = getLogger();
    this.overlay = null;
    this.historyList = null;
    this.closeCallback = null;
    this.footer = null;
    this.warningManager = new warningManager(this.screen, { pageTypeGetter: () => 'history' });

    this.logger?.info("History manager initialized");
  }
  
  showHistory(closeCallback) {
    try {
      this.closeCallback = closeCallback;
      const tab = this.browser.activeTab;

      if (!tab?.history) {
        this.logger?.warn("No tab or history available"); 
        this.warningManager.showWarning("No history available");
        if (this.closeCallback) this.closeCallback();
        return;
      }
    
      if (tab.history.length === 0) {
        this.logger?.debug("Empty history for current tab"); 
        this.warningManager.showWarning("No history available");
        if (this.closeCallback) this.closeCallback();
        return;
      }

      this.logger?.info(`Displaying history (${tab.history.length} items)`);

      this.footer = createFooter('history');
      this.screen.append(this.footer);
      
      this.overlay = blessed.box({
        parent: this.screen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bg: 'black',
        tags: true
      });

      this.logger?.debug("Created history overlay");
      
      this.historyList = blessed.list({
        parent: this.overlay,
        top: 'center',
        left: 'center',
        width: '80%',
        height: '70%',
        border: { type: 'line' },
        style: {
          border: { fg: 'cyan' },
          item: { fg: 'white' },
          selected: { bg: 'blue', fg: 'white' }
        },
        items: tab.history.map((url, index) => 
          `${index === tab.currentIndex ? '→ ' : '  '}${index + 1}. ${url}`
        ),
        keys: true,
        mouse: true,
        vi: true,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
          ch: ' ',
          style: {
            bg: 'blue'
          }
        }
      });

      this.logger?.debug(`Populated history list with ${tab.history.length} items`);

      blessed.text({
        parent: this.overlay,
        top: 1,
        left: 'center',
        content: `History (${tab.history.length} items)`,
        style: { fg: 'cyan', bold: true }
      });

      this.footer.setFront();
      
      const handleSelect = async (item, index) => {
        this.logger?.debug(`Selected history item ${index}: ${tab.history[index]}`);

        try {
          this.cleanup();
          const tab = this.browser.activeTab;

          if (index === tab.currentIndex) {
            this.logger?.debug("Selected current page in history");
            this.warningManager.showWarning("You're already on this page!");
            return;
          }

          await tab.navigate(tab.history[index], { 
            historyIndex: index,
            replaceHistory: true
          });

          this.logger?.info(`Navigated to history item ${index}`);
 
          this.browser.refreshUI({
            document: tab.currentDocument,
            url: tab.currentUrl,
            title: tab.currentDocument?.title || tab.currentUrl || 'New Tab'
          });
        } catch (err) {
          this.logger?.error(`History navigation failed: ${err.message}`, { 
            index,
            url: tab.history[index]
          });
          this.warningManager.showWarning('Failed to navigate to selected URL');
        }
      };
      
      const handleClose = () => {
        this.logger?.debug("History modal closed by user");
        this.cleanup();
      };
      
      this.historyList.on('select', handleSelect);
      bindKey(this.screen, ['escape'], handleClose);

      if (tab.currentIndex >= 0) {
        this.historyList.scrollTo(tab.currentIndex);
      }
      
      this.historyList.focus();
      this.screen.render();
      
    } catch (err) {
      this.logger?.error(`History screen error: ${err.message}`);
      console.error('History screen error:', err);
      this.warningManager.showWarning('Failed to show history');
      this.cleanup();
    }
  }

  cleanup() {
    this.logger?.debug("Cleaning up history manager resources");

    if (this.historyList) {
      this.historyList.removeAllListeners();
      this.historyList = null;
    }
    
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    
    if (this.footer) {
      this.footer.destroy();
      this.footer = null;
    }
    
    this.browser.currentPageType = 'main';
    this.screen.append(this.browser.footer);
    this.browser.footer.setFront();
    
    if (this.closeCallback) {
      this.logger?.debug("Executing history close callback");
      this.closeCallback();
      this.closeCallback = null;
    }
    
    this.screen?.render();
  }
}
