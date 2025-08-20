export const DEFAULT_SETTINGS = {
  searchEngine: 'https://searx.be/search?q={query}&format=html',
  maxDepth: 30,
  maxNodes: 10000,
  timeout: 10000,
  userAgent: 'Mozilla/5.0 (compatible; NeoBrowse/1.0)',
  timeFormat: '24h'
};

export const SEARCH_ENGINES = {
  'Searx': 'https://searx.be/search?q={query}&format=html',
  'Brave': 'https://search.brave.com/search?q={query}&source=web',
  'DuckDuckGo': 'https://duckduckgo.com/html/?q={query}',
  'StartPage': 'https://www.startpage.com/do/search?q={query}',
};

export const USER_AGENTS = {
  'Desktop Chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Desktop Firefox': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mobile Chrome': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'NeoBrowse Default': 'Mozilla/5.0 (compatible; NeoBrowse/1.0)',
};

export const TIME_FORMATS = {
  '24-hour': '24h',
  '12-hour': '12h'
};
