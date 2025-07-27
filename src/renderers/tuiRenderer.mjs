import blessed from 'blessed';
import chalk from 'chalk';
import { extractText } from '../utils/domHelpers.mjs';

export function renderTUI(document, pageTitle, onNavigate, tabOptions = {}) {
  const screen = blessed.screen({
    smartCSR: true,
    title: `TextBrowser - ${pageTitle}`,
    dockBorders: true,
    fullUnicode: true,
    ignoreDockContrast: true
  });

  const cleanAndNavigate = (url) => {
    const result = onNavigate(url);
    if (result == false) {
      screen.destroy();
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
      },
      selected: {
        bg: 'cyan',
        bold: true,
        underline: true
      }
    }
  });

  const updateTabItems = () => {
    const tabs = tabOptions.tabs || [];
    const tabItems = tabs.map((tab, i) => ({
      text: `${tab.title.substring(0, 20)}${tab.title.length > 20 ? '...' : ''}`,
      style: {
        bg: 'blue',
        bold: tab.active
      },
      callback: () => {
        if (tabOptions.onSwitchTab) {
          tabOptions.onSwitchTab(i);
          updateTabItems();
          screen.render();
        }
      }
    }));
    tabBar.setItems(tabItems);
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
    style: {
      border: { fg: 'cyan' },
      focus: { border: { fg: 'white' } }
    }
  });

  let content = '';
  if (document.body) {
    content = extractText(document.body, 0);
  } else {
    content = chalk.red('No body content found');
  }
  container.setContent(content);

  const header = blessed.box({
    top: 0,
    height: 1,
    width: '100%',
    tags: true,
    content: `{bold}TextBrowser{/bold} | Active: {bold}${pageTitle}{/bold}`,
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
      '{bold}Navigation:{/} [N]ew URL  [B]ack  [F]orward  [R]eload  [S]earch  [T]ab: New/Close',
      '{bold}Scrolling:{/} Arrows  PgUp/PgDn  Mouse',
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

  screen.key('s', () => {
    searchInput.show();
    searchInput.focus();
    searchInput.readInput((err, value) => {
      searchInput.hide();
      container.focus();
      if (value) {
        const searchResult = content.toLowerCase().includes(value.toLowerCase());
        if (searchResult) {
          footer.setContent(chalk.green(`Found "${value}" in page`));
        } else {
          footer.setContent(chalk.red(`"${value}" not found`));
        }
        setTimeout(() => {
          footer.setContent([
            '{bold}Navigation:{/} [N]ew URL  [B]ack  [R]eload  [S]earch  [T]ab: New/Close',
            '{bold}Scrolling:{/} Arrows  PgUp/PgDn  Mouse',
            '{bold}Quit:{/} [Q]uit  Ctrl+C'
          ].join(' | '));
          screen.render();
        }, 2000);
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
    screen.key([`{i + 1}`], () => {
      if (tabOptions.onSwitchTab) {
        tabOptions.onSwitchTab(i);
        updateTabItems();
        screen.render();
      }
    });
  }

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
