import chalk from 'chalk';

export function addStructuralSeparator(tagName, text, debugPanel) {
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
