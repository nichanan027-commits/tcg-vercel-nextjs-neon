'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

interface Summary {
  meetings: { id: number; label: string; total: number; added: number; updated: number; missingFromSheet: number }[];
  skippedBlank: number;
}

export default function ImportPanel() {
  const router = useRouter();
  const [sheetUrl, setSheetUrl] = useState('');
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(body: { sheetUrl?: string; csv?: string }) {
    setBusy(true); setError(''); setSummary(null);
    try {
      setSummary(await api<Summary>('/api/import', 'POST', body));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'นำเข้าไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="imp">
      <h2 id="imp" style={{ marginTop: 0, color: 'var(--navy)' }}>นำเข้าจากชีต</h2>
      <p className="sub">นำเข้าซ้ำได้ ระบบจะอัปเดตข้อมูลจากชีต แต่คงมติและหมายเหตุที่แก้ในระบบไว้ แถวที่หายจากชีตจะถูกซ่อน</p>
      <div className="import-grid">
        <div>
          <label htmlFor="sheetUrl"><b>ลิงก์ Google Sheets</b> (แชร์เป็น "ทุกคนที่มีลิงก์ - ผู้ดู")</label>
          <input id="sheetUrl" className="field" style={{ width: '100%', margin: '6px 0 10px' }} placeholder="https://docs.google.com/spreadsheets/d/…/edit?gid=0"
            value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
          <button className="btn" disabled={busy || !sheetUrl.trim()} onClick={() => run({ sheetUrl })}>{busy ? 'กำลังนำเข้า…' : 'ดึงจากลิงก์'}</button>
        </div>
        <div>
          <label htmlFor="csv"><b>หรือวางข้อมูล CSV</b> / เลือกไฟล์ .csv</label>
          <textarea id="csv" className="field" style={{ margin: '6px 0 10px' }} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="Bank,ธนาคาร,ประเภทการค้ำประกัน,…" />
          <div className="toolbar">
            <input ref={fileRef} type="file" accept=".csv,text/csv" aria-label="เลือกไฟล์ CSV"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} />
            <button className="btn" disabled={busy || !csv.trim()} onClick={() => run({ csv })}>นำเข้า CSV</button>
          </div>
        </div>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      {summary && (
        <div role="status" style={{ marginTop: 12 }}>
          <p className="ok">นำเข้าสำเร็จ{summary.skippedBlank ? ` (ข้ามแถวว่าง ${summary.skippedBlank} แถว)` : ''}</p>
          <ul>
            {summary.meetings.map((m) => (
              <li key={m.id}>
                <Link href={`/meetings/${m.id}`}>{m.label}</Link> — ทั้งหมด {m.total} ราย (เพิ่มใหม่ {m.added}, อัปเดต {m.updated}
                {m.missingFromSheet ? `, หายจากชีต ${m.missingFromSheet}` : ''})
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
