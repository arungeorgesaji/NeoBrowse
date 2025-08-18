import blessed from 'blessed';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs';
import { LOG_LEVELS, LOG_LEVEL_NAMES, LOG_COLORS } from '../constants/log.mjs';
import chalk from 'chalk';
import { getLogger } from './logger.mjs';

export class DebugPanel {
  constructor(screen, options = {}) {
    this.screen = screen;
    this.logger = getLogger();
    
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

    if (options.toggleKey) {
      bindKey(this.screen, [options.toggleKey], () => this.toggle());
    }

    if (options.clearKey) {
      bindKey(this.screen, [options.clearKey], () => {
        this.logger.clearVisible();
        this.refreshPanel();
      });
    }

    if (options.fullClearKey) {
      bindKey(this.screen, [options.fullClearKey], () => {
        this.logger.fullClear();
        this.refreshPanel();
      });
    }

    if (options.levelUpKey) {
      bindKey(this.screen, [options.levelUpKey], () => {
        this.logger.adjustLogLevel(1);
        this.refreshPanel();
      });
    }

    if (options.levelDownKey) {
      bindKey(this.screen, [options.levelDownKey], () => {
        this.logger.adjustLogLevel(-1);
        this.refreshPanel();
      });
    }
  }

  getVisibleLogs() {
    const filteredLogs = this.logger.sessionLogs.filter(log => {
      const levelMatch = log.level >= this.logger.logLevel;
      const filterMatch = this.logger.logFilter 
        ? log.message.match(this.logger.logFilter) 
        : true;
      return levelMatch && filterMatch;
    });

    const visibleLogs = filteredLogs.map(log => {
      const color = LOG_COLORS[log.level] || 'white';
      let logLine = chalk[color](`[${LOG_LEVEL_NAMES[log.level]}] ${log.message}`);

      if (log.stack && log.level >= LOG_LEVELS.ERROR) {
        const cleanStack = log.stack.split('\n')
          .filter(line => !line.includes('node_modules') && !line.includes('internal/'))
          .slice(0, 3) 
          .join('\n');
        logLine += '\n' + chalk.gray(cleanStack);
      }

      if (log.location) {
        logLine += chalk.gray(` (${log.location})`);
      }

      return logLine;
    });

    if (this.logger.allLogsCount > 0) {
      visibleLogs.unshift(
        chalk.gray(`[Session logs - ${filteredLogs.length}/${this.logger.sessionLogs.length} shown | ` +
                 `Level: ${LOG_LEVEL_NAMES[this.logger.logLevel]} | ` +
                 `Total in file: ${this.logger.allLogsCount}]`)
      );
    } else {
      visibleLogs.unshift(
        chalk.gray(`[Session logs - ${filteredLogs.length}/${this.logger.sessionLogs.length} shown]`)
      );
    }

    return visibleLogs.join('\n');
  }

  refreshPanel() {
    this.panel.setContent(this.getVisibleLogs());
    this.panel.scrollTo(this.logger.sessionLogs.length);
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

  destroy() {
    this.panel.destroy();
  }
}
