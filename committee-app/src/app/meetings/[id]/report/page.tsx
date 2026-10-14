import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMeeting, listCases } from '@/lib/queries';
import { money, proposalHeading, total, POLICY_REFERENCE } from '@/lib/report';
import PrintButton from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const meeting = await getMeeting(id);
  if (!meeting) notFound();
  const cases = await listCases(id);
  const issues = cases.filter((c) => c.issue.trim());

  return (
    <main className="wrap">
      <div className="toolbar no-print">
        <Link className="btn ghost" href={`/meetings/${id}`}>← ภาพรวม</Link>
        <PrintButton />
      </div>
      <article className="doc">
        <h2>รายงานเสนอจ่ายค่าประกันชดเชย {meeting.label}</h2>
        <p style={{ fontWeight: 600 }}>ระเบียบวาระที่ {meeting.agendaNo} {proposalHeading(cases)}</p>
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
        {issues.length > 0 && (
          <section>
            <h3>รายที่มีประเด็นพิจารณาเพิ่มเติม</h3>
            {issues.map((c) => (
              <div key={c.id} style={{ marginBottom: 12, breakInside: 'avoid' }}>
                <b>ลำดับที่ {c.seq} {c.borrower}</b>
                <div style={{ whiteSpace: 'pre-wrap' }}><b>ประเด็น:</b> {c.issue}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}><b>การปลดล็อก:</b> {c.unlock || '-'}</div>
              </div>
            ))}
            <p style={{ fontSize: 14 }}>ทั้งนี้ รายที่มีประเด็นพิจารณาเพิ่มเติมอยู่ในกรอบแนววิธีปฏิบัติที่นำเสนอต่อคณะกรรมการจ่ายค่าประกันชดเชยในการประชุม{POLICY_REFERENCE}</p>
          </section>
        )}
      </article>
    </main>
  );
}
