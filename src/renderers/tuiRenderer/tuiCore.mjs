import blessed from 'blessed';
import chalk from 'chalk';
import { extractText } from '../../utils/domHelpers.mjs';
import { createScreen, createTabBar, createContainer, createHeader, createFooter, createURLTextbox, createSearchTextbox } from './tuiComponents.mjs';
import { setupHandlers} from './tuiHandlers.mjs';

export function renderTUI(document, pageTitle, onNavigate, tabOptions = {}) {
  let links = [];
  let currentlyHighlightedLinkId = null;

  let scrollSpeed = 5; 
  let scrollAcceleration = 0;
  let scrollInterval = null;

  if (global.currentScreen) {
    global.currentScreen.destroy();
  }

  const screen = createScreen(pageTitle); 

  global.currentScreen = screen;

  screen.on('resize', () => {
    screen.emit('repaint');
    screen.render();
  });

  function processContentWithLinks(content) {
    links = [];
    let linkId = 0;
    
    const processedContent = content.replace(
      /\{underline\}\{cyan-fg\}(.*?)\{\/cyan-fg\}\{\/underline\}\{#(.*?)\}/g, 
      (match, text, url) => {
        links.push({ text, url, id: linkId++ });
        return `{underline}{cyan-fg}[${linkId}] ${text}{/cyan-fg}{/underline} `;
      }
    );
    
    return processedContent;
  }

  function highlightFocusedLink(index) {
    let newContent = content.replace(
        /\{underline\}\{bold\}\{magenta-fg\}\[(\d+)\](.*?)\{\/magenta-fg\}\{\/bold\}\{\/underline\}/g,
        '{underline}{cyan-fg}[$1]$2{/cyan-fg}{/underline}'
    );

    if (index >= 0 && index < links.length) {
      const linkId = links[focusedLinkIndex].id + 1;
      const linkRegex = new RegExp(
        `\\{underline\\}\\{cyan-fg\\}\\[${linkId}\\](.*?)\\{/cyan-fg\\}\\{/underline\\}`,
        'g'
      );
      
      newContent = newContent.replace(
        linkRegex,
        `{underline}{bold}{magenta-fg}[${linkId}]$1{/magenta-fg}{/bold}{/underline}`
      );
    }
    
    container.setContent(newContent);
    screen.render();
  }

  function scrollToLink(linkIndex) {
    if (linkIndex < 0 || linkIndex >= links.length) return;
    
    const linkId = links[linkIndex].id + 1;
    const linkText = `[${linkId}]`;
    
    const rawContent = container.getContent();
    
    const cleanContent = rawContent.replace(/\{[^}]*\}/g, '');
    
    const linkPos = cleanContent.indexOf(linkText);
    if (linkPos === -1) return;
    
    const containerWidth = container.width - 2; 
    const textBeforeLink = cleanContent.substring(0, linkPos);
    
    let lineNumber = 0;
    let currentLineLength = 0;
    
    for (let i = 0; i < textBeforeLink.length; i++) {
      const char = textBeforeLink[i];
      
      if (char === '\n') {
        lineNumber++;
        currentLineLength = 0;
      } else {
        currentLineLength++;
        if (currentLineLength >= containerWidth) {
          lineNumber++;
          currentLineLength = 0;
        }
      }
    }
    
    const currentScroll = container.getScroll();
    const visibleHeight = container.height - 2; 
    
    const padding = 2; 
    
    if (lineNumber < currentScroll + padding) {
      container.scrollTo(Math.max(0, lineNumber - padding));
    } else if (lineNumber > currentScroll + visibleHeight - padding) {
      container.scrollTo(lineNumber - visibleHeight + padding);
    }
    
    screen.render();
  }

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
  if (document.body) {
    const rawContent = extractText(document.body, 0, tabOptions.tabs?.find(t => t.active)?.currentUrl || '');
    content = processContentWithLinks(rawContent);
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
    highlightFocusedLink: (index) => highlightFocusedLink(index),
    scrollToLink: (index) => scrollToLink(index)
  });
  
  screen.render();
  return screen;
}
