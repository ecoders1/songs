import { SignJWT, jwtVerify } from 'jose';

// Fallback secret works out of the box for local dev.
// For production: set ADMIN_JWT_SECRET in Vercel / your hosting env vars.
// Tokens signed with the fallback will be invalidated if you later set the env var —
// that just means admins need to log in once after the env var is added (expected behavior).
const FALLBACK_SECRET = 'apostolic_songs_super_secret_jwt_key_2024!!';

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET || FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
