import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

interface StandardResponse<T> {
  success: boolean;
  data: T;
  metadata: {
    requestId: string;
    timestamp: string;
    path: string;
    method: string;
    version: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        // If response is already wrapped, return as-is
        if (data && typeof data === 'object' && 'success' in data && 'metadata' in data) {
          return data;
        }

        // Check if data has pagination info
        const hasPagination = data && typeof data === 'object' && 'edges' in data && 'pageInfo' in data;

        const response: StandardResponse<T> = {
          success: true,
          data: hasPagination ? data.edges.map((edge: any) => edge.node) : data,
          metadata: {
            requestId: (request as any).requestId || 'unknown',
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            version: request.headers['x-api-version'] as string || '1',
          },
        };

        // Add pagination metadata if available
        if (hasPagination) {
          const pageInfo = data.pageInfo;
          const page = parseInt(request.query.page as string) || 1;
          const limit = parseInt(request.query.limit as string) || 50;

          response.pagination = {
            page,
            limit,
            total: data.totalCount || 0,
            totalPages: Math.ceil((data.totalCount || 0) / limit),
            hasNext: pageInfo.hasNextPage,
            hasPrevious: pageInfo.hasPreviousPage,
          };
        }

        return response;
      }),
    );
  }
}
