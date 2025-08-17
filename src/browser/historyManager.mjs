import blessed from 'blessed';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs'

export class historyManager {
  constructor(browseInstance, screen, debugPanel) {
    this.browse = browseInstance;
    this.screen = screen;
    this.debugPanel = debugPanel
    this.overlay = null;
    this.historyList = null;
    this.closeCallback = null;

    this.debugPanel?.info("History manager initialized");
  }
  
  showHistory(closeCallback) {
    try {
      this.closeCallback = closeCallback;
      const tab = this.browse.activeTab;

      if (!tab?.history) {
        this.debugPanel?.warn("No tab or history available"); 
        this.browse.showWarning("No history available");
        if (this.closeCallback) this.closeCallback();
        return;
      }
    
      if (tab.history.length === 0) {
        this.debugPanel?.debug("Empty history for current tab"); 
        this.browse.showWarning("No history available");
        if (this.closeCallback) this.closeCallback();
        return;
      }

      this.debugPanel?.info(`Displaying history (${tab.history.length} items)`);
      
      this.overlay = blessed.box({
        parent: this.screen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bg: 'black',
        tags: true
      });

      this.debugPanel?.debug("Created history overlay");
      
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

      this.debugPanel?.debug(`Populated history list with ${tab.history.length} items`);

      blessed.text({
        parent: this.overlay,
        top: 1,
        left: 'center',
        content: `History (${tab.history.length} items)`,
        style: { fg: 'cyan', bold: true }
      });
      
      blessed.text({
        parent: this.overlay,
        bottom: 1,
        left: 1,
        content: 'Enter: Select • Esc: Close • Arrows: Navigate',
        style: { fg: 'gray' }
      });
      
      const handleSelect = async (item, index) => {
        this.debugPanel?.debug(`Selected history item ${index}: ${tab.history[index]}`);

        try {
          this.cleanup();
          const tab = this.browse.activeTab;

          if (index === tab.currentIndex) {
            this.debugPanel?.debug("Selected current page in history");
            this.browse.showWarning("You're already on this page!");
            return;
          }

          await tab.navigate(tab.history[index], { 
            historyIndex: index,
            replaceHistory: true
          });

          this.debugPanel?.info(`Navigated to history item ${index}`);
 
          this.browse.refreshUI({
            document: tab.currentDocument,
            url: tab.currentUrl,
            title: tab.currentDocument?.title || tab.currentUrl || 'New Tab'
          });
        } catch (err) {
          this.debugPanel?.error(`History navigation failed: ${err.message}`, { 
            index,
            url: tab.history[index]
          });
          this.browse.showWarning('Failed to navigate to selected URL');
        }
      };
      
      const handleClose = () => {
        this.debugPanel?.debug("History modal closed by user");
        this.cleanup();
      };
      
      this.historyList.on('select', handleSelect);
      bindKey(this.screen, ['escape'], this.debugPanel, handleClose);

      if (tab.currentIndex >= 0) {
        this.historyList.scrollTo(tab.currentIndex);
      }
      
      this.historyList.focus();
      this.screen.render();
      
    } catch (err) {
      this.debugPanel?.error(`History screen error: ${err.message}`);
      console.error('History screen error:', err);
      this.browse.showWarning('Failed to show history');
      this.cleanup();
    }
  }
  
  cleanup() {
    this.debugPanel?.debug("Cleaning up history manager resources");

    if (this.historyList) {
      this.historyList.removeAllListeners();
      this.historyList = null;
    }
    
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    
    if (this.closeCallback) {
      this.debugPanel?.debug("Executing history close callback");
      this.closeCallback();
      this.closeCallback = null;
    }
    
    this.screen?.render();
  }
}
