import type { CaseRow, Meeting } from './types';

export const money = (n: number) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/** 'YYYY-MM-DD' (ค.ศ.) → "วันศุกร์ที่ 25 กันยายน 2569" */
export function thaiDate(iso: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return `วัน${THAI_DAYS[dow]}ที่ ${d} ${THAI_MONTHS[mo - 1]} ${y + 543}`;
}

/** [1,2,3,5,6,9] → "1 ถึง 3, 5 ถึง 6, 9" */
export function formatRanges(numbers: number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j > i ? `${sorted[i]} ถึง ${sorted[j]}` : String(sorted[i]));
    i = j + 1;
  }
  return parts.join(', ');
}

export interface BankGroup {
  code: string;
  name: string;
  cases: CaseRow[];
  amount: number;
}

export function groupByBank(cases: CaseRow[]): BankGroup[] {
  const groups: BankGroup[] = [];
  const index = new Map<string, BankGroup>();
  for (const c of cases) {
    let g = index.get(c.bankCode);
    if (!g) {
      g = { code: c.bankCode, name: c.bankName || c.bankCode, cases: [], amount: 0 };
      index.set(c.bankCode, g);
      groups.push(g);
    }
    g.cases.push(c);
    g.amount += c.amount;
  }
  return groups;
}

export const total = (cases: CaseRow[]) => cases.reduce((s, c) => s + c.amount, 0);

export function proposalHeading(cases: CaseRow[]): string {
  return `พิจารณาจ่ายค่าประกันชดเชยโครงการ PGS จำนวน ${cases.length} ราย จำนวน ${money(total(cases))} บาท มีรายละเอียด ดังนี้`;
}

export const POLICY_REFERENCE = 'ครั้งที่ 19/2568 เมื่อวันที่ 15 ตุลาคม 2568';

export interface Minutes {
  header: string[];
  heading: string;
  approved: CaseRow[];
  resolution: string;
  others: { seq: number; borrower: string; label: string; note: string }[];
  pendingCount: number;
}

/** ร่างข้อความวาระพิจารณาจ่ายและมติ จากมติรายตัวที่บันทึกไว้ */
export function buildMinutes(meeting: Meeting, cases: CaseRow[]): Minutes {
  const approved = cases.filter((c) => c.decision === 'approved');
  const approvedTotal = total(approved);
  const issueApproved = approved.some((c) => c.issue.trim());
  const prefix = meeting.resolutionPrefix.trim();
  const resNo = prefix ? `มติที่ ${prefix}/${meeting.agendaNo}` : `มติที่ ....../${meeting.agendaNo}`;

  const header = [
    'รายงานการประชุมคณะกรรมการจ่ายค่าประกันชดเชย',
    meeting.resolutionPrefix ? `ครั้งที่ ${meeting.resolutionPrefix}` : `รอบเสนอ ${meeting.label}`,
    meeting.heldOn ? thaiDate(meeting.heldOn) : 'วันที่ประชุม ......',
  ];

  let resolution: string;
  if (!approved.length) {
    resolution = `${resNo} ที่ประชุมยังไม่มีมติอนุมัติรายใด`;
  } else {
    resolution =
      `${resNo}  ที่ประชุมพิจารณาแล้วมีมติอนุมัติให้จ่ายค่าประกันชดเชยโครงการ PGS ลำดับที่ ${formatRanges(approved.map((c) => c.seq))} ` +
      `จำนวน ${approved.length} ราย จำนวนค่าประกันชดเชยรวม ${money(approvedTotal)} บาท ให้แก่สถาบันการเงินดังกล่าวตามที่ฝ่ายค่าประกันชดเชยเสนอมา ` +
      `โดยฝ่ายค่าประกันชดเชยได้ตรวจสอบแล้วเป็นไปตามหลักเกณฑ์และวิธีปฏิบัติในการค้ำประกันสินเชื่อ` +
      (issueApproved
        ? ` สำหรับรายที่มีประเด็นพิจารณาเพิ่มเติมในการนำเสนอครั้งนี้ อยู่ในกรอบที่ฝ่ายค่าประกันชดเชยได้นำเสนอเป็นแนววิธีปฏิบัติในการพิจารณาจ่ายค่าประกันชดเชย ต่อคณะกรรมการจ่ายค่าประกันชดเชยในการประชุม${POLICY_REFERENCE}`
        : '');
  }

  const others = cases
    .filter((c) => c.decision === 'deferred' || c.decision === 'rejected')
    .map((c) => ({
      seq: c.seq,
      borrower: c.borrower,
      label: c.decision === 'deferred' ? 'เลื่อนพิจารณา' : 'ไม่อนุมัติ',
      note: c.decisionNote,
    }));

  return {
    header,
    heading: proposalHeading(cases),
    approved,
    resolution,
    others,
    pendingCount: cases.filter((c) => c.decision === 'pending').length,
  };
}
