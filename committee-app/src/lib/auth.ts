/** เซ็นและตรวจคุกกี้เซสชันด้วย HMAC-SHA256 (Web Crypto ใช้ได้ทั้ง middleware และ route handler) */
export const SESSION_COOKIE = 'tcg_session';
export const SESSION_SECONDS = 60 * 60 * 12;

const enc = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = '';
  new Uint8Array(bytes).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function getSecret(): string | null {
  const s = process.env.SESSION_SECRET ?? '';
  return s.length >= 32 ? s : null;
}

export async function createToken(secret: string, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS;
  return `${exp}.${await hmac(secret, String(exp))}`;
}

export async function verifyToken(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) * 1000 < now) return false;
  return sameString(sig, await hmac(secret, exp));
}

/** เทียบรหัสผ่านโดยเทียบ digest เพื่อไม่ให้ความยาว/ตำแหน่งที่ต่างรั่วทางเวลา */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(input)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  return sameString(toBase64Url(a), toBase64Url(b));
}
