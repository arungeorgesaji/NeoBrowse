import blessed from 'blessed';
import chalk from 'chalk';
import { extractText } from '../utils/domHelpers.mjs';

export function renderTUI(document, pageTitle, onNavigate, tabOptions = {}) {
  if (global.currentScreen) {
    global.currentScreen.destroy();
  }

  const screen = blessed.screen({
    smartCSR: true,
    title: `NeoBrowse - ${pageTitle}`,
    dockBorders: true,
    fullUnicode: true,
    ignoreDockContrast: true,
    mouse: true,
    sendFocus: true,
  });

  global.currentScreen = screen;

  screen.on('resize', () => {
    screen.emit('repaint');
    screen.render();
  });

  const cleanAndNavigate = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url); 
      const result = onNavigate(url);
      if (result == false) screen.destroy();
      return result;
    } catch {
      return false;
    }
  };

  const tabBar = blessed.listbar({
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

  const updateTabItems = () => {
    const tabs = tabOptions.tabs || [];
    const tabItems = {};
    
    tabs.forEach((tab, i) => {
      const isActive = tab.active;
      const displayText = tab.title.substring(0, 20) + (tab.title.length > 20 ? '...' : '');
      
      tabItems[i] = {
        text: displayText,  
        callback: () => {
          if (tabOptions.onSwitchTab) {
              tabOptions.onSwitchTab(i);
              updateTabItems();
              screen.render();
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
  };


  updateTabItems();

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

  let content = '';
  if (document.body) {
    content = extractText(document.body, 0, tabOptions.tabs?.find(t => t.active)?.currentUrl || '');
  } else {
    content = chalk.red('No body content found');
  }
  container.setContent(content);

  const header = blessed.box({
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

  const footer = blessed.box({
    bottom: 0,
    height: 3,
    width: '100%',
    tags: true,
    content: [
      '{bold}Navigation:{/} [N]ew URL  [B]ack  [F]orward  [R]eload  [S]earch  [H]istory',
      '{bold}Tabs:{/} [T]ab: New/Close  [1-9] Switch  [M]Bookmarks',
      '{bold}Quit:{/} [Q]uit  Ctrl+C'
    ].join(' | '),
    style: {
      bg: 'blue',
      fg: 'white'
    }
  });

  const urlInput = blessed.textbox({
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

  const searchInput = blessed.textbox({
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

  screen.append(header);
  screen.append(tabBar);
  screen.append(container);
  screen.append(footer);
  screen.append(urlInput);
  screen.append(searchInput);

  container.focus();
  
  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });
  
  screen.key('n', () => {
    urlInput.show();
    urlInput.focus();
    urlInput.readInput((err, value) => {
      urlInput.hide();
      container.focus();
      if (value && onNavigate) {
        cleanAndNavigate(value);
      }
      screen.render();
    });
  });

  screen.key('b', () => {
    cleanAndNavigate('back');
  });

  screen.key('f', () => {
    cleanAndNavigate('forward');
  });;

  screen.key('r', () => {
    cleanAndNavigate('reload');
  });

  screen.key('h', () => {
    if (tabOptions.onShowHistory) {
      tabOptions.onShowHistory();
    }
  });

  screen.key('m', () => {
    if (tabOptions.onShowBookmarks) {
      tabOptions.onShowBookmarks();
    }
  });

  screen.key('s', () => {
    searchInput.show();
    searchInput.focus();
    searchInput.readInput((err, value) => {
      searchInput.hide();
      container.focus();
      if (value) {
        const searchQuery = encodeURIComponent(value);
        cleanAndNavigate(`https://www.startpage.com/do/search?query=${searchQuery}`);
      }
      screen.render();
    });
  });

  screen.key('t', () => {
    if (tabOptions.onNewTab) {
      tabOptions.onNewTab();
      updateTabItems();
      screen.render();
    }
  });

  screen.key(['M-t'], () => {
    if (tabOptions.onNewTab) {
      tabOptions.onNewTab();
      updateTabItems();
      screen.render();
    }
  });

  screen.key(['w'], () => {
    if (tabOptions.onCloseTab) {
      tabOptions.onCloseTab();
      updateTabItems();
      screen.render();
    }
  });

  screen.key(['tab'], () => {
    if (tabOptions.onSwitchTab) {
      const tabs = tabOptions.tabs || [];
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(tab => tab.active);
        const nextIndex = (currentIndex + 1) % tabs.length;
        tabOptions.onSwitchTab(nextIndex);
        updateTabItems();
        screen.render();
      }
    }
  });

  for (let i = 0; i < 9; i++) {
    screen.key([`${i + 1}`], () => {  
      if (tabOptions.onSwitchTab && i < tabOptions.tabs.length) {
        tabOptions.onSwitchTab(i);
        updateTabItems();
        screen.render();
      }
    });
  }

  container.on('mouseover', (data) => {
    const line = container.getLine(data.y - container.aleft);
    if (line && line.includes('{underline}')) {
      screen.cursorShape = 'block';
    } else {
      screen.cursorShape = 'line';
    }
    screen.render();
  });

  container.on('click', (data) => {
    try {
      const line = container.getLine(data.y - container.aleft);
      if (!line) return;
      
      const linkMatch = line.match(/\{underline\}\{cyan-fg\}(.*?)\{\/cyan-fg\}\{\/underline\}\{#(.*?)\}/);
      if (linkMatch && linkMatch[2]) {
        const url = linkMatch[2];
        if (data.ctrl) {
          if (tabOptions.onNewTab) tabOptions.onNewTab(url);
        } else {
          cleanAndNavigate(url);
        }
        updateTabItems();
        screen.render();
      }
    } catch (err) {
      console.error('Link click error:', err);
    }
  });

  screen.key(['up', 'down'], (ch, key) => {
    container.scroll(key.name === 'up' ? -1 : 1);
    screen.render();
  });

  screen.key(['pageup', 'pagedown'], (ch, key) => {
    const scrollAmount = Math.floor(container.height / 2);
    container.scroll(key.name === 'pageup' ? -scrollAmount : scrollAmount);
    screen.render();
  });

  container.on('wheeldown', () => {
    container.scroll(1);
    screen.render();
  });

  container.on('wheelup', () => {
    container.scroll(-1);
    screen.render();
  });

  screen.render();
  return screen;
}
