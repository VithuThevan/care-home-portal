import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import { LoginPublicKey } from './login-password-cipher';

describe('AuthService', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.removeItem('carehome.auth');
  });

  it('posts an encrypted password and never sends the typed secret', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const secret = 'Test password';
    const login = firstValueFrom(auth.login('admin@localhost', secret));

    const pair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
      },
      true,
      ['encrypt', 'decrypt'],
    );
    const jwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
    http.expectOne('/api/auth/login-key').flush({
      kty: 'RSA',
      n: jwk.n ?? '',
      e: jwk.e ?? '',
      alg: 'RSA-OAEP-256',
    } satisfies LoginPublicKey);

    const request = await waitForRequest(http, '/api/auth/login');
    const body = request.request.body as Record<string, unknown>;
    const payload = JSON.stringify(body);

    expect(request.request.method).toBe('POST');
    expect(body).not.toHaveProperty('password');
    expect(payload).not.toContain(secret);
    expect(String(body['passwordCipher'] ?? '')).toMatch(/^enc:/);

    request.flush({
      token: 'test-token',
      displayName: 'Admin',
      email: 'admin@localhost',
      roles: ['PlatformAdmin'],
      careHomeIds: [],
    });
    await login;
  });

  it('does not send typed passwords on change-password', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const current = 'TempPass!12345';
    const next = 'NewPass!12345x';
    const pending = firstValueFrom(auth.changePassword(current, next));

    const pair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
      },
      true,
      ['encrypt', 'decrypt'],
    );
    const jwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
    http.expectOne('/api/auth/login-key').flush({
      kty: 'RSA',
      n: jwk.n ?? '',
      e: jwk.e ?? '',
      alg: 'RSA-OAEP-256',
    } satisfies LoginPublicKey);

    const request = await waitForRequest(http, '/api/auth/change-password');
    const payload = JSON.stringify(request.request.body);

    expect(request.request.body).not.toHaveProperty('currentPassword');
    expect(request.request.body).not.toHaveProperty('newPassword');
    expect(payload).not.toContain(current);
    expect(payload).not.toContain(next);

    request.flush({
      token: 'test-token',
      displayName: 'Admin',
      email: 'admin@localhost',
      roles: ['PlatformAdmin'],
      careHomeIds: [],
    });
    await pending;
  });
});

async function waitForRequest(http: HttpTestingController, url: string) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const matches = http.match(url);
    if (matches.length === 1) {
      return matches[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return http.expectOne(url);
}
