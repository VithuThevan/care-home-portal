export interface LoginPublicKey {
  kty: string;
  n: string;
  e: string;
  alg?: string;
  ext?: boolean;
  key_ops?: string[];
}

export async function encryptLoginPassword(
  publicKey: LoginPublicKey,
  password: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'RSA',
      n: publicKey.n,
      e: publicKey.e,
      alg: 'RSA-OAEP-256',
      ext: true,
      key_ops: ['encrypt'],
    },
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    new TextEncoder().encode(password),
  );

  return `enc:${bytesToBase64(new Uint8Array(encrypted))}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
