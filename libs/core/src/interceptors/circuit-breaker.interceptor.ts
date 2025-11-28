import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { CircuitBreaker } from './circuit-breaker';
import { catchError } from 'rxjs/operators';

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly circuitBreakerByHandler = new WeakMap<
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    Function,
    CircuitBreaker
  >();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const methodRef = context.getHandler();

    let circuitBreaker: CircuitBreaker;
    if (this.circuitBreakerByHandler.has(methodRef)) {
      const circuitBreakerService = this.circuitBreakerByHandler.get(methodRef);
      if (!circuitBreakerService) {
        throw new Error('CircuitBreaker not found');
      }
      circuitBreaker = circuitBreakerService;
    } else {
      circuitBreaker = new CircuitBreaker({
        successThreshold: 3,
        failureThreshold: 3,
        openToHalfOpenWaitTime: 60000,
        fallback: () =>
          throwError(
            () =>
              new HttpException(
                'Service unavailable. Please try again later.',
                HttpStatus.SERVICE_UNAVAILABLE,
              ),
          ),
      });
      this.circuitBreakerByHandler.set(methodRef, circuitBreaker);
    }

    return circuitBreaker.exec(next).pipe(
      catchError(() => {
        return throwError(
          () =>
            new HttpException(
              'Internal server error',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
        );
      }),
    );
  }
}
