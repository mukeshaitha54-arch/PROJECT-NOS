import { Injectable, NestMiddleware } from '@nestjs/common';
import * as crypto from 'crypto';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private logger = new LoggerService();

  constructor() {
    this.logger.setContext(CorrelationIdMiddleware.name);
  }

  use(req: any, res: any, next: () => void) {
    const headerId = req.headers['x-trace-id'] || req.headers['x-correlation-id'];
    const traceId = Array.isArray(headerId) 
      ? headerId[0] 
      : (headerId || crypto.randomUUID());
      
    req['traceId'] = traceId;
    
    if (res.setHeader) {
      res.setHeader('x-trace-id', traceId);
    } else if (res.header) { // Fastify fallback
      res.header('x-trace-id', traceId);
    }

    const method = req.method;
    const path = req.originalUrl || req.url;
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    this.logger.log(`Incoming Request: ${method} ${path}`, {
      traceId,
      method,
      path,
      ip,
      userAgent
    });

    next();
  }
}
