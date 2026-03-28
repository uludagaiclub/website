/**
 * Production-safe Logger
 * 
 * Provides logging utilities that respect NODE_ENV.
 * In production, only errors are logged (and should be sent to error tracking service).
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Structured log data
 */
interface LogData {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

/**
 * Format log data for output
 */
function formatLog(data: LogData): string {
  const { message, level, timestamp, context, error } = data;
  
  let output = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (context && Object.keys(context).length > 0) {
    output += `\n  Context: ${JSON.stringify(context, null, 2)}`;
  }
  
  if (error) {
    output += `\n  Error: ${error.message}`;
    if (error.stack && isDevelopment) {
      output += `\n  Stack: ${error.stack}`;
    }
  }
  
  return output;
}

/**
 * Send logs to external service (placeholder)
 * In production, integrate with services like Sentry, LogRocket, etc.
 * 
 * Note: This is intentionally a no-op placeholder. When ready to integrate error tracking,
 * uncomment and configure the service (e.g., Sentry.captureMessage(data.message, { level: data.level, extra: data.context }))
 */
function sendToExternalService(data: LogData): void {
  // Placeholder for future error tracking service integration
  // Example implementation:
  // Sentry.captureMessage(data.message, { level: data.level, extra: data.context });
}

/**
 * Logger class
 */
class Logger {
  /**
   * Debug logs - only in development
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!isDevelopment) return;
    
    const logData: LogData = {
      message,
      level: LogLevel.DEBUG,
      timestamp: new Date().toISOString(),
      context
    };
    
    console.log(formatLog(logData));
  }
  
  /**
   * Info logs - only in development
   */
  info(message: string, context?: Record<string, any>): void {
    if (!isDevelopment) return;
    
    const logData: LogData = {
      message,
      level: LogLevel.INFO,
      timestamp: new Date().toISOString(),
      context
    };
    
    console.info(formatLog(logData));
  }
  
  /**
   * Warning logs - development console, production tracking
   */
  warn(message: string, context?: Record<string, any>): void {
    const logData: LogData = {
      message,
      level: LogLevel.WARN,
      timestamp: new Date().toISOString(),
      context
    };
    
    if (isDevelopment) {
      console.warn(formatLog(logData));
    } else {
      sendToExternalService(logData);
    }
  }
  
  /**
   * Error logs - always logged and sent to tracking
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const logData: LogData = {
      message,
      level: LogLevel.ERROR,
      timestamp: new Date().toISOString(),
      context,
      error
    };
    
    // Always log errors to console
    console.error(formatLog(logData));
    
    // Send to external service in production
    if (isProduction) {
      sendToExternalService(logData);
    }
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * API-specific logger with sanitization
 */
export class ApiLogger extends Logger {
  /**
   * Log API request (sanitized)
   */
  logRequest(method: string, path: string, userId?: string): void {
    this.info('API Request', {
      method,
      path,
      userId: userId ?? 'anonymous',
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Log API response (sanitized)
   */
  logResponse(method: string, path: string, status: number, duration?: number): void {
    this.info('API Response', {
      method,
      path,
      status,
      duration: duration ? `${duration}ms` : undefined
    });
  }
  
  /**
   * Log API error (sanitized for production)
   */
  logApiError(
    message: string,
    error: Error,
    context?: {
      method?: string;
      path?: string;
      userId?: string;
      statusCode?: number;
    }
  ): void {
    // Sanitize error message for production
    const sanitizedMessage = isProduction 
      ? 'An error occurred processing the request'
      : message;
    
    this.error(sanitizedMessage, error, context);
  }
}

/**
 * Singleton API logger instance
 */
export const apiLogger = new ApiLogger();

