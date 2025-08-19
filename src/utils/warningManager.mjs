import chalk from 'chalk';
import { getLogger } from './logger.mjs';

export class warningManager {
  constructor(screen, options = {}) {
    this.screen = screen;
    this.defaultDuration = options.defaultDuration || 2000;
    this.warningTimeout = null;
    this.originalFooterContent = null;
    this.logger = getLogger();
    this.isModalOpen = false;
  }

  showWarning(message, duration = this.defaultDuration) {
    if (!this.screen || this.isModalOpen) {
      this.logger?.debug('Cannot show warning - no screen or modal is open');
      return false;
    }

    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }

    const footer = this.findFooter();
    if (!footer) {
      this.logger?.warn('Could not find footer element for warning');
      return false;
    }

    if (!this.originalFooterContent && footer.content !== message) {
      this.originalFooterContent = footer.content;
    }

    footer.setContent(chalk.bgYellow.black(` ${message} `));
    this.screen.render();
    this.logger?.info(`Showing warning: ${message}`);

    this.warningTimeout = setTimeout(() => {
      this.restoreFooter(footer);
    }, duration);

    return true;
  }

  findFooter() {
    return this.screen.children.find(
      child => child.type === 'box' && child.position.bottom === 0
    );
  }

  restoreFooter(footer) {
    if (footer && this.originalFooterContent) {
      footer.setContent(this.originalFooterContent);
      this.screen.render();
    }
    this.warningTimeout = null;
    this.originalFooterContent = null;
  }

  clearWarning() {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }

    const footer = this.findFooter();
    if (footer && this.originalFooterContent) {
      this.restoreFooter(footer);
    }
  }

  setModalState(state) {
    this.isModalOpen = state;
    if (state) {
      this.clearWarning();
    }
  }

  hasActiveWarning() {
    if (!this.warningTimeout || !this.lastWarningMessage) return null;
    
    return {
      message: this.lastWarningMessage,
      remainingTime: this.getRemainingWarningTime()
    };
  }

  getRemainingWarningTime() {
    if (!this.warningStartTime || !this.warningDuration) return 0;
    const elapsed = Date.now() - this.warningStartTime;
    return Math.max(0, this.warningDuration - elapsed);
  }
}
