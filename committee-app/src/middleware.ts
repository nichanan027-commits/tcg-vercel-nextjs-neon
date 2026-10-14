import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, getSecret, verifyToken } from '@/lib/auth';

const PUBLIC = ['/login', '/api/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const password = process.env.APP_PASSWORD;

  if (!password) {
    // dev: เปิดได้ถ้ายังไม่ตั้งรหัส / production: ปฏิเสธทั้งหมด เพราะข้อมูลมีชื่อบุคคลธรรมดา
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('ระบบยังไม่ได้ตั้งค่า APP_PASSWORD', { status: 503 });
    }
    return NextResponse.next();
  }
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const secret = getSecret();
  if (!secret) return new NextResponse('ระบบยังไม่ได้ตั้งค่า SESSION_SECRET (อย่างน้อย 32 ตัวอักษร)', { status: 503 });

  if (await verifyToken(req.cookies.get(SESSION_COOKIE)?.value, secret)) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
