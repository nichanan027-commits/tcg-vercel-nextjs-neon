import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMeeting, listCases } from '@/lib/queries';
import { buildMinutes, money, total } from '@/lib/report';
import MeetingSettings from '@/components/MeetingSettings';
import PrintButton from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function MinutesPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const meeting = await getMeeting(id);
  if (!meeting) notFound();
  const cases = await listCases(id);
  const m = buildMinutes(meeting, cases);

  return (
    <main className="wrap">
      <div className="toolbar no-print">
        <Link className="btn ghost" href={`/meetings/${id}`}>← ภาพรวม</Link>
        <Link className="btn orange" href={`/meetings/${id}/present`}>🎬 กลับไปบันทึกมติ</Link>
        <PrintButton />
      </div>
      <MeetingSettings meeting={meeting} />
      {m.pendingCount > 0 && (
        <p className="no-print" role="status" style={{ color: 'var(--amber)', fontWeight: 600 }}>
          ยังมี {m.pendingCount} รายที่ไม่ได้บันทึกมติ ร่างนี้ยังไม่นับรายเหล่านั้น
        </p>
      )}
      <article className="doc">
        <h2>{m.header[0]}</h2>
        <p className="center" style={{ fontWeight: 600 }}>{m.header[1]}</p>
        <p className="center">{m.header[2]}</p>
        <hr />
        <p style={{ fontWeight: 600 }}>ระเบียบวาระที่ {meeting.agendaNo} {m.heading}</p>
        <p className="r" style={{ margin: 0, fontSize: 14 }}>หน่วย : บาท</p>
        <table>
          <thead>
            <tr><th style={{ width: 56 }}>ลำดับ</th><th>ชื่อโครงการ</th><th>ประเภท</th><th>วงเงินค้ำประกัน<br />(ล่าสุด)</th><th>ขออนุมัติจ่าย<br />ค่าประกันชดเชย</th><th>หมายเหตุ</th></tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td className="c">{c.seq}</td><td>{c.borrower}</td><td>{`${c.guaranteeType} ${c.bankCode}`.trim()}</td>
                <td className="r nums">{money(c.limitAmount)}</td><td className="r nums">{money(c.amount)}</td><td>{c.note || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td /><td colSpan={3}>รวม {cases.length} ราย</td><td className="r nums">{money(total(cases))}</td><td /></tr></tfoot>
        </table>
        <p className="resolution">{m.resolution}</p>
        {m.others.length > 0 && (
          <section>
            <p style={{ fontWeight: 600 }}>รายที่ไม่ได้รับอนุมัติในที่ประชุมครั้งนี้</p>
            <ul>
              {m.others.map((o) => <li key={o.seq}>ลำดับที่ {o.seq} {o.borrower} — {o.label}{o.note ? ` (${o.note})` : ''}</li>)}
            </ul>
          </section>
        )}
        <p className="no-print" style={{ color: 'var(--muted)', fontSize: 14 }}>
          ร่างนี้สร้างจากมติรายตัวที่บันทึกไว้ ตรวจแก้ถ้อยคำก่อนนำไปใช้เป็นรายงานการประชุมจริง
        </p>
      </article>
    </main>
  );
}
