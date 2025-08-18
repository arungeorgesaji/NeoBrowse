import chalk from 'chalk';
import { extractText } from '../utils/domHelpers.mjs';
import { getLogger } from '../utils/logger.mjs'; 

export function calculateColumnWidths(rows, logger) {
  try {
    logger?.debug('Calculating column widths', {
      rowCount: rows.length,
      columnCount: rows[0]?.length || 0
    });

    const widths = [];
    rows.forEach(row => {
      row.forEach((cell, i) => {
        widths[i] = Math.max(widths[i] || 0, cell.length);
      });
    });

    logger?.debug('Column width calculation complete', {
      widths: widths,
      maxWidth: Math.max(...widths)
    })
    return widths;
  } catch (error) {
    logger?.error('Failed to calculate column widths', {
      error: error.message,
      sampleRow: rows[0]?.map(c => c.slice(0, 10)) || []
    });
    return rows[0]?.map(() => 20) || []; 
  }
}

export function renderTable(node) {
  const logger = getLogger();
  try {

    logger?.info('Starting table rendering', {
      source: node.outerHTML?.slice(0, 50) + (node.outerHTML?.length > 50 ? '...' : '')
    });

    const rows = []; 
    const rowsElements = node.querySelectorAll('tr');

    logger?.debug(`Found ${rowsElements.length} table rows`);

    rowsElements.forEach(tr => {
      const row = [];
      const cells = tr.querySelectorAll('th, td');
      
      logger?.debug(`Processing row ${trIdx} with ${cells.length} cells`);
      
      cells.forEach((cell, cellIdx) => {
        const cellText = extractText(cell, logger).trim();
        row.push(cellText);
        logger?.trace(`Cell [${trIdx},${cellIdx}]: "${cellText}"`);
      });

      if (row.length) rows.push(row);
    });

    if (rows.length === 0) {
      logger?.warn('Empty table detected');
      return '';
    }

    const colWidths = calculateColumnWidths(rows, logger);
    logger?.debug('Table layout calculated', {
      columns: colWidths.length,
      totalWidth: colWidths.reduce((a, b) => a + b + 3, 1) 
    });

    let output = '';
    const hasHeader = node.querySelector('thead') !== null;

    output += chalk.gray('┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐\n');
    logger?.trace('Rendered top border');

    rows.forEach((row, rowIndex) => {
      if (rowIndex === 1 && hasHeader) {
        output += chalk.gray('├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤\n');
        logger?.trace('Rendered header separator')
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
    logger?.debug('Table rendering complete', {
      outputLength: output.length,
      lineCount: output.split('\n').length
    });

    return output;
  } catch (error) {
    logger?.error('Table rendering failed', {
      error: error.message,
      nodeName: node?.nodeName,
      stack: error.stack?.split('\n')[0]
    });
    return '[TABLE RENDER ERROR]';
  }
}
