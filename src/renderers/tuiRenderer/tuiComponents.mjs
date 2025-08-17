import blessed from 'blessed';
import chalk from 'chalk';

export function createScreen(pageTitle, debugPanel) {
  return blessed.screen({
    smartCSR: true,
    title: `NeoBrowse - ${pageTitle}`,
    dockBorders: true,
    fullUnicode: true,
    ignoreDockContrast: true,
    mouse: true,
    sendFocus: true,
  });
}

export function createTabBar(debugPanel) {
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
}

export function createContainer(debugPanel) {
  return blessed.box({
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
} 

export function createHeader(pageTitle, debugPanel) {
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
}

export function createFooter(debugPanel) {
  return blessed.box({
    bottom: 0,
    height: 3,
    width: '100%',
    tags: true,
    content: [
      '{bold}Nav:{/} [N]ewURL  [B]ack  [F]orward  [R]eload  [S]earch  [H]istory\n' +
      '{bold}Links:{/} [K]Next  [J]Prev  [Enter]Open  [M]Bookmarks\n' +
      '{bold}Tabs:{/} [T]New  [W]Close  [1-9]Switch  [Tab]Cycle  [Q]uit',
    ].join(' | '),
    style: {
      bg: 'blue',
      fg: 'white'
    }
  });
}

export function createURLTextbox(debugPanel) {
  return blessed.textbox({
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
}

export function createSearchTextbox(debugPanel) {
  return blessed.textbox({
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
}
