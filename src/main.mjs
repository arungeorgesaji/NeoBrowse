import { neoBrowse } from './browser/neoBrowse.mjs';
import { debugPanel } from './utils/debugPanel.mjs';
import chalk from 'chalk';
import blessed from 'blessed';

async function main() {
  const args = process.argv.slice(2);
  const initialUrl = args[0] || 'https://arungeorgesaji.is-a.dev/NeoBrowse/';

  const screen = blessed.screen({
    smartCSR: true,
    title: 'NeoBrowse Terminal Browser'
  });

  const debugPanelInstance = new debugPanel(screen, {
    toggleKey: 'C-d',
    clearKey: 'C-k',
    fullClearKey: 'C-f',
    maxLines: 100,
    startHidden: true
  });

  const browser = new neoBrowse(screen, debugPanelInstance);
  
  process.on('uncaughtException', (err) => {
    debugPanelInstance.log(`Uncaught Exception: ${err.message}`, 'error');
    console.error(chalk.red('Uncaught Exception:'), err.message);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    debugPanelInstance.log(`Unhandled Rejection: ${reason}`, 'error');
    console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    process.exit(1);
  });

  await browser.newTab(initialUrl);
  debugPanelInstance.log('Browser initialized successfully');
}

main();
