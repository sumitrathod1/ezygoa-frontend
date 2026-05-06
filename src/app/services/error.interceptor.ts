import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ErrorHandlerService } from './error-handler.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ErrorHandlerService);

  return next(req).pipe(
    // Unwrap ApiResponse<T>: if response has { success, data }, return data directly
    map((event: any) => {
      if (event?.body && typeof event.body === 'object' && 'success' in event.body && 'data' in event.body) {
        return event.clone({ body: event.body.data ?? event.body });
      }
      return event;
    }),
    catchError((error) => {
      errorHandler.handle(error);
      return throwError(() => error);
    })
  );
};