/**
 * Sistema de logging estructurado
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private output(entry: LogEntry) {
    const json = JSON.stringify(entry);
    
    // En desarrollo, también mostrar en consola con formato legible
    if (process.env.NODE_ENV === 'development') {
      const colorMap: Record<LogLevel, string> = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m', // Green
        [LogLevel.WARN]: '\x1b[33m', // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
      };
      const reset = '\x1b[0m';
      const color = colorMap[entry.level] || '';
      
      console.log(
        `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}`,
        entry.context || '',
        entry.error || ''
      );
    } else {
      // En producción, solo JSON
      console.log(json);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.output(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.output(this.formatLog(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: Record<string, any>, error?: Error) {
    this.output(this.formatLog(LogLevel.WARN, message, context, error));
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.output(this.formatLog(LogLevel.ERROR, message, context, error));
  }
}

export const logger = new Logger();
export default logger;
