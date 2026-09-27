import { Injectable, LoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements LoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: any, context?: string, ...optionalParams: any[]) {
    const timestamp = new Date().toISOString();
    const resolvedContext = context || this.context || 'Application';
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      return JSON.stringify({
        timestamp,
        level: level.toUpperCase(),
        context: resolvedContext,
        message: typeof message === 'object' ? message : String(message),
        params: optionalParams.length > 0 ? optionalParams : undefined,
      });
    }

    const formattedMessage = typeof message === 'object' ? JSON.stringify(message) : message;
    return `[${timestamp}] [${level.toUpperCase()}] [${resolvedContext}] ${formattedMessage}`;
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
