import { SignJWT, jwtVerify } from 'jose';

// Fallback secret used if env var is missing — works out of the box
// Set ADMIN_JWT_SECRET in Vercel dashboard for production security
const FALLBACK_SECRET = 'apostolic_songs_super_secret_jwt_key_2024!!';

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET || FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(): Promise<string> {
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
