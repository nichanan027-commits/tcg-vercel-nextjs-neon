'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import type { Meeting } from '@/lib/types';

export default function MeetingSettings({ meeting }: { meeting: Meeting }) {
  const router = useRouter();
  const [heldOn, setHeldOn] = useState(meeting.heldOn ?? '');
  const [prefix, setPrefix] = useState(meeting.resolutionPrefix);
  const [agenda, setAgenda] = useState(String(meeting.agendaNo));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      await api(`/api/meetings/${meeting.id}`, 'PATCH', { heldOn: heldOn || null, resolutionPrefix: prefix, agendaNo: Number(agenda) });
      setMsg('บันทึกแล้ว');
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="settings no-print" onSubmit={save}>
      <label htmlFor="heldOn">วันที่ประชุม<input id="heldOn" type="date" className="field" value={heldOn} onChange={(e) => setHeldOn(e.target.value)} /></label>
      <label htmlFor="prefix">ครั้งที่ประชุม (เช่น 18/2569)<input id="prefix" className="field" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={40} /></label>
      <label htmlFor="agenda">ระเบียบวาระที่<input id="agenda" type="number" min={1} max={99} className="field" style={{ width: 90 }} value={agenda} onChange={(e) => setAgenda(e.target.value)} /></label>
      <button className="btn" disabled={busy}>บันทึก</button>
      {msg && <span role="status" className={msg === 'บันทึกแล้ว' ? 'ok' : 'err'}>{msg}</span>}
    </form>
  );
}
