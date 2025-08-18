import chalk from 'chalk';
import { getLogger } from '../../utils/logger.mjs'; 

export function processContentWithLinks(content) {
  const logger = getLogger();

  logger?.debug('Processing content for links', {
    contentLength: content?.length || 0
  });

  const links = [];
  let linkId = 0;
  
  const processedContent = content.replace(
    /\{underline\}\{cyan-fg\}(.*?)\{\/cyan-fg\}\{\/underline\}\{#(.*?)\}/g, 
    (match, text, url) => {
      links.push({ text, url, id: linkId++ });
      logger?.debug('Found link', {
        id: linkId,
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        url
      });
      return `{underline}{cyan-fg}[${linkId}] ${text}{/cyan-fg}{/underline} `;
    }
  );

  logger?.info('Finished processing content for links', {
    linkCount: links.length,
    processedContentLength: processedContent?.length || 0
  });

  return { processedContent, links };
}

export function highlightFocusedLink(content, links, index, container, screen) {
  const logger = getLogger();

  logger?.debug('Highlighting focused link', {
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

    logger?.debug('Applied highlighting to link', {
      linkId,
      linkText: links[index].text.substring(0, 50) + (links[index].text.length > 50 ? '...' : '')
    });
  } else {
    logger?.warn('Invalid link index for highlighting', {
      index,
      validRange: `0-${links.length - 1}`
    });
  }
  
  try {
    container.setContent(newContent);
    screen.render();
    logger?.debug('Updated container with highlighted link');
  } catch (err) {
    logger?.error('Failed to highlight link', {
      error: err.message,
      stack: err.stack?.split('\n')[0]
    });
  }
}

export function scrollToLink(links, linkIndex, container, screen) {
  const logger = getLogger();

  logger?.debug('Attempting to scroll to link', {
    linkIndex,
    totalLinks: links.length
  });

  if (linkIndex < 0 || linkIndex >= links.length) {
    logger?.warn('Invalid link index for scrolling', {
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
      logger?.warn('Link text not found in content', {
        linkText,
        cleanContentLength: cleanContent.length
      });
      return;
    }
    
    const lineNumber = calculateLineNumber(
      cleanContent.substring(0, linkPos), 
      container.width - 2,
      logger
    );
    
    logger?.debug('Calculated scroll position', {
      linkText,
      linkPos,
      lineNumber
    });
    
    scrollToLine(lineNumber, container, screen, logger);
  } else {
    logger?.warn('Link missing ID property', { link });
  }
}

export function scrollToFragment(fragment, container, screen, padding = 2) {
  const logger = getLogger();

  logger?.debug('Attempting to scroll to fragment', {
    fragment,
    containerHeight: container.height,
    padding
  });

  if (!fragment) {
    logger?.warn('No fragment provided for scrolling');
    return;
  }

  const rawContent = container.getContent();

  const fragmentRegex = new RegExp(
    `\\{fragment-target\\}([^\\{]*${fragment}[^\\{]*)\\{\\/fragment-target\\}`
  );
  const fragmentMatch = rawContent.match(fragmentRegex);
  
  if (!fragmentMatch) {
    logger?.warn('Fragment not found in content', {
      fragment,
      contentLength: rawContent.length
    });
    return;
  }

  logger?.debug('Fragment match found', {
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
    logger?.debug('Scrolling to fragment', {
      lineNumber,
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
    screen.render();
  } else {
    logger?.debug('Fragment already visible', {
      lineNumber,
      currentScroll,
      visibleHeight
    });
  }
}

function calculateLineNumber(textBeforeLink, containerWidth, logger) {
  logger?.debug('Calculating line number', {
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

  logger?.debug('Calculated line number', {
    lineNumber,
    finalLineLength: currentLineLength
  });

  return lineNumber;
}

function scrollToLine(lineNumber, container, screen, logger, padding = 2) {
  logger?.debug('Scrolling to line', {
    lineNumber,
    containerHeight: container.height,
    padding
  });

  const currentScroll = container.getScroll();
  const visibleHeight = container.height - 2;
  
  if (lineNumber < currentScroll + padding) {
    const targetScroll = Math.max(0, lineNumber - padding);
    logger?.debug('Scrolling up', {
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
  } else if (lineNumber > currentScroll + visibleHeight - padding) {
    const targetScroll = lineNumber - visibleHeight + padding;
    logger?.debug('Scrolling down', {
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
  } else {
    logger?.debug('Line already visible', {
      lineNumber,
      currentScroll,
      visibleHeight
    });
  }
  
  try {
    screen.render();
    logger?.debug('Screen rendered after scroll');
  } catch (err) {
    logger?.error('Failed to render after scroll', {
      error: err.message
    });
  }
}

function scrollToElement(element, container, screen, logger, padding = 2) {
  logger?.debug('Scrolling to element', {
    elementTop: element.top,
    containerHeight: container.height,
    padding
  });

  const elementLine = element.top;
  const currentScroll = container.getScroll();
  const visibleHeight = container.height - 2;
  
  if (elementLine < currentScroll + padding) {
    const targetScroll = Math.max(0, elementLine - padding);
    logger?.debug('Scrolling up to element', {
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
  } else if (elementLine > currentScroll + visibleHeight - padding) {
    const targetScroll = elementLine - visibleHeight + padding;
    logger?.debug('Scrolling down to element', {
      currentScroll,
      targetScroll
    });
    container.scrollTo(targetScroll);
  } else {
    logger?.debug('Element already visible', {
      elementLine,
      currentScroll,
      visibleHeight
    });
  }
  
  try {
    screen.render();
    logger?.debug('Screen rendered after element scroll');
  } catch (err) {
    logger?.error('Failed to render after element scroll', {
      error: err.message
    });
  }
}

export function getFragment(url) {
  const logger = getLogger();

  logger?.debug('Extracting fragment from URL', { url });
  const fragment = url?.match(/#([^#]*)$/)?.[1] ?? null;
  logger?.debug('Extracted fragment', { fragment });
  return fragment;
}
