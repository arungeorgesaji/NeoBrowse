import { extractText } from './domHelpers.mjs';
import { renderTable } from '../renderers/tableRenderer.mjs';
import { JSDOM } from 'jsdom';

export function parseHTML(html){
  const dom = new JSDOM(html, {
      runScripts: "outside-only",
  })
  
  return dom.window.document;
}
