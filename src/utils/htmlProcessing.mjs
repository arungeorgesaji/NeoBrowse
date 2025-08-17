import { JSDOM } from 'jsdom';

export function parseHTML(html, debugPanel) {
  try {
    debugPanel?.debug(`Starting HTML parsing (${html.length} bytes)`); 
    
    const dom = new JSDOM(html, {
      runScripts: "outside-only",
    });

    const doc = dom.window.document;
    const stats = {
      tags: doc.getElementsByTagName('*').length,
      links: doc.getElementsByTagName('a').length,
      scripts: doc.getElementsByTagName('script').length
    };

    debugPanel?.debug(`Parsed document stats:`, { 
      tags: stats.tags,
      links: stats.links,
      scripts: stats.scripts,
      title: doc.title || '(no title)'
    });

    if (stats.scripts > 0) {
      debugPanel?.warn(`Document contains ${stats.scripts} scripts (will not execute)`); 
    }

    return doc;

  } catch (error) {
    debugPanel?.error('HTML parsing failed', { 
      error: error.message,
      inputSample: html.substring(0, 100) + (html.length > 100 ? '...' : '')
    });
    throw new Error(`Failed to parse HTML: ${error.message}`);
  }
}
