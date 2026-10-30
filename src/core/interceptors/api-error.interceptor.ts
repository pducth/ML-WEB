import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../environment/environment';
import { ErrorNotificationService } from '../services/error-notification.service';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }

  const router = inject(Router);
  const notifications = inject(ErrorNotificationService);
  const credentialedRequest = request.clone({ withCredentials: environment.withCredentials });

  return next(credentialedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        const loginPath = router.url.startsWith('/admin') ? '/admin/login' : '/login';
        const loginPathname = router.url.split('?')[0];
        if (loginPathname !== loginPath) {
          void router.navigate([loginPath], { queryParams: { returnUrl: router.url } });
        }
      } else if (error.status === 403) {
        void router.navigate(['/403']);
        notifications.show('You do not have permission to perform this action.', 'error');
      } else if (error.status >= 500) {
        notifications.show('The server could not complete your request. Please try again later.', 'error');
      }

      return throwError(() => error);
    }),
  );
};
