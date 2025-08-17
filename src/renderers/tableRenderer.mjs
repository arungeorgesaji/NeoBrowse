import chalk from 'chalk';
import { extractText } from '../utils/domHelpers.mjs';

export function calculateColumnWidths(rows, debugPanel) {
  try {
    debugPanel?.debug('Calculating column widths', {
      rowCount: rows.length,
      columnCount: rows[0]?.length || 0
    });

    const widths = [];
    rows.forEach(row => {
      row.forEach((cell, i) => {
        widths[i] = Math.max(widths[i] || 0, cell.length);
      });
    });

    debugPanel?.debug('Column width calculation complete', {
      widths: widths,
      maxWidth: Math.max(...widths)
    })
    return widths;
  } catch (error) {
    debugPanel?.error('Failed to calculate column widths', {
      error: error.message,
      sampleRow: rows[0]?.map(c => c.slice(0, 10)) || []
    });
    return rows[0]?.map(() => 20) || []; 
  }
}

export function renderTable(node, debugPanel) {
  try {
    debugPanel?.info('Starting table rendering', {
      source: node.outerHTML?.slice(0, 50) + (node.outerHTML?.length > 50 ? '...' : '')
    });

    const rows = []; 
    const rowsElements = node.querySelectorAll('tr');

    debugPanel?.debug(`Found ${rowsElements.length} table rows`);

    rowsElements.forEach(tr => {
      const row = [];
      const cells = tr.querySelectorAll('th, td');
      
      debugPanel?.debug(`Processing row ${trIdx} with ${cells.length} cells`);
      
      cells.forEach((cell, cellIdx) => {
        const cellText = extractText(cell, debugPanel).trim();
        row.push(cellText);
        debugPanel?.trace(`Cell [${trIdx},${cellIdx}]: "${cellText}"`);
      });

      if (row.length) rows.push(row);
    });

    if (rows.length === 0) {
      debugPanel?.warn('Empty table detected');
      return '';
    }

    const colWidths = calculateColumnWidths(rows);
    debugPanel?.debug('Table layout calculated', {
      columns: colWidths.length,
      totalWidth: colWidths.reduce((a, b) => a + b + 3, 1) 
    });

    let output = '';
    const hasHeader = node.querySelector('thead') !== null;

    output += chalk.gray('┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐\n');
    debugPanel?.trace('Rendered top border');

    rows.forEach((row, rowIndex) => {
      if (rowIndex === 1 && hasHeader) {
        output += chalk.gray('├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤\n');
        debugPanel?.trace('Rendered header separator')
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
    debugPanel?.debug('Table rendering complete', {
      outputLength: output.length,
      lineCount: output.split('\n').length
    });

    return output;
  } catch (error) {
    debugPanel?.error('Table rendering failed', {
      error: error.message,
      nodeName: node?.nodeName,
      stack: error.stack?.split('\n')[0]
    });
    return '[TABLE RENDER ERROR]';
  }
}
