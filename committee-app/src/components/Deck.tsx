'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import { caseFlag, contactKind, embedUrl, safeUrl } from '@/lib/sheet';
import { groupByBank, money, total } from '@/lib/report';
import { DECISION_LABEL, type CaseRow, type Decision, type Meeting } from '@/lib/types';

const ROWS_PER_SLIDE = 6;

type Slide =
  | { kind: 'cover' }
  | { kind: 'summary' }
  | { kind: 'bank'; name: string; page: number; pages: number; cases: CaseRow[]; bankCases: CaseRow[] }
  | { kind: 'issue'; c: CaseRow }
  | { kind: 'close' };

function buildSlides(cases: CaseRow[]): Slide[] {
  if (!cases.length) return [{ kind: 'cover' }];
  const slides: Slide[] = [{ kind: 'cover' }, { kind: 'summary' }];
  for (const g of groupByBank(cases)) {
    const pages = Math.ceil(g.cases.length / ROWS_PER_SLIDE);
    for (let p = 0; p < pages; p++) {
      slides.push({ kind: 'bank', name: g.name, page: p + 1, pages, cases: g.cases.slice(p * ROWS_PER_SLIDE, (p + 1) * ROWS_PER_SLIDE), bankCases: g.cases });
    }
  }
  cases.filter((c) => c.issue.trim()).forEach((c) => slides.push({ kind: 'issue', c }));
  slides.push({ kind: 'close' });
  return slides;
}

export default function Deck({ meeting, initial }: { meeting: Meeting; initial: CaseRow[] }) {
  const [cases, setCases] = useState(initial);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  // โครงสไลด์สร้างจาก "ชุดรายการ" ไม่ใช่มติ จึงไม่เปลี่ยนตำแหน่งเมื่อกดมติ
  const structureKey = initial.map((c) => c.id).join(',');
  const slides = useMemo(() => buildSlides(initial), [structureKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);
  const live = (c: CaseRow) => byId.get(c.id) ?? c;

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(slides.length - 1, i))), [slides.length]);

  const fullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(index + 1); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(index - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); }
      else if (e.key === 'f' || e.key === 'F') fullscreen();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go, slides.length, fullscreen]);

  async function decide(c: CaseRow, decision: Decision, decisionNote?: string) {
    setError('');
    try {
      const updated = await api<CaseRow>(`/api/cases/${c.id}`, 'PATCH', decisionNote === undefined ? { decision } : { decision, decisionNote });
      setCases((list) => list.map((x) => (x.id === c.id ? { ...x, ...updated } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกมติไม่สำเร็จ');
    }
  }

  async function saveNote(c: CaseRow, decisionNote: string) {
    setError('');
    try {
      const updated = await api<CaseRow>(`/api/cases/${c.id}`, 'PATCH', { decisionNote });
      setCases((list) => list.map((x) => (x.id === c.id ? { ...x, ...updated } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกหมายเหตุไม่สำเร็จ');
    }
  }

  async function approveAll(list: CaseRow[]) {
    setError('');
    const ids = list.filter((c) => live(c).decision === 'pending').map((c) => c.id);
    if (!ids.length) return;
    try {
      await api(`/api/meetings/${meeting.id}/decisions`, 'POST', { ids, decision: 'approved' });
      setCases((cs) => cs.map((c) => (ids.includes(c.id) ? { ...c, decision: 'approved' } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกมติไม่สำเร็จ');
    }
  }

  const slide = slides[index];
  const sum = total(cases);
  const count = (d: Decision) => cases.filter((c) => c.decision === d).length;
  const banks = groupByBank(cases);
  const issues = cases.filter((c) => c.issue.trim());
  const yes = cases.filter((c) => contactKind(c.contactStatus) === 'yes').length;
  const no = cases.filter((c) => contactKind(c.contactStatus) === 'no').length;
  const title = `รายงานเสนอขออนุมัติจ่ายค่าประกันชดเชย ${meeting.label}`;

  const frame = (sub: string, body: React.ReactNode) => (
    <>
      <div className="ptop">
        <div><h1>{title}</h1><p className="sub">{sub}</p></div>
        <div className="pg">หน้า {index + 1}/{slides.length}</div>
      </div>
      <div className="pbody">{body}</div>
    </>
  );

  let content: React.ReactNode;
  if (!slide || slide.kind === 'cover') {
    content = (
      <div className="pcover">
        <h1>รายงานเสนอขออนุมัติ<br />จ่ายค่าประกันชดเชย</h1>
        <div className="round">{meeting.label}</div>
        {cases.length ? (
          <>
            <div className="big">จำนวน<b>{cases.length}</b>ราย &nbsp; รวม<b>{money(sum)}</b>บาท</div>
            <div className="meta">จาก {banks.length} สถาบันการเงิน | ติดต่อได้ {yes} ราย | ติดต่อไม่ได้ {no} ราย | มีประเด็นพิจารณา {issues.length} ราย</div>
          </>
        ) : <div className="meta">ไม่พบรายการเสนอในรอบนี้</div>}
      </div>
    );
  } else if (slide.kind === 'summary') {
    content = frame('ภาพรวมรายสถาบันการเงิน', (
      <>
        <div className="pkpis">
          <div className="pkpi"><div className="l">จำนวนเสนออนุมัติ</div><div className="v">{cases.length} ราย</div></div>
          <div className="pkpi o"><div className="l">ค่าประกันชดเชยรวม (บาท)</div><div className="v">{money(sum)}</div></div>
          <div className="pkpi g"><div className="l">ผ่านเกณฑ์ (Auto-Approve)</div><div className="v">{cases.length - issues.length}</div></div>
          <div className="pkpi bad"><div className="l">มีประเด็น (Grey Area)</div><div className="v">{issues.length}</div></div>
        </div>
        <table className="pt">
          <thead><tr><th style={{ textAlign: 'left' }}>สถาบันการเงิน</th><th className="c">จำนวน (ราย)</th><th className="r">ค่าประกันชดเชย (บาท)</th><th /><th className="c">ติดต่อได้</th><th className="c">ติดต่อไม่ได้</th><th className="c">มีประเด็น</th></tr></thead>
          <tbody>
            {banks.map((g) => (
              <tr key={g.code}>
                <td>{g.name}</td><td className="c">{g.cases.length}</td><td className="r">{money(g.amount)}</td>
                <td style={{ width: '18%' }}><div className="pbarcell"><div style={{ width: `${sum ? Math.max(2, (g.amount / sum) * 100) : 0}%` }} /></div></td>
                <td className="c">{g.cases.filter((c) => contactKind(c.contactStatus) === 'yes').length}</td>
                <td className="c">{g.cases.filter((c) => contactKind(c.contactStatus) === 'no').length}</td>
                <td className="c">{g.cases.filter((c) => c.issue.trim()).length || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>รวม</td><td className="c">{cases.length}</td><td className="r">{money(sum)}</td><td /><td className="c">{yes}</td><td className="c">{no}</td><td className="c">{issues.length}</td></tr></tfoot>
        </table>
      </>
    ));
  } else if (slide.kind === 'bank') {
    const bankTotal = total(slide.bankCases);
    content = frame(`${slide.name}${slide.pages > 1 ? ` (${slide.page}/${slide.pages})` : ''}`, (
      <>
        <table className="pt">
          <thead><tr><th className="c">ลำดับ</th><th style={{ textAlign: 'left' }}>โครงการ</th><th>ประเภทการค้ำประกัน</th><th>เงื่อนไข</th><th>สัดส่วน</th><th>ฉบับที่</th><th className="r">จำนวนเงิน</th><th>สถานะการติดต่อ</th><th>มติ</th></tr></thead>
          <tbody>
            {slide.cases.map((raw) => {
              const c = live(raw);
              const k = contactKind(c.contactStatus);
              return (
                <tr key={c.id}>
                  <td className="c"><b>{c.seq}</b></td>
                  <td><b>{c.borrower}</b>{caseFlag({ issue: c.issue, condition: c.condition }) === 'issue' ? ' ⭐' : ''}</td>
                  <td>{c.guaranteeType}</td>
                  <td className="c nw">{c.condition}</td><td className="c nw">{c.ratio ? `${c.ratio}%` : '-'}</td><td className="c nw">{c.payRound}</td>
                  <td className="r nw"><b>{money(c.amount)}</b></td>
                  <td>{k === 'yes' ? '🟢 ' : k === 'no' ? '🔴 ' : ''}{c.contactStatus}</td>
                  <td className="c"><span className={`pill ${c.decision}`}>{DECISION_LABEL[c.decision]}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="pnote">รวม {slide.name} <b>{slide.bankCases.length} ราย</b> จำนวน <b>{money(bankTotal)} บาท</b></div>
        <button className="pbulk" onClick={() => approveAll(slide.cases)}>✓ อนุมัติทุกรายที่รอพิจารณาในหน้านี้</button>
      </>
    ));
  } else if (slide.kind === 'issue') {
    const c = live(slide.c);
    const link = safeUrl(c.evidenceUrl);
    content = frame(`ลำดับที่ ${c.seq} ${c.borrower}`, (
      <>
        <div className="pnote"><b>{c.bankName || c.bankCode}</b> | {c.guaranteeType} | ขออนุมัติจ่าย <b>{money(c.amount)} บาท</b></div>
        <div className="pcols">
          <div className="pcol">
            <div className="pbox red"><h4>⚠️ ประเด็นที่ตรวจพบ</h4>{c.issue || 'ไม่มีระบุ'}</div>
            <div className="pbox grn"><h4>✅ การปลดล็อก</h4>{c.unlock || 'ไม่มีระบุ'}</div>
          </div>
          <div className="pcol">
            {link ? <iframe className="pdoc" src={embedUrl(link)} title="เอกสารหลักฐาน" referrerPolicy="no-referrer" /> : <div className="pnodoc">ไม่มีเอกสารแนบในระบบ</div>}
          </div>
        </div>
        <div className="pdecide">
          <b>มติ:</b>
          {(['approved', 'deferred', 'rejected'] as Decision[]).map((d) => (
            <button key={d} className={`${c.decision === d ? 'on ' : ''}${d}`} onClick={() => decide(c, c.decision === d ? 'pending' : d)}>{DECISION_LABEL[d]}</button>
          ))}
          <input key={c.id} aria-label="เหตุผล/หมายเหตุของมติ" placeholder="เหตุผล/หมายเหตุของมติ (ไม่บังคับ)" defaultValue={c.decisionNote} onBlur={(e) => { if (e.target.value !== c.decisionNote) void saveNote(c, e.target.value); }} />
        </div>
      </>
    ));
  } else {
    const approved = cases.filter((c) => c.decision === 'approved');
    content = frame('สรุปที่เสนอต่อที่ประชุม', (
      <div className="pclose">
        <div className="ask">ขอเสนอที่ประชุมพิจารณาอนุมัติจ่ายค่าประกันชดเชย ลำดับที่ 1 ถึงลำดับที่ {cases.length} จำนวน <b>{cases.length} ราย</b> รวมค่าประกันชดเชย <b>{money(sum)} บาท</b></div>
        {issues.length > 0 && <div>มีรายที่มีประเด็นพิจารณาเพิ่มเติม <b>{issues.length} ราย</b> (ลำดับที่ {issues.map((c) => c.seq).join(', ')}) ซึ่งได้นำเสนอประเด็นและการปลดล็อกแล้ว</div>}
        <div>
          มติที่บันทึกแล้ว: อนุมัติ <b>{approved.length}</b> ราย ({money(total(approved))} บาท) · เลื่อน <b>{count('deferred')}</b> · ไม่อนุมัติ <b>{count('rejected')}</b> · รอพิจารณา <b>{count('pending')}</b>
        </div>
        <div className="pdecide">
          <button className="pbulk" style={{ alignSelf: 'auto' }} onClick={() => approveAll(cases)}>✓ อนุมัติทุกรายที่ยังรอพิจารณา</button>
          <Link href={`/meetings/${meeting.id}/minutes`} className="pbulk" style={{ alignSelf: 'auto', textDecoration: 'none' }}>ดูร่างรายงานการประชุม →</Link>
        </div>
      </div>
    ));
  }

  return (
    <div className="deck" ref={rootRef}>
      <div className="pbar">
        <div className="grp"><Link href={`/meetings/${meeting.id}`}>← กลับภาพรวม</Link>{error && <span className="err" role="alert" style={{ color: '#fca5a5' }}>{error}</span>}</div>
        <div className="grp">
          <button onClick={() => go(index - 1)} aria-label="หน้าก่อนหน้า">◀ ก่อนหน้า</button>
          <span aria-live="polite" style={{ minWidth: 64, textAlign: 'center' }}>{index + 1} / {slides.length}</span>
          <button onClick={() => go(index + 1)} aria-label="หน้าถัดไป">ถัดไป ▶</button>
          <button onClick={fullscreen}>⛶ เต็มจอ (F)</button>
        </div>
      </div>
      <div className="pprogress"><div style={{ width: `${((index + 1) / slides.length) * 100}%` }} /></div>
      <div className="pstage"><div className="pslide">{content}</div></div>
    </div>
  );
}
