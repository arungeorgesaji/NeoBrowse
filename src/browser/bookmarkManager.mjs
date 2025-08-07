import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import blessed from 'blessed'; 
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class bookmarkManager {
  constructor() {
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
      this.showWarning('No URL to bookmark');
      return;
    }

    if (!this.bookmarks.some(b => b.url === url)) {
      this.bookmarks.push({ url, title });
      this.saveBookmarks();
      this.showWarning(`Bookmark added: ${title}`);
    } else {
      this.showWarning('Already bookmarked');
    }
  }

  removeBookmark(url) {
    const index = this.bookmarks.findIndex(b => b.url === url);
    if (index >= 0) {
      const { title } = this.bookmarks[index];
      this.bookmarks.splice(index, 1);
      this.saveBookmarks();
      this.showWarning(`Bookmark removed: ${title}`);
    }
  }

  async showBookmarks() {
    try {
      const bookmarksOverlay = blessed.box({
        parent: this.currentScreen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bg: 'black'
      });

      const bookmarksBox = blessed.list({
        parent: bookmarksOverlay,
        top: 'center',
        left: 'center',
        width: '80%',
        height: '80%',
        border: { type: 'line' },
        style: {
          border: { fg: 'cyan' },
          bg: 'black',
          selected: {
            bg: 'blue',
            fg: 'white'
          }
        },
        items: [],
        keys: true,
        mouse: true
      });

      const currentUrl = this.activeTab?.currentUrl;
      const hasCurrentUrl = currentUrl && !this.bookmarks.some(b => b.url === currentUrl);
      
      this.bookmarks.forEach(b => {
        bookmarksBox.addItem(`${b.title}\n${chalk.dim(b.url)}`);
      });

      if (hasCurrentUrl) {
        bookmarksBox.addItem(chalk.green('+ Add current page to bookmarks'));
      }

      if (this.bookmarks.length === 0 && !hasCurrentUrl) {
        bookmarksBox.addItem(chalk.yellow('No bookmarks yet'));
        bookmarksBox.addItem(chalk.dim('Visit a page first to bookmark it'));
      }

      bookmarksBox.key(['escape', 'q'], () => {
        bookmarksOverlay.destroy();
        this.currentScreen.render();
      });

      bookmarksBox.key(['enter'], async () => {
        const selected = bookmarksBox.selected;
        if (selected >= 0 && selected < this.bookmarks.length) {
          const bookmark = this.bookmarks[selected];
          bookmarksOverlay.destroy();
          await this.navigate(bookmark.url);
        } else if (hasCurrentUrl && selected === this.bookmarks.length) {
          await this.addBookmark();
          bookmarksOverlay.destroy();
          await this.showBookmarks();
        }
      });

      bookmarksBox.key(['d'], async () => {
        const selected = bookmarksBox.selected;
        if (selected >= 0 && selected < this.bookmarks.length) {
          const bookmark = this.bookmarks[selected];
          await this.removeBookmark(bookmark.url);
          this.bookmarks.splice(selected, 1);
          bookmarksOverlay.destroy();
          await this.showBookmarks();
        }
      });

      bookmarksBox.focus();
      this.currentScreen.render();
    } catch (err) {
      console.error('Bookmarks screen error:', err);
      this.showWarning('Failed to show bookmarks');
    }
  }
}
