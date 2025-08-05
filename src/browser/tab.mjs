import { fetchHTML } from '../network/fetcher.mjs';
import { parseHTML } from '../utils/htmlProcessing.mjs';
import chalk from 'chalk';

export class Tab {
  constructor() {
    this.history = []; 
    this.currentIndex = -1; 
    this.currentUrl = '';
    this.currentDocument = null;
    this.active = false;
  }

  async navigate(url) {
    try {
      if (url === 'back') {
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
        url = this.currentUrl;
      } else {
        this.history = this.history.slice(0, this.currentIndex + 1);

        if (url.startsWith('/')) {
          const baseUrl = new URL(this.currentUrl);
          url = baseUrl.origin + url;
          
          new URL(url); 
        }
        else if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }

        this.history.push(url);
        this.currentIndex = this.history.length - 1;
      }

      console.log(chalk.blue(`Fetching ${url}...`));
      const html = await fetchHTML(url);
      const doc = parseHTML(html);
      
      this.currentUrl = url;
      this.currentDocument = doc;
      
      return {
        document: doc,
        url: url,
        title: doc.title || url
      };
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      throw err;
    }
  }
}
