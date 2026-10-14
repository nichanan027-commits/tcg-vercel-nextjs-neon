import { NextResponse } from 'next/server';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** รับเฉพาะ JSON (เบราว์เซอร์ส่ง JSON ข้ามเว็บไม่ได้โดยไม่ผ่าน preflight จึงกัน CSRF ได้อีกชั้น) */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) return null;
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function intParam(value: string): number | null {
  return /^\d{1,9}$/.test(value) ? Number(value) : null;
}
