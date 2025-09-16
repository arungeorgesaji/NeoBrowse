import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { getLogger } from '../utils/logger.mjs'; 
import { settingsStorage } from '../browser/settings/settingsStorage.mjs';

export async function fetchHTML(url) {
  const logger = getLogger();

  try {
    const storage = new settingsStorage();
    const settings = settings.load();
    const user_agent = settings.user_agent || 'Mozilla/5.0 (compatible; TUI-Browser/1.0)';

    logger?.info(`Fetching URL: ${url}`); 
    logger?.debug(`Using User-Agent: ${user_agent}`);

    const { data } = await axios.get(url, { 
      timeout: settings.timeout || 10000,
      headers: { 'User-Agent': user_agent },
    });

    logger?.debug(`Received ${data.length} bytes from ${url}`);
    
    const sanitized = sanitizeHtml(data, { 
      allowedTags: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'li', 'strong', 'em', 'br', 'hr', 'title', 'q', 'i', 'b', 'div', 'header', 'footer', 'head', 'body', 'section', 'span', 'address', 'article', 'main', 'html', 'sup', 'sub', 'code', 'pre', 'blockquote', 'nav', 'samp', 'var', 'mark', 'time', 'kbd', 'del', 'ins', 'small', 'data', 'cite', 'abbr', 'dfn', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'th', 'td', 'tr', 'figure', 'figcaption', 'details', 'summary', 'dialog', 'menu', 'menuitem', 'meter', 'progress', 'base', 'wbr', 'nobr', 'plaintext', 'dl', 'optgroup', 'acronym', 'applet', 'basefont', 'big', 'center', 'dir', 'font', 'frame', 'frameset', 'noframes', 'isindex', 'strike', 'tt', 'xmp', 'marquee', 'noembed', 'image', 'img', 'picture', 'ruby', 'rt', 'rp', 'caption', 'bdi', 'bdo', 'search', 'hgroup', 'rb', 'rtc', 'template', 'metadata', 'link', 'nav', 'noembed', 'param'
      ],
      allowedAttributes: {
        '*': ['id', 'name'],
        'a': ['href', 'title', 'id', 'name']
      },
      disallowedTagsMode: 'discard'
    });

    logger?.debug(`Sanitized HTML to ${sanitized.length} bytes`); 
    return sanitized;
  } catch (error) {
    const errorType = error.response ? `HTTP ${error.response.status}` : error.code || 'Network';
    const errorDetails = {
      url,
      errorType,
      message: error.message,
      ...(error.response && { status: error.response.status }),
      ...(error.config && { timeout: error.config.timeout })
    };

    logger?.error(`Fetch failed for ${url}`, errorDetails); 
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}
