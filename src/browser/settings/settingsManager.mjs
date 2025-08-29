import { settingsStorage } from './settingsStorage.mjs';
import { settingsValidator } from './settingsValidator.mjs';
import { settingsUI } from './settingsUI.mjs';
import { DEFAULT_SETTINGS, SEARCH_ENGINES, USER_AGENTS, TIME_FORMATS } from '../../constants/settingsConfig.mjs';
import { getLogger } from '../../utils/logger.mjs';
import { warningManager } from '../../utils/warningManager.mjs';

export class settingsManager {
  constructor(browserInstance, screen) {
    this.browser = browserInstance;
    this.screen = screen;
    this.logger = getLogger();
    this.warningTimeout = null;
    this.warningManager = new warningManager(screen);
    this.storage = new settingsStorage(this.logger);
    this.ui = new settingsUI(browserInstance, screen, this.logger);
    this.settings = this.loadSettings();
    this.currentSettings = { ...this.settings };
    
    this.logger?.info("Settings manager initialized");
  }

  loadSettings() {
    try {
      const settings = this.storage.load();
      this.logger?.debug("Settings loaded successfully");
      return settings;
    } catch (err) {
      this.warningManager.showWarning('Corrupt settings - using defaults');
      this.logger?.error('Failed to load settings: ' + err.message);
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings() {
    try {
      this.storage.save(this.settings);
      this.logger?.debug("Settings saved successfully");
      return true;
    } catch (err) {
      this.warningManager.showWarning('Failed to save settings');
      this.logger?.error('Failed to save settings: ' + err.message);
      return false;
    }
  }

  showSettings() {
    this.currentSettings = { ...this.settings };
    this.logger?.debug("Opening settings interface");
    
    this.ui.show(
      this.currentSettings,
      () => this.handleSave(),
      () => this.handleReset()
    );

    this.ui.settingsList.on('select', (item, index) => {
      this.logger?.debug(`Settings item selected: ${index}`);
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
    } else {
      this.logger?.warn(`Invalid settings index: ${index}`);
    }
  }

  editSearchEngine() {
    this.logger?.debug("Editing search engine setting");
    const engines = { ...SEARCH_ENGINES, 'Custom': 'custom' };
    this.ui.showSelector('Search Engine', engines, this.currentSettings.searchEngine, (value) => {
      if (!value) {
        this.warningManager.showWarning('No search engine selected');
        this.logger?.warn("Search engine selection cancelled or invalid");
        return;
      }
      this.currentSettings.searchEngine = value;
      this.logger?.debug(`Search engine set to: ${value}`);
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editUserAgent() {
    this.logger?.debug("Editing user agent setting");
    const agents = { ...USER_AGENTS, 'Custom': 'custom' };
    this.ui.showSelector('User Agent', agents, this.currentSettings.userAgent, (value) => {
      if (!value) {
        this.warningManager.showWarning('No user agent selected');
        this.logger?.warn("User agent selection cancelled or invalid");
        return;
      }
      this.currentSettings.userAgent = value;
      this.logger?.debug(`User agent set to: ${value}`);
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editTimeFormat() {
    this.logger?.debug("Editing time format setting");
    this.ui.showSelector('Time Format', TIME_FORMATS, this.currentSettings.timeFormat, (value) => {
      if (!value) {
        this.warningManager.showWarning('No time format selected');
        this.logger?.warn("Time format selection cancelled or invalid");
        return;
      }
      this.currentSettings.timeFormat = value;
      this.logger?.debug(`Time format set to: ${value}`);
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editMaxDepth() {
    this.logger?.debug("Editing max depth setting");
    this.ui.showNumberInput('Max Depth', this.currentSettings.maxDepth, 1, 100, (value) => {
      if (value === null || value === undefined || value < 1 || value > 100) {
        this.warningManager.showWarning('Invalid depth value (1-100)');
        this.logger?.warn(`Invalid max depth value: ${value}`);
        return;
      }
      this.currentSettings.maxDepth = value;
      this.logger?.debug(`Max depth set to: ${value}`);
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editMaxNodes() {
    this.logger?.debug("Editing max nodes setting");
    this.ui.showNumberInput('Max Nodes', this.currentSettings.maxNodes, 10, 100000, (value) => {
      if (value === null || value === undefined || value < 10 || value > 100000) {
        this.warningManager.showWarning('Invalid nodes value (10-100000)');
        this.logger?.warn(`Invalid max nodes value: ${value}`);
        return;
      }
      this.currentSettings.maxNodes = value;
      this.logger?.debug(`Max nodes set to: ${value}`);
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  editTimeout() {
    this.logger?.debug("Editing timeout setting");
    this.ui.showNumberInput('Timeout (ms)', this.currentSettings.timeout, 1000, 30000, (value) => {
      if (value === null || value === undefined || value < 1000 || value > 30000) {
        this.warningManager.showWarning('Invalid timeout value (1000-30000)');
        this.logger?.warn(`Invalid timeout value: ${value}`);
        return;
      }
      this.currentSettings.timeout = value;
      this.logger?.debug(`Timeout set to: ${value}ms`);
      this.ui.updateDisplay(this.currentSettings);
    });
  }

  handleSave() {
    this.logger?.debug("Attempting to save settings");
    try {
      this.settings = settingsValidator.validateSettings(this.currentSettings);
      if (this.saveSettings()) {
        this.warningManager.showWarning('Settings saved successfully!');
        this.logger?.info("Settings saved and validated successfully");
      } else {
        this.warningManager.showWarning('Failed to save settings');
        this.logger?.error("Settings validation passed but save failed");
      }
    } catch (err) {
      this.warningManager.showWarning(err.message);
      this.logger?.error('Settings validation failed: ' + err.message);
    }
  }

  handleReset() {
    this.logger?.debug("Showing reset confirmation");
    this.ui.showConfirmation('Reset to defaults?', () => {
      this.logger?.info("Resetting settings to defaults");
      this.currentSettings = { ...DEFAULT_SETTINGS };
      this.settings = { ...DEFAULT_SETTINGS };
      if (this.saveSettings()) {
        this.warningManager.showWarning('Settings reset to defaults');
        this.logger?.info("Settings reset to defaults successfully");
        this.ui.updateDisplay(this.currentSettings);
      } else {
        this.warningManager.showWarning('Failed to reset settings');
        this.logger?.error("Failed to save settings after reset");
      }
    });
  }

  get searchEngine() { 
    this.logger?.debug(`Getting search engine: ${this.settings.searchEngine}`);
    return this.settings.searchEngine; 
  }
  
  get maxDepth() { 
    this.logger?.debug(`Getting max depth: ${this.settings.maxDepth}`);
    return this.settings.maxDepth; 
  }
  
  get maxNodes() { 
    this.logger?.debug(`Getting max nodes: ${this.settings.maxNodes}`);
    return this.settings.maxNodes; 
  }
  
  get timeout() { 
    this.logger?.debug(`Getting timeout: ${this.settings.timeout}`);
    return this.settings.timeout; 
  }
  
  get userAgent() { 
    this.logger?.debug(`Getting user agent: ${this.settings.userAgent}`);
    return this.settings.userAgent; 
  }
  
  get timeFormat() { 
    this.logger?.debug(`Getting time format: ${this.settings.timeFormat}`);
    return this.settings.timeFormat; 
  }
}
