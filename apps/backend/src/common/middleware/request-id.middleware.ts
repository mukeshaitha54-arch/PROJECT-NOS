import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Correlation Request ID Helper Interceptor / Middleware stub.
 * Note: Core insertion is executed directly via Fastify `onRequest` hook in main.ts
 * to guarantee early availability across all lifecycle phases.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    next();
  }
}
