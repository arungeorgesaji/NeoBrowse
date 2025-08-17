import fs from 'fs';
import blessed from 'blessed';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs';
import { LOG_LEVELS, LOG_LEVEL_NAMES, LOG_COLORS } from '../constants/log.mjs'; 
import chalk from 'chalk';

export class debugPanel {
  constructor(screen, options = {}) {
    this.screen = screen;
    this.logFilePath = options.logFilePath || './debug.log';
    this.maxFileLines = options.maxFileLines || 100000; 
    this.sessionLogs = []; 
    this.allLogsCount = 0; 
    this.clearedCount = 0;
    this.sessionStartTime = this.formatTime(new Date());
    this.logLevel = options.logLevel || LOG_LEVELS.INFO; 
    this.logFilter = options.logFilter || null;

    this.info(`Initializing debug panel (log level: ${LOG_LEVEL_NAMES[this.logLevel]})`);
    
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

    this.info(`Session started at ${this.sessionStartTime}`, LOG_LEVELS.INFO);

    if (options.toggleKey) {
      bindKey(this.screen, [options.toggleKey], this, () => this.toggle());
    }

    if (options.clearKey) {
      bindKey(this.screen, [options.clearKey], this, () => this.clearVisible());
    }

    if (options.fullClearKey) {
      bindKey(this.screen, [options.fullClearKey], this, this.debugPanel, () => this.fullClear());
    }

    if (options.levelUpKey) {
      bindKey(this.screen, [options.levelUpKey], this, () => this.adjustLogLevel(1));
    }

    if (options.levelDownKey) {
      bindKey(this.screen, [options.levelDownKey], this, () => this.adjustLogLevel(-1));
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
      this.error('Failed to load log count - resetting', { error: err.message });
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

  adjustLogLevel(direction) {
    const levels = Object.values(LOG_LEVELS).sort((a, b) => a - b);
    const currentIndex = levels.indexOf(this.logLevel);
    const newIndex = Math.max(0, Math.min(levels.length - 1, currentIndex + direction));
    
    if (newIndex !== currentIndex) {
      const newLevel = levels[newIndex];
      this.logLevel = newLevel;
      this.info(`Log level changed from ${LOG_LEVEL_NAMES[this.logLevel]} to ${LOG_LEVEL_NAMES[newLevel]}`);
      this.refreshPanel();
    } else {
      const limit = direction > 0 ? 'maximum' : 'minimum';
      this.debug(`Already at ${limit} log level (${LOG_LEVEL_NAMES[this.logLevel]})`);
    }
  }

  setLogFilter(filter) {
    try {
      this.logFilter = filter ? new RegExp(filter, 'i') : null;
      this.info(`Log filter set to ${filter || 'none'}`);
      this.refreshPanel();
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

    bindKey(popup, ['escape'], this, () => {
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
      this.debug(`Trimmed log file to ${trimmedLines.length}/${this.maxFileLines} lines`);
    } catch (err) {
      this.error('Failed to trim log file', { error: err.message });
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
    this.warn(`Cleared ALL logs (${count} session logs removed)`);
    if (!this.panel.hidden) this.refreshPanel();
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
    this.info(`Cleared ${count} session logs`);
  }

  destroy() {
    this.panel.destroy();
  }
}
