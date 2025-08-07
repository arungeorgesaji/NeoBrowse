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

  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });
  
  screen.key('n', () => {
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

  screen.key('b', () => {
    onNavigate('back');
  });

  screen.key('f', () => {
    onNavigate('forward');
  });;

  screen.key('r', () => {
    onNavigate('reload');
  });

  screen.key('h', () => {
    if (tabOptions.onShowHistory) {
      tabOptions.onShowHistory();
    }
  });

  screen.key('m', () => {
    if (tabOptions.onShowBookmarks) {
      tabOptions.onShowBookmarks();
    }
  });

  screen.key('s', () => {
    searchInput.show();
    searchInput.focus();
    searchInput.readInput((err, value) => {
      searchInput.hide();
      container.focus();
      if (value) {
        const searchQuery = encodeURIComponent(value);
        //onNavigate(`https://searx.be/search?q=${searchQuery}&format=html`);
        onNavigate(`https://searx.be/search?q=${searchQuery}&format=html`);

      }
      screen.render();
    });
  });

  screen.key('t', () => {
    if (tabOptions.onNewTab) {
      tabOptions.onNewTab();
      updateTabItems();
      screen.render();
    }
  });

  screen.key(['w'], () => {
    if (tabOptions.onCloseTab) {
      tabOptions.onCloseTab();
      updateTabItems();
      screen.render();
    }
  });

  screen.key(['tab'], () => {
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
    screen.key([`${i + 1}`], () => {  
      if (tabOptions.onSwitchTab && i < tabOptions.tabs.length) {
        tabOptions.onSwitchTab(i);
        updateTabItems();
        screen.render();
      }
    });
  }

  screen.key(['k', 'right'], () => {
    if (links.length === 0) return;
    
    focusedLinkIndex = (focusedLinkIndex + 1) % links.length;
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen);
    scrollToLink(links, focusedLinkIndex, container, screen);
  });

  screen.key(['j', 'left'], () => {
    if (links.length === 0) return;
    
    focusedLinkIndex = (focusedLinkIndex - 1 + links.length) % links.length;
    highlightFocusedLink(content, links, focusedLinkIndex, container, screen);
    scrollToLink(links, focusedLinkIndex, container, screen);
  });

  screen.key(['enter'], () => {
    if (focusedLinkIndex >= 0 && focusedLinkIndex < links.length) {
      const link = links[focusedLinkIndex];
      onNavigate(link.url);
    }
  });

  screen.key(['up', 'down'], (ch, key) => {
    container.scroll(key.name === 'up' ? -1 : 1);
    screen.render();
  });

  screen.key(['pageup', 'pagedown'], (ch, key) => {
    const scrollAmount = Math.floor(container.height / 2);
    container.scroll(key.name === 'pageup' ? -scrollAmount : scrollAmount);
    screen.render();
  });

  screen.key(['space'], () => {
    container.scroll(container.height);
    screen.render();
  });

  screen.key(['M-space'], () => {
    container.scroll(-(container.height));
    screen.render();
  });

  screen.key(['home', 'g'], () => {
    container.scrollTo(0);
    screen.render();
  });

  screen.key(['end', 'M-g'], () => {
    container.scrollTo(Infinity); 
    screen.render();
  });

  screen.key(['d'], () => {
    container.scroll(Math.floor(container.height / 2));
    screen.render();
  });

  screen.key(['u'], () => {
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
