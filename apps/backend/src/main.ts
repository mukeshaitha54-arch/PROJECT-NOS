import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: false, // Defer logging orchestration to nestjs-pino
    trustProxy: true,
  });

  // Custom Fastify hook for Request ID correlation middleware
  adapter.getInstance().addHook('onRequest', (req, res, done) => {
    const headerId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
    const requestId = Array.isArray(headerId) ? headerId[0] : (headerId || `nos-req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    req.headers['x-request-id'] = requestId;
    res.header('x-request-id', requestId);
    done();
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bufferLogs: true },
  );

  // Wire enterprise Socket.IO realtime adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Integrate Pino structured logging
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Security headers & compression middleware
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Adjusted for local OpenAPI doc viewer compatibility
  });
  await app.register(fastifyCompress, { encodings: ['gzip', 'deflate'] });

  // Enable CORS & Global validation pipes
  app.enableCors({ origin: '*', credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Prefix & URI versioning
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({ type: VersioningType.URI });

  // OpenAPI Swagger Documentation setup
  const config = new DocumentBuilder()
    .setTitle('NOS (Network Operating System) API')
    .setDescription(
      'Production-ready enterprise telemetry and network node management API foundation.',
    )
    .setVersion('0.1.0')
    .addTag('Health', 'System diagnostic and database liveliness endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);
  const url = await app.getUrl();
  console.log(`🚀 NOS Backend Fastify Server operational at: ${url}/${apiPrefix}`);
  console.log(`📚 OpenAPI Swagger docs accessible at: ${url}/docs`);
}

bootstrap();
