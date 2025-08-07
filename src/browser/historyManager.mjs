import blessed from 'blessed';

export class historyManager {
  constructor(tab, browseInstance) {
    this.tab = tab;
    this.browse = browseInstance;
    this.overlay = null;
    this.historyList = null;
    this.closeCallback = null;
  }
  
  showHistory(closeCallback) {
    try {
      this.closeCallback = closeCallback;
      
      if (!this.tab?.history || this.tab.history.length === 0) {
        this.browse.showWarning("No history available");
        if (this.closeCallback) this.closeCallback();
        return;
      }
      
      this.overlay = blessed.box({
        parent: this.browse.currentScreen,
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
        height: '80%',
        border: { type: 'line' },
        style: {
          border: { fg: 'cyan' },
          item: { fg: 'white' },
          selected: { bg: 'blue', fg: 'white' }
        },
        items: this.tab.history.map((url, index) => 
          `${index === this.tab.currentIndex ? '→ ' : '  '}${url}`
        ),
        keys: true,
        mouse: true,
        vi: true,
        scrollable: true,
        alwaysScroll: true
      });
      
      blessed.text({
        parent: this.overlay,
        bottom: 1,
        left: 1,
        content: 'Enter: Select • Esc: Close',
        style: { fg: 'gray' }
      });
      
      const handleSelect = async (item, index) => {
        try {
          this.cleanup();
          if (this.tab.history[index]) {
            await this.browse.navigate(this.tab.history[index]);
          }
        } catch (err) {
          console.error('Navigation error:', err);
          this.browse.showWarning('Failed to navigate to selected URL');
        }
      };
      
      const handleClose = () => {
        this.cleanup();
      };
      
      this.historyList.on('select', handleSelect);
      this.historyList.key(['escape', 'q', 'C-c'], handleClose);
      this.overlay.key(['escape', 'q', 'C-c'], handleClose);
      
      this.historyList.focus();
      this.browse.currentScreen.render();
      
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
    
    this.browse.currentScreen?.render();
  }
}
