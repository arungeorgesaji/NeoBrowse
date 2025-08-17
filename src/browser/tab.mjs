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

    this.debugPanel?.info(`New tab created with homepage: ${this.currentUrl}`);
  }

  async isUrl(input) {
    if (!input || typeof input !== 'string') {
      this.debugPanel?.debug(`Invalid URL input: ${input}`); 
      return false;
    }

    const trimmed = input.trim();
    if (/\s/.test(trimmed)) {
      this.debugPanel?.debug(`URL contains whitespace: ${trimmed}`); 
      return false;
    }

    let host;
    try {
      const url = new URL(trimmed.includes('://') ? trimmed : 'https://' + trimmed);
      await dns.lookup(url.hostname);
      this.debugPanel?.debug(`Valid URL: ${trimmed}`); 
      return true;
    } catch {
      this.debugPanel?.warn(`Invalid URL: ${trimmed} - ${err.message}`);
      return false;
    }
  }

  async navigate(url, options = {}) {
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL');
      }

      if (url === 'https://arungeorgesaji.is-a.dev/NeoBrowse/') {
        this.debugPanel?.info("Loading NeoBrowse homepage");
        const homepagePath = path.join(process.cwd(), 'index.html');
        const htmlContent = fs.readFileSync(homepagePath, 'utf8');
        const doc = parseHTML(htmlContent, this.debugPanel);
        
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
        this.debugPanel?.debug(`Navigating to history index ${options.historyIndex}`);
        if (options.historyIndex >= 0 && options.historyIndex < this.history.length) {
          this.currentIndex = options.historyIndex;
          url = this.history[this.currentIndex];
        } else {
          throw new Error('Invalid history index');
        }
      } else if (url === 'back') {
        this.debugPanel?.debug("Attempting to go back in history");
        if (this.currentIndex > 0) {
          this.currentIndex--;
          url = this.history[this.currentIndex];
        } else {
          return null; 
        }
      } else if (url === 'forward') {
        this.debugPanel?.debug("Attempting to go forward in history");
        if (this.currentIndex < this.history.length - 1) {
          this.currentIndex++;
          url = this.history[this.currentIndex];
        } else {
          return null; 
        }
      } else if (url === 'reload') {
        this.debugPanel?.info(`Reloading: ${this.currentUrl}`);
        if (!this.currentUrl) {
          throw new Error('No page to reload');
        }
        url = this.currentUrl;
      } else {
        url = this.resolveUrl(url);

        if (!(await this.isUrl(url))) {
          this.debugPanel?.info(`Treating input as search query: ${url}`);
          const searchQuery = encodeURIComponent(url);
          url = `https://searx.be/search?q=${searchQuery}&format=html`;
        }
        
        if (!options.preserveHistory && this.currentIndex < this.history.length - 1) {
          this.debugPanel?.debug(`Truncating history at index ${this.currentIndex}`);
          this.history = this.history.slice(0, this.currentIndex + 1);
        }

        if (!options.replaceHistory) {
          this.debugPanel?.info(`Added to history: ${url}`);
          this.history.push(url);
          this.currentIndex = this.history.length - 1;
          
          if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
            this.currentIndex--;
          }
        }
      }

      this.debugPanel?.info(`Fetching: ${url}`);
      const html = await fetchHTML(url, this.debugPanel);
      const doc = parseHTML(html, this.debugPanel);
      
      this.currentUrl = url;
      this.currentDocument = doc;
      this.debugPanel?.debug(`Parsed document with title: ${doc.title || 'Untitled'}`);
      
      return {
        document: doc,
        url: url,
        title: doc.title || url,
        fragment: url.includes('#') ? url.split('#')[1] : null,
        historyIndex: this.currentIndex,
        historyLength: this.history.length
      };
    } catch (err) {
      this.debugPanel?.error(`Navigation failed: ${err.message}`, { url });
      throw err;
    }
  }

  resolveUrl(url) {
    try {
      if (url.startsWith('/')) {
        this.debugPanel?.debug(`Resolving relative URL: ${url}`);
        const baseUrl = new URL(this.currentUrl);
        return baseUrl.origin + url;
      }
      
      if (url.startsWith('./') || url.startsWith('../')) {
        const baseUrl = new URL(this.currentUrl);
        return new URL(url, baseUrl).href;
      }
      
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        this.debugPanel?.debug(`Adding https:// prefix to: ${url}`);
        return 'https://' + url;
      }
      
      return url;
    } catch (err) {
      this.debugPanel?.warn(`URL resolution failed: ${err.message}`, { url });
      console.error(chalk.yellow('URL resolution error:'), err.message);
      return url;
    }
  }

  getHistoryState() {
    const state = {
      canGoBack: this.currentIndex > 0,
      canGoForward: this.currentIndex < this.history.length - 1,
      currentIndex: this.currentIndex,
      history: [...this.history]
    };
    this.debugPanel?.debug(`Current history state`, state);
    return state;
  }
}
