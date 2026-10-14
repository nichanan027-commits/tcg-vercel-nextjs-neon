import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/lib/csv';
import { parseSheet, caseFlag, contactKind, safeUrl, embedUrl, normalizeRound, locateColumns } from '../src/lib/sheet';
import { formatRanges, thaiDate, money, buildMinutes, groupByBank, proposalHeading } from '../src/lib/report';
import { csvOf, ROWS, HEADERS } from './fixture';
import type { CaseRow, Meeting } from '../src/lib/types';

test('parseCsv: quotes, commas, newlines in cells, CRLF, BOM', () => {
  const rows = parseCsv('﻿a,"b,1","c ""q""\nline2"\r\nd,e,f\r\n');
  assert.deepEqual(rows, [['a', 'b,1', 'c "q"\nline2'], ['d', 'e', 'f']]);
});

test('parseCsv: ignores fully blank rows and handles no trailing newline', () => {
  assert.deepEqual(parseCsv('a,b\n\n,\nc,d'), [['a', 'b'], ['c', 'd']]);
});

test('locateColumns: finds every column in the real header layout', () => {
  const col = locateColumns(HEADERS);
  for (const [field, idx] of Object.entries(col)) assert.ok(idx >= 0, `missing ${field}`);
  assert.equal(col.remaining, 16);
  assert.equal(col.borrower, 5);
  assert.equal(col.bankCode, 0);
  assert.equal(col.bankName, 1);
});

test('parseSheet: maps rows, numbers, rounds, flags', () => {
  const { cases } = parseSheet(parseCsv(csvOf(ROWS)));
  assert.equal(cases.length, 6);
  const [a, b, c, d, e] = cases;
  assert.equal(a.borrower, 'บริษัท ตัวอย่าง หนึ่ง, จำกัด');
  assert.equal(a.bankCode, 'KTB');
  assert.equal(a.bankName, 'ธนาคารกรุงไทย จำกัด (มหาชน)', 'ชื่อธนาคารเอาบรรทัดแรก');
  assert.equal(a.amount, 2950000);
  assert.equal(a.limitAmount, 3000000);
  assert.equal(a.sheetNote, 'เรียกเก็บค่าธรรมเนียม 59,000.00 บาท');
  assert.equal(b.ratio, 80, 'สัดส่วนที่เก็บเป็น 0.8');
  assert.equal(c.borrower, 'บริษัท "ตัวอย่าง" สาม จำกัด');
  assert.equal(d.round, 'ครั้งที่ 12/2569');
  assert.equal(caseFlag(c), 'litigation');
  assert.equal(caseFlag(d), 'issue');
  assert.equal(caseFlag(a), 'normal');
  assert.equal(e.amount, 2190692.27);
  assert.equal(a.key, '64-000001|1');
});

test('parseSheet: duplicate L/C + ฉบับที่ in a round get distinct keys; rows without L/C use the row number', () => {
  const dup = { ...ROWS[0] };
  const noLc = { ...ROWS[1], lc: '' };
  const { cases } = parseSheet(parseCsv(csvOf([ROWS[0], dup, noLc])));
  assert.equal(new Set(cases.map((c) => c.key)).size, 3);
  assert.match(cases[2].key, /^row\|/);
});

test('parseSheet: reports missing required columns and skips blank rows', () => {
  assert.throws(() => parseSheet([['ก', 'ข'], ['1', '2']]), /ไม่พบคอลัมน์ที่จำเป็น/);
  assert.throws(() => parseSheet([['Bank']]), /ไม่พบข้อมูล/);
  const csv = csvOf(ROWS) + '\r\n' + new Array(HEADERS.length).fill('').join(',');
  const parsed = parseSheet(parseCsv(csv));
  assert.equal(parsed.cases.length, 6);
});

test('helpers: contactKind, safeUrl, embedUrl, normalizeRound', () => {
  assert.equal(contactKind('ติดต่อได้และสนใจปรับปรุงโครงการ'), 'yes');
  assert.equal(contactKind('ติดต่อไม่ได้ (ไม่รับสาย)'), 'no');
  assert.equal(contactKind('ไม่มีสัญญาณ'), 'no');
  assert.equal(contactKind(''), 'unknown');
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl(' https://x.test/a '), 'https://x.test/a');
  assert.equal(embedUrl('https://drive.google.com/file/d/A/view?usp=sharing'), 'https://drive.google.com/file/d/A/preview');
  assert.equal(normalizeRound('ครั้งที่ 12/ 2569'), 'ครั้งที่ 12/2569');
});

test('report helpers', () => {
  assert.equal(formatRanges([1, 2, 3, 5, 6, 9]), '1 ถึง 3, 5 ถึง 6, 9');
  assert.equal(formatRanges([4]), '4');
  assert.equal(formatRanges([]), '');
  assert.equal(thaiDate('2026-09-25'), 'วันศุกร์ที่ 25 กันยายน 2569');
  assert.equal(thaiDate(null), '');
  assert.equal(money(1234567.5), '1,234,567.50');
});

function mk(over: Partial<CaseRow> & { seq: number }): CaseRow {
  return {
    id: over.seq, meetingId: 1, bankCode: 'KTB', bankName: 'ธนาคารกรุงไทย', guaranteeType: 'PGS', borrower: 'x', lcNo: '',
    limitAmount: 0, ratio: 100, payRound: '1', condition: 'NOTICE', amount: 1000, remaining: 0, businessStatus: '',
    contactStatus: '', note: '', noteEdited: false, issue: '', unlock: '', evidenceUrl: '', decision: 'pending', decisionNote: '', ...over,
  };
}

test('buildMinutes: approved ranges, totals, deferred/rejected list, issue sentence', () => {
  const meeting: Meeting = { id: 1, label: 'ครั้งที่ 12/2569', heldOn: '2026-09-25', agendaNo: 3, resolutionPrefix: '18/2569' };
  const cases = [
    mk({ seq: 1, decision: 'approved', amount: 1000.5 }),
    mk({ seq: 2, decision: 'approved', amount: 2000, issue: 'ประเด็น' }),
    mk({ seq: 3, decision: 'deferred', decisionNote: 'รอเอกสาร' }),
    mk({ seq: 4, decision: 'approved', amount: 500 }),
    mk({ seq: 5, decision: 'rejected' }),
    mk({ seq: 6 }),
  ];
  const m = buildMinutes(meeting, cases);
  assert.equal(m.approved.length, 3);
  assert.match(m.resolution, /^มติที่ 18\/2569\/3 /);
  assert.match(m.resolution, /ลำดับที่ 1 ถึง 2, 4 /);
  assert.match(m.resolution, /จำนวน 3 ราย จำนวนค่าประกันชดเชยรวม 3,500.50 บาท/);
  assert.match(m.resolution, /แนววิธีปฏิบัติ/);
  assert.deepEqual(m.others.map((o) => [o.seq, o.label, o.note]), [[3, 'เลื่อนพิจารณา', 'รอเอกสาร'], [5, 'ไม่อนุมัติ', '']]);
  assert.equal(m.pendingCount, 1);
  assert.equal(m.header[1], 'ครั้งที่ 18/2569');
  assert.equal(m.header[2], 'วันศุกร์ที่ 25 กันยายน 2569');
  assert.equal(proposalHeading(cases), 'พิจารณาจ่ายค่าประกันชดเชยโครงการ PGS จำนวน 6 ราย จำนวน 6,500.50 บาท มีรายละเอียด ดังนี้');
});

test('buildMinutes: no approvals, no issue sentence', () => {
  const meeting: Meeting = { id: 1, label: 'L', heldOn: null, agendaNo: 3, resolutionPrefix: '' };
  const m = buildMinutes(meeting, [mk({ seq: 1 })]);
  assert.match(m.resolution, /ยังไม่มีมติอนุมัติรายใด/);
  assert.equal(m.header[1], 'รอบเสนอ L');
  const m2 = buildMinutes(meeting, [mk({ seq: 1, decision: 'approved' })]);
  assert.doesNotMatch(m2.resolution, /แนววิธีปฏิบัติ/);
  assert.match(m2.resolution, /^มติที่ ....../);
});

test('groupByBank keeps first-appearance order and sums amounts', () => {
  const g = groupByBank([mk({ seq: 1, bankCode: 'B', amount: 1 }), mk({ seq: 2, bankCode: 'A', amount: 2 }), mk({ seq: 3, bankCode: 'B', amount: 3 })]);
  assert.deepEqual(g.map((x) => [x.code, x.amount, x.cases.length]), [['B', 4, 2], ['A', 2, 1]]);
});

import { sheetExportUrl } from '../src/lib/sheetUrl';

test('sheetExportUrl: only Google Sheets links, builds the export URL itself', () => {
  assert.equal(
    sheetExportUrl('https://docs.google.com/spreadsheets/d/1FbL-Id_x/edit?usp=sharing'),
    'https://docs.google.com/spreadsheets/d/1FbL-Id_x/export?format=csv',
  );
  assert.equal(
    sheetExportUrl('https://docs.google.com/spreadsheets/d/ABC/edit?gid=123#gid=123'),
    'https://docs.google.com/spreadsheets/d/ABC/export?format=csv&gid=123',
  );
  for (const bad of ['http://docs.google.com/spreadsheets/d/ABC', 'https://evil.test/https://docs.google.com/spreadsheets/d/ABC',
    'https://docs.google.com.evil.test/spreadsheets/d/ABC', 'https://169.254.169.254/latest/meta-data', 'file:///etc/passwd', '']) {
    assert.equal(sheetExportUrl(bad), null, bad);
  }
});
