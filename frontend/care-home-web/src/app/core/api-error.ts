export function getApiErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (!isRecord(error)) {
    return fallback;
  }

  const body = error['error'];

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (!isRecord(body)) {
    return fallback;
  }

  if (typeof body['message'] === 'string' && body['message'].trim()) {
    return body['message'];
  }

  const errors = body['errors'];

  if (isRecord(errors)) {
    for (const value of Object.values(errors)) {
      if (
        Array.isArray(value) &&
        typeof value[0] === 'string' &&
        value[0].trim()
      ) {
        return value[0];
      }
    }
  }

  if (typeof body['title'] === 'string' && body['title'].trim()) {
    return body['title'];
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
