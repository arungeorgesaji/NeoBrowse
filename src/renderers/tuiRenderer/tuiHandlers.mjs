import { highlightFocusedLink, scrollToLink } from './tuiUtils.mjs';

export function bindKey(element, keys, handler) {
  if (!element || typeof element.key !== 'function') {
    console.warn('bindKey: element must have a .key() method');
    return;
  }
  
  const keyArray = Array.isArray(keys) ? keys : [keys];
  const blessedKeys = keyArray.flatMap(key => {
    if (/^[a-z]$/.test(key)) return [key, `S-${key}`];
    if (/^M-[a-z]$/.test(key)) return [key, `M-S-${key.slice(2)}`];
    return [key]; 
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
}) {
  let focusedLinkIndex = -1;

  bindKey(screen, ['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });
  
  bindKey(screen, ['n'], () => {
    urlInput.show();
    urlInput.focus();
    urlInput.readInput((err, value) => {
      urlInput.hide();
      container.focus();
      if (value && onNavigate) {
        onNavigate(value);
      }
      screen.render();
    });
  });

  bindKey(screen, ['b'], () => {
    onNavigate('back');
  });

  bindKey(screen, ['f'], () => {
    onNavigate('forward');
  });;

  bindKey(screen, ['r'], () => {
    onNavigate('reload');
  });

  bindKey(screen, ['h'], () => {
    if (tabOptions.onShowHistory) {
      tabOptions.onShowHistory();
    }
  });

  bindKey(screen, ['m'], () => {
    if (tabOptions.onShowBookmarks) {
      tabOptions.onShowBookmarks();
    }
  });

  bindKey(screen, ['s'], () => {
    searchInput.show();
    searchInput.focus();
    searchInput.readInput((err, value) => {
      searchInput.hide();
      container.focus();
      if (value) {
        const searchQuery = encodeURIComponent(value);
        onNavigate(`https://searx.be/search?q=${searchQuery}&format=html`);

      }
      screen.render();
    });
  });

  bindKey(screen, ['M-s'], () => {
    if (tabOptions.onShowSettings) {
      tabOptions.onShowSettings();
    }
  });

  bindKey(screen, ['t'], () => {
    if (tabOptions.onNewTab) {
      tabOptions.onNewTab();
      updateTabItems();
      screen.render();
    }
  });

  bindKey(screen, ['w'], () => {
    if (tabOptions.onCloseTab) {
      tabOptions.onCloseTab();
      updateTabItems();
      screen.render();
    }
  });

  bindKey(screen, ['tab'], () => {
    if (tabOptions.onSwitchTab) {
      const tabs = tabOptions.tabs || [];
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(tab => tab.active);
        const nextIndex = (currentIndex + 1) % tabs.length;
        tabOptions.onSwitchTab(nextIndex);
        updateTabItems();
        screen.render();
      }
    }
  });

  for (let i = 0; i < 9; i++) {
    bindKey(screen, [`${i + 1}`], () => {  
      if (tabOptions.onSwitchTab && i < tabOptions.tabs.length) {
        tabOptions.onSwitchTab(i);
        updateTabItems();
        screen.render();
      }
    });
  }

  bindKey(screen, ['k', 'right'], () => {
    if (links.length === 0) return;
    
    focusedLinkIndex = (focusedLinkIndex + 1) % links.length;
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen);
    scrollToLink(links, focusedLinkIndex, container, screen);
  });

  bindKey(screen, ['j', 'left'], () => {
    if (links.length === 0) return;
    
    focusedLinkIndex = (focusedLinkIndex - 1 + links.length) % links.length;
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen);
    scrollToLink(links, focusedLinkIndex, container, screen);
  });

  bindKey(screen, ['enter'], () => {
    if (focusedLinkIndex >= 0 && focusedLinkIndex < links.length) {
      const link = links[focusedLinkIndex];
      onNavigate(link.url);
    }
  });

  bindKey(screen ,['up', 'down'], (ch, key) => {
    container.scroll(key.name === 'up' ? -1 : 1);
    screen.render();
  });

  bindKey(screen, ['pageup', 'pagedown'], (ch, key) => {
    const scrollAmount = Math.floor(container.height / 2);
    container.scroll(key.name === 'pageup' ? -scrollAmount : scrollAmount);
    screen.render();
  });

  bindKey(screen, ['space'], () => {
    container.scroll(container.height);
    screen.render();
  });

  bindKey(screen, ['M-space'], () => {
    container.scroll(-(container.height));
    screen.render();
  });

  bindKey(screen, ['home', 'g'], () => {
    container.scrollTo(0);
    screen.render();
  });

  bindKey(screen, ['end', 'M-g'], () => {
    container.scrollTo(Infinity); 
    screen.render();
  });

  bindKey(screen, ['d'], () => {
    container.scroll(Math.floor(container.height / 2));
    screen.render();
  });

  bindKey(screen, ['u'], () => {
    container.scroll(-Math.floor(container.height / 2));
    screen.render();
  });

  container.on('wheeldown', () => {
    container.scroll(1);
    screen.render();
  });

  container.on('wheelup', () => {
    container.scroll(-1);
    screen.render();
  });
}
