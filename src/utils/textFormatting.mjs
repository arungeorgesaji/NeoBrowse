import { superScriptMap, subScriptMap } from '../constants/scriptMaps.mjs';
import { addStructuralSeparator } from '../renderers/structuralRenderer.mjs';
import chalk from 'chalk';

export function toSuperScript(text, debugPanel) {
  return text.split('').map(c => superScriptMap[c] || c).join('');
}

export function toSubScript(text, debugPanel) {
  return text.split('').map(c => subScriptMap[c] || c).join('');
}

function collectFragments(node, debugPanel) {
  const fragments = new Set();
  
  function traverse(element) {
    if (element.tagName === 'A') {
      const href = element.getAttribute('href');
      if (href && href.startsWith('#')) {
        const fragment = href.substring(1);
        if (fragment) {
          fragments.add(fragment);
        }
      }
    }
    
    // Recursively check child nodes
    for (const child of element.children || []) {
      traverse(child);
    }
  }
  
  traverse(node);
  return fragments;
}

function initializeFragments(rootNode, context, debugPanel) {
  context.fragmentTargets = collectFragments(rootNode);
}

const elementPositions = new Map();
let currentLine = 0;

export function formatTextByTag(tagName, text, node, depth = 0, baseUrl = '', context = {}, debugPanel) {
  if (!text.trim()) return '';

  const elementId = node?.getAttribute('id') || node?.getAttribute('name');
  const isFragmentTarget = elementId && context.fragmentTargets?.has(elementId);

  if (isFragmentTarget) {
    text = `{fragment-target}${text}{/fragment-target}`;
  }

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
    case 'a': {
      const href = node?.getAttribute('href') || '';
      if (!href) return text;
      
      let absoluteUrl = href;
      
      try {
        if (baseUrl && !href.startsWith('http://') && !href.startsWith('https://')) {
          absoluteUrl = new URL(href, baseUrl).toString();
        }
      } catch (e) {
        absoluteUrl = href;
      }

      if (href.startsWith('#')) {
        const fragment = href.substring(1);
        if (fragment) {
          context.fragmentTargets?.add(fragment);
        }
      }

      return `{underline}{cyan-fg}${text}{/cyan-fg}{/underline}{#${absoluteUrl}}`;
    }
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
      return ''; 
    case 'th':
    case 'td':
      return text; 
    
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
