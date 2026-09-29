// Run: node --test pgs10/
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');
const S = require('./samples.js');

const sample = (id) => JSON.parse(JSON.stringify(S.list.find((s) => s.id === id).data));
const run = (data) => E.runAudit(data);
const ctl = (res, no) => res.results.find((r) => r.control_no === no);
const withChanges = (id, changes) => Object.assign(sample(id), changes);

test('sample cases give the expected case status', () => {
  const expect = { clean: 'PASS', cropped: 'HOLD', supported: 'PASS', historical: 'HOLD', observation: 'PASS_WITH_OBSERVATION', later: 'HOLD' };
  for (const [id, status] of Object.entries(expect)) assert.equal(run(sample(id)).case_status, status, id);
});

test('empty input is never approved', () => {
  const r = run({});
  assert.equal(r.case_status, 'HOLD');
  assert.equal(r.results.length, 22);
});

test('money helpers: exact satang, ROUND_HALF_UP', () => {
  const { parseMoney, mulRoundHalfUp, fmtMoney } = E.util;
  assert.equal(parseMoney('1,234.5').value, 123450);
  assert.equal(parseMoney('1.234').state, 'invalid');
  assert.equal(fmtMoney(mulRoundHalfUp(6647740, 7000)), '46,534.18'); // 66,477.40 × 70%
  assert.equal(fmtMoney(mulRoundHalfUp(4916400, 7000)), '34,414.80'); // 49,164.00 × 70%
  assert.equal(mulRoundHalfUp(1, 5000), 1); // 0.005 -> 0.01 (half up)
  assert.equal(mulRoundHalfUp(3, 5000), 2); // 0.015 -> 0.02
});

test('dates accept Buddhist Era and reject impossible days', () => {
  const { parseDate, fmtDate } = E.util;
  assert.equal(fmtDate(parseDate('15/04/2568').value), '15/04/2568');
  assert.equal(parseDate('15/04/2025').value, parseDate('15/04/2568').value);
  assert.equal(parseDate('31/02/2568').state, 'invalid');
});

test('Control 1: unknown product holds, hire-purchase fails', () => {
  assert.equal(ctl(run(withChanges('clean', { product: '' })), 1).status, 'HOLD_NEED_CLARIFICATION');
  assert.equal(ctl(run(withChanges('clean', { loan_hp_leasing: 'Y' })), 1).status, 'FAIL_ELIGIBILITY');
  assert.equal(ctl(run(withChanges('clean', { total_exposure_per_person: '200,000.01' })), 1).status, 'FAIL_ELIGIBILITY');
  assert.equal(ctl(run(withChanges('clean', { total_exposure_per_person: '200,000.00' })), 1).status, 'PASS');
  assert.equal(run(withChanges('clean', { loan_hp_leasing: 'Y' })).case_status, 'FAIL');
});

test('Control 2: LG formatting, leading zero, internal account difference', () => {
  assert.equal(ctl(run(sample('clean')), 2).status, 'PASS'); // 99-000001 = 99000001
  assert.equal(ctl(run(withChanges('clean', { id_acct_statement: '0123456789012' })), 2).status, 'OBSERVATION');
  const r = ctl(run(withChanges('clean', { id_acct_statement: '123456789035' })), 2);
  assert.equal(r.status, 'HOLD_NEED_CLARIFICATION');
  assert.equal(r.reason_code, 'VERIFY_REFERENCE_MAPPING');
  assert.equal(ctl(run(withChanges('clean', { id_name_demand: 'คนอื่น' })), 2).status, 'HOLD_DATA_MISMATCH');
});

test('Control 3: approval date must equal demand-letter contract date', () => {
  assert.equal(ctl(run(withChanges('clean', { demand_contract_date: '07/03/2567' })), 3).status, 'HOLD_DATA_MISMATCH');
});

test('Control 4: document page sequence uses document pages, not PDF pages', () => {
  assert.equal(ctl(run(withChanges('clean', { approval_pages_found: '1-9' })), 4).status, 'PASS');
  const gap = ctl(run(withChanges('clean', { approval_pages_found: '1,3-9' })), 4);
  assert.equal(gap.status, 'HOLD_INCOMPLETE_DOCUMENT');
  assert.match(gap.message, /2 of 9/);
  assert.equal(ctl(run(withChanges('clean', { approval_pages_found: '1-9', approval_pages_unreadable: 'Y' })), 4).status, 'HOLD_INCOMPLETE_DOCUMENT');
});

test('Control 5: any missing element of the confirmation letter is visually incomplete', () => {
  const r = ctl(run(sample('cropped')), 5);
  assert.equal(r.status, 'HOLD_INCOMPLETE_DOCUMENT');
  assert.equal(r.reason_code, 'CONFIRMATION_LETTER_VISUALLY_INCOMPLETE');
  assert.equal(ctl(run(withChanges('clean', { vis_demand: 'N' })), 5).status, 'HOLD_INCOMPLETE_DOCUMENT');
  assert.equal(ctl(run(withChanges('clean', { vis_demand: '' })), 5).status, 'NOT_TESTABLE');
});

test('Control 6: only PAYMENT counts; UNKNOWN after last payment is not guessed', () => {
  const d = sample('clean');
  d.transactions.push({ date: '01/02/2568', type: 'ADJUSTMENT', amount: '100.00' }, { date: '02/02/2568', type: 'REVERSAL', amount: '50.00' });
  const r6 = ctl(run(d), 6);
  assert.equal(r6.status, 'PASS');
  assert.equal(E.util.fmtDate(r6.derived.last_actual_payment_date), '20/01/2568');
  d.transactions.push({ date: '08/02/2568', type: 'UNKNOWN', amount: '100.00' });
  assert.equal(ctl(run(d), 6).status, 'HOLD_NEED_CLARIFICATION');
});

test('Control 7: default >= last payment (equal passes); earlier needs the exception', () => {
  assert.equal(ctl(run(withChanges('clean', { default_date_screen: '20/01/2568' })), 7).status, 'PASS');
  assert.equal(ctl(run(withChanges('clean', { default_date_screen: '19/01/2568' })), 7).status, 'HOLD_MISSING_DOCUMENT');
});

test('Control 8: exception letter paths', () => {
  const ok = run(sample('supported'));
  assert.equal(ctl(ok, 8).status, 'PASS_WITH_DOCUMENTARY_SUPPORT');
  assert.equal(ok.case_status, 'PASS');
  assert.equal(ctl(run(withChanges('supported', { exc_letter_present: 'N' })), 8).status, 'HOLD_MISSING_DOCUMENT');
  assert.equal(ctl(run(withChanges('supported', { vis_conf_header: '' })), 8).status, 'HOLD_INCOMPLETE_DOCUMENT');
  assert.equal(ctl(run(withChanges('supported', { exc_confirmed_default_date: '11/02/2568' })), 8).status, 'HOLD_DATA_MISMATCH');
  assert.equal(ctl(run(withChanges('supported', { exc_states_no_change: '' })), 8).status, 'HOLD_NEED_CLARIFICATION');
});

test('Control 9: tracking date must match the report', () => {
  assert.equal(ctl(run(withChanges('clean', { fup_report_date: '16/02/2568' })), 9).status, 'HOLD_DATA_MISMATCH');
  assert.equal(ctl(run(withChanges('clean', { fup_report_date: '' })), 9).status, 'HOLD_MISSING_DOCUMENT');
});

test('Control 10: restructure date source hierarchy', () => {
  const base = { rst_has: 'Y', rst_screen_date: '01/05/2568' };
  assert.equal(ctl(run(withChanges('clean', { ...base, rst_doc_signing: '01/05/2568' })), 10).status, 'PASS');
  assert.equal(ctl(run(withChanges('clean', { ...base, rst_doc_signing: '25/04/2568', rst_stmt_header_date: '01/05/2568' })), 10).status, 'PASS_WITH_DOCUMENTARY_SUPPORT');
  assert.equal(ctl(run(withChanges('clean', { ...base, rst_doc_signing: '25/04/2568' })), 10).status, 'HOLD_NEED_CLARIFICATION');
  assert.equal(ctl(run(withChanges('clean', { ...base, rst_doc_signing: '25/04/2568', rst_stmt_header_date: '26/04/2568' })), 10).status, 'HOLD_DATA_MISMATCH');
  assert.equal(ctl(run(withChanges('clean', base)), 10).status, 'HOLD_MISSING_DOCUMENT');
});

test('Controls 12 & 13: principal vs interest/total are separate controls', () => {
  const h = run(sample('historical'));
  assert.equal(ctl(h, 12).status, 'PASS'); // principal matches
  const c13 = ctl(h, 13);
  assert.equal(c13.status, 'HOLD_DATA_MISMATCH');
  assert.ok(c13.details.some((x) => /นำยอดปัจจุบันมาใส่ซ้ำ/.test(x)));
  assert.equal(ctl(run(withChanges('clean', { dmd_principal: '49,164.01', dmd_total: '54,164.01' })), 12).status, 'HOLD_DATA_MISMATCH');
  // payment after demand: as-of-demand principal is honoured when supplied
  const later = withChanges('clean', { cur_stmt_principal: '45,000.00', stmt_principal_at_demand: '49,164.00' });
  assert.equal(ctl(run(later), 12).status, 'PASS');
  assert.equal(ctl(run(withChanges('clean', { cur_stmt_principal: '45,000.00' })), 12).status, 'HOLD_DATA_MISMATCH');
});

test('Control 14/15: postal proof and address', () => {
  assert.equal(ctl(run(sample('clean')), 14).status, 'PASS');
  for (const sig of ['PRINTED_NAME_ONLY', 'POSTAL_OFFICER_ONLY', 'NONE'])
    assert.equal(ctl(run(withChanges('clean', { pst_signature: sig })), 14).status, 'HOLD_MISSING_DOCUMENT', sig);
  assert.equal(ctl(run(withChanges('clean', { pst_received_date: '' })), 14).status, 'HOLD_MISSING_DOCUMENT');
  const returned = withChanges('clean', { pst_outcome: 'RETURNED', pst_signature: '', pst_received_date: '', pst_returned_evidence: 'Y' });
  assert.equal(ctl(run(returned), 14).status, 'PASS');
  assert.equal(ctl(run({ ...returned, pst_returned_evidence: '' }), 14).status, 'HOLD_MISSING_DOCUMENT');
  assert.equal(ctl(run(withChanges('clean', { pst_outcome: 'NONE' })), 14).status, 'HOLD_MISSING_DOCUMENT');
});

test('Control 15: abbreviations normalise, house number never fuzzy, change-of-address wins', () => {
  assert.equal(ctl(run(sample('clean')), 15).status, 'PASS'); // ต./ตำบล, อ./อำเภอ, จ./จังหวัด, ม./หมู่
  assert.equal(ctl(run(withChanges('clean', { addr_postal_house: '12/4' })), 15).status, 'HOLD_DATA_MISMATCH');
  assert.equal(ctl(run(withChanges('clean', { addr_docs: [] })), 15).status, 'HOLD_MISSING_DOCUMENT');
  const moved = sample('clean');
  moved.addr_docs.push({ source: 'หนังสือแจ้งเปลี่ยนที่อยู่', house: '99', moo: '', tambon: 'ตำบลใหม่', amphoe: 'อำเภอใหม่', province: 'ปทุมธานี', zip: '12000', changed: true });
  const r = ctl(run(moved), 15);
  assert.equal(r.status, 'HOLD_DATA_MISMATCH'); // postal still used the old address
  assert.equal(r.reason_code, 'ADDRESS_DIFFERS_FROM_LATEST');
  assert.equal(ctl(run(moved), 14).status, 'HOLD_MISSING_DOCUMENT'); // Control 14 depends on 15
});

test('Control 16: exact principal, 0.01 interest variance is only an observation', () => {
  assert.equal(ctl(run(sample('observation')), 16).status, 'OBSERVATION');
  assert.equal(ctl(run(withChanges('clean', { cur_screen_principal: '49,164.01', cur_screen_total: '55,264.51' })), 16).status, 'HOLD_DATA_MISMATCH');
  assert.equal(ctl(run(withChanges('clean', { cur_screen_interest: '6,100.52', cur_screen_total: '55,264.52' })), 16).status, 'HOLD_DATA_MISMATCH');
  const cfg = { moneyToleranceSatang: 5 };
  assert.equal(ctl(E.runAudit(withChanges('clean', { cur_screen_interest: '6,100.52', cur_screen_total: '55,264.52' }), cfg), 16).status, 'OBSERVATION');
});

test('Control 17: payment after Statement cut-off holds until a newer Statement exists', () => {
  assert.equal(ctl(run(sample('later')), 17).status, 'HOLD_MISSING_DOCUMENT');
  assert.equal(ctl(run(withChanges('later', { later_stmt_covers: 'Y' })), 17).status, 'PASS');
});

test('Control 18: claim base = min(principal, guarantee) and mode', () => {
  const a = run(withChanges('clean', { cur_stmt_principal: '49,988.18', guarantee_exposure: '50,000.00', cb_screen_base: '49,988.18', cb_screen_mode: 'BY_PRINCIPAL' }));
  assert.equal(ctl(a, 18).status, 'PASS');
  const b = run(withChanges('clean', { cur_stmt_principal: '80,000.00', guarantee_exposure: '80,000.00', cb_screen_base: '80,000.00', cb_screen_mode: 'BY_GUARANTEE' }));
  assert.equal(ctl(b, 18).status, 'PASS');
  assert.equal(ctl(run(withChanges('clean', { cb_screen_mode: 'BY_GUARANTEE' })), 18).reason_code, 'CLAIM_BASE_MODE_MISMATCH');
  assert.equal(ctl(run(withChanges('clean', { cb_screen_base: '50,000.00' })), 18).status, 'HOLD_DATA_MISMATCH');
});

test('Control 19: Small Biz 70% up to 5 years, 100% after; other products need a rule', () => {
  const at = (claim) => ctl(run(withChanges('clean', { claim_app_date: claim, cr_screen_ratio: '70' })), 19);
  assert.equal(at('07/03/2572').status, 'PASS'); // exactly 5 years -> 70%
  const over = at('08/03/2572'); // 5 years + 1 day -> 100%
  assert.equal(over.status, 'HOLD_DATA_MISMATCH');
  assert.equal(over.expected, '100%');
  assert.equal(ctl(run(withChanges('clean', { product: 'SMART_BIZ' })), 19).reason_code, 'NO_RULE_FOR_PRODUCT');
});

test('Control 20: claim amount recalculated, not trusted from screen', () => {
  const r = run(withChanges('clean', { cur_stmt_principal: '66,477.40', cb_screen_base: '66,477.40', claim_amount_screen: '46,534.18', claim_paid_screen: '46,534.18' }));
  assert.equal(ctl(r, 20).status, 'PASS');
  assert.equal(r.claim_amount_text, '46,534.18');
  assert.equal(ctl(run(withChanges('clean', { claim_paid_screen: '34,414.81' })), 20).status, 'HOLD_DATA_MISMATCH');
});

test('Control 21: CLAIM MAX arithmetic to the satang; cap-only is not testable', () => {
  assert.equal(ctl(run(sample('clean')), 21).status, 'PASS');
  assert.equal(ctl(run(withChanges('clean', { cap_screen_after: '6,465,585.21' })), 21).status, 'HOLD_DATA_MISMATCH');
  assert.equal(ctl(run(withChanges('clean', { cap_paid: '', cap_pending: '' })), 21).status, 'NOT_TESTABLE');
  assert.equal(ctl(run(withChanges('clean', { cap_max: '3,520,000.00', cap_screen_available: '', cap_screen_after: '' })), 21).status, 'HOLD_NEED_CLARIFICATION');
});

test('Control 22: timeline order; a post-default payment does not break it', () => {
  assert.equal(ctl(run(sample('clean')), 22).status, 'PASS');
  assert.equal(ctl(run(sample('supported')), 22).status, 'PASS');
  assert.equal(ctl(run(withChanges('clean', { dmd_date_screen: '01/01/2568' })), 22).status, 'HOLD_DATA_MISMATCH');
});

test('every result carries the rule version and control id', () => {
  const r = run(sample('clean'));
  r.results.forEach((x) => { assert.equal(x.rule_version, E.RULE_VERSION); assert.match(x.control_id, /^PGS10-/); });
  assert.equal(new Set(r.results.map((x) => x.control_id)).size, 22);
});
