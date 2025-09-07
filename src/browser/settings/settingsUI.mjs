import blessed from 'blessed';
import { bindKey } from '../../renderers/tuiRenderer/tuiHandlers.mjs';
import { SEARCH_ENGINES, USER_AGENTS, TIME_FORMATS } from '../../constants/settingsConfig.mjs';
import { createFooter } from '../../renderers/tuiRenderer/tuiComponents.mjs';

export class settingsUI {
  constructor(browser, screen, logger) {
    this.browser = browser;
    this.screen = screen;
    this.logger = logger;
    this.overlay = null;
    this.settingsList = null;
    this.activePopup = null;
    this.footer = null;
  }

  show(settings, onSave, onReset) {
    if (this.browser.isModalOpen) {
      this.logger?.debug("Skipping settings (another modal is open)");
      return;
    }

    this.footer = createFooter('settings');
    this.screen.append(this.footer);

    this.browser.isModalOpen = true;
    this.createOverlay();
    this.createSettingsList(settings);
    this.bindEvents(onSave, onReset); 
    this.settingsList.focus();

    this.footer.setFront();

    this.screen.render();
  }

  createOverlay() {
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
      content: 'Settings',
      style: { fg: 'cyan', bold: true }
    });
  }

  createSettingsList(settings) {
    this.settingsList = blessed.list({
      parent: this.overlay,
      top: 3,
      left: 'center',
      width: '80%',
      height: '55%',
      border: { type: 'line' },
      style: {
        border: { fg: 'cyan' },
        item: { fg: 'white' },
        selected: { bg: 'blue', fg: 'white' }
      },
      keys: true,
      mouse: true,
      vi: true,
      scrollable: true
    });

    this.updateDisplay(settings);
  }

  updateDisplay(settings) {
    const engineName = this.getKeyByValue(SEARCH_ENGINES, settings.searchEngine) || 'Custom';
    const userAgentName = this.getKeyByValue(USER_AGENTS, settings.userAgent) || 'Custom';
    const timeFormatName = this.getKeyByValue(TIME_FORMATS, settings.timeFormat) || settings.timeFormat;

    const items = [
      `Search Engine: ${engineName}`,
      `Max Depth: ${settings.maxDepth}`,
      `Max Nodes: ${settings.maxNodes}`,
      `Timeout: ${settings.timeout}ms`,
      `User Agent: ${userAgentName}`,
      `Time Format: ${timeFormatName}`
    ];

    this.settingsList.setItems(items);
    this.browser.currentScreen.render();
  }

  getKeyByValue(object, value) {
    for (const [key, val] of Object.entries(object)) {
      if (val === value) {
        return key;
      }
    }
    return null;
  }

  bindEvents(onSave, onReset) {
    const isPopupOpen = () => this.activePopup !== null; 

    bindKey(this.settingsList, ['C-s'], () => {
      if (!this.activePopup) onSave();
    });

    bindKey(this.settingsList, ['d'], () => {
      if (!this.activePopup) onReset();
    });

    bindKey(this.settingsList, ['escape'], () => {
      if (this.activePopup) return;  
      this.cleanup();

      if (this.browser.settingsManager) {
        this.browser.settingsManager.cleanup();
      }
    });
  }

  showSelector(title, options, currentValue, onSelect) {
    const keys = Object.keys(options);
    let selectedIndex = 0;
    
    for (let i = 0; i < keys.length; i++) {
      if (options[keys[i]] === currentValue) {
        selectedIndex = i;
        break;
      }
    }

    const popup = blessed.list({
      parent: this.overlay,
      top: 'center',
      left: 'center',
      width: Math.max(40, title.length + 10),
      height: Math.min(keys.length + 4, 12),
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        item: { fg: 'white' },
        selected: { bg: 'blue', fg: 'white' }
      },
      items: keys,
      keys: true,
      mouse: true
    });
    this.activePopup = popup;

    popup.select(selectedIndex);

    popup.on('select', (item, index) => {
      const selectedKey = keys[index];
      popup.destroy();
      this.activePopup = null;
      
      if (selectedKey === 'Custom') {
        const initialValue = Object.values(options).includes(currentValue) ? '' : currentValue;
        this.showTextInput(title, initialValue, onSelect);
      } else {
        onSelect(options[selectedKey]);
        this.settingsList.focus();
      }
    });

    bindKey(popup, ['escape'], () => {
      popup.destroy();
      this.activePopup = null;
      this.settingsList.focus();
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });

    popup.focus();
    this.browser.currentScreen.render();
  }

  showNumberInput(label, currentValue, min, max, onSubmit) {
    const popup = this.createInputPopup(label, `(${min}-${max})`);
    this.activePopup = popup;
    
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

    input.on('submit', (value) => {
      try {
        const num = parseInt(value);
        if (isNaN(num) || num < min || num > max) {
          throw new Error(`Must be between ${min} and ${max}`);
        }
        popup.destroy();
        this.activePopup = null;
        onSubmit(num);
        this.settingsList.focus();
      } catch (err) {
        this.logger?.warn(err.message);
      }
    });

    this.bindInputEvents(input, popup);
    input.focus();
  }

  showTextInput(label, currentValue, onSubmit) {
    const popup = this.createInputPopup(label);
    this.activePopup = popup;
    
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

    input.on('submit', (value) => {
      if (value.trim()) {
        popup.destroy();
        this.activePopup = null;
        onSubmit(value.trim());
        this.settingsList.focus();
      }
    });

    this.bindInputEvents(input, popup);
    input.focus();
  }

  createInputPopup(label, suffix = '') {
    const contentWidth = Math.max(50, label.length + (suffix ? suffix.length : 0) + 10);

    const popup = blessed.box({
      parent: this.overlay,
      top: 'center',
      left: 'center',
      width: contentWidth,
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
      content: `${label} ${suffix}:`,
      style: { fg: 'white' }
    });

    blessed.text({
      parent: popup,
      bottom: 1,
      left: 2,
      content: 'Enter: Save • Esc: Cancel',
      style: { fg: 'gray' }
    });

    return popup;
  }

  bindInputEvents(input, popup) {
    bindKey(input, ['escape'], () => {
      popup.destroy();
      this.activePopup = null;
      this.settingsList.focus();
      this.browser.currentScreen.render();
    });
  }

  showConfirmation(message, onConfirm) {
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
    this.activePopup = popup;

    blessed.text({
      parent: popup,
      top: 1,
      left: 'center',
      content: message,
      style: { fg: 'white', bold: true }
    });
    
    const noBtn = this.createButton(popup, 'No', '30%-6', 'gray', () => {
      popup.destroy();
      this.activePopup = null;
      this.settingsList.focus();
    });

    const yesBtn = this.createButton(popup, 'Yes', '70%-6', 'red', () => {
      popup.destroy();
      this.activePopup = null;
      onConfirm();
    });

    bindKey(yesBtn, ['left'], () => noBtn.focus());
    bindKey(noBtn, ['right'], () => yesBtn.focus());

    bindKey(yesBtn, ['escape'], () => {
      popup.destroy();
      this.activePopup = null;
      this.settingsList.focus();
    });

    bindKey(noBtn, ['escape'], () => {
      popup.destroy();
      this.activePopup = null;
      this.settingsList.focus();
    });

    noBtn.focus();
    this.browser.currentScreen.render();
  }

  createButton(parent, text, left, color, onClick) {
    const button = blessed.button({
      parent,
      top: 5,
      left,
      width: 12,
      height: 1,
      content: `{center}${text}{/center}`,
      style: {
        fg: 'white',
        focus: { bg: color }
      },
      tags: true
    });

    button.on('press', onClick);
    return button;
  }

  cleanup() {
    this.logger?.debug("Cleaning up settings UI resources");

    if (this.activePopup) {
        this.activePopup.destroy();
        this.activePopup = null;
    }

    if (this.settingsList) {
        this.settingsList.removeAllListeners();
        this.settingsList.destroy();
        this.settingsList = null;
    }
    
    if (this.overlay) {
        this.overlay.destroy();
        this.overlay = null;
    }
    
    if (this.footer) {
        this.footer.destroy();
        this.footer = null;
    }
    
    this.browser.isModalOpen = false;
    this.screen?.render();
  }
}
