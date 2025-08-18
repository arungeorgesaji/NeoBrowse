import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { LOG_LEVELS, LOG_LEVEL_NAMES, LOG_COLORS } from '../constants/log.mjs';

let instance = null;

class logger {
  constructor(options = {}) {
    if (instance) {
      return instance;
    }

    const configDir = process.env.XDG_CONFIG_HOME || 
      path.join(process.env.HOME || process.env.USERPROFILE, '.config');
    const appDir = path.join(configDir, 'neobrowse');
    
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    this.logFilePath = options.logFilePath || path.join(appDir, 'debug.log');
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
    this.info(`Initializing logger (log level: ${LOG_LEVEL_NAMES[this.logLevel]})`);

      
    instance = this;
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

  log(message, level = LOG_LEVELS.INFO, metadata = {}) {
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

  setLogFilter(filter) {
    try {
      this.logFilter = filter ? new RegExp(filter, 'i') : null;
      this.info(`Log filter set to ${filter || 'none'}`);
    } catch (err) {
      this.error(`Invalid log filter: ${filter}`);
    }
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
  }

  fullClear() {
    const count = this.sessionLogs.length;
    this.sessionLogs = [];
    this.allLogsCount = 0;
    this.clearedCount += count;
    fs.writeFileSync(this.logFilePath, '');
    this.warn(`Cleared ALL logs (${count} session logs removed)`);
  }
}

export function getLogger(options) {
  if (!instance) {
    instance = new logger(options);
  }
  return instance;
}
