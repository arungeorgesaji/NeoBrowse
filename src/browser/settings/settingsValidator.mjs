export class settingsValidator {
  static validateNumber(value, min, max, name) {
    const num = parseInt(value);
    if (isNaN(num)) {
      throw new Error(`${name} must be a number`);
    }
    if (num < min || num > max) {
      throw new Error(`${name} must be between ${min} and ${max}`);
    }
    return num;
  }

  static validateString(value, name, maxLength = 500) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${name} cannot be empty`);
    }
    if (value.length > maxLength) {
      throw new Error(`${name} too long (max ${maxLength} chars)`);
    }
    return value.trim();
  }

  static validateUrl(value, name) {
    const url = this.validateString(value, name);
    if (!url.includes('{query}')) {
      throw new Error(`${name} must contain {query} placeholder`);
    }
    try {
      new URL(url.replace('{query}', 'test'));
    } catch {
      throw new Error(`${name} must be a valid URL`);
    }
    return url;
  }

  static validateSettings(settings) {
    return {
      searchEngine: this.validateUrl(settings.searchEngine, 'Search Engine'),
      maxDepth: this.validateNumber(settings.maxDepth, 1, 100, 'Max Depth'),
      maxNodes: this.validateNumber(settings.maxNodes, 10, 100000, 'Max Nodes'),
      timeout: this.validateNumber(settings.timeout, 1000, 30000, 'Timeout'),
      userAgent: this.validateString(settings.userAgent, 'User Agent', 200),
      timeFormat: ['24h', '12h'].includes(settings.timeFormat) ? 
        settings.timeFormat : '24h'
    };
  }
}
