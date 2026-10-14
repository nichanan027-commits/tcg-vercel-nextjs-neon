import { parseCsv } from '@/lib/csv';
import { parseSheet } from '@/lib/sheet';
import { importCases } from '@/lib/queries';
import { fail, json, readJson } from '@/lib/http';
import { sheetExportUrl } from '@/lib/sheetUrl';

const MAX_CSV = 5_000_000;

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail('ต้องส่งข้อมูลเป็น JSON');

  let csv = typeof body.csv === 'string' ? body.csv : '';
  const sheetUrl = typeof body.sheetUrl === 'string' ? body.sheetUrl : '';

  if (!csv && sheetUrl) {
    const url = sheetExportUrl(sheetUrl);
    if (!url) return fail('ลิงก์ต้องเป็นลิงก์ Google Sheets (https://docs.google.com/spreadsheets/d/...)');
    let res: Response;
    try {
      res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    } catch {
      return fail('เชื่อมต่อ Google Sheets ไม่สำเร็จ ลองใหม่หรือวางข้อมูล CSV แทน', 502);
    }
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('csv')) {
      return fail('อ่านชีตไม่ได้ ต้องแชร์ชีตเป็น "ทุกคนที่มีลิงก์ (ผู้ดู)" หรือดาวน์โหลดเป็น CSV แล้ววางแทน', 422);
    }
    csv = await res.text();
  }

  if (!csv.trim()) return fail('ไม่พบข้อมูล: ส่ง csv หรือ sheetUrl');
  if (csv.length > MAX_CSV) return fail('ไฟล์ใหญ่เกินไป', 413);

  try {
    const parsed = parseSheet(parseCsv(csv));
    if (!parsed.cases.length) return fail('ไม่พบแถวข้อมูลที่ใช้ได้ (ต้องมีธนาคารและชื่อโครงการ)');
    return json(await importCases(parsed.cases, parsed.skippedBlank));
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'นำเข้าไม่สำเร็จ');
  }
}
