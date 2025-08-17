import { fetchHTML } from '../network/fetcher.mjs';
import { parseHTML } from '../utils/htmlProcessing.mjs';
import chalk from 'chalk';
import dns from 'dns/promises'
import fs from 'fs';
import path from 'path';

export class Tab {
  constructor(debugPanel) {
    this.history = []; 
    this.currentIndex = -1; 
    this.currentUrl = 'https://arungeorgesaji.is-a.dev/NeoBrowse/';
    this.currentDocument = null;
    this.active = false;
    this.MAX_HISTORY = 100;
    this.debugPanel = debugPanel;
  }

  async isUrl(input) {
    if (!input || typeof input !== 'string') return false;
    const trimmed = input.trim();

    if (/\s/.test(trimmed)) return false;

    let host;
    try {
      const url = new URL(trimmed.includes('://') ? trimmed : 'https://' + trimmed);
      host = url.hostname;
    } catch {
      return false;
    }

    try {
      await dns.lookup(host);
      return true; 
    } catch {
      return false;
    }
  }

  async navigate(url, options = {}) {
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL');
      }

      if (url === 'https://arungeorgesaji.is-a.dev/NeoBrowse/') {
        console.log(chalk.blue('Navigating to homepage...'));
        const homepagePath = path.join(process.cwd(), 'index.html');
        const htmlContent = fs.readFileSync(homepagePath, 'utf8');
        const doc = parseHTML(htmlContent);
        
        this.currentDocument = doc;

        return {
          document: doc,
          url: this.currentUrl,
          title: doc.title || 'NeoBrowse Home',
          historyIndex: this.currentIndex,
          historyLength: this.history.length
        };
      }

      if (options.historyIndex !== undefined) {
        if (options.historyIndex >= 0 && options.historyIndex < this.history.length) {
          this.currentIndex = options.historyIndex;
          url = this.history[this.currentIndex];
        } else {
          throw new Error('Invalid history index');
        }
      } else if (url === 'back') {
        if (this.currentIndex > 0) {
          this.currentIndex--;
          url = this.history[this.currentIndex];
        } else {
          return null; 
        }
      } else if (url === 'forward') {
        if (this.currentIndex < this.history.length - 1) {
          this.currentIndex++;
          url = this.history[this.currentIndex];
        } else {
          return null; 
        }
      } else if (url === 'reload') {
        if (!this.currentUrl) {
          throw new Error('No page to reload');
        }
        url = this.currentUrl;
      } else {
        url = this.resolveUrl(url);

        if (!(await this.isUrl(url))) {
          const searchQuery = encodeURIComponent(url);
          url = `https://searx.be/search?q=${searchQuery}&format=html`;
        }
        
        if (!options.preserveHistory && this.currentIndex < this.history.length - 1) {
          this.history = this.history.slice(0, this.currentIndex + 1);
        }

        if (!options.replaceHistory) {
          this.history.push(url);
          this.currentIndex = this.history.length - 1;
          
          if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
            this.currentIndex--;
          }
        }
      }

      console.log(chalk.blue(`Fetching ${url}...`));
      const html = await fetchHTML(url);
      const doc = parseHTML(html);
      
      this.currentUrl = url;
      this.currentDocument = doc;
      
      return {
        document: doc,
        url: url,
        title: doc.title || url,
        fragment: url.includes('#') ? url.split('#')[1] : null,
        historyIndex: this.currentIndex,
        historyLength: this.history.length
      };
    } catch (err) {
      console.error(chalk.red('Navigation error:'), err.message);
      throw err;
    }
  }

  resolveUrl(url) {
    try {
      if (url.startsWith('/')) {
        const baseUrl = new URL(this.currentUrl);
        return baseUrl.origin + url;
      }
      
      if (url.startsWith('./') || url.startsWith('../')) {
        const baseUrl = new URL(this.currentUrl);
        return new URL(url, baseUrl).href;
      }
      
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
      }
      
      return url;
    } catch (err) {
      console.error(chalk.yellow('URL resolution error:'), err.message);
      return url;
    }
  }

  getHistoryState() {
    return {
      canGoBack: this.currentIndex > 0,
      canGoForward: this.currentIndex < this.history.length - 1,
      currentIndex: this.currentIndex,
      history: [...this.history]
    };
  }
}
