import blessed from 'blessed';
import chalk from 'chalk';
import { extractText } from '../../utils/domHelpers.mjs';
import { createScreen, createTabBar, createContainer, createHeader, createURLTextbox, createSearchTextbox } from './tuiComponents.mjs';
import { setupHandlers } from './tuiHandlers.mjs';
import { processContentWithLinks } from './tuiUtils.mjs';
import { getLogger } from '../../utils/logger.mjs'; 

export function renderTUI(document, pageTitle, onNavigate, tabOptions = {}) {
  const logger = getLogger();

  try {
    logger?.info('Starting TUI rendering', {
      pageTitle,
      hasDocument: Boolean(document),
      tabCount: tabOptions.tabs?.length || 0
    });

    if (global.currentScreen) {
      try {
        logger?.debug('Cleaning up previous screen');
        global.currentScreen.destroy();
      } catch (cleanupError) {
        logger?.error('Screen cleanup failed', {
          error: cleanupError.message
        });
      }
    }

    const screen = createScreen(pageTitle);
    global.currentScreen = screen;

    screen.on('resize', () => {
      try {
        logger?.debug('Handling screen resize');
        screen.emit('repaint');
        screen.render();
      } catch (resizeError) {
        logger?.error('Resize handler failed', {
          error: resizeError.message
        });
      }
    });

    const tabBar = createTabBar();
    const container = createContainer();
    let content = '';
    let links = [];

    try {
      if (document?.body) {
        logger?.debug('Extracting document content');
        const currentUrl = tabOptions.tabs?.find(t => t.active)?.currentUrl || '';
        const rawContent = extractText(document.body, 0, currentUrl);
        
        logger?.debug('Processing links in content');
        const result = processContentWithLinks(rawContent);
        content = result?.processedContent || chalk.yellow('No processable content');
        links = result?.links || [];
        
        logger?.info('Content processing complete', {
          contentLength: content.length,
          linkCount: links.length
        });
      } else {
        content = chalk.red('No document body found');
        logger?.warn('Missing document body');
      }
    } catch (contentError) {
      content = chalk.red(`Content processing failed: ${contentError.message}`);
      logger?.error('Content processing error', {
        error: contentError.message,
        stack: contentError.stack?.split('\n')[0]
      });
    }

    try {
      logger?.debug('Setting container content');
      container.setContent(content);
    } catch (contentSetError) {
      logger?.error('Failed to set container content', {
        error: contentSetError.message
      });
      container.setContent(chalk.red('Could not display page content'));
    }

    const header = createHeader(pageTitle);
    const urlInput = createURLTextbox();
    const searchInput = createSearchTextbox();

    const components = [header, tabBar, container, urlInput, searchInput];
    components.forEach(component => {
      try {
        logger?.debug(`Appending component: ${component.type}`);
        screen.append(component);
      } catch (appendError) {
        logger?.error('Component append failed', {
          component: component.type,
          error: appendError.message
        });
      }
    });

    const updateTabItems = () => {
      try {
        const tabs = tabOptions.tabs || [];
        logger?.debug('Updating tab bar items', {
          tabCount: tabs.length
        });

        const tabItems = {};
        tabs.forEach((tab, i) => {
          const displayText = tab.title.substring(0, 20) + (tab.title.length > 20 ? '...' : '');
          tabItems[i] = {
            text: displayText,
            callback: () => {
              if (tabOptions.onSwitchTab) {
                try {
                  logger?.info('Switching tabs', {
                    tabIndex: i,
                    title: tab.title
                  });
                  tabOptions.onSwitchTab(i);
                  updateTabItems();
                  screen.render();
                } catch (tabSwitchError) {
                  logger?.error('Tab switch failed', {
                    tabIndex: i,
                    error: tabSwitchError.message
                  });
                }
              }
            }
          };
        });

        tabBar.setItems(tabItems);
        tabs.forEach((tab, i) => {
          if (tabBar.items[i]) {
            tabBar.items[i].style = {
              bg: tab.active ? 'cyan' : 'blue',
              fg: tab.active ? 'black' : 'white',
              bold: tab.active,
            };
          }
        });
      } catch (tabError) {
        logger?.error('Tab update failed', {
          error: tabError.message
        });
      }
    };

    updateTabItems();

    try {
      logger?.debug('Setting initial focus');
      container.focus();
    } catch (focusError) {
      logger?.error('Failed to set focus', {
        error: focusError.message
      });
    }

    try {
      logger?.info('Setting up event handlers');
      setupHandlers({
        screen,
        container,
        onNavigate,
        tabOptions,
        urlInput,
        searchInput,
        links,
        updateTabItems,
        content,
      });
    } catch (handlerError) {
      logger?.error('Handler setup failed', {
        error: handlerError.message,
        stack: handlerError.stack?.split('\n')[0]
      });
    }

    try {
      logger?.debug('Performing final render');
      screen.render();
      logger?.info('TUI rendering complete');
      return { screen, container };
    } catch (renderError) {
      logger?.error('Final render failed', {
        error: renderError.message
      });
      throw renderError;
    }

  } catch (mainError) {
    logger?.error('Fatal TUI rendering error', {
      error: mainError.message,
      stack: mainError.stack?.split('\n').slice(0, 3).join('\n')
    });

    try {
      logger?.warn('Creating fallback error screen');
      const errorScreen = blessed.screen({ smartCSR: true });
      errorScreen.append(blessed.box({
        content: chalk.red(`Fatal Error:\n${mainError.message}\n\nCheck console for details`),
        top: 'center',
        left: 'center',
        width: '80%',
        height: '80%',
        border: { type: 'line' },
        style: { fg: 'white', bg: 'red' }
      }));
      errorScreen.render();
      return errorScreen;
    } catch (fallbackError) {
      logger?.error('Fallback screen creation failed', {
        error: fallbackError.message
      });
      process.exit(1);
    }
  }
}
