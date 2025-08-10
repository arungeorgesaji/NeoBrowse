import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import blessed from 'blessed'; 
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class bookmarkManager {
  constructor(browserInstance) {
    this.browser = browserInstance;
    this.bookmarks = [];
    this.loadBookmarks();
  }

  loadBookmarks() {
    try {
      const bookmarksPath = path.join(process.env.HOME || process.env.USERPROFILE, '.neobrowse_bookmarks');
      if (fs.existsSync(bookmarksPath)) {
        this.bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
      }
    } catch (err) {
      console.error('Error loading bookmarks:', err);
    }
  }

  saveBookmarks() {
    try {
      const bookmarksPath = path.join(process.env.HOME || process.env.USERPROFILE, '.neobrowse_bookmarks');
      fs.writeFileSync(bookmarksPath, JSON.stringify(this.bookmarks, null, 2));
    } catch (err) {
      console.error('Error saving bookmarks:', err);
    }
  }

  addBookmark(url, title) {
    if (!url) url = this.activeTab?.currentUrl;
    if (!title) title = this.activeTab?.currentDocument?.title || url;
    
    if (!url) {
      if (!this.browser.isModalOpen) {
        this.showWarning('No URL to bookmark');
      }
      return;
    }

    if (!this.bookmarks.some(b => b.url === url)) {
      this.bookmarks.push({ url, title });
      this.saveBookmarks();
      if (!this.browser.isModalOpen) {
        this.showWarning(`Bookmark added: ${title}`);
      }
    } else if (!this.browser.isModalOpen) {
      this.showWarning('Already bookmarked');
    }
  }

  removeBookmark(url) {
    const index = this.bookmarks.findIndex(b => b.url === url);
    if (index >= 0) {
      const { title } = this.bookmarks[index];
      this.bookmarks.splice(index, 1);
      this.saveBookmarks();
    }
  }

  async showBookmarks() {
    if (this.browser.isModalOpen) return;
    this.browser.isModalOpen = true;

    try {
      const bookmarks = this.bookmarks;
      const currentUrl = this.browser.activeTab?.currentUrl;
      const hasCurrentUrl = currentUrl && !bookmarks.some(b => b.url === currentUrl);

      const overlay = blessed.box({
        parent: this.browser.currentScreen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bg: 'black'
      });

      const list = blessed.list({
        parent: overlay,
        top: 'center',
        left: 'center',
        width: '80%',
        height: '80%',
        border: { type: 'line' },
        style: {
          border: { fg: 'cyan' },
          bg: 'black',
          selected: { bg: 'blue', fg: 'white' }
        },
        keys: true,
        mouse: true,
        items: []
      });

      bookmarks.forEach((b, index) => {
        const displayTitle = b.title || b.url;
        
        list.addItem(`${chalk.bold(`${index + 1}. ${displayTitle}`)}`);
      });

      if (currentUrl) {
        const isBookmarked = bookmarks.some(b => b.url === currentUrl);
        if (isBookmarked) {
          list.addItem(chalk.yellow('✓ Current page is bookmarked'));
        } else {
          list.addItem(chalk.green('+ Add current page to bookmarks'));
        }
      }

      if (bookmarks.length === 0 && !hasCurrentUrl) {
        list.addItem(chalk.yellow('No bookmarks yet'));
        list.addItem(chalk.dim('Visit a page first to bookmark it'));
      }

      blessed.text({
        parent: overlay,
        bottom: 1,
        left: 1,
        content: 'Enter: Open • D: Delete • Esc: Close • Arrows: Navigate',
        style: { fg: 'gray' }
      });

      list.key(['escape', 'q'], () => {
        overlay.destroy();
        this.browser.isModalOpen = false;
        this.browser.currentScreen.render();
      });

      list.key(['enter'], async () => {
        const selected = list.selected;
        if (selected >= 0 && selected < bookmarks.length) {
          const bookmark = bookmarks[selected];
          overlay.destroy();
          this.browser.isModalOpen = false;
          await this.browser.navigate(bookmark.url);
        } else if (hasCurrentUrl && selected === bookmarks.length) {
          await this.browser.addCurrentToBookmarks();
          overlay.destroy();
          this.browser.isModalOpen = false;
          await this.showBookmarks();
        }
      });

      list.key(['d'], async () => {
        const selected = list.selected;
        if (selected >= 0 && selected < bookmarks.length) {
            const bookmark = bookmarks[selected];
            this.removeBookmark(bookmark.url);
            
            overlay.destroy();
            this.browser.isModalOpen = false;
            await this.showBookmarks(); 
        }
      });

      list.focus();
      this.browser.currentScreen.render();
    } catch (err) {
      console.error(chalk.red('Bookmarks error:'), err);
      this.browser.isModalOpen = false;
      this.browser.showWarning('Failed to load bookmarks');
    }
  }
}
