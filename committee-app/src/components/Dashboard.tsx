'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { caseFlag, contactKind, embedUrl, safeUrl } from '@/lib/sheet';
import { money } from '@/lib/report';
import { DECISIONS, DECISION_LABEL, type CaseRow, type Decision, type Meeting } from '@/lib/types';

export default function Dashboard({ meeting, initial }: { meeting: Meeting; initial: CaseRow[] }) {
  const [cases, setCases] = useState(initial);
  const [bank, setBank] = useState('ALL');
  const [issueFor, setIssueFor] = useState<CaseRow | null>(null);
  const [error, setError] = useState('');

  const banks = useMemo(() => {
    const map = new Map<string, string>();
    cases.forEach((c) => { if (!map.has(c.bankCode)) map.set(c.bankCode, c.bankName); });
    return [...map].map(([code, name]) => ({ code, name }));
  }, [cases]);

  const shown = bank === 'ALL' ? cases : cases.filter((c) => c.bankCode === bank);
  const stat = useMemo(() => {
    let issue = 0, litigation = 0, yes = 0, no = 0, amount = 0;
    shown.forEach((c) => {
      amount += c.amount;
      const f = caseFlag({ issue: c.issue, condition: c.condition });
      if (f === 'issue') issue++; else if (f === 'litigation') litigation++;
      const k = contactKind(c.contactStatus);
      if (k === 'yes') yes++; else if (k === 'no') no++;
    });
    return { issue, litigation, yes, no, amount, auto: shown.length - issue - litigation };
  }, [shown]);

  async function patch(id: number, body: { note?: string | null; decision?: Decision }) {
    setError('');
    try {
      const updated = await api<CaseRow>(`/api/cases/${id}`, 'PATCH', body);
      setCases((list) => list.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    }
  }

  return (
    <main className="wrap wide">
      <section className="head">
        <div>
          <h1>{meeting.label}</h1>
          <div className="toolbar" style={{ margin: '10px 0 0' }}>
            <label htmlFor="bank"><b>สถาบันการเงิน:</b></label>
            <select id="bank" className="field" value={bank} onChange={(e) => setBank(e.target.value)}>
              <option value="ALL">ทั้งหมด ({cases.length} ราย)</option>
              {banks.map((b) => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
            </select>
            <Link className="btn orange" href={`/meetings/${meeting.id}/present`}>🎬 โหมดนำเสนอ</Link>
            <Link className="btn ghost" href={`/meetings/${meeting.id}/report`}>รายงานเสนอ</Link>
            <Link className="btn ghost" href={`/meetings/${meeting.id}/minutes`}>ร่างรายงานประชุม</Link>
          </div>
        </div>
        <div className="tot nums">
          <div>จำนวนเสนออนุมัติ<b>{shown.length}</b>ราย</div>
          <div>จำนวนเงินค่าประกันชดเชย<b>{money(stat.amount)}</b>บาท</div>
          <div style={{ color: 'var(--muted)', fontWeight: 500 }}>ติดต่อได้ {stat.yes} ราย | ติดต่อไม่ได้ {stat.no} ราย</div>
        </div>
      </section>

      <div className="kpis">
        <div className="kpi g"><div className="l">🟢 ผ่านเกณฑ์ (Auto-Approve)</div><div className="v">{stat.auto}</div></div>
        <div className="kpi o"><div className="l">🟡 ดำเนินคดี (Litigation)</div><div className="v">{stat.litigation}</div></div>
        <div className="kpi bad"><div className="l">🔴 มีประเด็น (Grey Area)</div><div className="v">{stat.issue}</div></div>
      </div>

      {error && <p className="err" role="alert">{error}</p>}

      <div className="card scroll-x" style={{ padding: 0 }}>
        <table className="grid">
          <thead>
            <tr>
              <th>ลำดับ</th><th style={{ textAlign: 'left' }}>โครงการ</th>{bank === 'ALL' && <th>ธนาคาร</th>}<th>ประเภทการค้ำประกัน</th><th>เงื่อนไข</th>
              <th>สัดส่วน</th><th className="r">จำนวนเงิน</th><th className="r">คงเหลือจ่ายได้</th><th>สถานะการติดต่อ</th>
              <th>หมายเหตุ (เงื่อนไขการจ่าย)</th><th>มติ</th><th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const flag = caseFlag({ issue: c.issue, condition: c.condition });
              return (
                <tr key={c.id}>
                  <td className="c nums"><b>{c.seq}</b></td>
                  <td><b>{c.borrower}</b><div style={{ color: 'var(--muted)', fontSize: 13 }}>{c.lcNo ? `L/C ${c.lcNo}` : ''}{c.payRound ? ` · ฉบับที่ ${c.payRound}` : ''}</div></td>
                  {bank === 'ALL' && <td className="c">{c.bankCode}</td>}
                  <td style={{ minWidth: 130 }}>{c.guaranteeType || '-'}</td>
                  <td className="c">{c.condition || '-'}</td>
                  <td className="c nums">{c.ratio ? `${c.ratio}%` : '-'}</td>
                  <td className="r nums"><b>{money(c.amount)}</b></td>
                  <td className="r nums" style={{ color: 'var(--muted)' }}>{money(c.remaining)}</td>
                  <td style={{ fontSize: 14, minWidth: 130 }}>{c.contactStatus || '-'}</td>
                  <td style={{ minWidth: 190 }}>
                    <input
                      className={`note${c.noteEdited ? ' edited' : ''}`}
                      aria-label={`หมายเหตุ ${c.borrower}`}
                      defaultValue={c.note}
                      placeholder="เช่น เรียกเก็บค่าธรรมเนียม … บาท"
                      onBlur={(e) => { if (e.target.value !== c.note) patch(c.id, { note: e.target.value }); }}
                    />
                  </td>
                  <td>
                    <select
                      className="field"
                      aria-label={`มติ ${c.borrower}`}
                      value={c.decision}
                      onChange={(e) => patch(c.id, { decision: e.target.value as Decision })}
                    >
                      {DECISIONS.map((d) => <option key={d} value={d}>{DECISION_LABEL[d]}</option>)}
                    </select>
                  </td>
                  <td className="c">
                    {flag === 'issue' ? (
                      <button className="btn orange small" onClick={() => setIssueFor(c)}>⭐ ประเด็น</button>
                    ) : flag === 'litigation' ? <span className="pill litigation">ดำเนินคดี</span>
                      : safeUrl(c.evidenceUrl) ? <a href={safeUrl(c.evidenceUrl)} target="_blank" rel="noopener noreferrer">📄 เอกสาร</a>
                      : <span style={{ color: 'var(--muted)' }}>- ปกติ -</span>}
                  </td>
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan={12} className="c" style={{ padding: 30 }}>ไม่พบข้อมูล</td></tr>}
          </tbody>
        </table>
      </div>

      {issueFor && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label="ประเด็นพิจารณา" onClick={() => setIssueFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <div>
                <span className="pill issue">⭐ บันทึกการพิจารณาข้อกฎหมายและหลักฐาน</span>
                <h2 style={{ margin: '6px 0 0' }}>ลำดับที่ {issueFor.seq} {issueFor.borrower}</h2>
              </div>
              <button className="btn ghost small" onClick={() => setIssueFor(null)} aria-label="ปิด">✕</button>
            </div>
            <div className="modal-b">
              <div>
                <div className="box red"><h4>⚠️ ประเด็นที่ตรวจพบ</h4>{issueFor.issue || 'ไม่มีระบุ'}</div>
                <div className="box grn"><h4>✅ การปลดล็อก</h4>{issueFor.unlock || 'ไม่มีระบุ'}</div>
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px' }}>📄 เอกสารหลักฐาน</h4>
                {safeUrl(issueFor.evidenceUrl)
                  ? (
                    <>
                      <iframe className="docframe" src={embedUrl(safeUrl(issueFor.evidenceUrl))} title="เอกสารหลักฐาน" referrerPolicy="no-referrer" />
                      <p style={{ margin: '6px 0 0' }}><a href={safeUrl(issueFor.evidenceUrl)} target="_blank" rel="noopener noreferrer">เปิดเอกสารในแท็บใหม่ ↗</a></p>
                    </>
                  )
                  : <p className="sub">ไม่มีเอกสารแนบในระบบ</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
