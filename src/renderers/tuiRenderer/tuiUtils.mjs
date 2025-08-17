import chalk from 'chalk';

export function processContentWithLinks(content, debugPanel) {
  debugPanel?.debug('Processing content for links', {
    contentLength: content?.length || 0
  });

  const links = [];
  let linkId = 0;
  
  const processedContent = content.replace(
    /\{underline\}\{cyan-fg\}(.*?)\{\/cyan-fg\}\{\/underline\}\{#(.*?)\}/g, 
    (match, text, url) => {
      links.push({ text, url, id: linkId++ });
      debugPanel?.trace('Found link', {
        id: linkId,
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        url
      });
      return `{underline}{cyan-fg}[${linkId}] ${text}{/cyan-fg}{/underline} `;
    }
  );

  debugPanel?.info('Finished processing content for links', {
    linkCount: links.length,
    processedContentLength: processedContent?.length || 0
  });

  return { processedContent, links };
}

export function highlightFocusedLink(content, links, index, container, screen, debugPanel) {
  debugPanel?.debug('Highlighting focused link', {
    linkIndex: index,
    totalLinks: links.length,
    contentLength: content?.length || 0
  });

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

    debugPanel?.trace('Applied highlighting to link', {
      linkId,
      linkText: links[index].text.substring(0, 50) + (links[index].text.length > 50 ? '...' : '')
    });
  } else {
    debugPanel?.warn('Invalid link index for highlighting', {
      index,
      validRange: `0-${links.length - 1}`
    });
  }
  
  try {
    container.setContent(newContent);
    screen.render();
    debugPanel?.trace('Updated container with highlighted link');
  } catch (err) {
    debugPanel?.error('Failed to highlight link', {
      error: err.message,
      stack: err.stack?.split('\n')[0]
    });
  }
}

export function scrollToLink(links, linkIndex, container, screen, debugPanel) {
  debugPanel?.debug('Attempting to scroll to link', {
    linkIndex,
    totalLinks: links.length
  });

  if (linkIndex < 0 || linkIndex >= links.length) {
    debugPanel?.warn('Invalid link index for scrolling', {
      linkIndex,
      validRange: `0-${links.length - 1}`
    });
    return;
  }
  
  const link = links[linkIndex];
  
  if (link.id !== undefined) {
    const linkText = `[${link.id + 1}]`;
    const rawContent = container.getContent();
    const cleanContent = rawContent.replace(/\{[^}]*\}/g, '');
    const linkPos = cleanContent.indexOf(linkText);
    
    if (linkPos === -1) {
      debugPanel?.warn('Link text not found in content', {
        linkText,
        cleanContentLength: cleanContent.length
      });
      return;
    }
    
    const lineNumber = calculateLineNumber(
      cleanContent.substring(0, linkPos), 
      container.width - 2,
      debugPanel
    );
    
    debugPanel?.trace('Calculated scroll position', {
      linkText,
      linkPos,
      lineNumber
    });
    
    scrollToLine(lineNumber, container, screen, debugPanel);
  } else {
    debugPanel?.warn('Link missing ID property', { link });
  }
}

export function scrollToFragment(fragment, container, screen, debugPanel, padding = 2) {
  debugPanel?.debug('Attempting to scroll to fragment', {
    fragment,
    containerHeight: container.height,
    padding
  });

  if (!fragment) {
    debugPanel?.warn('No fragment provided for scrolling');
    return;
  }

  const rawContent = container.getContent();

  const fragmentRegex = new RegExp(
    `\\{fragment-target\\}([^\\{]*${fragment}[^\\{]*)\\{\\/fragment-target\\}`
  );
  const fragmentMatch = rawContent.match(fragmentRegex);
  
  if (!fragmentMatch) {
    debugPanel?.warn('Fragment not found in content', {
      fragment,
      contentLength: rawContent.length
    });
    return;
  }

  debugPanel?.trace('Fragment match found', {
    match: fragmentMatch[1].substring(0, 50) + (fragmentMatch[1].length > 50 ? '...' : ''),
    position: fragmentMatch.index
  });
  
  const cleanContentBefore = rawContent
    .substring(0, fragmentMatch.index)
    .replace(/\{[^}]*\}/g, '');
  
  const linesBefore = cleanContentBefore.split('\n');
  const lineNumber = linesBefore.length - 1;
  
  const currentScroll = container.getScroll();
  const visibleHeight = container.height;
  
  if (
    lineNumber < currentScroll || 
    lineNumber > currentScroll + visibleHeight - padding * 2
  ) {
    const targetScroll = Math.max(0, lineNumber - Math.floor(visibleHeight / 2));
    debugPanel?.trace('Scrolling to fragment', {
      lineNumber,
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
    screen.render();
  } else {
    debugPanel?.trace('Fragment already visible', {
      lineNumber,
      currentScroll,
      visibleHeight
    });
  }
}

function calculateLineNumber(textBeforeLink, containerWidth, debugPanel) {
  debugPanel?.trace('Calculating line number', {
    textLength: textBeforeLink.length,
    containerWidth
  });

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

  debugPanel?.trace('Calculated line number', {
    lineNumber,
    finalLineLength: currentLineLength
  });

  return lineNumber;
}

function scrollToLine(lineNumber, container, screen, debugPanel, padding = 2) {
  debugPanel?.debug('Scrolling to line', {
    lineNumber,
    containerHeight: container.height,
    padding
  });

  const currentScroll = container.getScroll();
  const visibleHeight = container.height - 2;
  
  if (lineNumber < currentScroll + padding) {
    const targetScroll = Math.max(0, lineNumber - padding);
    debugPanel?.trace('Scrolling up', {
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
  } else if (lineNumber > currentScroll + visibleHeight - padding) {
    const targetScroll = lineNumber - visibleHeight + padding;
    debugPanel?.trace('Scrolling down', {
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
  } else {
    debugPanel?.trace('Line already visible', {
      lineNumber,
      currentScroll,
      visibleHeight
    });
  }
  
  try {
    screen.render();
    debugPanel?.trace('Screen rendered after scroll');
  } catch (err) {
    debugPanel?.error('Failed to render after scroll', {
      error: err.message
    });
  }
}

function scrollToElement(element, container, screen, debugPanel, padding = 2) {
  debugPanel?.debug('Scrolling to element', {
    elementTop: element.top,
    containerHeight: container.height,
    padding
  });

  const elementLine = element.top;
  const currentScroll = container.getScroll();
  const visibleHeight = container.height - 2;
  
  if (elementLine < currentScroll + padding) {
    const targetScroll = Math.max(0, elementLine - padding);
    debugPanel?.trace('Scrolling up to element', {
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
  } else if (elementLine > currentScroll + visibleHeight - padding) {
    const targetScroll = elementLine - visibleHeight + padding;
    debugPanel?.trace('Scrolling down to element', {
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
  } else {
    debugPanel?.trace('Element already visible', {
      elementLine,
      currentScroll,
      visibleHeight
    });
  }
  
  try {
    screen.render();
    debugPanel?.trace('Screen rendered after element scroll');
  } catch (err) {
    debugPanel?.error('Failed to render after element scroll', {
      error: err.message
    });
  }
}

export function getFragment(url, debugPanel) {
  debugPanel?.trace('Extracting fragment from URL', { url });
  const fragment = url?.match(/#([^#]*)$/)?.[1] ?? null;
  debugPanel?.debug('Extracted fragment', { fragment });
  return fragment;
}
