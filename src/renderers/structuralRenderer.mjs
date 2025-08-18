import chalk from 'chalk';
import { getLogger } from '../utils/logger.mjs'; 

export function addStructuralSeparator(tagName, text) {
  const logger = getLogger();

  try {
    logger?.debug(`Adding structural separator for <${tagName}>`, {
      textLength: text.length,
      screenWidth: process.stdout.columns,
      isTTY: process.stdout.isTTY
    });

    const boxWidth = Math.min(process.stdout.columns - 4, 60);

    const createBox = (label, content, color) => {
      logger?.debug(`Creating box separator: ${label}`, {
        boxWidth,
        labelLength: label.length
      });

      const labelText = `── ${label} `;
      const padding = '─'.repeat(Math.max(0, boxWidth - labelText.length - 2));
      const topBorder = `┌${labelText}${padding}┐`;
      const bottomBorder = `└${'─'.repeat(boxWidth - 2)}┘`;
      
      return color(`\n${topBorder}\n${content}\n${bottomBorder}\n`);
    };
    
    const createSeperator = (label, content, color) => {
      logger?.debug(`Creating simple separator: ${label}`);
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

    const result = separators[tagName] || text;
    
    logger?.debug(`Structural separator applied to <${tagName}>`, {
      finalLength: result.length,
      type: separators[tagName] ? 'custom' : 'fallback'
    });
    
    return result;
  } catch (error) {
    logger?.error('Failed to add structural separator', {
      tagName,
      error: error.message,
      stack: error.stack?.split('\n')[0]
    });
    return text;
  }
}
