import { settingsStorage } from './settingsStorage.mjs';
import { settingsValidator } from './settingsValidator.mjs';
import { settingsUI } from './settingsUI.mjs';
import { DEFAULT_SETTINGS, SEARCH_ENGINES, USER_AGENTS, TIME_FORMATS } from '../../constants/settingsConfig.mjs';
import { getLogger } from '../../utils/logger.mjs';

export class settingsManager {
  constructor(browserInstance, screen) {
    this.browser = browserInstance;
    this.screen = screen;
    this.logger = getLogger();
    
    this.storage = new settingsStorage(this.logger);
    this.ui = new settingsUI(browserInstance, screen, this.logger);
    
    this.settings = this.loadSettings();
    this.currentSettings = { ...this.settings };
    
    this.logger?.info("Settings manager initialized");
  }

  loadSettings() {
    try {
      return this.storage.load();
    } catch (err) {
      this.browser.showWarning('Corrupt settings - using defaults');
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings() {
    try {
      this.storage.save(this.settings);
      return true;
    } catch (err) {
      this.browser.showWarning('Failed to save settings');
      return false;
    }
  }

  showSettings() {
    this.currentSettings = { ...this.settings };
    
    this.ui.show(
      this.currentSettings,
      () => this.handleSave(),
      () => this.handleReset()
    );

    // Handle setting selection
    this.ui.settingsList.on('select', (item, index) => {
      this.handleSettingSelect(index);
    });
  }

  handleSettingSelect(index) {
    const handlers = [
      () => this.editSearchEngine(),
      () => this.editMaxDepth(),
      () => this.editMaxNodes(),
      () => this.editTimeout(),
      () => this.editUserAgent(),
      () => this.editTimeFormat()
    ];

    if (handlers[index]) {
      handlers[index]();
    }
  }

  editSearchEngine() {
    const engines = { ...SEARCH_ENGINES, 'Custom': 'custom' };
    this.ui.showSelector('Search Engine', engines, this.currentSettings.searchEngine, (value) => {
      this.currentSettings.searchEngine = value;
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editUserAgent() {
    const agents = { ...USER_AGENTS, 'Custom': 'custom' };
    this.ui.showSelector('User Agent', agents, this.currentSettings.userAgent, (value) => {
      this.currentSettings.userAgent = value;
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editTimeFormat() {
    this.ui.showSelector('Time Format', TIME_FORMATS, this.currentSettings.timeFormat, (value) => {
      this.currentSettings.timeFormat = value;
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editMaxDepth() {
    this.ui.showNumberInput('Max Depth', this.currentSettings.maxDepth, 1, 100, (value) => {
      this.currentSettings.maxDepth = value;
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editMaxNodes() {
    this.ui.showNumberInput('Max Nodes', this.currentSettings.maxNodes, 10, 100000, (value) => {
      this.currentSettings.maxNodes = value;
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editTimeout() {
    this.ui.showNumberInput('Timeout (ms)', this.currentSettings.timeout, 1000, 30000, (value) => {
      this.currentSettings.timeout = value;
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  handleSave() {
    try {
      this.settings = SettingsValidator.validateSettings(this.currentSettings);
      if (this.saveSettings()) {
        this.ui.showMessage('Settings saved successfully!');
      }
    } catch (err) {
      this.browser.showWarning(err.message);
    }
  }

  handleReset() {
    this.ui.showConfirmation('Reset to defaults?', () => {
      this.currentSettings = { ...DEFAULT_SETTINGS };
      this.settings = { ...DEFAULT_SETTINGS };
      this.saveSettings();
      this.ui.updateDisplay(this.currentSettings);
      this.browser.showMessage('Settings reset to defaults');
    });
  }

  get searchEngine() { return this.settings.searchEngine; }
  get maxDepth() { return this.settings.maxDepth; }
  get maxNodes() { return this.settings.maxNodes; }
  get timeout() { return this.settings.timeout; }
  get userAgent() { return this.settings.userAgent; }
  get timeFormat() { return this.settings.timeFormat; }
}
