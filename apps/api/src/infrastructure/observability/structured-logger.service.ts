import { Injectable, LoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements LoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: any, context?: string, ...optionalParams: any[]) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      context: context || this.context || 'Application',
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      params: optionalParams.length > 0 ? optionalParams : undefined,
    };

    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(entry);
    }
    return `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}`;
  }

  log(message: any, context?: string, ...optionalParams: any[]) {
    console.log(this.formatMessage('info', message, context, ...optionalParams));
  }

  error(message: any, trace?: string, context?: string) {
    console.error(this.formatMessage('error', message, context, { trace }));
  }

  warn(message: any, context?: string, ...optionalParams: any[]) {
    console.warn(this.formatMessage('warn', message, context, ...optionalParams));
  }

  debug(message: any, context?: string, ...optionalParams: any[]) {
    console.debug(this.formatMessage('debug', message, context, ...optionalParams));
  }

  verbose(message: any, context?: string, ...optionalParams: any[]) {
    console.log(this.formatMessage('verbose', message, context, ...optionalParams));
  }
}
