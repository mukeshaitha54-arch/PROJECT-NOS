import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console()
      ],
      defaultMeta: {
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, ...optionalParams: any[]) {
    this.logger.info(message, this.buildMeta(optionalParams));
  }

  error(message: any, trace?: string, context?: string, ...optionalParams: any[]) {
    this.logger.error(message, {
      ...this.buildMeta(optionalParams, context),
      trace,
    });
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, this.buildMeta(optionalParams));
  }

  debug(message: any, ...optionalParams: any[]) {
    this.logger.debug(message, this.buildMeta(optionalParams));
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.logger.verbose(message, this.buildMeta(optionalParams));
  }

  private buildMeta(optionalParams: any[], overrideContext?: string) {
    const meta: any = { context: overrideContext || this.context || 'Application' };
    
    // Extract req/res if passed in optional params
    if (optionalParams && optionalParams.length > 0) {
      const obj = optionalParams[0];
      if (typeof obj === 'object' && obj !== null) {
        if (obj.traceId) meta.traceId = obj.traceId;
        if (obj.tenantId) meta.tenantId = obj.tenantId;
        // Merge other useful properties safely
        for (const key of Object.keys(obj)) {
          if (key !== 'traceId' && key !== 'tenantId') {
             meta[key] = obj[key];
          }
        }
      }
    }
    return meta;
  }
}
