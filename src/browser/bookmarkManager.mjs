import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import blessed from 'blessed'; 
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { bindKey } from '../renderers/tuiRenderer/tuiHandlers.mjs'
import { getLogger } from '../utils/logger.mjs'; 
import { createFooter } from '../renderers/tuiRenderer/tuiComponents.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class bookmarkManager {
  constructor(browserInstance, screen) {
    this.browser = browserInstance;
    this.screen = screen;
    this.logger = getLogger();
    this.bookmarks = [];
    this.overlay = null;
    this.footer = null;

    this.logger?.info("Bookmark manager initialized");
    this.loadBookmarks();
  }

  loadBookmarks() {
    try {
      const bookmarksPath = path.join(process.env.HOME || process.env.USERPROFILE, '.neobrowse_bookmarks');
      if (fs.existsSync(bookmarksPath)) {
        this.bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
        this.logger?.debug(`Loaded ${this.bookmarks.length} bookmarks from ${bookmarksPath}`);
      } else {
        this.logger?.debug("No existing bookmarks file found");
      }      
    } catch (err) {
      this.logger?.error(`Failed to load bookmarks: ${err.message}`);
    }
  }

  saveBookmarks() {
    try {
      const bookmarksPath = path.join(process.env.HOME || process.env.USERPROFILE, '.neobrowse_bookmarks');
      fs.writeFileSync(bookmarksPath, JSON.stringify(this.bookmarks, null, 2));
      this.logger?.debug(`Saved ${this.bookmarks.length} bookmarks to ${bookmarksPath}`);
    } catch (err) {
      this.logger?.error(`Failed to save bookmarks: ${err.message}`);
    }
  }

  addBookmark(url, title) {
    if (!url) url = this.activeTab?.currentUrl;
    if (!title) title = this.activeTab?.currentDocument?.title || url;
    
    if (!url) {
      this.logger?.warn("Attempted to bookmark with no URL");
      if (!this.browser.isModalOpen) {
        this.browser.showWarning('No URL to bookmark');
      }
      return;
    }

    if (!this.bookmarks.some(b => b.url === url)) {
      this.bookmarks.push({ url, title });
      this.saveBookmarks();
      this.logger?.info(`Added bookmark: "${title}" (${url})`);
      if (!this.browser.isModalOpen) {
        this.browser.showWarning(`Bookmark added: ${title}`);
      }
    } else {
      this.logger?.debug(`Bookmark already exists: ${url}`);
      if (!this.browser.isModalOpen) this.browser.showWarning('Already bookmarked');
    }
  }

  removeBookmark(url) {
    const index = this.bookmarks.findIndex(b => b.url === url);
    if (index >= 0) {
      const { title } = this.bookmarks[index];
      this.bookmarks.splice(index, 1);
      this.saveBookmarks();
      this.logger?.info(`Removed bookmark: "${title}" (${url})`);
    } else {
      this.logger?.warn(`Attempted to remove non-existent bookmark: ${url}`);
    }
  }

  async showBookmarks() {
    if (this.browser.isModalOpen) {
      this.logger?.debug("Skipping bookmarks modal (another modal is open)");
      return
    }
    
    this.logger?.debug("Opening bookmarks modal");
    this.browser.isModalOpen = true;

    try {
      this.browser.currentPageType = 'bookmarks';

      this.footer = createFooter('bookmarks');
      this.screen.append(this.footer);

      const bookmarks = this.bookmarks;
      const currentUrl = this.browser.activeTab?.currentUrl;
      const hasCurrentUrl = currentUrl && !bookmarks.some(b => b.url === currentUrl);

      this.overlay = blessed.box({
        parent: this.screen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bg: 'black'
      });

      const list = blessed.list({
        parent: this.overlay,
        top: 'center',
        left: 'center',
        width: '80%',
        height: '70%',
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

      const urlDisplay = blessed.box({
        parent: this.overlay,
        bottom: 4,
        left: 'center',
        width: '80%',
        height: 3,
        border: { type: 'line' },
        style: {
          border: { fg: 'yellow' },
          bg: 'black',
          fg: 'cyan'
        },
        content: 'Select a bookmark to see its URL',
        align: 'center',
        valign: 'middle'
      });

      this.footer.setFront();

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

      const updateUrlDisplay = () => {
        const selected = list.selected;
        if (selected >= 0 && selected < bookmarks.length) {
          const bookmark = bookmarks[selected];
          const truncateUrl = bookmark.url.length > 100 ? 
            bookmark.url.substring(0, 97) + '...' : bookmark.url;
          urlDisplay.setContent(chalk.cyan(truncateUrl));
        } else if (hasCurrentUrl && selected === bookmarks.length) {
          const truncateUrl = currentUrl.length > 100 ? 
            currentUrl.substring(0, 97) + '...' : currentUrl;
          urlDisplay.setContent(chalk.green(truncateUrl));
        } else {
          urlDisplay.setContent('Select a bookmark to see its URL');
        }
        this.screen.render();
      };

      list.on('select item', updateUrlDisplay);
      list.on('focus', updateUrlDisplay);
      list.on('move', updateUrlDisplay);
      
      if (bookmarks.length > 0) {
        setTimeout(updateUrlDisplay, 50);
      }
      
      blessed.text({
        parent: this.overlay,
        top: 1,
        left: 'center',
        content: `Bookmarks (${bookmarks.length})`,
        style: { fg: 'cyan', bold: true }
      });

      const cleanup = () => {
        this.logger?.debug("Closing bookmarks modal");
        this.overlay.destroy();
        if (this.footer) {
          this.footer.destroy();
          this.footer = null;
        }
        this.browser.isModalOpen = false;

        this.browser.currentPageType = 'main';
        this.browser.footer = createFooter('main');
        this.screen.append(this.browser.footer);
        this.browser.footer.setFront();
        this.screen.render();
      };

      bindKey(this.screen, ['escape'], cleanup)

      bindKey(this.screen, ['enter'], async () => {
        const selected = list.selected;
        if (selected >= 0 && selected < bookmarks.length) {
          const bookmark = bookmarks[selected];
          this.logger?.info(`Navigating to bookmarked URL: ${bookmark.url}`);
          this.overlay.destroy();
          this.browser.isModalOpen = false;
          await this.browser.navigate(bookmark.url);
        } else if (hasCurrentUrl && selected === bookmarks.length) {
          this.logger?.debug("Adding current page to bookmarks from modal");
          await this.browser.addCurrentToBookmarks();
          this.overlay.destroy();
          this.browser.isModalOpen = false;
          await this.showBookmarks();
        }
      });

      bindKey(this.screen, ['d'], async () => {
        const selected = list.selected;
        if (selected >= 0 && selected < bookmarks.length) {
            const bookmark = bookmarks[selected];
            this.logger?.info(`Deleting bookmark: "${bookmark.title}" (${bookmark.url})`);
            this.removeBookmark(bookmark.url);
            
            this.overlay.destroy();
            this.browser.isModalOpen = false;
            await this.showBookmarks(); 
        } else {
          this.logger?.debug("No bookmark selected for deletion");
        }
      });

      this.logger?.info(`Displaying ${bookmarks.length} bookmarks in modal`);
      this.screen.render();
      list.focus();
    } catch (err) {
      this.logger?.error(`Bookmarks modal error: ${err.message}`);
      this.browser.isModalOpen = false;
      this.browser.showWarning('Failed to load bookmarks');
    }
  }
}
