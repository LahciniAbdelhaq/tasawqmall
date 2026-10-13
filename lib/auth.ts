import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';

export const ADMIN_COOKIE = 'bm_admin';
export const authSecret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');

export async function signAdminToken(id: number, days = 7) {
  return new SignJWT({ kind: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(authSecret());
}

export async function verifyAdminToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret());
    return payload.kind === 'admin' && payload.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
}

export async function setAdminSession(id: number) {
  (await cookies()).set(ADMIN_COOKIE, await signAdminToken(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1',
    path: '/',
    maxAge: 7 * 86400,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getAdmin() {
  const id = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  return id ? db.adminUser.findUnique({ where: { id } }) : null;
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
