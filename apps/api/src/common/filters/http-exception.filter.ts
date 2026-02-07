import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any[];
    requestId: string;
    timestamp: string;
    path: string;
    method: string;
    documentationUrl?: string;
    stack?: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = response<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers['x-request-id'] as string || uuidv4();
    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: any[] | undefined;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        code = this.mapHttpStatusToErrorCode(status);
        details = responseObj.details || (Array.isArray(responseObj.message) ? responseObj.message : undefined);
      } else {
        message = exceptionResponse as string;
        code = this.mapHttpStatusToErrorCode(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = 'INTERNAL_ERROR';
      stack = exception.stack;
    }

    const errorResponse: ErrorResponse = {
      error: {
        code,
        message,
        details,
        requestId,
        timestamp,
        path: request.url,
        method: request.method,
        documentationUrl: this.getDocumentationUrl(code),
      },
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && stack) {
      errorResponse.error.stack = stack;
    }

    // Log error
    this.logError(exception, request, requestId, status);

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Map HTTP status to error code
   */
  private mapHttpStatusToErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return codeMap[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Get documentation URL for error code
   */
  private getDocumentationUrl(code: string): string {
    const baseUrl = 'https://docs.pms-platform.com/errors';
    return `${baseUrl}/${code.toLowerCase()}`;
  }

  /**
   * Log error with context
   */
  private logError(
    exception: unknown,
    request: Request,
    requestId: string,
    status: number,
  ): void {
    const errorMessage = exception instanceof Error ? exception.message : 'Unknown error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    const logContext = {
      requestId,
      method: request.method,
      path: request.url,
      status,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.sub,
      tenantId: request.headers['x-tenant-id'],
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${errorMessage}`,
        stack,
        JSON.stringify(logContext),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${errorMessage}`,
        JSON.stringify(logContext),
      );
    }
  }
}
