import ascii from 'ascii-art';
import { getLogger } from '../utils/logger.mjs';

export async function imageToAscii(src, alt, baseUrl, logger, options = {}) {
  try {
    let imageUrl = src;
    
    if (baseUrl && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
      try {
        imageUrl = new URL(src, baseUrl).toString();
      } catch (e) {
        logger?.warn('Failed to construct absolute URL for image', { src, baseUrl });
      }
    }
    
    logger?.debug(`Converting image to ASCII: ${imageUrl}`);
    
    const asciiArt = await new Promise((resolve, reject) => {
      ascii.image({
        filepath: imageUrl,
        alphabet: 'variant1',
        width: options.width || 40,
        height: options.height || 20
      }, (err, converted) => {
        if (err) {
          reject(err);
        } else {
          resolve(converted);
        }
      });
    });
    
    return `\n${asciiArt}\n${chalk.dim(`[Image: ${alt}]`)}\n`;
  } catch (error) {
    logger?.error('Failed to convert image to ASCII', {
      src,
      error: error.message
    });
    
    const dimensions = options.width && options.height ? ` (${options.width}×${options.height})` : '';
    return `\n[🖼️ ${alt}${dimensions}](${src})\n`;
  }
}

export async function renderPictureElement(pictureElement, baseUrl, logger, context = {}) {
  try {
    logger?.debug('Processing <picture> element');
    
    const imgElement = pictureElement.querySelector('img');
    const altText = imgElement?.getAttribute('alt') || 'Responsive image';
    
    let imageSrc = null;
    
    const sources = pictureElement.querySelectorAll('source');
    for (const source of sources) {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        const firstSource = srcset.split(',')[0].split(' ')[0];
        imageSrc = firstSource;
        break;
      }
      
      const src = source.getAttribute('src');
      if (src) {
        imageSrc = src;
        break;
      }
    }
    
    if (!imageSrc && imgElement) {
      imageSrc = imgElement.getAttribute('src');
    }
    
    if (!imageSrc) {
      logger?.warn('No image source found in <picture> element');
      return `\n[🖼️ ${altText}]\n`;
    }
    
    const width = imgElement?.getAttribute('width');
    const height = imgElement?.getAttribute('height');
    
    return await imageToAscii(
      imageSrc,
      altText,
      baseUrl,
      logger,
      { 
        width: width ? parseInt(width) : 40, 
        height: height ? parseInt(height) : 20 
      }
    );
  } catch (error) {
    logger?.error('Failed to render picture element', {
      error: error.message
    });
    
    const imgElement = pictureElement.querySelector('img');
    const altText = imgElement?.getAttribute('alt') || 'Responsive image';
    return `\n[🖼️ ${altText}]\n`;
  }
}

export async function renderImage(element, baseUrl, context = {}) {
  const tagName = element.tagName.toLowerCase();
  const logger = logger || getLogger();
  
  if (tagName === 'picture') {
    return await renderPictureElement(element, baseUrl, logger, context);
  }
  
  if (tagName === 'img') {
    const src = element.getAttribute('src') || '';
    const alt = element.getAttribute('alt') || 'Image';
    const width = element.getAttribute('width');
    const height = element.getAttribute('height');
    
    return await imageToAscii(
      src, 
      alt, 
      baseUrl, 
      logger, 
      { 
        width: width ? parseInt(width) : 40, 
        height: height ? parseInt(height) : 20 
      }
    );
  }
  
  logger?.warn(`Attempted to render non-image element as image: ${tagName}`);
  return '';
}
