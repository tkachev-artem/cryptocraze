// Comprehensive logging system for production and development

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  context?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
}

class Logger {
  private sessionId: string;
  private logLevel: LogLevel;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.logLevel = this.getLogLevel();
    
    // Setup global error handlers
    this.setupGlobalErrorHandlers();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLogLevel(): LogLevel {
    const isDev = import.meta.env.DEV;
    const envLevel = import.meta.env.VITE_LOG_LEVEL;
    
    if (envLevel) {
      return parseInt(envLevel, 10) as LogLevel;
    }
    
    return isDev ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: level === LogLevel.ERROR ? new Error().stack : undefined
    };
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    // Only send errors and warnings to remote in production
    if (import.meta.env.PROD && 
        entry.level <= LogLevel.WARN && 
        import.meta.env.VITE_ERROR_REPORTING_ENABLED === 'true') {
      
      try {
        // Example: send to logging service
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
        });
      } catch {
        // Fail silently to avoid logging loops
      }
    }
  }

  private logToConsole(entry: LogEntry): void {
    const { level, message, data, context } = entry;
    const prefix = context ? `[${context}]` : '';
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(fullMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, data);
        break;
      case LogLevel.INFO:
        console.info(fullMessage, data);
        break;
      case LogLevel.DEBUG:
        console.debug(fullMessage, data);
        break;
    }
  }

  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: string
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, message, data, context);
    
    this.addToBuffer(entry);
    this.logToConsole(entry);
    
    // Send to remote logging service
    void this.sendToRemote(entry);
  }

  public error(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  public warn(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  public info(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  public debug(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  public getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  public clearLogBuffer(): void {
    this.logBuffer = [];
  }

  public setUserId(userId: string): void {
    // Update all future logs with user ID
    this.logBuffer.forEach(entry => {
      entry.userId = userId;
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.error('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      }, 'GlobalErrorHandler');
    });

    // Handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      }, 'GlobalErrorHandler');
    });

    // Handle console errors in development
    if (import.meta.env.DEV) {
      const originalError = console.error;
      console.error = (...args) => {
        this.error('Console error', args, 'Console');
        originalError.apply(console, args);
      };
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience functions
export const logError = (message: string, data?: unknown, context?: string) => {
  logger.error(message, data, context);
};

export const logWarning = (message: string, data?: unknown, context?: string) => {
  logger.warn(message, data, context);
};

export const logInfo = (message: string, data?: unknown, context?: string) => {
  logger.info(message, data, context);
};

export const logDebug = (message: string, data?: unknown, context?: string) => {
  logger.debug(message, data, context);
};

// Performance monitoring
export const performanceLogger = {
  startTiming: (label: string): (() => void) => {
    const startTime = performance.now();
    logger.debug(`Performance start: ${label}`, { startTime }, 'Performance');
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      logger.info(`Performance end: ${label}`, { 
        startTime, 
        endTime, 
        duration: `${duration.toFixed(2)}ms` 
      }, 'Performance');
    };
  },

  markApiCall: (endpoint: string, method: string, duration: number, success: boolean) => {
    logger.info(`API call: ${method} ${endpoint}`, {
      method,
      endpoint,
      duration: `${duration.toFixed(2)}ms`,
      success
    }, 'API');
  }
};