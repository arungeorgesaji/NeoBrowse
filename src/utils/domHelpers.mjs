import { MAX_DEPTH } from '../constants/config.mjs';
import { formatTextByTag } from './textFormatting.mjs';

export function extractText(node, depth = 0) {
  if (depth > MAX_DEPTH) {
    return `[Max depth ${MAX_DEPTH} reached - content truncated]`;
  }

  if (node.nodeType === 3) { 
    return node.textContent.trim();
  }
  
  if (node.nodeType === 1) { 
    const tagName = node.tagName.toLowerCase();
    let text = '';
    
    for (const child of node.childNodes) {
      text += extractText(child, depth + 1);
    }
    
    return formatTextByTag(tagName, text, node, depth);
  }
  
  return '';
}
