import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const res = context.switchToHttp().getResponse();
          const ms = Date.now() - now;
          this.logger.log(`${method} ${url} ${res.statusCode} +${ms}ms`);
        },
        error: (err) => {
          const ms = Date.now() - now;
          const status = err.getStatus?.() ?? 500;
          this.logger.error(
            `${method} ${url} ${status} +${ms}ms - ${err.message}`,
          );
        },
      }),
    );
  }
}
