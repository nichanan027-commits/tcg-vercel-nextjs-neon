/** เรียก API ภายในระบบ ส่ง JSON และโยนข้อความผิดพลาดที่อ่านได้เมื่อไม่สำเร็จ */
export async function api<T = unknown>(path: string, method: 'POST' | 'PATCH', body: unknown): Promise<T> {
  const res = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `ผิดพลาด (${res.status})`);
  return data as T;
}
