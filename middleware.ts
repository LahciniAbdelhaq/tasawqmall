import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const LOCALE_RE = /^[a-z]{2}$/;
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');

async function isAdmin(req: NextRequest) {
  const token = req.cookies.get('bm_admin')?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.kind === 'admin';
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // back-office: everything but the login page needs a session
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (pathname === '/admin/login' || (await isAdmin(req))) return NextResponse.next();
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // shop: ?lang=xx switches language (remembered in a cookie) and is passed on to the render
  const lang = searchParams.get('lang');
  if (lang && LOCALE_RE.test(lang)) {
    const headers = new Headers(req.headers);
    headers.set('x-bm-locale', lang);
    const res = NextResponse.next({ request: { headers } });
    res.cookies.set('bm_lang', lang, { path: '/', maxAge: 365 * 86400, sameSite: 'lax' });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|assets/|wp-content/|uploads/|fonts/|favicon|api/track|app.css).*)'],
};
