import Link from 'next/link';
import { listMeetings } from '@/lib/queries';
import { money } from '@/lib/report';
import ImportPanel from '@/components/ImportPanel';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const meetings = await listMeetings();
  return (
    <main className="wrap">
      <h1 className="page">รอบประชุมเสนอจ่ายค่าประกันชดเชย</h1>
      <p className="sub">แต่ละรอบมาจากคอลัมน์ Appointment ในชีต</p>

      {meetings.length === 0 ? (
        <div className="card" style={{ marginBottom: 20 }}>ยังไม่มีรอบประชุม นำเข้าชีตด้านล่างเพื่อเริ่มต้น</div>
      ) : (
        <div className="meeting-grid" style={{ marginBottom: 20 }}>
          {meetings.map((m) => (
            <article key={m.id} className="card meeting-card">
              <h2><Link href={`/meetings/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{m.label}</Link></h2>
              <div className="nums"><span className="big">{m.total}</span> ราย &nbsp; <span className="big">{money(m.amount)}</span> บาท</div>
              <div className="chips">
                <span className="pill approved">อนุมัติ {m.approved}</span>
                <span className="pill pending">รอพิจารณา {m.pending}</span>
                {m.deferred > 0 && <span className="pill deferred">เลื่อน {m.deferred}</span>}
                {m.rejected > 0 && <span className="pill rejected">ไม่อนุมัติ {m.rejected}</span>}
                {m.issues > 0 && <span className="pill issue">มีประเด็น {m.issues}</span>}
              </div>
              {m.missingFromSheet > 0 && <p className="sub" style={{ margin: '0 0 8px' }}>มี {m.missingFromSheet} รายหายจากชีตล่าสุด (ซ่อนอยู่)</p>}
              <div className="toolbar" style={{ marginBottom: 0 }}>
                <Link className="btn small" href={`/meetings/${m.id}`}>ภาพรวม</Link>
                <Link className="btn small orange" href={`/meetings/${m.id}/present`}>🎬 นำเสนอ</Link>
                <Link className="btn small ghost" href={`/meetings/${m.id}/report`}>รายงานเสนอ</Link>
                <Link className="btn small ghost" href={`/meetings/${m.id}/minutes`}>ร่างรายงานประชุม</Link>
              </div>
            </article>
          ))}
        </div>
      )}
      <ImportPanel />
    </main>
  );
}
