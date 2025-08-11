import fs from 'fs';
import path from 'path';
import blessed from 'blessed';
import chalk from 'chalk';

export class settingsManager {
  constructor(browserInstance) {
    this.browser = browserInstance;
    this.settings = {
      searchEngine: 'https://search.brave.com/search?q=',
      maxDepth: 30,
      maxNodes: 10000,
      timeout: 5000,
      userAgent: 'Mozilla/5.0 (compatible; NeoBrowse/1.0)'
    };
    this.configPath = path.join(
      process.env.HOME || process.env.USERPROFILE, 
      '.neobrowse_config.json'
    );
    this.loadSettings();
    
    this.overlay = null;
    this.settingsList = null;
    this.closeCallback = null;
    this.currentSettings = { ...this.settings }; 
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.configPath)) {
        this.settings = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }

  saveSettings() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2));
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }

  showSettings() {
    if (this.browser.isModalOpen) return;
    
    try {
      this.browser.isModalOpen = true;
      this.currentSettings = { ...this.settings }; 
      
      this.overlay = blessed.box({
        parent: this.browser.currentScreen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bg: 'black',
        tags: true
      });

      blessed.text({
        parent: this.overlay,
        top: 1,
        left: 'center',
        content: '{bold}{cyan-fg}Settings{/cyan-fg}{/bold}',
        tags: true,
        style: { fg: 'cyan' }
      });

      this.settingsList = blessed.list({
        parent: this.overlay,
        top: 3,
        left: 'center',
        width: '80%',
        height: '70%',
        border: { type: 'line' },
        style: {
          border: { fg: 'cyan' },
          item: { fg: 'white' },
          selected: { bg: 'blue', fg: 'white' }
        },
        keys: true,
        mouse: true,
        vi: true,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
          ch: ' ',
          style: { bg: 'blue' }
        }
      });

      this.updateSettingsDisplay();

      blessed.text({
        parent: this.overlay,
        bottom: 3,
        left: 'center',
        content: 'Enter: Edit • S: Save • Esc: Close',
        style: { fg: 'gray' }
      });

      this.settingsList.on('select', (item, index) => {
        this.handleSettingSelect(index);
      });

      const handleClose = () => {
        this.cleanup();
      };

      this.settingsList.key(['escape', 'q', 'C-c'], handleClose);
      this.settingsList.key(['s', 'S'], () => {
        this.handleSave();
      });

      this.overlay.key(['escape', 'q', 'C-c'], handleClose);

      this.settingsList.focus();
      this.browser.currentScreen.render();

    } catch (err) {
      console.error('Settings screen error:', err);
      this.browser.showWarning('Failed to show settings');
      this.cleanup();
    }
  }

  updateSettingsDisplay() {
    const searchEngines = {
      'https://search.brave.com/search?q=': 'Brave',
      'https://www.google.com/search?q=': 'Google',
      'https://duckduckgo.com/?q=': 'DuckDuckGo',
      'https://searx.be/search?q=': 'Searx'
    };

    const engineName = searchEngines[this.currentSettings.searchEngine] || 'Custom';

    const items = [
      `Search Engine: ${engineName}`,
      `Max Depth: ${this.currentSettings.maxDepth}`,
      `Max Nodes: ${this.currentSettings.maxNodes}`,
      `Timeout: ${this.currentSettings.timeout}ms`,
      `User Agent: ${this.currentSettings.userAgent.slice(0, 40)}...`
    ];

    this.settingsList.setItems(items);
    this.browser.currentScreen.render();
  }

  handleSettingSelect(index) {
    switch (index) {
      case 0: 
        this.showSearchEngineSelector();
        break;
      case 1: 
        this.showNumberInput('Max Depth', 'maxDepth', this.currentSettings.maxDepth, 1, 100);
        break;
      case 2: 
        this.showNumberInput('Max Nodes', 'maxNodes', this.currentSettings.maxNodes, 10, 100000);
        break;
      case 3: 
        this.showNumberInput('Timeout (ms)', 'timeout', this.currentSettings.timeout, 1000, 30000);
        break;
      case 4: 
        this.showUserAgentSelector();
        break;
    }
  }

  showUserAgentSelector() {
    const userAgents = {
      'Desktop Chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Desktop Firefox': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mobile Chrome': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Desktop Edge': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      'Desktop Safari': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
      'Mobile Safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Googlebot': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'NeoBrowse Default': 'Mozilla/5.0 (compatible; NeoBrowse/1.0)',
      'Custom': 'custom'
    };

    let selectedIndex = 0;
    const currentUA = this.currentSettings.userAgent;
    
    const entries = Object.entries(userAgents);
    for (let i = 0; i < entries.length - 1; i++) { 
      if (entries[i][1] === currentUA) {
        selectedIndex = i;
        break;
      }
    }
    
    if (selectedIndex === 0 && !Object.values(userAgents).slice(0, -1).includes(currentUA)) {
      selectedIndex = entries.length - 1; 
    }

    const displayItems = Object.keys(userAgents).map((name, index) => {
      const isSelected = index === selectedIndex;
      return isSelected ? `> ${name}` : `  ${name}`;
    });

    const popup = blessed.list({
      parent: this.overlay,
      top: 'center',
      left: 'center',
      width: 60,
      height: 10,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        item: { fg: 'white' },
        selected: { bg: 'blue', fg: 'white' }
      },
      items: displayItems,
      keys: true,
      mouse: true
    });

    popup.select(selectedIndex);

    popup.on('select', (item, index) => {
      const agentNames = Object.keys(userAgents);
      const selectedName = agentNames[index];
      
      if (selectedName === 'Custom') {
        popup.destroy();
        const initialValue = Object.values(userAgents).slice(0, -1).includes(currentUA) 
          ? '' 
          : currentUA;
          
        this.showTextInput(
          'Custom User Agent', 
          'userAgent', 
          initialValue,
          (newValue) => {
            this.currentSettings.userAgent = newValue;
            this.updateSettingsDisplay();
            this.settingsList.focus();
          }
        );
      } else {
        this.currentSettings.userAgent = userAgents[selectedName];
        popup.destroy();
        this.updateSettingsDisplay();
        this.settingsList.focus();
      }
    });

    popup.key(['escape'], () => {
      popup.destroy();
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });

    popup.focus();
    this.browser.currentScreen.render();
  }

  showSearchEngineSelector() {
    const searchEngines = {
      'Brave': 'https://search.brave.com/search?q=',
      'Google': 'https://www.google.com/search?q=',
      'DuckDuckGo': 'https://duckduckgo.com/?q=',
      'Searx': 'https://searx.be/search?q='
    };

    let selectedIndex = 0;
    const currentEngine = this.currentSettings.searchEngine;
    const entries = Object.entries(searchEngines);
    
    for (let i = 0; i < entries.length; i++) {
      if (entries[i][1] === currentEngine) {
        selectedIndex = i;
        break;
      }
    }

    const displayItems = Object.keys(searchEngines).map((name, index) => {
      const isSelected = index === selectedIndex;
      return isSelected ? `> ${name}` : `  ${name}`;
    });

    const popup = blessed.list({
      parent: this.overlay,
      top: 'center',
      left: 'center',
      width: 40,
      height: 8,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        item: { fg: 'white' },
        selected: { bg: 'blue', fg: 'white' }
      },
      items: displayItems,
      keys: true,
      mouse: true
    });

    popup.select(selectedIndex);

    popup.on('select', (item, index) => {
      const engines = Object.values(searchEngines);
      this.currentSettings.searchEngine = engines[index];
      popup.destroy();
      this.updateSettingsDisplay();
      this.settingsList.focus();
    });

    popup.key(['escape'], () => {
      popup.destroy();
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });

    popup.focus();
    this.browser.currentScreen.render();
  }

  showNumberInput(label, key, currentValue, min, max) {
    const popup = blessed.box({
      parent: this.overlay,
      top: 'center',
      left: 'center',
      width: 50,
      height: 8,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        bg: 'black'
      }
    });

    blessed.text({
      parent: popup,
      top: 1,
      left: 2,
      content: `${label} (${min}-${max}):`,
      style: { fg: 'white' }
    });

    const input = blessed.textbox({
      parent: popup,
      top: 3,
      left: 2,
      width: 20,
      height: 1,
      inputOnFocus: true,
      value: String(currentValue),
      style: {
        fg: 'white',
        bg: 'gray',
        focus: { bg: 'blue' }
      }
    });

    blessed.text({
      parent: popup,
      bottom: 1,
      left: 2,
      content: 'Enter: Save • Esc: Cancel',
      style: { fg: 'gray' }
    });

    input.on('submit', (value) => {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= min && numValue <= max) {
        this.currentSettings[key] = numValue;
        popup.destroy();
        this.updateSettingsDisplay();
        this.settingsList.focus();
      }
    });

    input.key(['escape'], () => {
      popup.destroy();
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });

    input.focus();
    this.browser.currentScreen.render();
  }

  showTextInput(label, key, currentValue, onSuccess) {
    const popup = blessed.box({
      parent: this.overlay,
      top: 'center',
      left: 'center',
      width: 70,
      height: 8,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        bg: 'black'
      }
    });

    blessed.text({
      parent: popup,
      top: 1,
      left: 2,
      content: `${label}:`,
      style: { fg: 'white' }
    });

    const input = blessed.textbox({
      parent: popup,
      top: 3,
      left: 2,
      width: '90%',
      height: 1,
      inputOnFocus: true,
      value: currentValue,
      style: {
        fg: 'white',
        bg: 'gray',
        focus: { bg: 'blue' }
      }
    });

    blessed.text({
      parent: popup,
      bottom: 1,
      left: 2,
      content: 'Enter: Save • Esc: Cancel',
      style: { fg: 'gray' }
    });

    input.on('submit', (value) => {
      if (value.trim()) {
        popup.destroy();
        if (onSuccess) {
          onSuccess(value.trim());
        } else {
          this.currentSettings[key] = value.trim();
          this.updateSettingsDisplay();
          this.settingsList.focus();
        }
      }
    });

    input.key(['escape'], () => {
      popup.destroy();
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });

    input.focus();
    this.browser.currentScreen.render();
  }

  handleSave() {
    this.settings = { ...this.currentSettings };
    this.saveSettings();
    this.showConfirmation();
  }

  showConfirmation() {
    const popup = blessed.box({
      parent: this.overlay,
      top: 'center',
      left: 'center',
      width: 40,
      height: 6,
      border: { type: 'line' },
      style: {
        border: { fg: 'green' },
        bg: 'black'
      }
    });

    blessed.text({
      parent: popup,
      top: 1,
      left: 'center',
      content: 'Settings saved successfully!',
      style: { fg: 'green' }
    });

    blessed.text({
      parent: popup,
      bottom: 1,
      left: 'center',
      content: 'Press any key to continue',
      style: { fg: 'gray' }
    });

    popup.key(['.'], () => {
      popup.destroy();
      this.cleanup();
    });

    popup.focus();
    this.browser.currentScreen.render();
  }

  cleanup() {
    if (this.settingsList) {
      this.settingsList.removeAllListeners();
      this.settingsList = null;
    }
    
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    
    this.browser.isModalOpen = false;
    this.browser.currentScreen?.render();
  }
}
