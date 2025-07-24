import blessed from 'blessed';
import chalk from 'chalk';
import { extractText } from '../utils/domHelpers.mjs';

export function renderTUI(document, pageTitle) {
  const screen = blessed.screen({ 
    smartCSR: true,
    title: pageTitle
  });
  
  const container = blessed.box({
    width: '100%',
    height: '100%',
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'cyan'
      },
      style: {
        inverse: true
      }
    },
    border: {
      type: 'line'
    },
    style: {
      border: {
        fg: 'cyan'
      }
    }
  });

  let content = '';
  if (document.body) {
    console.log(chalk.blue('Processing document body...'));
    content = extractText(document.body, 0);
  } else {
    content = chalk.red('No body content found');
  }

  container.setContent(content);
  screen.append(container);

  const instructions = blessed.box({
    bottom: 0,
    height: 3,
    width: '100%',
    content: chalk.gray('Press q or Ctrl+C to exit | Use arrow keys or mouse to scroll | Page Up/Down for faster scrolling'),
    style: {
      bg: 'blue',
      fg: 'white'
    }
  });

  screen.append(instructions);

  screen.key(['q', 'C-c'], () => {
    process.exit(0);
  });

  screen.key(['up', 'down'], (ch, key) => {
    if (key.name === 'up') {
      container.scroll(-1);
    } else {
      container.scroll(1);
    }
    screen.render();
  });

  screen.key(['pageup', 'pagedown'], (ch, key) => {
    const scrollAmount = Math.floor(container.height / 2);
    if (key.name === 'pageup') {
      container.scroll(-scrollAmount);
    } else {
      container.scroll(scrollAmount);
    }
    screen.render();
  });

  screen.render();
  return screen;
}
