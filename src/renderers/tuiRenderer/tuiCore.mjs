import blessed from 'blessed';
import chalk from 'chalk';
import { extractText } from '../../utils/domHelpers.mjs';
import { createScreen, createTabBar, createContainer, createHeader, createFooter, createURLTextbox, createSearchTextbox } from './tuiComponents.mjs';
import { setupHandlers} from './tuiHandlers.mjs';
import { processContentWithLinks } from './tuiUtils.mjs';

export function renderTUI(document, pageTitle, onNavigate, tabOptions = {}) {
  if (global.currentScreen) {
    global.currentScreen.destroy();
  }

  const screen = createScreen(pageTitle); 

  global.currentScreen = screen;

  screen.on('resize', () => {
    screen.emit('repaint');
    screen.render();
  });

  const tabBar = createTabBar(); 

  const updateTabItems = () => {
    const tabs = tabOptions.tabs || [];
    const tabItems = {};
    
    tabs.forEach((tab, i) => {
      const isActive = tab.active;
      const displayText = tab.title.substring(0, 20) + (tab.title.length > 20 ? '...' : '');
      
      tabItems[i] = {
        text: displayText,  
        callback: () => {
          if (tabOptions.onSwitchTab) {
              tabOptions.onSwitchTab(i);
              updateTabItems();
              screen.render();
          }
        }
      };
    });
    
    tabBar.setItems(tabItems);
    
    tabs.forEach((tab, i) => {
      const isActive = tab.active;
      if (tabBar.items[i]) {
        tabBar.items[i].style = {
          bg: isActive ? 'cyan' : 'blue',
          fg: isActive ? 'black' : 'white',
          bold: isActive,
        };
      }
    });
  };


  updateTabItems();

  const container = createContainer(); 

  let content = '';
  let links = [];
  if (document.body) {
    const rawContent = extractText(document.body, 0, tabOptions.tabs?.find(t => t.active)?.currentUrl || '');
    const result = processContentWithLinks(rawContent);
    content = result.processedContent;
    links = result.links;
  } else {
    content = chalk.red('No body content found');
  }
  container.setContent(content);

  const header = createHeader(pageTitle);
  const footer = createFooter();

  const urlInput = createURLTextbox();
  const searchInput = createSearchTextbox();

  screen.append(header);
  screen.append(tabBar);
  screen.append(container);
  screen.append(footer);
  screen.append(urlInput);
  screen.append(searchInput);

  container.focus();

  setupHandlers({
    screen,
    container,
    onNavigate,
    tabOptions,
    urlInput,
    searchInput,
    links,
    updateTabItems,
    content,
  });
  
  screen.render();
  return screen;
}
