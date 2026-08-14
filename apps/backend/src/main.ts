import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import fastifyHelmet from "@fastify/helmet";
import fastifyCompress from "@fastify/compress";
import { IoAdapter } from "@nestjs/platform-socket.io";
import * as crypto from "crypto";
import { AppModule } from "./app.module";
import { LoggerService } from "./common/logger/logger.service";

/**
 * Fail-fast startup secret guard.
 * Throws immediately in production if critical secrets are absent —
 * prevents booting with insecure defaults.
 */
function validateProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production") return;
  const required = ["JWT_SECRET", "REFRESH_TOKEN_SECRET", "DATABASE_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[NOS] FATAL: Missing production secrets: [${missing.join(", ")}]. ` +
        `Set all required environment variables before starting in production mode.`,
    );
  }
}

async function bootstrap() {
  // Guard production secrets before any module initialisation
  validateProductionSecrets();

  const adapter = new FastifyAdapter({
    logger: false, // Handled by Winston
    trustProxy: true,
  });

  const appLogger = new LoggerService();
  appLogger.setContext("Bootstrap");

  // Custom Fastify hook for Request ID correlation middleware (Native Pattern)
  adapter.getInstance().addHook("onRequest", (req, res, done) => {
    const headerId =
      req.headers["x-trace-id"] || req.headers["x-correlation-id"];
    const traceId = Array.isArray(headerId)
      ? headerId[0]
      : headerId || crypto.randomUUID();

    req.headers["x-trace-id"] = traceId;
    res.header("x-trace-id", traceId);

    const method = req.method;
    const path = req.originalUrl || req.url;
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers["user-agent"] || "";

    appLogger.log(`Incoming Request: ${method} ${path}`, {
      traceId,
      method,
      path,
      ip,
      userAgent,
    });

    done();
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bufferLogs: true, logger: appLogger },
  );

  // Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  // Wire enterprise Socket.IO realtime adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Integrate Winston structured logging globally
  app.useLogger(appLogger);

  // Security headers & compression middleware
  await app.register(fastifyHelmet as any, {
    contentSecurityPolicy: false, // Adjusted for local OpenAPI doc viewer compatibility
  });
  await app.register(fastifyCompress as any, {
    encodings: ["gzip", "deflate"],
  });

  // Enable CORS & Global validation pipes
  app.enableCors({ origin: "*", credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Prefix & URI versioning
  const apiPrefix = process.env.API_PREFIX || "api/v1";
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({ type: VersioningType.URI });

  // OpenAPI Swagger Documentation — Phase 7 Enterprise Edition
  const config = new DocumentBuilder()
    .setTitle("NOS — Network Operations & Security Platform API")
    .setDescription(
      "Enterprise-grade telemetry, network node management, alerting, inventory, and multi-tenant administration API. " +
        "Powering real-time NOC operations for hundreds of monitored endpoints.",
    )
    .setVersion("7.0.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "JWT",
    )
    .addApiKey({ type: "apiKey", in: "header", name: "x-api-key" }, "ApiKey")
    .addTag("Health", "System diagnostic and database liveliness endpoints")
    .addTag(
      "Authentication & Identity",
      "Login, registration, token refresh, password reset",
    )
    .addTag(
      "Devices",
      "Device registration, heartbeat, and lifecycle management",
    )
    .addTag(
      "Telemetry",
      "Real-time CPU, RAM, Disk, and Network telemetry ingest and retrieval",
    )
    .addTag("Alerts", "Alert rules, engine evaluation, incident lifecycle")
    .addTag(
      "Inventory",
      "Hardware, software, network, and security asset discovery",
    )
    .addTag(
      "Dashboard",
      "Operational NOC overview and device status aggregations",
    )
    .addTag("Realtime", "Socket.IO gateway and room management")
    .addTag("Users", "User management and profile operations")
    .addTag(
      "Tenant",
      "Multi-tenant organization, roles, API keys, and governance",
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  const host = process.env.HOST || "0.0.0.0";

  await app.listen(port, host);
  const url = await app.getUrl();
  appLogger.log(
    `🚀 NOS Backend Fastify Server operational at: ${url}/${apiPrefix}`,
  );
  appLogger.log(`📚 OpenAPI Swagger docs accessible at: ${url}/docs`);
  appLogger.log(
    `🔒 Production secrets validation: ${process.env.NODE_ENV === "production" ? "ENFORCED" : "DEVELOPMENT MODE"}`,
  );
}

bootstrap();
