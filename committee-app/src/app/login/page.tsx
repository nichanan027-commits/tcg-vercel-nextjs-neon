'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/client';

function LoginForm() {
  const next = useSearchParams().get('next');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/api/login', 'POST', { password });
      // โหลดหน้าใหม่ทั้งหน้า: router ฝั่งไคลเอนต์จำผลพรีเฟตช์ที่ถูก redirect มาหน้าล็อกอินไว้
      window.location.assign(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
      setBusy(false);
    }
  }

  return (
    <form className="card login" onSubmit={submit}>
      <h1 className="page" style={{ fontSize: 22 }}>เข้าสู่ระบบ</h1>
      <label htmlFor="password">รหัสผ่าน</label>
      <input id="password" type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn" disabled={busy || !password}>{busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบ'}</button>
    </form>
  );
}

export default function LoginPage() {
  return <div className="wrap"><Suspense><LoginForm /></Suspense></div>;
}
