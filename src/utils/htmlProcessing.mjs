import { extractText } from './domHelpers.mjs';
import { renderTable } from './tableRenderer.mjs';
import { JSDOM } from 'jsdom';

export function parseHTML(html){
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable' 
  })
  
  return dom.window.document;
}
