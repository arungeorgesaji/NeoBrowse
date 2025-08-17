import { highlightFocusedLink, scrollToLink } from './tuiUtils.mjs';

export function bindKey(element, keys, debugPanel, handler) {
  if (!element || typeof element.key !== 'function') {
    debugPanel?.warn('bindKey: element must have a .key() method', {
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
  
  debugPanel?.trace('Binding keys', {
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
  debugPanel,
}) {
  debugPanel?.info('Setting up keyboard handlers', {
    hasOnNavigate: !!onNavigate,
    tabCount: tabOptions?.tabs?.length || 0,
    linkCount: links?.length || 0
  });

  let focusedLinkIndex = -1;

  bindKey(screen, ['q', 'C-c'], debugPanel, () => {
    debugPanel?.info('Quit command received');
    screen.destroy();
    process.exit(0);
  });
  
  bindKey(screen, ['n'], debugPanel, () => {
    debugPanel?.debug('URL input triggered');
    urlInput.show();
    urlInput.focus();
    urlInput.readInput((err, value) => {
      urlInput.hide();
      container.focus();
      if (value && onNavigate) {
        debugPanel?.info('Navigating to URL', {
          url: value.substring(0, 100) + (value.length > 100 ? '...' : '')
        });
        onNavigate(value);
      } else if (err) {
        debugPanel?.error('URL input error', {
          error: err.message
        });
      }
      screen.render();
    });
  });

  bindKey(screen, ['b'], debugPanel, () => {
    debugPanel?.debug('Back navigation triggered');
    onNavigate('back');
  });

  bindKey(screen, ['f'], debugPanel, () => {
    debugPanel?.debug('Forward navigation triggered');
    onNavigate('forward');
  });

  bindKey(screen, ['r'], debugPanel, () => {
    debugPanel?.debug('Reload triggered');
    onNavigate('reload');
  });

  bindKey(screen, ['h'], debugPanel, () => {
    debugPanel?.debug('History command triggered');
    if (tabOptions.onShowHistory) {
      tabOptions.onShowHistory();
    }
  });

  bindKey(screen, ['m'], debugPanel, () => {
    debugPanel?.debug('Bookmarks command triggered');
    if (tabOptions.onShowBookmarks) {
      tabOptions.onShowBookmarks();
    }
  });

  bindKey(screen, ['s'], debugPanel, () => {
    debugPanel?.debug('Search input triggered');
    searchInput.show();
    searchInput.focus();
    searchInput.readInput((err, value) => {
      searchInput.hide();
      container.focus();
      if (value) {
        const searchQuery = encodeURIComponent(value);
        debugPanel?.info('Searching', {
          query: value.substring(0, 50) + (value.length > 50 ? '...' : '')
        });
        onNavigate(`https://searx.be/search?q=${searchQuery}&format=html`);
      } else if (err) {
        debugPanel?.error('Search input error', {
          error: err.message
        });
      }
      screen.render();
    });
  });

  bindKey(screen, ['M-s'], debugPanel, () => {
    debugPanel?.debug('Settings command triggered');
    if (tabOptions.onShowSettings) {
      tabOptions.onShowSettings();
    }
  });

  bindKey(screen, ['t'], debugPanel, () => {
    debugPanel?.debug('New tab command triggered');
    if (tabOptions.onNewTab) {
      tabOptions.onNewTab();
      updateTabItems();
      screen.render();
      debugPanel?.trace('New tab created and UI updated');
    }
  });

  bindKey(screen, ['w'], debugPanel, () => {
    debugPanel?.debug('Close tab command triggered');
    if (tabOptions.onCloseTab) {
      tabOptions.onCloseTab();
      updateTabItems();
      screen.render();
      debugPanel?.trace('Tab closed and UI updated');
    }
  });

  bindKey(screen, ['tab'], debugPanel, () => {
    debugPanel?.debug('Switch tab command triggered');
    if (tabOptions.onSwitchTab) {
      const tabs = tabOptions.tabs || [];
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(tab => tab.active);
        const nextIndex = (currentIndex + 1) % tabs.length;
        debugPanel?.trace('Switching tabs', {
          fromTab: currentIndex,
          toTab: nextIndex
        });
        tabOptions.onSwitchTab(nextIndex);
        updateTabItems();
        screen.render();
      } else {
        debugPanel?.trace('No other tabs to switch to');
      }
    }
  });

  for (let i = 0; i < 9; i++) {
    bindKey(screen, [`${i + 1}`], debugPanel, () => {  
      debugPanel?.debug(`Tab ${i + 1} shortcut triggered`);
      if (tabOptions.onSwitchTab && i < tabOptions.tabs?.length) {
        debugPanel?.trace(`Switching to tab ${i}`);
        tabOptions.onSwitchTab(i);
        updateTabItems();
        screen.render();
      }
    });
  }

  bindKey(screen, ['k', 'right'], debugPanel, () => {
    if (links.length === 0) {
      debugPanel?.trace('No links available for navigation');
      return;
    }
    
    focusedLinkIndex = (focusedLinkIndex + 1) % links.length;
    debugPanel?.trace('Navigating to next link', {
      linkIndex: focusedLinkIndex,
      linkText: links[focusedLinkIndex].text.substring(0, 50) + (links[focusedLinkIndex].text.length > 50 ? '...' : ''),
      linkUrl: links[focusedLinkIndex].url
    });
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen, debugPanel);
    scrollToLink(links, focusedLinkIndex, container, screen, debugPanel);
  });

  bindKey(screen, ['j', 'left'], debugPanel, () => {
    if (links.length === 0) {
      debugPanel?.trace('No links available for navigation');
      return;
    }
    
    focusedLinkIndex = (focusedLinkIndex - 1 + links.length) % links.length;
    debugPanel?.trace('Navigating to previous link', {
      linkIndex: focusedLinkIndex,
      linkText: links[focusedLinkIndex].text.substring(0, 50) + (links[focusedLinkIndex].text.length > 50 ? '...' : ''),
      linkUrl: links[focusedLinkIndex].url
    });
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen, debugPanel);
    scrollToLink(links, focusedLinkIndex, container, screen, debugPanel);
  });

  bindKey(screen, ['enter'], debugPanel, () => {
    if (focusedLinkIndex >= 0 && focusedLinkIndex < links.length) {
      const link = links[focusedLinkIndex];
      debugPanel?.info('Following link', {
        index: focusedLinkIndex,
        text: link.text.substring(0, 50) + (link.text.length > 50 ? '...' : ''),
        url: link.url
      });
      onNavigate(link.url);
    } else {
      debugPanel?.debug('Enter pressed but no valid link focused', {
        focusedLinkIndex
      });
    }
  });

  bindKey(screen, ['up', 'down'], debugPanel, (ch, key) => {
    debugPanel?.trace('Scrolling', {
      direction: key.name,
      lines: 1
    });
    container.scroll(key.name === 'up' ? -1 : 1);
    screen.render();
  });

  bindKey(screen, ['pageup', 'pagedown'], debugPanel, (ch, key) => {
    const scrollAmount = Math.floor(container.height / 2);
    debugPanel?.trace('Page scrolling', {
      direction: key.name,
      amount: scrollAmount
    });
    container.scroll(key.name === 'pageup' ? -scrollAmount : scrollAmount);
    screen.render();
  });

  bindKey(screen, ['space'], debugPanel, () => {
    const scrollAmount = container.height;
    debugPanel?.trace('Space scrolling', {
      direction: 'down',
      amount: scrollAmount
    });
    container.scroll(scrollAmount);
    screen.render();
  });

  bindKey(screen, ['M-space'], debugPanel, () => {
    const scrollAmount = container.height;
    debugPanel?.trace('Meta-space scrolling', {
      direction: 'up',
      amount: scrollAmount
    });
    container.scroll(-scrollAmount);
    screen.render();
  });

  bindKey(screen, ['home', 'g'], debugPanel, () => {
    debugPanel?.trace('Scrolling to top');
    container.scrollTo(0);
    screen.render();
  });

  bindKey(screen, ['end', 'M-g'], debugPanel, () => {
    debugPanel?.trace('Scrolling to bottom');
    container.scrollTo(Infinity); 
    screen.render();
  });

  bindKey(screen, ['d'], debugPanel, () => {
    const scrollAmount = Math.floor(container.height / 2);
    debugPanel?.trace('Half-page scrolling down', { amount: scrollAmount });
    container.scroll(scrollAmount);
    screen.render();
  });

  bindKey(screen, ['u'], debugPanel, () => {
    const scrollAmount = Math.floor(container.height / 2);
    debugPanel?.trace('Half-page scrolling up', { amount: scrollAmount });
    container.scroll(-scrollAmount);
    screen.render();
  });

  container.on('wheeldown', () => {
    debugPanel?.trace('Mouse wheel down');
    container.scroll(1);
    screen.render();
  });

  container.on('wheelup', () => {
    debugPanel?.trace('Mouse wheel up');
    container.scroll(-1);
    screen.render();
  });

  debugPanel?.info('Keyboard handlers setup complete');
}
