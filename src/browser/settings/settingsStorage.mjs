import fs from 'fs';
import path from 'path';
import { DEFAULT_SETTINGS } from '../../constants/settingsConfig.mjs';

export class settingsStorage {
  constructor(logger) {
    this.logger = logger;
    this.configPath = path.join(
      process.env.XDG_CONFIG_HOME || 
      path.join(process.env.HOME || process.env.USERPROFILE, '.config'),
      'neobrowse',
      'config.json'
    );
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        this.logger?.debug(`Loading settings from ${this.configPath}`);
        const rawData = fs.readFileSync(this.configPath, 'utf8');
        const loadedSettings = JSON.parse(rawData);
        
        return { ...DEFAULT_SETTINGS, ...loadedSettings };
      } else {
        this.logger?.debug("No settings file found - using defaults");
        return { ...DEFAULT_SETTINGS };
      }
    } catch (err) {
      this.logger?.error(`Failed to load settings: ${err.message}`);
      throw new Error('Corrupt settings file');
    }
  }

  save(settings) {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        this.logger?.debug(`Creating config directory: ${configDir}`);
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(
        this.configPath, 
        JSON.stringify(settings, null, 2), 
        { mode: 0o600 }
      );
      
      this.logger?.info(`Settings saved to ${this.configPath}`);
      return true;
    } catch (err) {
      this.logger?.error(`Failed to save settings: ${err.message}`);
      throw new Error('Failed to save settings');
    }
  }
}
