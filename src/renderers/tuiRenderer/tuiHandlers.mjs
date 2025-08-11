import { highlightFocusedLink, scrollToLink } from './tuiUtils.mjs';

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

  const bindKey = (keys, handler) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const blessedKeys = keyArray.flatMap(key => {
      if (/^[a-z]$/.test(key)) return [key, `S-${key}`];
      if (/^M-[a-z]$/.test(key)) return [key, `M-S-${key.slice(2)}`];
      return [key]; 
    });
    screen.key(blessedKeys, handler);
  };

  bindKey(['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });
  
  bindKey('n', () => {
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

  bindKey('b', () => {
    onNavigate('back');
  });

  bindKey('f', () => {
    onNavigate('forward');
  });;

  bindKey('r', () => {
    onNavigate('reload');
  });

  bindKey('h', () => {
    if (tabOptions.onShowHistory) {
      tabOptions.onShowHistory();
    }
  });

  bindKey('m', () => {
    if (tabOptions.onShowBookmarks) {
      tabOptions.onShowBookmarks();
    }
  });

  bindKey('s', () => {
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

  bindKey('M-s', () => {
    if (tabOptions.onShowSettings) {
      tabOptions.onShowSettings();
    }
  });

  bindKey('t', () => {
    if (tabOptions.onNewTab) {
      tabOptions.onNewTab();
      updateTabItems();
      screen.render();
    }
  });

  bindKey(['w'], () => {
    if (tabOptions.onCloseTab) {
      tabOptions.onCloseTab();
      updateTabItems();
      screen.render();
    }
  });

  bindKey(['tab'], () => {
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
    bindKey([`${i + 1}`], () => {  
      if (tabOptions.onSwitchTab && i < tabOptions.tabs.length) {
        tabOptions.onSwitchTab(i);
        updateTabItems();
        screen.render();
      }
    });
  }

  bindKey(['k', 'right'], () => {
    if (links.length === 0) return;
    
    focusedLinkIndex = (focusedLinkIndex + 1) % links.length;
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen);
    scrollToLink(links, focusedLinkIndex, container, screen);
  });

  bindKey(['j', 'left'], () => {
    if (links.length === 0) return;
    
    focusedLinkIndex = (focusedLinkIndex - 1 + links.length) % links.length;
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen);
    scrollToLink(links, focusedLinkIndex, container, screen);
  });

  bindKey(['enter'], () => {
    if (focusedLinkIndex >= 0 && focusedLinkIndex < links.length) {
      const link = links[focusedLinkIndex];
      onNavigate(link.url);
    }
  });

  bindKey(['up', 'down'], (ch, key) => {
    container.scroll(key.name === 'up' ? -1 : 1);
    screen.render();
  });

  bindKey(['pageup', 'pagedown'], (ch, key) => {
    const scrollAmount = Math.floor(container.height / 2);
    container.scroll(key.name === 'pageup' ? -scrollAmount : scrollAmount);
    screen.render();
  });

  bindKey(['space'], () => {
    container.scroll(container.height);
    screen.render();
  });

  bindKey(['M-space'], () => {
    container.scroll(-(container.height));
    screen.render();
  });

  bindKey(['home', 'g'], () => {
    container.scrollTo(0);
    screen.render();
  });

  bindKey(['end', 'M-g'], () => {
    container.scrollTo(Infinity); 
    screen.render();
  });

  bindKey(['d'], () => {
    container.scroll(Math.floor(container.height / 2));
    screen.render();
  });

  bindKey(['u'], () => {
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
