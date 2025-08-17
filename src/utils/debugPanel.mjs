import fs from 'fs';
import blessed from 'blessed';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs';
import { LOG_LEVELS, LOG_LEVEL_NAMES, LOG_COLORS } from '../constants/log.mjs'; 
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
    this.logLevel = options.logLevel || LOG_LEVELS.INFO; 
    this.logFilter = options.logFilter || null;
    
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

    this.log(`Session started at ${this.sessionStartTime}`, LOG_LEVELS.INFO);

    if (options.toggleKey) {
      bindKey(this.screen, [options.toggleKey], () => this.toggle());
    }

    if (options.clearKey) {
      bindKey(this.screen, [options.clearKey], () => this.clearVisible());
    }

    if (options.fullClearKey) {
      bindKey(this.screen, [options.fullClearKey], () => this.fullClear());
    }

    if (options.setLevelKey) {
      bindKey(this.screen, [options.setLevelKey], () => this.showLogLevelSelector());
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
    const filteredLogs = this.sessionLogs.filter(log => {
      const levelMatch = log.level >= this.logLevel;
      const filterMatch = this.logFilter 
        ? log.message.match(this.logFilter) 
        : true;
      return levelMatch && filterMatch;
    });

    const visibleLogs = filteredLogs.map(log => {
      const color = LOG_COLORS[log.level] || 'white';
      return chalk[color](`[${LOG_LEVEL_NAMES[log.level]}] ${log.message}`);
    });

    if (this.allLogsCount > 0) {
      visibleLogs.unshift(
        chalk.gray(`[Session logs - ${filteredLogs.length}/${this.sessionLogs.length} shown | ` +
                 `Level: ${LOG_LEVEL_NAMES[this.logLevel]} | ` +
                 `Total in file: ${this.allLogsCount}]`)
      );
    } else {
      visibleLogs.unshift(
        chalk.gray(`[Session logs - ${filteredLogs.length}/${this.sessionLogs.length} shown]`)
      );
    }

    return visibleLogs.join('\n');
  }

  log(message, level = LOG_LEVELS.INFO, metadata = {}) {
    if (level < this.logLevel) return;
    
    if (this.logFilter && !message.match(this.logFilter)) return;

    const timestamp = this.formatTime(new Date());
    const entry = {
      timestamp,
      level,
      message,
      ...metadata
    };

    this.sessionLogs.push(entry);
    
    const fileEntry = `[${timestamp}] [${LOG_LEVEL_NAMES[level]}] ${message}`;
    fs.appendFileSync(this.logFilePath, fileEntry + '\n');
    this.allLogsCount++;
    
    if (this.allLogsCount > this.maxFileLines) {
      this.trimLogFile();
    }
    
    if (!this.panel.hidden) {
      this.refreshPanel();
    }
  }

  debug(message, metadata) {
    this.log(message, LOG_LEVELS.DEBUG, metadata);
  }

  info(message, metadata) {
    this.log(message, LOG_LEVELS.INFO, metadata);
  }

  warn(message, metadata) {
    this.log(message, LOG_LEVELS.WARN, metadata);
  }

  error(message, metadata) {
    this.log(message, LOG_LEVELS.ERROR, metadata);
  }

  setLogLevel(level) {
    if (Object.values(LOG_LEVELS).includes(level)) {
      this.logLevel = level;
      this.refreshPanel();
      this.info(`Log level set to ${LOG_LEVEL_NAMES[level]}`);
    }
  }

  setLogFilter(filter) {
    try {
      this.logFilter = filter ? new RegExp(filter, 'i') : null;
      this.refreshPanel();
      this.info(`Log filter set to ${filter || 'none'}`);
    } catch (err) {
      this.error(`Invalid log filter: ${filter}`);
    }
  }

  showLogLevelSelector() {
    const popup = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 30,
      height: 8,
      border: { type: 'line' },
      style: {
        border: { fg: 'yellow' },
        item: { fg: 'white' },
        selected: { bg: 'blue', fg: 'white' }
      },
      items: Object.entries(LOG_LEVEL_NAMES).map(([value, name]) => 
        `${this.logLevel === parseInt(value) ? '> ' : '  '}${name}`
      ),
      keys: true,
      mouse: true
    });

    popup.on('select', (item, index) => {
      this.setLogLevel(index);
      popup.destroy();
      this.screen.render();
    });

    bindKey(popup, ['escape'], () => {
      popup.destroy();
      this.screen.render();
    });

    popup.focus();
    this.screen.render();
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
    
    const entry = {
      timestamp: this.formatTime(new Date()),
      level: LOG_LEVELS.INFO,
      message: `Cleared ${count} visible logs (${this.clearedCount} total cleared)`
    };
    
    this.sessionLogs.push(entry);
    fs.appendFileSync(this.logFilePath, 
      `[${entry.timestamp}] [INFO] ${entry.message}\n`);
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
