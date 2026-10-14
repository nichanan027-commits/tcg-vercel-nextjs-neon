// ชีตสมมติ รูปแบบเดียวกับไฟล์จริง (หัวคอลัมน์ขึ้นบรรทัดใหม่, เซลล์ที่มีคอมมา/เครื่องหมายคำพูด/ขึ้นบรรทัดใหม่)
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

export const HEADERS = [
  'Bank', 'ธนาคาร', 'ประเภทการค้ำประกัน', 'รับคำขอใบลำดับที่', 'ลำดับที่', 'โครงการ', 'เลขที่ L/C', 'วงเงินค้ำประกัน',
  'สัดส่วน', 'ฉบับที่', 'วันที่ผิดสัญญาและ/หรือวันที่ธนาคาร / ยื่นฟ้อง', 'เงื่อนไข', 'วันที่อนุมัติ', 'รอจ่าย', 'สถานะกิจการ',
  'สะสม', 'จำนวนที่จ่ายไป\n(คงเหลือ)', 'Max Claim', 'NPG', 'Appointment', 'สถานะการขออนุมัติ', 'เบอร์โทรศัพท์',
  'สถานะการติดต่อ', 'หมายเหตุ', 'ประเด็นพิจารณา', 'การปลดล็อกกฎหมาย', 'ลิงก์หลักฐาน',
];

interface Row {
  bank: string; bankName: string; type: string; borrower: string; lc: string; limit: string; ratio: string; pay: string;
  cond: string; amount: string; round: string; contact: string; note?: string; issue?: string; unlock?: string; link?: string;
}

export function csvOf(rows: Row[]): string {
  const lines = [HEADERS.map(q).join(',')];
  for (const r of rows) {
    const cells = new Array(HEADERS.length).fill('');
    cells[0] = r.bank; cells[1] = r.bankName; cells[2] = r.type; cells[5] = r.borrower; cells[6] = r.lc; cells[7] = r.limit;
    cells[8] = r.ratio; cells[9] = r.pay; cells[11] = r.cond; cells[13] = r.amount; cells[14] = 'ยังดำเนินกิจการ';
    cells[19] = r.round; cells[22] = r.contact; cells[23] = r.note ?? ''; cells[24] = r.issue ?? ''; cells[25] = r.unlock ?? '';
    cells[26] = r.link ?? '';
    lines.push(cells.map(q).join(','));
  }
  return lines.join('\r\n');
}

export const ROWS: Row[] = [
  { bank: 'KTB', bankName: 'ธนาคารกรุงไทย จำกัด (มหาชน)\nสำนักงานใหญ่', type: 'PGS ระยะที่ 9 SMEs ดีแน่นอน', borrower: 'บริษัท ตัวอย่าง หนึ่ง, จำกัด', lc: '64-000001', limit: '3,000,000.00', ratio: '100', pay: '1', cond: 'NOTICE', amount: '2,950,000.00', round: 'ครั้งที่ 11/2569', contact: 'ติดต่อได้และสนใจปรับปรุงโครงการ', note: 'เรียกเก็บค่าธรรมเนียม 59,000.00 บาท' },
  { bank: 'KTB', bankName: 'ธนาคารกรุงไทย จำกัด (มหาชน)', type: 'PGS ระยะที่ 6', borrower: 'นายตัวอย่าง สอง', lc: '64-000002', limit: '7,300,000.00', ratio: '0.8', pay: '2', cond: 'TDR / NOTICE', amount: '6,742,725.47', round: 'ครั้งที่ 11/2569', contact: 'ติดต่อไม่ได้ (ไม่รับสาย)' },
  { bank: 'KBANK', bankName: 'ธนาคารกสิกรไทย จำกัด (มหาชน)', type: 'PGS ระยะที่ 8', borrower: 'บริษัท "ตัวอย่าง" สาม จำกัด', lc: '63-000003', limit: '2,719,900.00', ratio: '100', pay: '1', cond: 'ฟ้อง', amount: '2,478,813.28', round: 'ครั้งที่ 11/2569', contact: 'ติดต่อไม่ได้ (ไม่มีสัญญาณ)' },
  { bank: 'SCB', bankName: 'ธนาคารไทยพาณิชย์ จำกัด (มหาชน)', type: 'PGS ระยะที่ 9', borrower: 'นายตัวอย่าง สี่', lc: '64-000004', limit: '7,300,000.00', ratio: '100', pay: '1', cond: 'NOTICE', amount: '7,300,000.00', round: 'ครั้งที่ 12/ 2569', contact: 'ติดต่อไม่ได้ (ไม่รับสาย)', issue: '3.สัญญาปรับปรุงโครงสร้างหนี้\nระบุข้อมูลไม่ครบ', unlock: 'ผลการตรวจสอบ:\n1.ธนาคารนำส่งหนังสือแล้ว', link: 'https://drive.google.com/file/d/ABC123/view?usp=sharing' },
  { bank: 'SCB', bankName: 'ธนาคารไทยพาณิชย์ จำกัด (มหาชน)', type: 'PGS ระยะที่ 9', borrower: 'นายตัวอย่าง ห้า', lc: '64-000005', limit: '2,200,000', ratio: '100', pay: '1', cond: 'NOTICE', amount: '2,190,692.27', round: 'ครั้งที่ 12/ 2569', contact: 'ติดต่อได้แต่ไม่สนใจปรับปรุง', link: 'javascript:alert(1)' },
  { bank: 'SCB', bankName: 'ธนาคารไทยพาณิชย์ จำกัด (มหาชน)', type: 'PGS ระยะที่ 9', borrower: 'นายตัวอย่าง หก', lc: '64-000006', limit: '2,000,000', ratio: '70', pay: '1', cond: 'NOTICE', amount: '1,000,000.00', round: 'ครั้งที่ 12/ 2569', contact: 'ติดต่อได้และสนใจปรับปรุงโครงการ' },
];
