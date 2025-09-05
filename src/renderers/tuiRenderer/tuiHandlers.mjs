import { highlightFocusedLink, scrollToLink } from './tuiUtils.mjs';
import { getLogger } from '../../utils/logger.mjs'; 

export function bindKey(element, keys, handler) {
  const logger = getLogger();

  if (!element || typeof element.key !== 'function') {
    logger?.warn('bindKey: element must have a .key() method', {
      elementType: typeof element,
      hasKeyMethod: typeof element.key
    });
    return;
  }
  
  const keyArray = Array.isArray(keys) ? keys : [keys];
  const blessedKeys = keyArray.flatMap(key => {
    if (/^[a-z]$/.test(key)) return [key, `S-${key}`];
    if (/^M-[a-z]$/.test(key)) return [key, `M-S-${key.slice(2)}`];
    return [key]; 
  });
  
  logger?.debug('Binding keys', {
    originalKeys: keys,
    blessedKeys,
    handler: handler.name || 'anonymous'
  });
  
  element.key(blessedKeys, handler);
}

export function setupHandlers({
  screen,
  container,
  onNavigate,
  tabOptions,
  urlInput,
  searchInput,
  links,
  updateTabItems,
  content,
  browseInstance 
}) {
  const logger = getLogger();

  const isMainPage = () => {
    const pageType = browseInstance?.currentPageType || 'main';
    return pageType === 'main';  
  };

  logger?.info('Setting up keyboard handlers', {
    hasOnNavigate: !!onNavigate,
    tabCount: tabOptions?.tabs?.length || 0,
    linkCount: links?.length || 0
  });

  let focusedLinkIndex = -1;

  bindKey(screen, ['q', 'C-c'], () => {
    logger?.info('Quit command received');
    screen.destroy();
    process.exit(0);
  });
  
  bindKey(screen, ['n'], () => {
    if (!isMainPage()) return;

    logger?.debug('URL input triggered');
    urlInput.show();
    urlInput.focus();
    urlInput.readInput((err, value) => {
      urlInput.hide();
      container.focus();
      if (value && onNavigate) {
        logger?.info('Navigating to URL', {
          url: value.substring(0, 100) + (value.length > 100 ? '...' : '')
        });
        onNavigate(value);
      } else if (err) {
        logger?.error('URL input error', {
          error: err.message
        });
      }
      screen.render();
    });
  });

  bindKey(screen, ['b'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Back navigation triggered');
    onNavigate('back');
  });

  bindKey(screen, ['f'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Forward navigation triggered');
    onNavigate('forward');
  });

  bindKey(screen, ['r'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Reload triggered');
    onNavigate('reload');
  });

  bindKey(screen, ['h'], () => {
    if (!isMainPage()) return; 

    logger?.debug('History command triggered');
    if (tabOptions.onShowHistory) {
      tabOptions.onShowHistory();
    }
  });

  bindKey(screen, ['m'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Bookmarks command triggered');
    if (tabOptions.onShowBookmarks) {
      tabOptions.onShowBookmarks();
    }
  });

  bindKey(screen, ['s'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Search input triggered');
    searchInput.show();
    searchInput.focus();
    searchInput.readInput((err, value) => {
      searchInput.hide();
      container.focus();
      if (value) {
        const searchQuery = encodeURIComponent(value);
        logger?.info('Searching', {
          query: value.substring(0, 50) + (value.length > 50 ? '...' : '')
        });
        onNavigate(`https://searx.be/search?q=${searchQuery}&format=html`);
      } else if (err) {
        logger?.error('Search input error', {
          error: err.message
        });
      }
      screen.render();
    });
  });

  bindKey(screen, ['M-s'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Settings command triggered');
    if (tabOptions.onShowSettings) {
      tabOptions.onShowSettings();
    }
  });

  bindKey(screen, ['t'], () => {
    if (!isMainPage()) return; 

    logger?.debug('New tab command triggered');
    if (tabOptions.onNewTab) {
      tabOptions.onNewTab();
      updateTabItems();
      screen.render();
      logger?.debug('New tab created and UI updated');
    }
  });

  bindKey(screen, ['w'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Close tab command triggered');
    if (tabOptions.onCloseTab) {
      tabOptions.onCloseTab();
      updateTabItems();
      screen.render();
      logger?.debug('Tab closed and UI updated');
    }
  });

  bindKey(screen, ['tab'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Switch tab command triggered');
    if (tabOptions.onSwitchTab) {
      const tabs = tabOptions.tabs || [];
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(tab => tab.active);
        const nextIndex = (currentIndex + 1) % tabs.length;
        logger?.debug('Switching tabs', {
          fromTab: currentIndex,
          toTab: nextIndex
        });
        tabOptions.onSwitchTab(nextIndex);
        updateTabItems();
        screen.render();
      } else {
        logger?.debug('No other tabs to switch to');
      }
    }
  });

  for (let i = 0; i < 9; i++) {
    bindKey(screen, [`${i + 1}`], () => {  
      if (!isMainPage()) return; 

      logger?.debug(`Tab ${i + 1} shortcut triggered`);
      if (tabOptions.onSwitchTab && i < tabOptions.tabs?.length) {
        logger?.debug(`Switching to tab ${i}`);
        tabOptions.onSwitchTab(i);
        updateTabItems();
        screen.render();
      }
    });
  }

  bindKey(screen, ['k', 'right'], () => {
    if (!isMainPage()) return; 

    if (links.length === 0) {
      logger?.debug('No links available for navigation');
      return;
    }
    
    focusedLinkIndex = (focusedLinkIndex + 1) % links.length;
    logger?.debug('Navigating to next link', {
      linkIndex: focusedLinkIndex,
      linkText: links[focusedLinkIndex].text.substring(0, 50) + (links[focusedLinkIndex].text.length > 50 ? '...' : ''),
      linkUrl: links[focusedLinkIndex].url
    });
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen);
    scrollToLink(links, focusedLinkIndex, container, screen);
  });

  bindKey(screen, ['j', 'left'], () => {
    if (!isMainPage()) return; 

    if (links.length === 0) {
      logger?.debug('No links available for navigation');
      return;
    }
    
    focusedLinkIndex = (focusedLinkIndex - 1 + links.length) % links.length;
    logger?.debug('Navigating to previous link', {
      linkIndex: focusedLinkIndex,
      linkText: links[focusedLinkIndex].text.substring(0, 50) + (links[focusedLinkIndex].text.length > 50 ? '...' : ''),
      linkUrl: links[focusedLinkIndex].url
    });
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen);
    scrollToLink(links, focusedLinkIndex, container, screen);
  });

  bindKey(screen, ['enter'], () => {
    if (!isMainPage()) return; 

    if (focusedLinkIndex >= 0 && focusedLinkIndex < links.length) {
      const link = links[focusedLinkIndex];
      logger?.info('Following link', {
        index: focusedLinkIndex,
        text: link.text.substring(0, 50) + (link.text.length > 50 ? '...' : ''),
        url: link.url
      });
      onNavigate(link.url);
    } else {
      logger?.debug('Enter pressed but no valid link focused', {
        focusedLinkIndex
      });
    }
  });

  bindKey(screen, ['up', 'down'], (ch, key) => {
    if (!isMainPage()) return; 
 
    logger?.debug('Scrolling', {
      direction: key.name,
      lines: 1
    });
    container.scroll(key.name === 'up' ? -1 : 1);
    screen.render();
  });

  bindKey(screen, ['pageup', 'pagedown'], (ch, key) => {
    if (!isMainPage()) return; 

    const scrollAmount = Math.floor(container.height / 2);
    logger?.debug('Page scrolling', {
      direction: key.name,
      amount: scrollAmount
    });
    container.scroll(key.name === 'pageup' ? -scrollAmount : scrollAmount);
    screen.render();
  });

  bindKey(screen, ['space'], () => {
    if (!isMainPage()) return; 
 
    const scrollAmount = container.height;
    logger?.debug('Space scrolling', {
      direction: 'down',
      amount: scrollAmount
    });
    container.scroll(scrollAmount);
    screen.render();
  });

  bindKey(screen, ['M-space'], () => {
    if (!isMainPage()) return; 

    const scrollAmount = container.height;
    logger?.debug('Meta-space scrolling', {
      direction: 'up',
      amount: scrollAmount
    });
    container.scroll(-scrollAmount);
    screen.render();
  });

  bindKey(screen, ['home', 'g'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Scrolling to top');
    container.scrollTo(0);
    screen.render();
  });

  bindKey(screen, ['end', 'M-g'], () => {
    if (!isMainPage()) return; 

    logger?.debug('Scrolling to bottom');
    container.scrollTo(Infinity); 
    screen.render();
  });

  bindKey(screen, ['d'], () => {
    if (!isMainPage()) return; 

    const scrollAmount = Math.floor(container.height / 2);
    logger?.debug('Half-page scrolling down', { amount: scrollAmount });
    container.scroll(scrollAmount);
    screen.render();
  });

  bindKey(screen, ['u'], () => {
    if (!isMainPage()) return; 

    const scrollAmount = Math.floor(container.height / 2);
    logger?.debug('Half-page scrolling up', { amount: scrollAmount });
    container.scroll(-scrollAmount);
    screen.render();
  });

  container.on('wheeldown', () => {
    logger?.debug('Mouse wheel down');
    container.scroll(1);
    screen.render();
  });

  container.on('wheelup', () => {
    logger?.debug('Mouse wheel up');
    container.scroll(-1);
    screen.render();
  });

  logger?.info('Keyboard handlers setup complete');
}
