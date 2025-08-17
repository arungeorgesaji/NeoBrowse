import fs from 'fs';
import path from 'path';
import blessed from 'blessed';
import chalk from 'chalk';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs'

export class settingsManager {
  constructor(browserInstance, screen, debugPanel) {
    this.browser = browserInstance;
    this.screen = screen;
    this.debugPanel = debugPanel;
    this.settings = {
      searchEngine: 'https://search.brave.com/search?q={query}&source=web',
      maxDepth: 30,
      maxNodes: 10000,
      timeout: 10000,
      userAgent: 'Mozilla/5.0 (compatible; NeoBrowse/1.0)',
      timeFormat: '24h'
    };

    this.debugPanel?.info("Settings manager initialized");  
    this.debugPanel?.debug(`Default config path: ${this.configPath}`);

    this.searchEngines = {
      'https://searx.be/search?q={query}&format=html': 'Searx',
      'https://search.brave.com/search?q={query}&source=web': 'Brave',
      'https://duckduckgo.com/html/?q={query}': 'DuckDuckGo',
      'https://www.startpage.com/do/search?q={query}': 'StartPage',
    };

    this.configPath = path.join(
      process.env.XDG_CONFIG_HOME || 
      path.join(process.env.HOME || process.env.USERPROFILE, '.config'),
      'neobrowse',
      'config.json'
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
        this.debugPanel?.debug(`Loading settings from ${this.configPath}`);
        const rawData = fs.readFileSync(this.configPath, 'utf8');
        const loadedSettings = JSON.parse(rawData);
        
        this.settings = { ...this.settings, ...loadedSettings };
        this.debugPanel?.info("Settings loaded successfully");
      } else {
        this.debugPanel?.debug("No settings file found - using defaults");
      }
    } catch (err) {
      this.debugPanel?.error(`Failed to load settings: ${err.message}`);
      this.browser.showWarning('Corrupt settings - using defaults');
    }
  }

  saveSettings() {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
          this.debugPanel?.debug(`Creating config directory: ${configDir}`);
          fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), { mode: 0o600 });
      this.debugPanel?.info(`Settings saved to ${this.configPath}`);
      return true;
    } catch (err) {
      this.debugPanel?.error(`Failed to save settings: ${err.message}`);
      this.browser.showWarning('Failed to save settings');
      return false;
    }
  }

  showSettings() {
    if (this.browser.isModalOpen) {
      this.debugPanel?.debug("Skipping settings (another modal is open)"); 
      return;
    }
    
    try {
      this.debugPanel?.info("Opening settings modal");
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
        content: `Settings`,
        style: { fg: 'cyan', bold: true }
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
        content: 'Enter: Edit • S: Save • D: Reset Defaults • Esc: Close',
        style: { fg: 'gray' }
      });

      this.settingsList.on('select', (item, index) => {
        this.handleSettingSelect(index);
      });

      const handleClose = () => {
        this.cleanup();
      };

      bindKey(this.settingsList, ['s', 'S'], this.debugPanel, () => this.handleSave());
      bindKey(this.screen, ['escape'], this.debugPanel, handleClose);
      bindKey(this.screen, ['d', 'D'], this.debugPanel, () => this.showResetConfirmation());

      this.settingsList.focus();
      this.browser.currentScreen.render();

    } catch (err) {
      this.debugPanel?.error(`Settings modal error: ${err.message}`);
      this.browser.showWarning('Failed to show settings');
      this.cleanup();
    }
  }

  updateSettingsDisplay() {
    const engineName = this.searchEngines[this.currentSettings.searchEngine] || 'Custom';

    const items = [
      `Search Engine: ${engineName}`,
      `Max Depth: ${this.currentSettings.maxDepth}`,
      `Max Nodes: ${this.currentSettings.maxNodes}`,
      `Timeout: ${this.currentSettings.timeout}ms`,
      `User Agent: ${this.currentSettings.userAgent.slice(0, 40)}...`,
      `Time Format: ${this.currentSettings.timeFormat === '24h' ? '24-hour' : '12-hour'}`
    ];

    this.settingsList.setItems(items);
    this.browser.currentScreen.render();
  }

  handleSettingSelect(index) {
    const settingNames = [
      'Search Engine', 
      'Max Depth', 
      'Max Nodes', 
      'Timeout', 
      'User Agent', 
      'Time Format'
    ];
    this.debugPanel?.debug(`Selected setting: ${settingNames[index]}`);

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
      case 5:
        this.showTimeFormatSelector();
        break;
      case 6:
        this.showResetConfirmation();
        break;
    }
  }

  showTimeFormatSelector() {
    const formats = {
      '24-hour': '24h',
      '12-hour': '12h'
    };

    let selectedIndex = this.currentSettings.timeFormat === '24h' ? 0 : 1;

    const popup = blessed.list({
      parent: this.overlay,
      top: 'center',
      left: 'center',
      width: 30,
      height: 6,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        item: { fg: 'white' },
        selected: { bg: 'blue', fg: 'white' }
      },
      items: Object.keys(formats).map((format, i) => 
        i === selectedIndex ? `> ${format}` : `  ${format}`
      ),
      keys: true,
      mouse: true
    });

    popup.select(selectedIndex);

    popup.on('select', (item, index) => {
      const selectedFormat = Object.values(formats)[index];
      this.currentSettings.timeFormat = selectedFormat;
      popup.destroy();
      this.updateSettingsDisplay();
      this.settingsList.focus();
    });

    bindKey(popup, ['escape'], this.debugPanel, () => {
      popup.destroy();
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });

    popup.focus();
    this.browser.currentScreen.render();
  }

  showUserAgentSelector() {
    this.debugPanel?.debug("Opening user agent selector");
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
      this.debugPanel?.info(`Selected user agent: ${agentNames[index]}`);
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

    bindKey(popup, ['escape'], this.debugPanel, () => {
      popup.destroy();
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });

    popup.focus();
    this.browser.currentScreen.render();
  }

  showSearchEngineSelector() {
    this.debugPanel?.debug("Opening search engine selector");
    const selectorEngines = {};
    for (const [url, name] of Object.entries(this.searchEngines)) {
      selectorEngines[name] = url;
    }
    selectorEngines['Custom'] = 'custom';

    let selectedIndex = 0;
    const currentEngine = this.currentSettings.searchEngine;
    const entries = Object.entries(selectorEngines);
    
    for (let i = 0; i < entries.length; i++) {
      if (entries[i][1] === currentEngine) {
        selectedIndex = i;
        break;
      }
    }

    const displayItems = Object.keys(selectorEngines).map((name, index) => {
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
      const engineNames = Object.keys(selectorEngines);
      this.debugPanel?.info(`Selected search engine: ${engineNames[index]}`);
      const selectedName = engineNames[index];
      
      if (selectedName === 'Custom') {
        popup.destroy();
        const initialValue = Object.values(selectorEngines).slice(0, -1).includes(currentEngine) 
          ? '' 
          : currentEngine;
          
        this.showTextInput(
          'Custom Search Engine', 
          'searchEngine', 
          initialValue,
          (newValue) => {
            this.currentSettings.searchEngine = newValue;
            this.updateSettingsDisplay();
            this.settingsList.focus();
          }
        );
      } else {
        this.currentSettings.searchEngine = selectorEngines[selectedName];
        popup.destroy();
        this.updateSettingsDisplay();
        this.settingsList.focus();
      }
    });

    bindKey(popup, ['escape'], this.debugPanel, () => {
      popup.destroy();
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });

    popup.focus();
    this.browser.currentScreen.render();
  }

  showNumberInput(label, key, currentValue, min, max) {
    this.debugPanel?.debug(`Editing number setting: ${label}`); 
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
      this.debugPanel?.info(`Updated ${label} to ${value}`);
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= min && numValue <= max) {
        this.currentSettings[key] = numValue;
        popup.destroy();
        this.updateSettingsDisplay();
        this.settingsList.focus();
      }
    });

    bindKey(input, ['escape'], this.debugPanel, () => {
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

    bindKey(input,input,  ['escape'], this.debugPanel, () => {
      popup.destroy();
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });

    input.focus();
    this.browser.currentScreen.render();
  }

  handleSave() {
    this.debugPanel?.info("Saving settings changes");
    this.settings = { ...this.currentSettings };
    if (this.saveSettings()) {
      this.debugPanel?.debug("Showing save confirmation");  
      this.showConfirmation();
    }
  }

  showResetConfirmation() {
    const popup = blessed.box({
      parent: this.overlay,
      top: 'center',
      left: 'center',
      width: 50,
      height: 8,
      border: { type: 'line' },
      style: {
        border: { fg: 'red' },
        bg: 'black'
      }
    });

    blessed.text({
      parent: popup,
      top: 1,
      left: 'center',
      content: 'Reset to defaults?',
      style: { fg: 'white', bold: true }
    });

    blessed.text({
      parent: popup,
      top: 3,
      left: 'center',
      content: 'This cannot be undone',
      style: { fg: 'red' }
    });

    const yesButton = blessed.button({
      parent: popup,
      top: 5,
      left: '30%-6',
      width: 12,
      height: 1,
      content: '{center}Yes{/center}',
      style: {
        bg: 'red',
        fg: 'white',
        focus: { bg: 'darkred' }
      },
      tags: true
    });

    const noButton = blessed.button({
      parent: popup,
      top: 5,
      left: '70%-6',
      width: 12,
      height: 1,
      content: '{center}No{/center}',
      style: {
        bg: 'gray',
        fg: 'white',
        focus: { bg: 'darkgray' }
      }, 
      tags: true
    });

    yesButton.on('press', () => {
      this.resetToDefaults();
      popup.destroy();
      this.updateSettingsDisplay();
      this.settingsList.focus();
    });

    noButton.on('press', () => {
      popup.destroy();
      this.settingsList.focus();
    });

    bindKey(popup, ['escape'], this.debugPanel, () => {
      popup.destroy();
      this.settingsList.focus();
    });

    bindKey(yesButton, ['right', 'left'], this.debugPanel, () => noButton.focus());
    bindKey(noButton, ['left', 'right'], this.debugPanel, () => yesButton.focus());

    noButton.key(['enter'], () => {
      popup.destroy();
      this.settingsList.focus();
    });

    yesButton.focus();
    this.browser.currentScreen.render();
  }

  resetToDefaults() {
    this.debugPanel?.info("Resetting settings to defaults");
    this.currentSettings = {
      searchEngine: 'https://search.brave.com/search?q={query}&source=web',
      maxDepth: 30,
      maxNodes: 10000,
      timeout: 10000,
      userAgent: 'Mozilla/5.0 (compatible; NeoBrowse/1.0)',
      timeFormat: '24h'
    };
    
    this.settings = { ...this.currentSettings };
    this.saveSettings();
    
    this.browser.showMessage('Settings reset to defaults');
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

    bindKey(popup, ['.', 'escape', 'enter', 'space', 'q'], this.debugPanel, () => {
      popup.destroy();
      this.cleanup();
    });

    popup.focus();
    this.browser.currentScreen.render();
  }

  cleanup() {
    this.debugPanel?.debug("Cleaning up settings modal");
    if (this.settingsList) {
      this.settingsList.removeAllListeners();
      this.settingsList = null;
    }
    
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    
    this.browser.isModalOpen = false;
    this.debugPanel?.debug("Settings modal closed");
    this.browser.currentScreen?.render();
  }
}
