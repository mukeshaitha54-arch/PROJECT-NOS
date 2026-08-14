import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { ApiResponse, ApiErrorPayload } from "@nos/shared-types";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: "Internal server error occurred" };

    const message: string =
      typeof errorResponse === "string"
        ? errorResponse
        : errorResponse?.message ||
          (exception as any)?.message ||
          "Unknown exception encountered";

    const details =
      typeof errorResponse === "object" && errorResponse !== null
        ? errorResponse
        : undefined;

    const requestId = (request.headers["x-request-id"] ||
      request.headers["x-correlation-id"] ||
      "untracked") as string;

    const errorPayload: ApiErrorPayload = {
      code: status,
      message: Array.isArray(message) ? message.join(", ") : message,
      details,
      path: request.url,
    };

    const apiResponse: ApiResponse<null> = {
      success: false,
      error: errorPayload,
      timestamp: new Date().toISOString(),
      requestId,
    };

    if (status >= 500) {
      this.logger.error(
        `[Request ID: ${requestId}] Unhandled Server Exception at ${request.method} ${request.url}`,
        (exception as any)?.stack || exception,
      );
    } else {
      this.logger.warn(
        `[Request ID: ${requestId}] Client HTTP Exception (${status}) at ${request.method} ${request.url}: ${apiResponse.error?.message}`,
      );
    }

    response.status(status).send(apiResponse);
  }
}
