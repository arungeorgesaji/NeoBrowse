import axios from 'axios';
import sanitizeHtml from 'sanitize-html';

export async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url, { 
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TUI-Browser/1.0)' }
    });
    
    return sanitizeHtml(data, { 
      allowedTags: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'li', 'strong', 'em', 'br', 'hr', 'title', 'q', 'i', 'b', 'div', 'header', 'footer', 'head', 'body', 'section', 'span', 'address', 'article', 'main', 'html', 'sup', 'sub', 'code', 'pre', 'blockquote', 'nav', 'samp', 'var', 'mark', 'time', 'kbd', 'del', 'ins', 'small', 'data', 'cite', 'abbr', 'dfn', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'th', 'td', 'tr'],
      allowedAttributes: {
        '*': ['id', 'name'],
        'a': ['href', 'title', 'id', 'name']
      },
      disallowedTagsMode: 'discard'
    });
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}
