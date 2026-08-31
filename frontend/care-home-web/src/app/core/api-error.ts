import { HttpErrorResponse } from '@angular/common/http';

export function getApiErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (!isRecord(error)) {
    return fallback;
  }

  const body = error['error'];

  if (typeof body === 'string' && body.trim()) {
    return containsSecretDump(body) ? fallback : body;
  }

  if (!isRecord(body)) {
    return fallback;
  }

  if (typeof body['message'] === 'string' && body['message'].trim()) {
    return containsSecretDump(body['message']) ? fallback : body['message'];
  }

  const errors = body['errors'];

  if (isRecord(errors)) {
    for (const value of Object.values(errors)) {
      if (
        Array.isArray(value) &&
        typeof value[0] === 'string' &&
        value[0].trim()
      ) {
        return containsSecretDump(value[0]) ? fallback : value[0];
      }
    }
  }

  if (typeof body['title'] === 'string' && body['title'].trim()) {
    return body['title'];
  }

  return fallback;
}

export function logApiFailure(error: unknown, context = 'Request failed'): void {
  if (error instanceof HttpErrorResponse) {
    console.error(context, { status: error.status, url: sanitizeUrl(error.url) });
    return;
  }

  console.error(context);
}

function containsSecretDump(value: string): boolean {
  return /"(password|currentPassword|newPassword|passwordCipher|token|authorization)"\s*:/i.test(value);
}

function sanitizeUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  const path = url.split('?')[0]?.split('#')[0];
  return path || url;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
