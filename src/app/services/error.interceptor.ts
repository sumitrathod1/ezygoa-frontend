import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ErrorHandlerService } from './error-handler.service';

/**
 * Set on background requests (header badge, polling) so a failure does not pop up an
 * error toast every few minutes — e.g. while offline or before a new API is deployed.
 */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

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
      if (!req.context.get(SILENT_ERRORS)) errorHandler.handle(error);
      return throwError(() => error);
    })
  );
};