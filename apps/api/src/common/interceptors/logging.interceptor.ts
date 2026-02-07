import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    const startTime = Date.now();

    // Add request ID to request object
    (request as any).requestId = requestId;

    // Add request ID to response headers
    response.setHeader('X-Request-ID', requestId);

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const userId = (request as any).user?.sub;
    const tenantId = headers['x-tenant-id'];

    this.logger.log(
      `→ ${method} ${url} | IP: ${ip} | RequestID: ${requestId} | User: ${userId || 'Anonymous'} | Tenant: ${tenantId || 'N/A'}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(
            `← ${method} ${url} ${statusCode} | ${duration}ms | RequestID: ${requestId}`,
          );

          // Log slow requests (> 1s)
          if (duration > 1000) {
            this.logger.warn(
              `Slow request detected: ${method} ${url} took ${duration}ms | RequestID: ${requestId}`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.error(
            `← ${method} ${url} ${statusCode || 500} | ${duration}ms | Error: ${error.message} | RequestID: ${requestId}`,
          );
        },
      }),
    );
  }
}
