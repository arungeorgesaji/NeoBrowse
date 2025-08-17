import chalk from 'chalk';
import { extractText } from '../utils/domHelpers.mjs';

export function calculateColumnWidths(rows, debugPanel) {
  const widths = [];
  rows.forEach(row => {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] || 0, cell.length);
    });
  });
  return widths;
}

export function renderTable(node, debugPanel) {
  const rows = [];
  
  const rowsElements = node.querySelectorAll('tr');
  rowsElements.forEach(tr => {
    const row = [];
    tr.querySelectorAll('th, td').forEach(cell => {
      row.push(extractText(cell, debugPanel).trim());
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
