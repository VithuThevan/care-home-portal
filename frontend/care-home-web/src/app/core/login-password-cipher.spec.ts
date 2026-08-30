import { encryptLoginPassword } from './login-password-cipher';

describe('encryptLoginPassword', () => {
  it('does not include the typed password in the cipher text', async () => {
    const secret = 'Test password';
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
    const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    const cipher = await encryptLoginPassword(
      { kty: 'RSA', n: jwk.n ?? '', e: jwk.e ?? '' },
      secret,
    );

    expect(cipher.startsWith('enc:')).toBe(true);
    expect(cipher).not.toContain(secret);
  });
});
