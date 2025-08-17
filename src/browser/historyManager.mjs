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
  }
  
  showHistory(closeCallback) {
    try {
      this.closeCallback = closeCallback;
      const tab = this.browse.activeTab;
      
      if (!tab?.history || tab.history.length === 0) {
        this.browse.showWarning("No history available");
        if (this.closeCallback) this.closeCallback();
        return;
      }
      
      this.overlay = blessed.box({
        parent: this.screen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bg: 'black',
        tags: true
      });
      
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
        try {
          this.cleanup();
          const tab = this.browse.activeTab;

          if (index === tab.currentIndex) {
            this.browse.showWarning("You're already on this page!");
            return;
          }

          await tab.navigate(tab.history[index], { 
            historyIndex: index,
            replaceHistory: true
          });
          
          this.browse.refreshUI({
            document: tab.currentDocument,
            url: tab.currentUrl,
            title: tab.currentDocument?.title || tab.currentUrl || 'New Tab'
          });
        } catch (err) {
          console.error('Navigation error:', err);
          this.browse.showWarning('Failed to navigate to selected URL');
        }
      };
      
      const handleClose = () => {
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
      console.error('History screen error:', err);
      this.browse.showWarning('Failed to show history');
      this.cleanup();
    }
  }
  
  cleanup() {
    if (this.historyList) {
      this.historyList.removeAllListeners();
      this.historyList = null;
    }
    
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    
    if (this.closeCallback) {
      this.closeCallback();
      this.closeCallback = null;
    }
    
    this.screen?.render();
  }
}
