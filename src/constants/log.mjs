export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

export const LOG_LEVEL_NAMES = {
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR'
};

export const LOG_COLORS = {
  [LOG_LEVELS.DEBUG]: 'gray',
  [LOG_LEVELS.INFO]: 'white',
  [LOG_LEVELS.WARN]: 'yellow',
  [LOG_LEVELS.ERROR]: 'red'
};
