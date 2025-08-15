import fs from 'fs';
import blessed from 'blessed';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs'

export class debugPanel {
  constructor(screen, options = {}) {
    this.screen = screen;
    this.logFilePath = options.logFilePath || './debug.log';
    this.maxLines = options.maxLines || 50;
    this.logEntries = [];
    
    this.panel = blessed.box({
      parent: this.screen,
      top: options.top || '80%',
      left: options.left || 0,
      width: options.width || '100%',
      height: options.height || '20%',
      content: '',
      scrollable: true,
      alwaysScroll: true,
      border: { type: 'line' },
      style: {
        fg: options.fgColor || 'yellow',
        border: { fg: options.borderColor || 'yellow' },
        scrollbar: { bg: 'blue' }
      },
      hidden: options.startHidden !== false 
    });

    if (options.toggleKey) {
      bindKey(this.screen, [options.toggleKey], () => this.toggle());
    }

    if (options.clearKey) {
      bindKey(this.screen, [options.clearKey], () => {
        this.clear();
        this.log('Debug log cleared'); 
      });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level}] ${message}`;
    
    this.logEntries.push(entry);
    if (this.logEntries.length > this.maxLines) {
      this.logEntries.shift();
    }
    
    if (!this.panel.hidden) {
      this.panel.setContent(this.logEntries.join('\n'));
      this.panel.scrollTo(this.logEntries.length);
      this.screen.render();
    }
    
    fs.appendFileSync(this.logFilePath, entry + '\n');
  }

  show() {
    this.panel.hidden = false;
    this.panel.setContent(this.logEntries.join('\n'));
    this.panel.scrollTo(this.logEntries.length);
    this.screen.render();
  }

  hide() {
    this.panel.hidden = true;
    this.screen.render();
  }

  toggle() {
    if (this.panel.hidden) {
      this.show();
    } else {
      this.hidden();
    }
  }

  clear() {
    this.logEntries = [];
    if (!this.panel.hidden) {
      this.panel.setContent('');
      this.screen.render();
    }
    fs.writeFileSync(this.logFilePath, '');
  }

  destroy() {
    this.panel.destroy();
  }
}
