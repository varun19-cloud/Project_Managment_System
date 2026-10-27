const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;

/**
 * Custom log format: [2024-01-01 12:00:00] INFO: Message
 */
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: combine(
    errors({ stack: true }), // Capture stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console output with colors in development
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // Error log file
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Combined log file
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
