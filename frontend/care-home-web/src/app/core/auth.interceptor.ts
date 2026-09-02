import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

const SECRET_QUERY_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'passwordcipher',
  'token',
  'access_token',
  'refresh_token',
  'jwt',
  'authorization',
]);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  let params = req.params;
  for (const key of params.keys()) {
    if (SECRET_QUERY_KEYS.has(key.toLowerCase()) || key.toLowerCase().includes('password')) {
      params = params.delete(key);
    }
  }

  const authorized = token
    ? req.clone({ params, setHeaders: { Authorization: `Bearer ${token}` } })
    : req.clone({ params });

  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/login')) {
        auth.logout();
      }

      if (error.status === 403) {
        void router.navigate([auth.mustChangePassword() ? '/change-password' : '/forbidden']);
      }

      return throwError(() => error);
    }),
  );
};
