import { neoBrowse } from './browser/neoBrowse.mjs';
import chalk from 'chalk';

async function main() {
  const args = process.argv.slice(2);
  const initialUrl = args[0] || 'https://arungeorgesaji.is-a.dev/NeoBrowse/';

  const browser = new neoBrowse();
  
  process.on('uncaughtException', (err) => {
    console.error(chalk.red('Uncaught Exception:'), err.message);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    process.exit(1);
  });

  await browser.newTab(initialUrl);
}

main();
