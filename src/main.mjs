import { fetchHTML } from './network/fetcher.mjs';
import { parseHTML } from './utils/htmlProcessing.mjs';
import { renderTUI } from './renderers/tuiRenderer.mjs';
import chalk from 'chalk';

async function main() {
  const args = process.argv.slice(2);
  const url = process.argv[2] || 'https://arungeorgesaji.is-a.dev';

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
