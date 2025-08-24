import chalk from 'chalk';
import { getLogger } from './logger.mjs';

export async function renderAudio(node, baseUrl, logger, context) {
  const logger = getLogger();
  
  try {
    const sourceElement = node.querySelector('source');
    const src = sourceElement?.getAttribute('src') || node.getAttribute('src');
    
    if (!src) {
      logger?.debug('Audio element has no source');
      return;
    }
    
    let audioUrl = src;
    try {
      if (baseUrl && !src.startsWith('http://') && !src.startsWith('https://')) {
        audioUrl = new URL(src, baseUrl).toString();
      }
    } catch (e) {
      logger?.warn('Failed to resolve audio URL', { src, error: e.message });
    }
    
    const title = node.getAttribute('title') || 
                 node.getAttribute('aria-label') || 
                 'Untitled audio';
    const duration = node.getAttribute('data-duration') || 
                    node.getAttribute('duration');
    const controls = node.hasAttribute('controls');
    
    if (!context.media) context.media = {};
    if (!context.media.audio) context.media.audio = [];
    
    const audioData = {
      url: audioUrl,
      title,
      duration,
      controls,
      autoplay: node.hasAttribute('autoplay'),
      loop: node.hasAttribute('loop'),
      muted: node.hasAttribute('muted')
    };
    
    context.media.audio.push(audioData);
    
    logger?.info('Audio element processed', { 
      url: audioUrl, 
      title,
      hasDuration: !!duration
    });
    
  } catch (error) {
    logger?.error('Audio processing failed', {
      error: error.message
    });
  }
}
