import { JSDOM } from 'jsdom';
import blessed from 'blessed';
import axios from 'axios';
import chalk from 'chalk';
import sanitizeHtml from 'sanitize-html';

const MAX_DEPTH = 20; 

const superScriptMap = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
  '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻',
  '=': '⁼', '(': '⁽', ')': '⁾'
};

const subScriptMap = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅',
  '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋',
  '=': '₌', '(': '₍', ')': '₎'
};

function toSuperScript(text) {
  return text.split('').map(c => superScriptMap[c] || c).join('');
}

function toSubScript(text) {
  return text.split('').map(c => subScriptMap[c] || c).join('');
}

function calculateColumnWidths(rows) {
  const widths = [];
  rows.forEach(row => {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] || 0, cell.length);
    });
  });
  return widths;
}

function extractText(node, depth = 0) {
  if (depth > MAX_DEPTH) {
    return `[Max depth ${MAX_DEPTH} reached - content truncated]`;
  }

  if (node.nodeType === 3) { 
    return node.textContent.trim();
  }
  
  if (node.nodeType === 1) { 
    const tagName = node.tagName.toLowerCase();
    let text = '';
    
    for (const child of node.childNodes) {
      text += extractText(child, depth + 1);
    }
    
    return formatTextByTag(tagName, text, node, depth);
  }
  
  return '';
}

function renderTable(node) {
  const rows = [];
  
  const rowsElements = node.querySelectorAll('tr');
  rowsElements.forEach(tr => {
    const row = [];
    tr.querySelectorAll('th, td').forEach(cell => {
      row.push(extractText(cell).trim());
    });
    if (row.length) rows.push(row);
  });

  if (rows.length === 0) return '';

  const colWidths = calculateColumnWidths(rows);
  let output = '';

  output += chalk.gray('┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐\n');

  rows.forEach((row, rowIndex) => {
    if (rowIndex === 1 && node.querySelector('thead')) {
      output += chalk.gray('├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤\n');
    }

    let rowText = '│';
    row.forEach((cell, colIndex) => {
      const isHeader = rowsElements[rowIndex].querySelector('th');
      const content = isHeader 
        ? chalk.bold.cyan(cell.padEnd(colWidths[colIndex]))
        : cell.padEnd(colWidths[colIndex]);
      rowText += ` ${content} │`;
    });
    output += rowText + '\n';
  });

  output += chalk.gray('└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘');
  return output;
}

async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url, { 
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TUI-Browser/1.0)' }
    });
    
    return sanitizeHtml(data, { 
      allowedTags: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'li', 'strong', 'em', 'br', 'hr', 'title', 'q', 'i', 'b', 'div', 'header', 'footer', 'head', 'body', 'section', 'span', 'address', 'article', 'main', 'html', 'sup', 'sub', 'code', 'pre', 'blockquote', 'nav', 'samp', 'var', 'mark', 'time', 'kbd', 'del', 'ins', 'small', 'data', 'cite', 'abbr', 'dfn', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'th', 'td', 'tr'],
      allowedAttributes: {
        'a': ['href', 'title']
      },
      disallowedTagsMode: 'discard'
    });
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

function parseHTML(html){
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable' 
  })
  
  return dom.window.document;
}

function addStructuralSeparator(tagName, text) {
  const boxWidth = Math.min(process.stdout.columns - 4, 60);
  const createBox = (label, content, color) => {
    const labelText = `── ${label} `;
    const padding = '─'.repeat(Math.max(0, boxWidth - labelText.length - 2));
    const topBorder = `┌${labelText}${padding}┐`;
    const bottomBorder = `└${'─'.repeat(boxWidth - 2)}┘`;
    
    return color(`\n${topBorder}\n${content}\n${bottomBorder}\n`);
  };
  
  const createSeperator = (label, content, color) => {
    const separator = `── ${label} ──`;
    return color(`\n${separator}\n${content}\n`);
  };
  
  const separators = {
    'header': createBox('HEADER', text, chalk.cyan),
    'main': createBox('MAIN CONTENT', text, chalk.white),
    'footer': createBox('FOOTER', text, chalk.yellow),
    'article': createBox('ARTICLE', text, chalk.red),
    'section': createSeperator('Section', text, chalk.green),
    'nav': createSeperator('Navigation', text, chalk.blue)
  };
  
  return separators[tagName] || text;
}

function formatTextByTag(tagName, text, node, depth = 0) {
  if (!text.trim()) return '';
  
  switch (tagName) {
    case 'h1':
      return chalk.bold.yellow(`\n${text}\n${'='.repeat(Math.min(text.length, 80))}\n`);
    case 'h2':
      return chalk.bold.cyan(`\n${text}\n${'-'.repeat(Math.min(text.length, 80))}\n`);
    case 'h3':
      return chalk.bold.white(`\n${text}\n`);
    case 'h4':
      return chalk.bold.gray(`\n${text}\n`);
    case 'h5':
    case 'h6':
      return chalk.bold(`\n${text}\n`);
    case 'p':
      return chalk.white(`${text}\n\n`);
    case 'a':
      const href = node?.getAttribute('href') || '';
      return chalk.cyan.underline(`${text}`) + chalk.gray(` (${href})`);
    case 'strong':
    case 'b':
      return chalk.bold(text);
    case 'em':
    case 'i':
      return chalk.italic(text);
    case 'u':
      return chalk.underline(text);
    case 's':
      return chalk.strikethrough(text);
    case 'li':
      return chalk.white(`• ${text}\n`);
    case 'br':
      return '\n';
    case 'hr':
      return '\n' + chalk.gray('─'.repeat(Math.min(process.stdout.columns - 4, 80))) + '\n\n';
    case 'q':
      return chalk.gray(`"${text}"`);
    case 'blockquote':
      return chalk.italic.gray(`\n│ ${text.replace(/\n/g, '\n│ ')}\n`);
    case 'code':
      return chalk.bgGray.white(` ${text} `);
    case 'pre':
      return chalk.gray(`\n\`\`\`\n${text}\n\`\`\`\n`);
    case 'address':
      return chalk.italic.gray(`${text}\n`);
    case 'sup':
      return chalk.bold(toSuperScript(text));
    case 'sub':
      return chalk.dim(toSubScript(text));
    case 'kbd': {
      return chalk.bgBlack.white.bold(`[${text}]`); 
    }
    case 'samp':
      return chalk.dim(text); 
    case 'var':
      return chalk.italic(text);
    case 'mark':
      return chalk.bgYellow.black(text);
    case 'time': {
      const datetime = node.getAttribute('datetime') || text;
      return datetime; 
    }
    case 'small':
      return chalk.dim(text);
    case 'del':
      return chalk.strikethrough.red(text);
    case 'data': {
      const value = node.getAttribute('value') || text;
      return chalk.gray(`[${value}]`); 
    }
    case 'cite':
      return chalk.italic.blue(`"${text}"`); 
    case 'ins':
      return chalk.underline.green(text);
    case 'abbr':
      const title = node.getAttribute('title') ? `[${node.getAttribute('title')}]` : '';
      return chalk.dim(text + title);
    case 'dfn':
      return chalk.italic.cyan(`"${text}"`);
    case 'ul':
      // Fixed: properly handle ul elements
      let listOutput = '';
      node.querySelectorAll('li').forEach(li => {
        listOutput += chalk.white(`• ${extractText(li, depth + 1)}\n`);
      });
      return listOutput;
    case 'dt':
      return chalk.bold(text + ': ');
    case 'dd':
      return '  ' + text + '\n';
    case 'table':
      return '\n' + renderTable(node) + '\n';
    case 'thead':
    case 'tbody':
    case 'tfoot':
    case 'tr':
      return ''; // These are handled by renderTable
    case 'th':
    case 'td':
      return text; // Content only, formatting handled by renderTable
    
    case 'header':
    case 'main':
    case 'footer':
    case 'article':
    case 'section':
    case 'nav':
      return addStructuralSeparator(tagName, text);
    
    case 'html':
    case 'body':
    case 'div':
    case 'span':
    case 'aside':
      return text;

    case 'template':
      return ''
    
    default:
      return text;
  }
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

async function main() {
  const args = process.argv.slice(2);
  const url = process.argv[2] || 'http://0.0.0.0:8000/table.html';

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
