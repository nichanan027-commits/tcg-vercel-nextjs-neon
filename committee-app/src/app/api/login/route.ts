import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_SECONDS, createToken, getSecret, passwordMatches } from '@/lib/auth';
import { fail, readJson } from '@/lib/http';

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  const secret = getSecret();
  if (!expected || !secret) return fail('ระบบยังไม่ได้ตั้งค่า APP_PASSWORD / SESSION_SECRET', 503);

  const body = await readJson(req);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!(await passwordMatches(password, expected))) {
    await new Promise((r) => setTimeout(r, 700)); // หน่วงเล็กน้อยลดการเดารหัส
    return fail('รหัสผ่านไม่ถูกต้อง', 401);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createToken(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
  return res;
}
