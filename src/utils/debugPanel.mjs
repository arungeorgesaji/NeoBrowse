import blessed from 'blessed';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs';
import { LOG_LEVELS, LOG_LEVEL_NAMES, LOG_COLORS, LOG_KEY_BINDINGS } from '../constants/log.mjs';
import chalk from 'chalk';
import { getLogger } from './logger.mjs';

export class debugPanel {
  constructor(screen, options = {}) {
    this.screen = screen;
    this.logger = getLogger();
    
    this.panel = blessed.box({
      parent: this.screen,
      top: options.top || '80%',
      left: options.left || 0,
      width: options.width || '100%',
      height: options.height || '20%',
      content: '',
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        inverse: true,
        style: { bg: 'blue' }
      },
      keys: true,
      vi: true,
      mouse: true,
      border: { type: 'line' },
      style: {
        fg: options.fgColor || 'yellow',
        border: { fg: options.borderColor || 'yellow' }
      },
      hidden: options.startHidden !== false 
    });

    this.panel.on('wheeldown', () => this.panel.scroll(1));
    this.panel.on('wheelup', () => this.panel.scroll(-1));

    this.bindKeys();
    this.refresh(); 
  }

  bindKeys() {
    bindKey(this.screen, [LOG_KEY_BINDINGS.TOGGLE], () => this.toggle());

    bindKey(this.screen, [LOG_KEY_BINDINGS.CLEAR], () => {
      this.logger.clearVisible();
      this.refresh();
    });

    bindKey(this.screen, [LOG_KEY_BINDINGS.FULL_CLEAR], () => {
      this.logger.fullClear();
      this.refresh();
    });

    bindKey(this.screen, [LOG_KEY_BINDINGS.LEVEL_UP], () => {
      this.logger.debug(`LEVEL_UP pressed - Current level: ${this.logger.logLevel} (${LOG_LEVEL_NAMES[this.logger.logLevel]})`);
      this.logger.debug(`Available LOG_LEVELS: ${JSON.stringify(LOG_LEVELS)}`);
      this.logger.debug(`Session logs count: ${this.logger.sessionLogs.length}`);
      
      this.logger.adjustLogLevel(1);
      
      this.logger.debug(`After adjust - New level: ${this.logger.logLevel} (${LOG_LEVEL_NAMES[this.logger.logLevel]})`);
      this.refresh();
    });

    bindKey(this.screen, [LOG_KEY_BINDINGS.LEVEL_DOWN], () => {
      this.logger.debug(`LEVEL_DOWN pressed - Current level: ${this.logger.logLevel} (${LOG_LEVEL_NAMES[this.logger.logLevel]})`);
      this.logger.debug(`Available LOG_LEVELS: ${JSON.stringify(LOG_LEVELS)}`);
      this.logger.debug(`Session logs count: ${this.logger.sessionLogs.length}`);
      
      this.logger.adjustLogLevel(-1);
      
      this.logger.debug(`After adjust - New level: ${this.logger.logLevel} (${LOG_LEVEL_NAMES[this.logger.logLevel]})`);
      this.refresh();
    });

    const logLevelMapping = this.getLogLevelMapping();
    
    Object.entries(logLevelMapping).forEach(([key, level]) => {
      bindKey(this.screen, [`M-${key}`], () => {
        this.logger.debug(`Alt+${key} pressed - Setting level to: ${level} (${LOG_LEVEL_NAMES[level]})`);
        this.logger.setLogLevel(level);
        this.logger.debug(`After setLogLevel - Current level: ${this.logger.logLevel} (${LOG_LEVEL_NAMES[this.logger.logLevel]})`);
        this.refresh();
      });
    });
  }

  getLogLevelMapping() {
    const sortedLevels = Object.entries(LOG_LEVELS)
      .sort(([,a], [,b]) => a - b) 
      .map(([name, level]) => level);
    
    const mapping = {};
    sortedLevels.forEach((level, index) => {
      mapping[index] = level;
    });
    
    this.logger.debug(`Log level mapping: ${JSON.stringify(mapping)}`);
    return mapping;
  }

  getFormattedLogs() {
    const filteredLogs = this.logger.sessionLogs.filter(log => {
      const passesLevel = log.level >= this.logger.logLevel;
      const passesFilter = !this.logger.logFilter || log.message.match(this.logger.logFilter);
      
      if (!passesLevel && this.logger.logLevel === LOG_LEVELS.DEBUG) {
        this.logger.debug(`Log filtered out by level - Log level: ${log.level} (${LOG_LEVEL_NAMES[log.level]}), Required: ${this.logger.logLevel} (${LOG_LEVEL_NAMES[this.logger.logLevel]})`);
      }
      
      return passesLevel && passesFilter;
    });

    if (this.logger.logLevel === LOG_LEVELS.DEBUG) {
      this.logger.debug(`Filtering: ${this.logger.sessionLogs.length} total logs, ${filteredLogs.length} after filtering, current level: ${this.logger.logLevel} (${LOG_LEVEL_NAMES[this.logger.logLevel]})`);
    }

    return [
      chalk.gray(this.getHeaderString(filteredLogs)),
      ...filteredLogs.map(log => this.formatLogEntry(log))
    ];
  }

  getHeaderString(filteredLogs) {
    return this.logger.allLogsCount > 0
      ? `[Logs: ${filteredLogs.length}/${this.logger.sessionLogs.length} shown | ` +
        `Level: ${LOG_LEVEL_NAMES[this.logger.logLevel]} | ` +
        `Total: ${this.logger.allLogsCount}]`
      : `[Logs: ${filteredLogs.length}/${this.logger.sessionLogs.length} shown]`;
  }

  formatLogEntry(log) {
    const color = LOG_COLORS[log.level] || 'white';
    let line = chalk[color](`[${LOG_LEVEL_NAMES[log.level]}] ${log.message}`);

    if (log.location) {
      line += chalk.gray(` (${log.location})`);
    }

    if (log.stack && log.level >= LOG_LEVELS.ERROR) {
      line += '\n' + chalk.gray(
        log.stack.split('\n')
          .filter(l => !l.includes('node_modules') && !l.includes('internal/'))
          .slice(0, 3)
          .join('\n')
      );
    }

    return line;
  }

  refresh() {
    this.logger.debug(`Refresh called - Current log level: ${this.logger.logLevel} (${LOG_LEVEL_NAMES[this.logger.logLevel]})`);
    const logs = this.getFormattedLogs();
    this.panel.setContent(logs.join('\n'));
    this.panel.scrollTo(logs.length); 
    this.screen.render();
    this.logger.debug('Refresh completed');
  }

  show() {
    this.panel.hidden = false;
    this.panel.setFront();
    this.refresh();
  }

  hide() {
    this.panel.hidden = true;
    this.screen.render();
  }

  toggle() {
    this.panel.hidden ? this.show() : this.hide();
  }

  destroy() {
    this.panel.destroy();
  }
}
