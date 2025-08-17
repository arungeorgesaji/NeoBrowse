import fs from 'fs';
import blessed from 'blessed';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs';
import chalk from 'chalk';

export class debugPanel {
  constructor(screen, options = {}) {
    this.screen = screen;
    this.initialized = false;
    this.logFilePath = options.logFilePath || './debug.log';
    this.maxFileLines = options.maxFileLines || 100000; 
    this.sessionLogs = []; 
    this.allLogsCount = 0; 
    this.clearedCount = 0;
    this.sessionStartTime = this.formatTime(new Date());
    
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, '');
    }

    this.loadLogCount();

    this.panel = blessed.box({
      parent: this.screen,
      top: options.top || '80%',
      left: options.left || 0,
      width: options.width || '100%',
      height: options.height || '20%',
      content: this.getVisibleLogs(),
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

    this.log(`Session started at ${this.sessionStartTime}`);

    if (options.toggleKey) {
      bindKey(this.screen, [options.toggleKey], () => this.toggle());
    }

    if (options.clearKey) {
      bindKey(this.screen, [options.clearKey], () => this.clearVisible());
    }

    if (options.fullClearKey) {
      bindKey(this.screen, [options.fullClearKey], () => this.fullClear());
    }
  }

  formatTime(date) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-').replace(',', '');
  }

  loadLogCount() {
    try {
      const logContent = fs.readFileSync(this.logFilePath, 'utf-8');
      this.allLogsCount = logContent.split('\n').filter(line => line.trim()).length;
    } catch (err) {
      this.allLogsCount = 0;
      fs.writeFileSync(this.logFilePath, '');
    }
  }

  getVisibleLogs() {
    const visibleLogs = [...this.sessionLogs];
    
    if (this.allLogsCount > 0) {
      visibleLogs.unshift(
        chalk.gray(`[Session logs - ${this.sessionLogs.length} entries | Total in file: ${this.allLogsCount}]`)
      );
    } else {
      visibleLogs.unshift(
        chalk.gray(`[Session logs - ${this.sessionLogs.length} entries]`)
      );
    }
    
    return visibleLogs.join('\n');
  }

  log(message, level = 'info') {
    const timestamp = this.formatTime(new Date());
    const entry = `[${timestamp}] [${level}] ${message}`;
    
    this.sessionLogs.push(entry);
    
    fs.appendFileSync(this.logFilePath, entry + '\n');
    this.allLogsCount++;
    
    if (this.allLogsCount > this.maxFileLines) {
      this.trimLogFile();
    }
    
    if (!this.panel.hidden) {
      this.refreshPanel();
    }
  }

  trimLogFile() {
    try {
      const logContent = fs.readFileSync(this.logFilePath, 'utf-8');
      const allLines = logContent.split('\n').filter(line => line.trim());
      const trimmedLines = allLines.slice(-this.maxFileLines);
      fs.writeFileSync(this.logFilePath, trimmedLines.join('\n'));
      this.allLogsCount = trimmedLines.length;
    } catch (err) {
      console.error('Error trimming log file:', err);
    }
  }

  refreshPanel() {
    this.panel.setContent(this.getVisibleLogs());
    this.panel.scrollTo(this.sessionLogs.length);
    this.screen.render();
  }

  show() {
    this.panel.hidden = false;
    this.refreshPanel();
  }

  hide() {
    this.panel.hidden = true;
    this.screen.render();
  }

  toggle() {
    if (this.panel.hidden) {
      this.show();
    } else {
      this.hide();
    }
  }

  clearVisible() {
    const count = this.sessionLogs.length;
    this.sessionLogs = [];
    this.clearedCount += count;
    
    const timestamp = this.formatTime(new Date());
    const entry = `[${timestamp}] [info] Cleared ${count} visible logs (${this.clearedCount} total cleared)`;
    fs.appendFileSync(this.logFilePath, entry + '\n');
    this.allLogsCount++;
    
    this.refreshPanel();
  }

  fullClear() {
    const count = this.sessionLogs.length;
    this.sessionLogs = [];
    this.allLogsCount = 0;
    this.clearedCount += count;
    fs.writeFileSync(this.logFilePath, '');
    
    if (!this.panel.hidden) {
      this.refreshPanel();
    }
    this.log('Fully cleared all logs and file');
  }

  clearSessionLogs() {
    const count = this.sessionLogs.length;
    this.sessionLogs = [];
    this.clearedCount += count;
    
    const timestamp = this.formatTime(new Date());
    const entry = `[${timestamp}] [info] Cleared ${count} session logs (${this.clearedCount} total cleared)`;
    fs.appendFileSync(this.logFilePath, entry + '\n');
    this.allLogsCount++;
    
    this.refreshPanel();
    this.log(`Cleared ${count} session logs`);
  }

  destroy() {
    this.panel.destroy();
  }
}
