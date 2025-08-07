import { MAX_DEPTH, MAX_NODES } from '../constants/config.mjs';
import { formatTextByTag } from './textFormatting.mjs';

const nodeCache = new WeakMap();

export function extractText(node, depth = 0, baseUrl = '', context = {}) {
  if (depth === 0) {
    context = {
      seenNodes: new Set(),
      nodeCount: 0,
      startTime: Date.now()
    };
  }

  try {
    if (!node) {
      console.warn('extractText: No node provided');
      return '';
    }
    
    if (Date.now() - context.startTime > 5000) {
      return '[Processing timeout]';
    }
    if (++context.nodeCount > MAX_NODES) {
      return '[Max nodes reached]';
    }
    
    if (typeof depth !== 'number' || depth < 0) {
      console.warn(`extractText: Invalid depth ${depth}, defaulting to 0`);
      depth = 0;
    }

    if (depth > MAX_DEPTH) {
      return `[Max depth ${MAX_DEPTH} reached]`;
    }

    const nodeId = `${node.nodeName}-${depth}-${node.textContent?.slice(0, 20)}`;
    if (context.seenNodes.has(nodeId)) {
      return '';
    }
    context.seenNodes.add(nodeId);
    
    if (node.nodeType === 3) { 
      return node.textContent?.replace(/\s+/g, ' ').trim() || '';
    }
    
    if (node.nodeType === 1) {
      if (nodeCache.has(node)) {
        return nodeCache.get(node);
      }
      
      const tagName = node.tagName?.toLowerCase() || 'unknown';
      const parts = [];
      
      if (node.childNodes) {
        for (const child of node.childNodes) {
          try {
            parts.push(extractText(child, depth + 1, baseUrl, context));
          } catch (childError) {
            console.warn(`Child node error: ${childError.message}`);
          }
        }
      }
      
      const result = formatTextByTag(tagName, parts.join(''), node, depth, baseUrl);
      nodeCache.set(node, result);
      return result;
    }
    
    if (node.nodeType === 8) {
      return ''; 
    }
    
    return '';
  } catch (error) {
    console.error(`extractText error (depth ${depth}):`, error.message);
    return '';
  }
}
