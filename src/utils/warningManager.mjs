import chalk from 'chalk';
import { getLogger } from './logger.mjs';

export class warningManager {
  constructor(screen, options = {}) {
    this.screen = screen;
    this.defaultDuration = options.defaultDuration || 2000;
    this.warningTimeout = null;
    this.originalFooterContent = null;
    this.logger = getLogger();
    this.lastWarningMessage = null;
    this.warningStartTime = null;
    this.warningDuration = null;
    this.pageTypeGetter = options.pageTypeGetter || (() => options.pageType || 'main');
  }

  updateScreen(newScreen, pageType = 'main') {
    this.screen = newScreen;
    this.currentPageType = pageType;
    this.clearWarning();
  }

  setPageType(pageType) {
    this.currentPageType = pageType;
  }
  
  getWarningStyle() {
    const pageType = this.pageTypeGetter();
    const warningStyles = {
      main: chalk.bgYellow.black,        
      bookmarks: chalk.bgMagenta.white,  
      settings: chalk.bgCyan.black,      
      history: chalk.bgBlue.white,       
      default: chalk.bgRed.white         
    };

    return warningStyles[pageType] || warningStyles.default;
  }

  showWarning(message, duration = this.defaultDuration, pageType = null) {
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

    const effectivePageType = pageType || this.currentPageType;
    const warningStyler = this.getWarningStyle(effectivePageType);
    
    footer.setContent(warningStyler(` ${message} `));
    this.screen.render();
    
    this.lastWarningMessage = message;
    this.warningStartTime = Date.now();
    this.warningDuration = duration;
    
    this.logger?.info(`Showing warning: ${message} (style: ${effectivePageType})`);
    this.warningTimeout = setTimeout(() => {
      this.restoreFooter(footer);
    }, duration);
    
    return true;
  }

  findFooter() {
    if (!this.screen) return null;
    
    const footers = this.screen.children.filter(
      child => child.type === 'box' && child.position.bottom === 0
    );
    
    if (footers.length > 1) {
      return footers.reduce((latest, current) => {
        const currentIndex = this.screen.children.indexOf(current);
        const latestIndex = this.screen.children.indexOf(latest);
        return currentIndex > latestIndex ? current : latest;
      });
    }
    
    return footers[0] || null;
  }

  restoreFooter(footer) {
    if (footer && this.originalFooterContent) {
      footer.setContent(this.originalFooterContent);
      this.screen.render();
    }
    this.warningTimeout = null;
    this.originalFooterContent = null;
    this.lastWarningMessage = null;
    this.warningStartTime = null;
    this.warningDuration = null;
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

  hasActiveWarning() {
    if (!this.warningTimeout || !this.lastWarningMessage) return null;
    
    return {
      message: this.lastWarningMessage,
      remainingTime: this.getRemainingWarningTime(),
      pageType: this.currentPageType
    };
  }

  getRemainingWarningTime() {
    if (!this.warningStartTime || !this.warningDuration) return 0;
    const elapsed = Date.now() - this.warningStartTime;
    return Math.max(0, this.warningDuration - elapsed);
  }
}
