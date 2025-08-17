import { JSDOM } from 'jsdom';

export function parseHTML(html, debugPanel){
  const dom = new JSDOM(html, {
      runScripts: "outside-only",
  })
  
  return dom.window.document;
}
