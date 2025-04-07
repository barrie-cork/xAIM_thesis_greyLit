import pino from 'pino';
import { NextRequest } from 'next/server';

/**
 * Logger configuration
 * Configures different log levels and formats based on environment
 */

// Determine if we're in production or development
const isProduction = process.env.NODE_ENV === 'production';

// Base logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  // Production uses JSON format, development uses prettier human-readable format
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // Add base metadata to all logs
  base: {
    env: process.env.NODE_ENV,
    app: 'grey-literature-search',
  },
};

// Create the logger instance
const logger = pino(loggerConfig);

/**
 * HTTP Request context logger
 * Creates a child logger with request-specific context
 */
export function requestLogger(req: NextRequest) {
  return logger.child({
    url: req.url,
    method: req.method,
    requestId: crypto.randomUUID(),
    userAgent: req.headers.get('user-agent') || 'unknown',
    referer: req.headers.get('referer') || 'unknown',
  });
}

/**
 * API context logger
 * Creates a child logger for API operations with path and operation context
 */
export function apiLogger(path: string, operation: string, userId?: string) {
  return logger.child({
    path,
    operation,
    userId,
    apiRequestId: crypto.randomUUID(),
  });
}

/**
 * Error logger
 * Special utility to properly format and log errors with stack traces
 */
export function logError(
  err: Error | unknown,
  context?: Record<string, any>,
  customLogger = logger
) {
  if (err instanceof Error) {
    customLogger.error(
      {
        err,
        ...context,
        stack: err.stack,
        name: err.name,
      },
      `Error: ${err.message}`
    );
  } else {
    customLogger.error(
      {
        err,
        ...context,
      },
      'Unknown error occurred'
    );
  }
}

// Export the base logger for general use
export default logger; 