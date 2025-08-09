import chalk from 'chalk';

export function processContentWithLinks(content) {
  const links = [];
  let linkId = 0;
  
  const processedContent = content.replace(
    /\{underline\}\{cyan-fg\}(.*?)\{\/cyan-fg\}\{\/underline\}\{#(.*?)\}/g, 
    (match, text, url) => {
      links.push({ text, url, id: linkId++ });
      return `{underline}{cyan-fg}[${linkId}] ${text}{/cyan-fg}{/underline} `;
    }
  );

  return { processedContent, links };
}

export function highlightFocusedLink(content, links, index, container, screen) {
  let newContent = content.replace(
      /\{underline\}\{bold\}\{magenta-fg\}\[(\d+)\](.*?)\{\/magenta-fg\}\{\/bold\}\{\/underline\}/g,
      '{underline}{cyan-fg}[$1]$2{/cyan-fg}{/underline}'
  );

  if (index >= 0 && index < links.length) {
    const linkId = links[index].id + 1;
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

export function scrollToLink(links, linkIndex, container, screen) {
  if (linkIndex < 0 || linkIndex >= links.length) return;
  
  const link = links[linkIndex];
  
  if (link.href && link.href.startsWith('#')) {
    const fragment = link.href.substring(1);
    const element = container.children.find(child => 
      child.type === 'box' && child.content.includes(`id="${fragment}"`)
    );
    
    if (element) {
      scrollToElement(element, container, screen);
    }
    return;
  }
  
  if (link.id !== undefined) {
    const linkText = `[${link.id + 1}]`;
    const rawContent = container.getContent();
    const cleanContent = rawContent.replace(/\{[^}]*\}/g, '');
    const linkPos = cleanContent.indexOf(linkText);
    
    if (linkPos === -1) return;
    
    const lineNumber = calculateLineNumber(cleanContent.substring(0, linkPos), container.width - 2);
    scrollToLine(lineNumber, container, screen);
  }
}

function calculateLineNumber(textBeforeLink, containerWidth) {
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
  return lineNumber;
}

function scrollToLine(lineNumber, container, screen, padding = 2) {
  const currentScroll = container.getScroll();
  const visibleHeight = container.height - 2;
  
  if (lineNumber < currentScroll + padding) {
    container.scrollTo(Math.max(0, lineNumber - padding));
  } else if (lineNumber > currentScroll + visibleHeight - padding) {
    container.scrollTo(lineNumber - visibleHeight + padding);
  }
  
  screen.render();
}

function scrollToElement(element, container, screen, padding = 2) {
  const elementLine = element.top;
  const currentScroll = container.getScroll();
  const visibleHeight = container.height - 2;
  
  if (elementLine < currentScroll + padding) {
    container.scrollTo(Math.max(0, elementLine - padding));
  } else if (elementLine > currentScroll + visibleHeight - padding) {
    container.scrollTo(elementLine - visibleHeight + padding);
  }
  
  screen.render();
}
