/**
 * Lightweight user auth helpers.
 * Passwords are hashed with PBKDF2 (Web Crypto API) + random salt.
 * User sessions are HttpOnly cookies signed with HS256 JWT.
 *
 * Secret resolution order:
 *   1. USER_JWT_SECRET env var  (set in Vercel / .env.local for production)
 *   2. ADMIN_JWT_SECRET env var (reuse admin secret if user secret not set)
 *   3. Hardcoded fallback       (works out of the box for local dev)
 *
 * This means the app works with zero env vars, and upgrading to a real secret
 * only requires one env var instead of two.
 */
import { SignJWT, jwtVerify } from 'jose';

const FALLBACK_SECRET = 'apostolic_user_jwt_secret_2024_secure!!';

function getSecret(): Uint8Array {
  // Prefer dedicated user secret, fall back to admin secret, then hardcoded
  const s =
    process.env.USER_JWT_SECRET ||
    process.env.ADMIN_JWT_SECRET ||
    FALLBACK_SECRET;
  return new TextEncoder().encode(s);
}

/** Sign a user session token (24h expiry) */
export async function signUserToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ sub: userId, email, role: 'user' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(getSecret());
}

/** Verify and decode a user session token; returns userId or null */
export async function verifyUserToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Hash a password with a random salt using PBKDF2 (Web Crypto).
 * Returns "salt:hash" both as hex strings.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

/** Verify a plain-text password against a stored "salt:hash" string */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const computed = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return computed === hashHex;
}
