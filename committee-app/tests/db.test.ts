process.env.PGLITE_DIR = 'memory';
delete process.env.DATABASE_URL;

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/lib/csv';
import { parseSheet } from '../src/lib/sheet';
import { importCases, listMeetings, listCases, updateCase, setDecisions, updateMeeting, getMeeting } from '../src/lib/queries';
import { csvOf, ROWS } from './fixture';

const load = (rows = ROWS) => parseSheet(parseCsv(csvOf(rows)));

test('import creates one meeting per round with ordered sequence numbers', async () => {
  const { cases, skippedBlank } = load();
  const summary = await importCases(cases, skippedBlank);
  assert.deepEqual(summary.meetings.map((m) => [m.label, m.total, m.added, m.updated]), [['ครั้งที่ 11/2569', 3, 3, 0], ['ครั้งที่ 12/2569', 3, 3, 0]]);

  const meetings = await listMeetings();
  assert.equal(meetings.length, 2);
  const r12 = meetings.find((m) => m.label === 'ครั้งที่ 12/2569')!;
  assert.equal(r12.total, 3);
  assert.equal(r12.amount, 7300000 + 2190692.27 + 1000000);
  assert.equal(r12.issues, 1);
  assert.equal(r12.pending, 3);

  const list = await listCases(r12.id);
  assert.deepEqual(list.map((c) => c.seq), [1, 2, 3]);
  assert.equal(list[0].borrower, 'นายตัวอย่าง สี่');
  assert.equal(list[0].amount, 7300000);
  assert.equal(list[0].decision, 'pending');
  assert.equal(list[0].issue.includes('\n'), true);
  assert.equal(list[0].note, '');
});

test('re-import updates sheet fields but keeps decisions and edited notes', async () => {
  const meetings = await listMeetings();
  const r11 = meetings.find((m) => m.label === 'ครั้งที่ 11/2569')!;
  const [first, second] = await listCases(r11.id);

  await updateCase(first.id, { decision: 'approved', decisionNote: 'ok' });
  await updateCase(first.id, { note: 'หมายเหตุที่แก้ในระบบ' });
  await updateCase(second.id, { note: 'แก้เอง' });
  await updateCase(second.id, { note: null }); // กลับไปใช้ค่าจากชีต

  const changed = ROWS.map((r, i) => (i === 0 ? { ...r, amount: '2,900,000.00', note: 'ชีตแก้ใหม่' } : r));
  const summary = await importCases(load(changed).cases);
  assert.deepEqual(summary.meetings.map((m) => [m.label, m.added, m.updated]), [['ครั้งที่ 11/2569', 0, 3], ['ครั้งที่ 12/2569', 0, 3]]);

  const after = await listCases(r11.id);
  assert.equal(after[0].amount, 2900000, 'ข้อมูลจากชีตถูกอัปเดต');
  assert.equal(after[0].decision, 'approved', 'มติยังอยู่');
  assert.equal(after[0].decisionNote, 'ok');
  assert.equal(after[0].note, 'หมายเหตุที่แก้ในระบบ', 'หมายเหตุที่แก้ในระบบไม่ถูกทับ');
  assert.equal(after[1].noteEdited, false);
});

test('rows that disappear from the sheet are hidden, and come back when re-added', async () => {
  const r11 = (await listMeetings()).find((m) => m.label === 'ครั้งที่ 11/2569')!;
  const summary = await importCases(load(ROWS.filter((_, i) => i !== 1)).cases);
  assert.equal(summary.meetings.find((m) => m.label === 'ครั้งที่ 11/2569')!.missingFromSheet, 1);
  assert.equal((await listCases(r11.id)).length, 2);
  const m = (await listMeetings()).find((x) => x.id === r11.id)!;
  assert.equal(m.total, 2);
  assert.equal(m.missingFromSheet, 1);

  await importCases(load().cases);
  assert.equal((await listCases(r11.id)).length, 3);
});

test('bulk decisions only touch the given meeting', async () => {
  const meetings = await listMeetings();
  const r11 = meetings.find((m) => m.label === 'ครั้งที่ 11/2569')!;
  const r12 = meetings.find((m) => m.label === 'ครั้งที่ 12/2569')!;
  const c11 = await listCases(r11.id);
  const c12 = await listCases(r12.id);

  const touched = await setDecisions(r12.id, [c12[0].id, c12[1].id, c11[2].id], 'approved');
  assert.equal(touched, 2, 'id ของรอบอื่นถูกเมิน');
  assert.equal((await listCases(r11.id))[2].decision, 'pending');
  assert.equal(await setDecisions(r12.id, [], 'approved'), 0);

  await setDecisions(r12.id, [c12[1].id], 'pending');
  const after = await listCases(r12.id);
  assert.deepEqual(after.map((c) => c.decision), ['approved', 'pending', 'pending']);
});

test('updateMeeting stores date, prefix and agenda number', async () => {
  const r12 = (await listMeetings()).find((m) => m.label === 'ครั้งที่ 12/2569')!;
  const m = await updateMeeting(r12.id, { heldOn: '2026-09-25', resolutionPrefix: '18/2569', agendaNo: 3 });
  assert.equal(m!.heldOn, '2026-09-25');
  assert.equal((await getMeeting(r12.id))!.resolutionPrefix, '18/2569');
  assert.equal((await updateMeeting(r12.id, { heldOn: '' }))!.heldOn, null);
  assert.equal(await getMeeting(999999), null);
});

test('values with quotes and SQL metacharacters are stored verbatim', async () => {
  const evil = { ...ROWS[0], lc: "X'; DROP TABLE cases;--", borrower: "Robert'); DROP TABLE meetings;--", round: 'ครั้งที่ 99/2569' };
  await importCases(load([evil]).cases);
  const m = (await listMeetings()).find((x) => x.label === 'ครั้งที่ 99/2569')!;
  const [c] = await listCases(m.id);
  assert.equal(c.borrower, "Robert'); DROP TABLE meetings;--");
  assert.ok((await listMeetings()).length >= 3);
});
