import { JSDOM } from 'jsdom';
import blessed from 'blessed';
import axios from 'axios';
import chalk from 'chalk';
import sanitizeHtml from 'sanitize-html';

async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url, { 
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TUI-Browser/1.0)' }
    });
    
    return sanitizeHtml(data, { 
      allowedTags: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'li', 'strong', 'em', 'br', 'hr', 'title', 'q', 'i', 'b'],
      allowedAttributes: {
        'a': ['href', 'title']
      },
      disallowedTagsMode: 'discard'
    });
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

function parseHTML(html) {
  const dom = new JSDOM(html, { 
    runScripts: 'outside-only', 
    resources: 'usable'
  });
  
  return dom.window.document;
}

function renderTUI(document, pageTitle) {
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
  let yOffset = 0;

  function extractText(node) {
    if (node.nodeType === 3) { 
      return node.textContent.trim();
    }
    
    if (node.nodeType === 1) { 
      const tagName = node.tagName.toLowerCase();
      let text = '';
      
      for (const child of node.childNodes) {
        text += extractText(child);
      }
      
      switch (tagName) {
        case 'h1':
          return chalk.bold.yellow(`\n${text}\n${'='.repeat(text.length)}\n`);
        case 'h2':
          return chalk.bold.cyan(`\n${text}\n${'-'.repeat(text.length)}\n`);
        case 'h3':
          return chalk.bold.white(`\n${text}\n`);
        case 'p':
          return chalk.white(`${text}\n\n`);
        case 'a':
          const href = node.getAttribute('href') || '';
          return chalk.cyan.underline(`${text}`) + chalk.gray(` (${href})`);
        case 'strong' || 'b':
          return chalk.bold(text);
        case 'em' || 'i':
          return chalk.italic(text);
        case 'u':
          return chalk.underline(text);
        case 's':
          return chalk.strikethrough(text);
        case 'li':
          return chalk.white(`• ${text}\n`);
        case 'ul':
          return `${text}\n`;
        case 'br':
          return '\n';
        case 'hr':
          return '\n' + chalk.gray('─'.repeat(process.stdout.columns - 4)) + '\n\n';
        case 'q':
          return chalk.gray(`“${text}”\n`);
        default:
          return text;
      }
    }
    
    return '';
  }

  if (document.body) {
    content = extractText(document.body);
  } else {
    content = chalk.red('No body content found');
  }

  container.setContent(content);
  screen.append(container);

  const instructions = blessed.box({
    bottom: 0,
    height: 3,
    width: '100%',
    content: chalk.gray('Press q or Ctrl+C to exit | Use arrow keys or mouse to scroll'),
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

  screen.render();
  return screen;
}

async function main() {
  const url = process.argv[2] || 'https://example.com';
  
  try {
    console.log(chalk.blue(`Fetching ${url}...`));
    const html = await fetchHTML(url);
    const doc = parseHTML(html);
    
    const pageTitle = doc.title || url;
    
    console.log(chalk.green('Rendering TUI...'));
    renderTUI(doc, pageTitle); 
    
  } catch (err) {
    console.error(chalk.red('Error:'), err.message);
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => {
  console.error(chalk.red('Uncaught Exception:'), err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

main();
