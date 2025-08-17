import { MAX_DEPTH, MAX_NODES } from '../constants/config.mjs';
import { formatTextByTag } from './textFormatting.mjs';

const nodeCache = new WeakMap();

export function extractText(node, depth = 0, baseUrl = '', context = {}, debugPanel) {
  if (depth === 0) {
    context = {
      seenNodes: new Set(),
      nodeCount: 0,
      startTime: Date.now(),
      fragmentTargets: new Set(),
      baseUrl: baseUrl
    };
    debugPanel?.debug(`Starting text extraction (baseUrl: ${baseUrl || 'none'})`);
  }

  try {
    if (!node) {
      debugPanel?.warn('extractText: No node provided');
      return '';
    }
    
    if (Date.now() - context.startTime > 5000) {
      debugPanel?.warn(`Processing timeout after ${context.nodeCount} nodes`);
      return '[Processing timeout]';
    }
    if (++context.nodeCount > MAX_NODES) {
      debugPanel?.warn(`Max nodes reached (${MAX_NODES})`);
      return '[Max nodes reached]';
    }
    
    if (typeof depth !== 'number' || depth < 0) {
      debugPanel?.warn(`Invalid depth ${depth}, resetting to 0`);
      depth = 0;
    }

    if (depth > MAX_DEPTH) {
      debugPanel?.debug(`Max depth reached (${MAX_DEPTH}) at node ${context.nodeCount}`);
      return `[Max depth ${MAX_DEPTH} reached]`;
    }

    const nodeId = `${node.nodeName}-${depth}-${node.textContent?.slice(0, 20)}`;
    if (context.seenNodes.has(nodeId)) {
      debugPanel?.debug(`Skipping duplicate node: ${nodeId}`);
      return '';
    }
    context.seenNodes.add(nodeId);
    
    if (node.nodeType === 3) { 
      const text = node.textContent?.replace(/\s+/g, ' ').trim() || '';
      debugPanel?.debug(`Processed text node (${text.length} chars)`);
      return text;
    }
    
    if (node.nodeType === 1) {
      const tagName = node.tagName?.toLowerCase() || 'unknown';

      if (nodeCache.has(node)) {
        debugPanel?.debug(`Cache hit for ${tagName} node`);
        return nodeCache.get(node);
      }
      
      const parts = [];
      debugPanel?.debug(`Processing ${tagName} node at depth ${depth}`);
      
      if (node.childNodes) {
        for (const child of node.childNodes) {
          try {
            parts.push(extractText(child, depth + 1, baseUrl, context));
          } catch (childError) {
             debugPanel?.warn(`Child node error: ${childError.message}`, { 
              parentTag: tagName,
              depth
            });
          }
        }
      }
      
      const result = formatTextByTag(tagName, parts.join(''), node, depth, baseUrl, context, debugPanel);
      nodeCache.set(node, result);

      debugPanel?.debug(`Formatted ${tagName} node (${result.length} chars)`);
      return result;
    }
    
    if (node.nodeType === 8) {
      debugPanel?.debug('Skipping comment node');
      return ''; 
    }
    
    return '';
  } catch (error) {
    debugPanel?.error('extractText failure', { 
      depth,
      nodeType: node?.nodeType,
      error: error.message,
      stack: error.stack?.split('\n')[0]
    });
    return '';
  }
}
