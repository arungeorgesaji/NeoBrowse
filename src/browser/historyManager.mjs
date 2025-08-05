export class historyManager {
  constructor(tab) {
    this.tab = tab;
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
