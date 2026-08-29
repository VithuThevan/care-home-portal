import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { AuthUser } from './models';

const STORAGE_KEY = 'carehome.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<AuthUser | null>(readStoredUser());

  get token(): string | null {
    return this.currentUser()?.token ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser()?.token;
  }

  hasRole(...roles: string[]): boolean {
    const current = this.currentUser()?.roles ?? [];
    return roles.some((role) => current.includes(role));
  }

  canWrite(): boolean {
    return this.isLoggedIn() && !this.isReadOnlyOnly();
  }

  isReadOnlyOnly(): boolean {
    return this.hasRole('ReadOnly') && !this.hasRole('PlatformAdmin', 'SuperAdmin', 'TenantAdmin', 'Administrator');
  }

  isPlatformAdmin(): boolean {
    return this.hasRole('PlatformAdmin', 'SuperAdmin');
  }

  canManageUsers(): boolean {
    return this.hasRole('TenantAdmin', 'Administrator');
  }

  canManageOrganisation(): boolean {
    return this.hasRole('TenantAdmin', 'Administrator');
  }

  homePath(): string[] {
    if (this.isPlatformAdmin() && !this.currentUser()?.tenantPublicId) {
      return ['/platform/tenants'];
    }

    return ['/dashboard'];
  }

  login(email: string, password: string) {
    return this.http.post<AuthUser>('/api/auth/login', { email, password }).pipe(
      tap((user) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUser.set(null);
    void this.router.navigate(['/login']);
  }
}

function readStoredUser(): AuthUser | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
