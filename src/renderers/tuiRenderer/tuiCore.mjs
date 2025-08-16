import blessed from 'blessed';
import chalk from 'chalk';
import { extractText } from '../../utils/domHelpers.mjs';
import { createScreen, createTabBar, createContainer, createHeader, createFooter, createURLTextbox, createSearchTextbox } from './tuiComponents.mjs';
import { setupHandlers} from './tuiHandlers.mjs';
import { processContentWithLinks } from './tuiUtils.mjs';
import { state } from '../../constants/state.mjs';

export function renderTUI(document, pageTitle, onNavigate, tabOptions = {}) {
  state.elementPositions.clear();

  try {
    if (global.currentScreen) {
      try {
        global.currentScreen.destroy();
      } catch (cleanupError) {
        console.error(chalk.red('Screen cleanup error:'), cleanupError.message);
      }
    }

    const screen = createScreen(pageTitle);
    global.currentScreen = screen;

    screen.on('resize', () => {
      try {
        screen.emit('repaint');
        screen.render();
      } catch (resizeError) {
        console.error(chalk.red('Resize handler error:'), resizeError.message);
      }
    });

    const tabBar = createTabBar();
    const container = createContainer();
    let content = '';
    let links = [];

    try {
      if (document?.body) {
        const rawContent = extractText(document.body, 0, tabOptions.tabs?.find(t => t.active)?.currentUrl || '');
        const result = processContentWithLinks(rawContent);
        content = result?.processedContent || chalk.yellow('No processable content');
        links = result?.links || [];
      } else {
        content = chalk.red('No document body found');
      }
    } catch (contentError) {
      content = chalk.red(`Content processing failed: ${contentError.message}`);
      console.error(chalk.red('Content error:'), contentError);
    }

    try {
      container.setContent(content);
    } catch (contentSetError) {
      console.error(chalk.red('Content setting error:'), contentSetError.message);
      container.setContent(chalk.red('Could not display page content'));
    }

    const header = createHeader(pageTitle);
    const footer = createFooter();
    const urlInput = createURLTextbox();
    const searchInput = createSearchTextbox();

    const components = [header, tabBar, container, footer, urlInput, searchInput];
    components.forEach(component => {
      try {
        screen.append(component);
      } catch (appendError) {
        console.error(chalk.red('Component append error:'), appendError.message);
      }
    });

    const updateTabItems = () => {
      try {
        const tabs = tabOptions.tabs || [];
        const tabItems = {};
        
        tabs.forEach((tab, i) => {
          const isActive = tab.active;
          const displayText = tab.title.substring(0, 20) + (tab.title.length > 20 ? '...' : '');
          
          tabItems[i] = {
            text: displayText,  
            callback: () => {
              if (tabOptions.onSwitchTab) {
                try {
                  tabOptions.onSwitchTab(i);
                  updateTabItems();
                  screen.render();
                } catch (tabSwitchError) {
                  console.error(chalk.red('Tab switch error:'), tabSwitchError.message);
                }
              }
            }
          };
        });
        
        tabBar.setItems(tabItems);
        
        tabs.forEach((tab, i) => {
          const isActive = tab.active;
          if (tabBar.items[i]) {
            tabBar.items[i].style = {
              bg: isActive ? 'cyan' : 'blue',
              fg: isActive ? 'black' : 'white',
              bold: isActive,
            };
          }
        });
      } catch (tabError) {
        console.error(chalk.red('Tab update error:'), tabError.message);
      }
    };

    updateTabItems();

    try {
      container.focus();
    } catch (focusError) {
      console.error(chalk.red('Focus error:'), focusError.message);
    }

    try {
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
      console.error(chalk.red('Handler setup error:'), handlerError.message);
    }

    try {
      screen.render();
    } catch (renderError) {
      console.error(chalk.red('Final render error:'), renderError.message);
    }

    return { 
      screen, 
      container, 
      elementPositions: new Map(state.elementPositions) 
    };

  } catch (mainError) {
    console.error(chalk.red('Fatal TUI rendering error:'), mainError.message);
    console.error(mainError.stack);
    
    try {
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
      console.error(chalk.red('Could not create fallback screen:'), fallbackError.message);
      process.exit(1);
    }
  }
}
