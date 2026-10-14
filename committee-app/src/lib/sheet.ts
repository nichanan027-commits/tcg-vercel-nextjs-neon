/**
 * แปลงแถวจากชีต "Bank Approved" เป็นรายการเสนอ
 * หัวคอลัมน์เทียบด้วย "ขึ้นต้นด้วย" โดยไม่สนช่องว่าง/ขึ้นบรรทัดใหม่/ตัวพิมพ์
 */
export type CaseFlag = 'normal' | 'litigation' | 'issue';

export interface SheetCase {
  key: string;
  round: string;
  rowIndex: number;
  bankCode: string;
  bankName: string;
  guaranteeType: string;
  borrower: string;
  lcNo: string;
  limitAmount: number;
  ratio: number;
  payRound: string;
  condition: string;
  amount: number;
  remaining: number;
  businessStatus: string;
  contactStatus: string;
  sheetNote: string;
  issue: string;
  unlock: string;
  evidenceUrl: string;
}

type Field =
  | 'bankCode' | 'bankName' | 'guaranteeType' | 'borrower' | 'lcNo' | 'limit' | 'ratio' | 'payRound'
  | 'condition' | 'amount' | 'remaining' | 'businessStatus' | 'contactStatus' | 'round' | 'note'
  | 'issue' | 'unlock' | 'evidence';

const PREFIXES: Record<Field, string[]> = {
  bankCode: ['bank'],
  bankName: ['ธนาคาร'],
  guaranteeType: ['ประเภทการค้ำประกัน'],
  borrower: ['โครงการ'],
  lcNo: ['เลขที่l/c'],
  limit: ['วงเงินค้ำประกัน'],
  ratio: ['สัดส่วน'],
  payRound: ['ฉบับที่'],
  condition: ['เงื่อนไข'],
  amount: ['รอจ่าย', 'จำนวนเงิน'],
  remaining: ['จำนวนที่จ่ายไป', 'คงเหลือจ่ายได้'],
  businessStatus: ['สถานะกิจการ'],
  contactStatus: ['สถานะการติดต่อ'],
  round: ['appointment'],
  note: ['หมายเหตุ'],
  issue: ['ประเด็นพิจารณา'],
  unlock: ['การปลดล็อกกฎหมาย'],
  evidence: ['ลิงก์หลักฐาน'],
};

const FIELD_LABEL: Partial<Record<Field, string>> = {
  borrower: 'โครงการ',
  amount: 'รอจ่าย',
  bankCode: 'Bank หรือ ธนาคาร',
};

export const NO_ROUND_LABEL = 'ไม่ระบุรอบ';

export function normalizeHeader(text: unknown): string {
  return String(text ?? '')
    .replace(/ํา/g, 'ำ') // นิคหิต+สระอา → สระอำ ("ดํา" กับ "ดำ")
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function normalizeRound(text: string): string {
  return oneLine(text).replace(/\s*\/\s*/g, '/');
}

export function oneLine(text: string): string {
  return String(text ?? '').replace(/\s*[\r\n]+\s*/g, ' ').trim();
}

export function toNumber(text: unknown): number {
  if (typeof text === 'number') return text;
  const n = parseFloat(String(text ?? '').replace(/[,%\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function locateColumns(headers: string[]): Record<Field, number> {
  const normalized = headers.map(normalizeHeader);
  const out = {} as Record<Field, number>;
  (Object.keys(PREFIXES) as Field[]).forEach((field) => {
    out[field] = -1;
    for (const prefix of PREFIXES[field]) {
      const p = normalizeHeader(prefix);
      const idx = normalized.findIndex((h) => h.startsWith(p));
      if (idx >= 0) { out[field] = idx; break; }
    }
  });
  return out;
}

export interface ParsedSheet {
  cases: SheetCase[];
  skippedBlank: number;
}

export function parseSheet(rows: string[][]): ParsedSheet {
  if (rows.length < 2) throw new Error('ไม่พบข้อมูล: ไฟล์ต้องมีแถวหัวคอลัมน์และอย่างน้อย 1 แถวข้อมูล');
  const col = locateColumns(rows[0]);

  const missing: string[] = [];
  if (col.bankCode < 0 && col.bankName < 0) missing.push(FIELD_LABEL.bankCode!);
  if (col.borrower < 0) missing.push(FIELD_LABEL.borrower!);
  if (col.amount < 0) missing.push(FIELD_LABEL.amount!);
  if (missing.length) throw new Error('ไม่พบคอลัมน์ที่จำเป็น: ' + missing.join(', ') + ' (ตรวจชื่อหัวคอลัมน์ในแถวแรกของชีต)');

  const cell = (row: string[], field: Field) => (col[field] < 0 ? '' : String(row[col[field]] ?? '').trim());

  const seenKeys = new Map<string, number>();
  const seqPerRound = new Map<string, number>();
  const cases: SheetCase[] = [];
  let skippedBlank = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const bankName = cell(row, 'bankName').split(/\r?\n/)[0].trim();
    const bankCode = oneLine(cell(row, 'bankCode')) || bankName;
    const borrower = oneLine(cell(row, 'borrower'));
    if (!bankCode || !borrower) { skippedBlank++; continue; }

    const round = normalizeRound(cell(row, 'round')) || NO_ROUND_LABEL;
    const lcNo = oneLine(cell(row, 'lcNo'));
    const payRound = oneLine(cell(row, 'payRound'));
    let key = lcNo ? `${lcNo}|${payRound}` : `row|${r}`;
    const compound = `${round}\u0000${key}`;
    const dup = seenKeys.get(compound) ?? 0;
    seenKeys.set(compound, dup + 1);
    if (dup) key += `#${dup + 1}`;

    let ratio = toNumber(cell(row, 'ratio'));
    if (ratio > 0 && ratio <= 1) ratio *= 100; // เซลล์ฟอร์แมตเป็นเปอร์เซ็นต์ (0.8 → 80)

    seqPerRound.set(round, (seqPerRound.get(round) ?? 0) + 1);

    cases.push({
      key,
      round,
      rowIndex: r + 1,
      bankCode,
      bankName: bankName || bankCode,
      guaranteeType: oneLine(cell(row, 'guaranteeType')),
      borrower,
      lcNo,
      limitAmount: toNumber(cell(row, 'limit')),
      ratio,
      payRound,
      condition: oneLine(cell(row, 'condition')),
      amount: toNumber(cell(row, 'amount')),
      remaining: toNumber(cell(row, 'remaining')),
      businessStatus: oneLine(cell(row, 'businessStatus')),
      contactStatus: oneLine(cell(row, 'contactStatus')),
      sheetNote: oneLine(cell(row, 'note')),
      issue: cell(row, 'issue'),
      unlock: cell(row, 'unlock'),
      evidenceUrl: cell(row, 'evidence'),
    });
  }
  return { cases, skippedBlank };
}

export function caseFlag(c: { issue?: string | null; condition?: string | null }): CaseFlag {
  if ((c.issue ?? '').trim()) return 'issue';
  const cond = c.condition ?? '';
  if (cond.includes('ฟ้อง') || cond.includes('คดี')) return 'litigation';
  return 'normal';
}

export type ContactKind = 'yes' | 'no' | 'unknown';

export function contactKind(status: string | null | undefined): ContactKind {
  const s = status ?? '';
  if (s.includes('ติดต่อได้') && !s.includes('ติดต่อไม่ได้')) return 'yes';
  if (s.includes('ติดต่อไม่ได้') || s.includes('ไม่รับสาย') || s.includes('ไม่มีสัญญาณ')) return 'no';
  return 'unknown';
}

/** ลิงก์เอกสารต้องเป็น http(s) เท่านั้น (กัน javascript: ฯลฯ) */
export function safeUrl(url: string | null | undefined): string {
  const u = String(url ?? '').trim();
  return /^https?:\/\//i.test(u) ? u : '';
}

/** แปลงลิงก์ Drive แบบ /view เป็น /preview เพื่อฝังในกรอบ */
export function embedUrl(url: string): string {
  return url.includes('drive.google.com') && url.includes('/view') ? url.replace(/\/view.*$/, '/preview') : url;
}
