import blessed from 'blessed';
import chalk from 'chalk';
import { getLogger } from '../../utils/logger.mjs'; 

export function createScreen(pageTitle) {
  const logger = getLogger();

  try {
    logger?.debug('Creating main screen', {
      title: `NeoBrowse - ${pageTitle}`,
      features: ['smartCSR', 'fullUnicode', 'mouseSupport']
    });

    const screen = blessed.screen({
      smartCSR: true,
      title: `NeoBrowse - ${pageTitle}`,
      dockBorders: true,
      fullUnicode: true,
      ignoreDockContrast: true,
      mouse: true,
      sendFocus: true,
    });

    screen.on('render', () => {
      logger?.debug('Screen rendered');
    });

    return screen;
  } catch (error) {
    logger?.error('Failed to create screen', {
      error: error.message,
      stack: error.stack?.split('\n')[0]
    });
    throw error;
  }
}

export function createTabBar() {
  const logger = getLogger();

  try {
    logger?.debug('Creating tab bar', {
      position: 'top:1',
      style: 'blue/magenta'
    });

    return blessed.listbar({
      top: 1,
      height: 1,
      width: '100%',
      autoCommandKeys: true,
      style: {
        bg: 'blue',
        item: {
          bg: 'blue',
          hover: {
            bg: 'magenta',
            bold: true
          }
        }
      }
    });
  } catch (error) {
    logger?.error('Failed to create tab bar', {
      error: error.message
    });
    throw error;
  }
}

export function createContainer() {
  const logger = getLogger();

  try {
    logger?.debug('Creating content container', {
      dimensions: '100% width, height:100%-7',
      features: ['scrollable', 'keyNavigation']
    });

    const container = blessed.box({
      top: 3, 
      width: '100%',
      height: '100%-7', 
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      scrollbar: {
        ch: ' ',
        track: { bg: 'cyan' },
        style: { inverse: true }
      },
      border: { type: 'line' },
      tags: true, 
      style: {
        border: { fg: 'cyan' },
        focus: { border: { fg: 'white' } }
      }
    });

    container.on('scroll', (offset) => {
      logger?.debug(`Container scrolled to offset: ${offset}`);
    });

    return container;
  } catch (error) {
    logger?.error('Failed to create container', {
      error: error.message
    });
    throw error;
  }
}

export function createHeader(pageTitle) {
  const logger = getLogger();

  try {
    logger?.debug('Creating header', {
      title: pageTitle,
      position: 'top:0'
    });

    return blessed.box({
      top: 0,
      height: 1,
      width: '100%',
      tags: true,
      content: `{bold}NeoBrowse{/bold} | Active: {bold}${pageTitle}{/bold}`,
      style: {
        bg: 'blue',
        fg: 'white'
      }
    });
  } catch (error) {
    logger?.error('Failed to create header', {
      error: error.message
    });
    throw error;
  }
}

export function createFooter(pageType = 'main') {
  const logger = getLogger();

  const pageStyles = {
    main: {
      bg: 'blue',
      fg: 'white',
      content: [
        '{bold}Nav:{/} [N]ewURL  [B]ack  [F]orward  [R]eload  [S]earch  [H]istory',
        '{bold}Links:{/} [K]Next  [J]Prev  [Enter]Open  [M]Bookmarks',
        '{bold}Tabs:{/} [T]New  [W]Close  [1-9]Switch  [Tab]Cycle  [Q]uit'
      ],
      height: 3 
    },
    settings: {
      bg: 'magenta',
      fg: 'white',
      content: [
        '{bold}Settings:{/} [Enter]Edit [Ctrl+S]Save [D]Reset [Esc]Close'
      ],
      height: 1 
    },
    bookmarks: {
      bg: 'green',
      fg: 'white',
      content: [
        '{bold}Bookmarks:{/} [↑↓]Navigate  [Enter]Select  [x]Delete  [Esc]Close'
      ],
      height: 1  
    },
    history: {
      bg: 'yellow',
      fg: 'black',
      content: [
        '{bold}History:{/} [↑↓]Navigate  [Enter]Select [Esc]Close'
      ],
      height: 1  
    }
  };
  
  const style = pageStyles[pageType] || pageStyles.main;
  
  try {
    logger?.debug('Creating footer', {
      pageType,
      position: 'bottom:0',
      height: 3,
      style
    });

    return blessed.box({
      name: 'footerBox',
      bottom: 0,
      height: style.height,
      width: '100%',
      tags: true,
      content: style.content.join('\n'),
      style: {
        bg: style.bg,
        fg: style.fg
      },
      input: false,
      clickable: false,
      focusable: false,
      mouse: false,
      keys: false,
    });
  } catch (error) {
    logger?.error('Failed to create footer', {
      error: error.message
    });
    throw error;
  }
}

export function createURLTextbox() {
  const logger = getLogger();
  
  try {
    logger?.debug('Creating URL textbox', {
      position: 'centered',
      dimensions: '80% width, 3 height'
    });

    const textbox = blessed.textbox({
      top: 'center',
      left: 'center',
      width: '80%',
      height: 3,
      hidden: true,
      content: 'Enter URL:',
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'cyan' }
      }
    });

    textbox.on('submit', (value) => {
      logger?.info('URL submitted', {
        value: value.slice(0, 100) // Truncate long URLs
      });
    });

    return textbox;
  } catch (error) {
    logger?.error('Failed to create URL textbox', {
      error: error.message
    });
    throw error;
  }
}

export function createSearchTextbox() {
  const logger = getLogger();

  try {
    logger?.debug('Creating search textbox', {
      position: 'centered',
      style: 'green border'
    });

    const textbox = blessed.textbox({
      top: 'center',
      left: 'center',
      width: '80%',
      height: 3,
      hidden: true,
      content: 'Search:',
      border: { type: 'line' },
      style: {
        fg: 'white',
        bg: 'black',
        border: { fg: 'green' }
      }
    });

    textbox.on('submit', (value) => {
      logger?.info('Search submitted', {
        queryLength: value.length
      });
    });

    return textbox;
  } catch (error) {
    logger?.error('Failed to create search textbox', {
      error: error.message
    });
    throw error;
  }
}
