#!/usr/bin/env node
/*
 * PGS10 v1.2.0 Spec Candidate — Freeze Gate checker (Node >= 18, no dependencies).
 *   node check_freeze_gate.js          # human-readable
 *   node check_freeze_gate.js --json   # machine-readable
 * Exit code: 0 = all 5 checks pass and no freeze blockers · 1 = a check failed · 2 = checks pass but freeze blockers remain.
 *
 * Checks (Reconciliation DEC-28):
 *   1 Canonical IDs resolve 100%      2 Reason codes resolve 100%      3 No status/reason mixing
 *   4 Policy OPEN rules have Safe-Hold      5 Golden tests have evidence and no invented expected result
 */
'use strict';
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const dict = JSON.parse(read('03_PGS10_DATA_DICTIONARY.json'));
const gold = JSON.parse(read('04_PGS10_GOLDEN_TESTS.json'));
const reg = JSON.parse(read('05_PGS10_RULE_REGISTRY.json'));
const par = JSON.parse(read('06_PGS10_POLICY_PARAMETERS.json'));
const md01 = read('01_PGS10_POLICY_RULEBOOK.md');
const md02 = read('02_PGS10_OPERATIONAL_AUDIT_RULES.md');

const CASE = dict.enums.case_status, CONTROL = dict.enums.control_status, FLAGS = dict.enums.review_flag;
const ruleIds = new Set(reg.rules.map((r) => r.id));
const aliasRules = reg.alias_index_rules;
const reasons = new Map(reg.reason_codes.map((r) => [r.code, r]));
const aliasReasons = reg.alias_index_reasons;
const fields = dict.fields;
const paramIds = new Set(par.parameters.map((p) => p.id));
const results = [];

function gate(n, title, fn) {
  const errs = [], info = [];
  fn(errs, info);
  results.push({ n, title, pass: errs.length === 0, errors: errs, info });
}
const uniq = (a) => [...new Set(a)];

// ------------------------------------------------------------------ 1. canonical IDs
gate(1, 'Canonical IDs resolve 100%', (E, I) => {
  const ids = reg.rules.map((r) => r.id);
  if (ids.length !== ruleIds.size) E.push('duplicate canonical rule id');
  ids.forEach((i) => { if (!/^PGS10-[A-Z]+-\d{3}$/.test(i)) E.push('bad id format ' + i); });
  Object.entries(aliasRules).forEach(([k, v]) => v.split('+').map((s) => s.trim()).forEach((t) => { if (!ruleIds.has(t)) E.push(`alias ${k} -> unknown ${t}`); }));
  reg.rules.forEach((r) => (r.legacy_aliases || []).forEach((a) => { if (!(`${a.alias}@${a.version}` in aliasRules)) E.push(`legacy alias not indexed: ${a.alias}@${a.version}`); }));
  const re = /PGS10-[A-Z]+(?:-[A-Z]+)?-\d{3}(?:@[A-Za-z0-9.]+)?/g;
  let tokens = 0;
  const scan = (name, text) => (text.match(re) || []).forEach((t) => {
    tokens++;
    if (t.includes('@')) { if (!(t in aliasRules)) E.push(`${name}: unknown versioned alias ${t}`); }
    else if (!ruleIds.has(t)) E.push(`${name}: non-canonical rule id without @version: ${t}`);
  });
  scan('01', md01); scan('02', md02); scan('04', read('04_PGS10_GOLDEN_TESTS.json')); scan('05', JSON.stringify(reg.rules.map((r) => Object.assign({}, r, { legacy_aliases: undefined }))));
  Object.entries(fields).forEach(([k, f]) => (f.used_by || []).forEach((u) => { if (!ruleIds.has(u)) E.push(`field ${k} used_by unknown ${u}`); }));
  reg.rules.forEach((r) => {
    r.inputs.forEach((f) => { if (!fields[f]) E.push(`${r.id} input not in dictionary: ${f}`); });
    r.parameters.forEach((p) => { if (!paramIds.has(p)) E.push(`${r.id} parameter unknown: ${p}`); });
  });
  reg.reason_codes.forEach((c) => c.rules.forEach((r) => { if (r !== '*' && !ruleIds.has(r)) E.push(`reason ${c.code} -> unknown rule ${r}`); }));
  gold.tests.forEach((t) => { (t.rule_ids || []).concat((t.expected_rule_results || []).map((e) => e.rule_id)).forEach((r) => { if (!ruleIds.has(r)) E.push(`${t.test_id}: unknown rule ${r}`); }); });
  I.push(`${ruleIds.size} canonical rules, ${Object.keys(aliasRules).length} versioned aliases, ${tokens} ID tokens scanned`);
});

// ------------------------------------------------------------------ 2. reason codes
gate(2, 'Reason codes resolve 100%', (E, I) => {
  const codes = [...reasons.keys()];
  if (codes.length !== reg.reason_codes.length) E.push('duplicate reason code');
  Object.entries(aliasReasons).forEach(([a, c]) => { if (!reasons.has(c)) E.push(`alias ${a} -> unknown ${c}`); if (reasons.has(a)) E.push(`alias ${a} is also a canonical code`); });
  const nonReason = new Set([...CASE, ...CONTROL, ...FLAGS, ...dict.enums.review_stage, ...dict.enums.requirement, ...dict.enums.transaction_type, ...dict.enums.source_status,
    ...dict.enums.transaction_code_evidence_status, 'ROUND_HALF_UP', 'THAI_CREDIT', 'BLOCKED_PENDING_EVIDENCE', 'NORMAL_RESTRUCTURE_PATH', 'UNCONTACTABLE_EXCEPTION_PATH', 'NOT_REQUIRED',
    'DIRECT_SNAPSHOT', 'BY_PRINCIPAL', 'BY_GUARANTEE', 'DELIVERED', 'RETURNED', 'PROVEN_INELIGIBILITY_ONLY', 'SMALL_BIZ', 'START_UP', 'SMART_BIZ', 'SMART_ONE', 'SMART_GREEN', 'SMART_PLUS',
    'NOT_PGS10', 'REQUIRED', 'PGS10', 'OFFICIAL', 'LOCKED', 'USER_ATTESTED', 'VERIFIED', 'RULE_ONLY', 'FULL_CASE', 'AGGREGATION_LOGIC', 'EXACT', 'CONTAINS', 'ISO', 'RECIPIENT', 'AUTHORIZED',
    'PRINTED_NAME_ONLY', 'POSTAL_OFFICER_ONLY', 'NONE', 'DERIVED', 'DIRECT', 'FINAL_APPROVAL', 'PRE_REVIEW', 'NORMAL', 'MISSING', 'PAGE_SEQUENCE_GAP', 'PAGE_UNREADABLE', 'DOCUMENT_TRUNCATED',
    'CLAIM_MAX_UNDEFINED', 'ROUND_UNDEFINED', 'PAID_PENDING_MISSING']);
  reasons.forEach((c) => (c.detail_codes || []).forEach((d) => nonReason.add(d)));
  let scanned = 0;
  [['01', md01], ['02', md02]].forEach(([n, txt]) => (txt.match(/`([A-Z][A-Z0-9_]{7,})`/g) || []).forEach((raw) => {
    const t = raw.slice(1, -1); scanned++;
    if (reasons.has(t) || t in aliasReasons || nonReason.has(t) || /^PRM|^DEC|^GT-|^UT-/.test(t)) return;
    E.push(`${n}: unresolved token \`${t}\``);
  }));
  reg.rules.forEach((r) => r.reasons.forEach((c) => { if (!reasons.has(c.code)) E.push(`${r.id}: reason ${c.code} not in catalogue`); }));
  par.parameters.forEach((p) => { if (p.safe_hold && !reasons.has(p.safe_hold.reason_code)) E.push(`${p.id}: safe_hold reason ${p.safe_hold.reason_code} not in catalogue`); });
  gold.tests.forEach((t) => {
    const all = [...(t.expected_reason_codes || [])];
    (t.expected_rule_results || []).forEach((e) => (e.reason_codes || []).forEach((c) => {
      all.push(c);
      const rc = reasons.get(c);
      if (!rc) return;
      if (!rc.rules.includes('*') && !rc.rules.includes(e.rule_id)) E.push(`${t.test_id}: reason ${c} is not defined for ${e.rule_id}`);
      if (rc.control_status !== e.control_status) E.push(`${t.test_id}: reason ${c} implies ${rc.control_status} but expected ${e.control_status}`);
    }));
    all.forEach((c) => { if (!reasons.has(c)) E.push(`${t.test_id}: unknown reason ${c}`); });
    if (t.pending_assertion && !reasons.has(t.pending_assertion.reason_code)) E.push(`${t.test_id}: pending reason unknown`);
  });
  I.push(`${reasons.size} canonical reason codes, ${Object.keys(aliasReasons).length} aliases, ${scanned} backticked tokens scanned`);
});

// ------------------------------------------------------------------ 3. no status/reason mixing
gate(3, 'No status/reason mixing', (E, I) => {
  const statuses = new Set([...CASE, ...CONTROL, ...FLAGS]);
  if (CASE.length !== 5) E.push('case_status must have exactly 5 values');
  reasons.forEach((c, code) => {
    if (/^(HOLD|FAIL|PASS)_/.test(code)) E.push(`reason code looks like a status: ${code}`);
    if (statuses.has(code)) E.push(`reason code equals a status/flag: ${code}`);
    if (!CONTROL.includes(c.control_status)) E.push(`${code}: control_status ${c.control_status} invalid`);
  });
  ['01', '02'].forEach((n) => { const txt = n === '01' ? md01 : md02; (txt.match(/\b(HOLD|FAIL)_[A-Z_]+/g) || []).forEach((t) => E.push(`${n}: status-like token ${t}`)); });
  reg.aggregation.order.forEach((o) => { if (!CASE.includes(o.case_status)) E.push('aggregation outputs invalid case_status ' + o.case_status); });
  gold.tests.forEach((t) => {
    if (t.expected_case_status != null && !CASE.includes(t.expected_case_status)) E.push(`${t.test_id}: invalid case status ${t.expected_case_status}`);
    (t.expected_rule_results || []).forEach((e) => {
      if (!CONTROL.includes(e.control_status)) E.push(`${t.test_id}: invalid control_status ${e.control_status}`);
      if (e.review_flag && !FLAGS.includes(e.review_flag)) E.push(`${t.test_id}: invalid review_flag ${e.review_flag}`);
    });
  });
  Object.keys(aliasReasons).forEach((a) => { if (!/^(HOLD_|FAIL_)/.test(a) && statuses.has(a)) E.push('alias equals status ' + a); });
  I.push(`case statuses: ${CASE.join(', ')}; retired status-like names (aliases only): ${Object.keys(aliasReasons).filter((a) => /^HOLD_/.test(a)).length}`);
});

// ------------------------------------------------------------------ 4. OPEN policy rules have Safe-Hold
gate(4, 'Policy OPEN rules have Safe-Hold', (E, I) => {
  const needs = new Set(['OPEN', 'ASSUMPTION', 'UNVERIFIED_UNTIL_SOURCE', 'PROPOSED_CONFIG_DISABLED']);
  const open = [];
  par.parameters.forEach((p) => {
    if (!dict.enums.source_status.includes(p.source_status)) E.push(`${p.id}: invalid source_status ${p.source_status}`);
    if (!needs.has(p.source_status)) return;
    open.push(p.id);
    if (!p.safe_hold || !p.safe_hold.behavior || !p.safe_hold.reason_code) E.push(`${p.id} (${p.source_status}) has no safe_hold`);
  });
  const openSet = new Set(open);
  reg.rules.forEach((r) => {
    const usedOpen = r.parameters.filter((p) => openSet.has(p));
    const declared = new Set((r.safe_hold || []).map((s) => s.parameter));
    usedOpen.forEach((p) => { if (!declared.has(p)) E.push(`${r.id}: uses OPEN ${p} without listing safe_hold`); });
  });
  const tm = par.transaction_code_map;
  if (!tm.unmapped_policy || !/TRANSACTION_CODE_UNMAPPED/.test(tm.unmapped_policy) || !reasons.has('TRANSACTION_CODE_UNMAPPED')) E.push('transaction map has no unmapped safe-hold');
  tm.entries.forEach((e) => {
    tm.schema.forEach((k) => { if (!(k in e)) E.push(`txn ${e.bank_id}/${e.code}: missing field ${k}`); });
    if (e.evidence_status === 'UNVERIFIED_UNTIL_SOURCE' && (e.semantic_type !== null || e.is_payment)) E.push(`txn ${e.bank_id}/${e.code}: unverified code must not carry semantic_type/is_payment`);
    if (e.evidence_status === 'EVIDENCE_SUPPORTED_BANK_SPECIFIC' && (!e.evidence_source || e.bank_id === 'UNSPECIFIED')) E.push(`txn ${e.bank_id}/${e.code}: evidence-supported code needs bank_id and evidence_source`);
  });
  const lz = par.parameters.find((p) => p.id === 'PRM-014');
  if (!lz || lz.value !== false) E.push('PRM-014 allow_default_date_as_npl_date must be false');
  const tol = par.parameters.find((p) => p.id === 'PRM-032');
  if (!tol || tol.value !== false) E.push('PRM-032 tolerance must be disabled by default');
  const meta = reg.metadata;
  I.push(`OPEN/ASSUMPTION/UNVERIFIED/PROPOSED params with safe-hold: ${open.join(', ')}`);
  I.push(`transaction codes: ${tm.entries.filter((e) => e.evidence_status.startsWith('EVIDENCE')).length} evidence-supported, ${tm.entries.filter((e) => e.evidence_status.startsWith('UNVERIFIED')).length} unverified`);
  results.blockers = meta.freeze_blockers || [];
});

// ------------------------------------------------------------------ 5. golden tests: evidence, no invented expected result
const BI = (s) => { const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(s)); if (!m) throw new Error('bad money ' + s); const v = BigInt(m[2]) * 100n + BigInt((m[3] || '').padEnd(2, '0') || '0'); return m[1] ? -v : v; };
const fmt = (v) => `${v < 0n ? '-' : ''}${(v < 0n ? -v : v) / 100n}.${String((v < 0n ? -v : v) % 100n).padStart(2, '0')}`;
function addMonths(iso, n) { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + n, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10); }
function aggregate(controls, stage) {
  let fail = false, hold = false, obs = false, sup = false;
  Object.entries(controls).forEach(([id, c]) => {
    const rule = reg.rules.find((r) => r.id === 'PGS10-' + id);
    if (!rule) throw new Error('unknown control ' + id);
    const req = rule.requirement_by_stage[stage];
    const s = c.control_status;
    if (s === 'FAIL') fail = true;
    else if (s === 'HOLD') hold = true;
    else if (s === 'NOT_TESTABLE' && req === 'REQUIRED_HARD') hold = true;
    else if (s === 'OBSERVATION' || c.review_flag === 'FORMAT_NORMALIZED') obs = true;
    if (s === 'PASS_WITH_SUPPORT') sup = true;
  });
  if (fail) return { case_status: 'FAIL', support_used: false };
  if (hold) return { case_status: 'HOLD', support_used: false };
  if (obs) return { case_status: 'PASS_WITH_OBSERVATION', support_used: sup };
  if (sup) return { case_status: 'PASS_WITH_SUPPORT', support_used: true };
  return { case_status: 'PASS', support_used: false };
}
gate(5, 'Golden tests have evidence and no invented expected result', (E, I) => {
  const scopes = ['RULE_ONLY', 'FULL_CASE', 'AGGREGATION_LOGIC'], modes = ['RULE_ONLY', 'EXACT', 'CONTAINS'], bases = ['FROM_DOCUMENT', 'DERIVED_FROM_LOCKED_RULE', 'SYNTHETIC_FROM_RULE', 'OWNER_REVIEWED_CASE'];
  const ids = gold.tests.map((t) => t.test_id);
  if (new Set(ids).size !== ids.length) E.push('duplicate test_id');
  const allowedExtra = new Set(['controls', 'review_stage']);
  let verified = 0, evaluated = 0;
  gold.tests.forEach((t) => {
    const id = t.test_id;
    if (!scopes.includes(t.test_scope)) E.push(`${id}: bad test_scope`);
    if (!modes.includes(t.match_mode)) E.push(`${id}: bad match_mode`);
    if (!['ACTIVE', 'BLOCKED_PENDING_EVIDENCE'].includes(t.activation)) E.push(`${id}: bad activation`);
    if (!bases.includes(t.basis)) E.push(`${id}: bad basis ${t.basis}`);
    if (!t.rule_basis || typeof t.rule_basis !== 'string') E.push(`${id}: missing rule_basis (expected result must cite its source)`);
    if (t.test_scope === 'RULE_ONLY' && (t.expected_case_status !== null || (t.expected_reason_codes || []).length)) E.push(`${id}: RULE_ONLY must not assert case status/case reasons`);
    if (t.test_scope === 'FULL_CASE' && !(t.evidence_package && t.evidence_package.complete === true)) E.push(`${id}: FULL_CASE requires a complete evidence_package`);
    if (t.test_scope === 'AGGREGATION_LOGIC' && !t.proposed_scope) E.push(`${id}: AGGREGATION_LOGIC must be flagged proposed_scope`);
    if (t.lg_no) {
      if (!t.evidence_ref || !t.evidence_ref.status) E.push(`${id}: real case without evidence_ref`);
      else if (t.activation === 'ACTIVE' && !(['VERIFIED', 'USER_ATTESTED'].includes(t.evidence_ref.status) && t.evidence_ref.document && (t.evidence_ref.pages || []).length)) E.push(`${id}: ACTIVE real case needs evidence_ref.document/pages`);
      if (t.activation === 'BLOCKED_PENDING_EVIDENCE' && t.input !== null) E.push(`${id}: blocked real case must not carry invented input`);
      if (t.activation === 'ACTIVE' && t.basis === 'OWNER_REVIEWED_CASE' && !t.evidence_ref) E.push(`${id}: active reviewed case without evidence`);
    } else {
      if (t.evidence_ref !== null) E.push(`${id}: synthetic test should have evidence_ref null`);
      if (t.basis === 'OWNER_REVIEWED_CASE') E.push(`${id}: OWNER_REVIEWED_CASE requires lg_no`);
      if (t.input === null || typeof t.input !== 'object') E.push(`${id}: synthetic test needs input`);
      if (t.activation !== 'ACTIVE') E.push(`${id}: synthetic test must be ACTIVE`);
    }
    if (t.input && t.test_scope !== 'AGGREGATION_LOGIC') Object.keys(t.input).forEach((k) => { if (!fields[k] && !allowedExtra.has(k)) E.push(`${id}: input field not in dictionary: ${k}`); });
    (t.expected_rule_results || []).forEach((e) => { if (!(t.rule_ids || []).includes(e.rule_id)) E.push(`${id}: expected rule ${e.rule_id} not in rule_ids`); });
    if (t.activation === 'ACTIVE' && t.test_scope !== 'AGGREGATION_LOGIC' && !(t.expected_rule_results || []).length) E.push(`${id}: ACTIVE test has no expected_rule_results`);
    // aggregation logic is recomputed from the registry — expected must equal the spec's own result
    if (t.test_scope === 'AGGREGATION_LOGIC') {
      const r = aggregate(t.input.controls, t.input.review_stage || 'FINAL_APPROVAL');
      evaluated++;
      if (r.case_status !== t.expected_case_status) E.push(`${id}: aggregation gives ${r.case_status}, test expects ${t.expected_case_status}`);
      if ('expected_support_used' in t && r.support_used !== t.expected_support_used) E.push(`${id}: support_used ${r.support_used} != ${t.expected_support_used}`);
    }
    // numeric re-verification
    const v = t.verify;
    if (v) {
      try {
        verified++;
        if (v.kind === 'claim_amount') { const got = fmt((BI(v.claim_base) * BigInt(v.ratio_bp) + 5000n) / 10000n); if (got !== v.expect) E.push(`${id}: claim_amount ${got} != ${v.expect}`); }
        if (v.kind === 'min') { const a = BI(v.a), b = BI(v.b); if (fmt(a < b ? a : b) !== v.expect) E.push(`${id}: min mismatch`); }
        if (v.kind === 'sum') { const s = v.parts.reduce((x, p) => x + BI(p), 0n); if (fmt(s) !== v.expect) E.push(`${id}: sum ${fmt(s)} != ${v.expect}`); }
        if (v.kind === 'capacity') { const av = BI(v.claim_max) - BI(v.paid) - BI(v.pending); if (fmt(av) !== v.expect_available || fmt(av - BI(v.claim)) !== v.expect_after) E.push(`${id}: capacity arithmetic mismatch`); }
      } catch (e) { E.push(`${id}: verify error ${e.message}`); }
    }
    // date-rule re-evaluation for tests whose expectation is a pure function of the rules
    const inp = t.input || {}, exp = (t.expected_rule_results || [])[0];
    if (t.activation === 'ACTIVE' && exp) {
      if (exp.rule_id === 'PGS10-NPL-001' && inp.npl_date && inp.guarantee_effective_date) {
        const months = { START_UP: 6, SMALL_BIZ: 6, SMART_BIZ: 9 }[inp.product];
        const ok = inp.npl_date >= addMonths(inp.guarantee_effective_date, months); evaluated++;
        if ((exp.control_status === 'PASS') !== ok) E.push(`${id}: NPL seasoning re-evaluation says ${ok ? 'PASS' : 'HOLD'}`);
      }
      if (exp.rule_id === 'PGS10-RST-002' && inp.restructure_route === 'UNCONTACTABLE_EXCEPTION_PATH' && (t.config || {}).enable_uncontactable_exception === true) {
        const start = inp.first_uncontactable_date || inp.first_contacted_restructure_failed_date; const ok = inp.claim_submission_date >= addMonths(start, 7); evaluated++;
        if ((exp.control_status === 'PASS_WITH_SUPPORT') !== ok) E.push(`${id}: exception maturity re-evaluation says ${ok ? 'matured' : 'not matured'}`);
      }
      if (exp.rule_id === 'PGS10-CLM-002' && inp.lg_issue_date && inp.claim_submission_date && exp.control_status !== 'HOLD' || (exp.rule_id === 'PGS10-CLM-002' && exp.reason_codes && exp.reason_codes[0] === 'COVERAGE_AGE_BASIS_UNDEFINED')) {
        const anniv = addMonths(inp.lg_issue_date, 60);
        const events = [inp.claim_submission_date, inp.npl_date, inp.default_date, inp.demand_date_letter].filter(Boolean);
        const tiers = new Set(events.map((e) => (e <= anniv ? 'LE' : 'GT'))); evaluated++;
        if (exp.reason_codes && exp.reason_codes[0] === 'COVERAGE_AGE_BASIS_UNDEFINED') { if (tiers.size < 2) E.push(`${id}: expected basis conflict but tiers agree`); }
        else if (exp.coverage_ratio_bp) {
          if (tiers.size > 1) E.push(`${id}: candidate events disagree — should be Safe-Hold`);
          else { const start = inp.product === 'START_UP' ? 10000 : (tiers.has('LE') ? 7000 : 10000); if (start !== exp.coverage_ratio_bp) E.push(`${id}: coverage ${start} != ${exp.coverage_ratio_bp}`); }
        }
      }
    }
  });
  const c = (f) => gold.tests.filter(f).length;
  I.push(`${gold.tests.length} tests: ACTIVE ${c((t) => t.activation === 'ACTIVE')}, BLOCKED_PENDING_EVIDENCE ${c((t) => t.activation !== 'ACTIVE')}; FULL_CASE ${c((t) => t.test_scope === 'FULL_CASE')}; AGGREGATION_LOGIC (proposed scope) ${c((t) => t.test_scope === 'AGGREGATION_LOGIC')}`);
  I.push(`numeric blocks re-verified: ${verified}; rule/aggregation expectations re-evaluated from spec: ${evaluated}`);
});

// ------------------------------------------------------------------ report
const blockers = results.blockers || [];
const allPass = results.every((r) => r.pass);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ruleset: dict.metadata.ruleset_version, frozen: dict.metadata.frozen, checks: results.map(({ n, title, pass, errors, info }) => ({ n, title, pass, errors, info })), freeze_blockers: blockers }, null, 2));
} else {
  console.log(`PGS10 ${dict.metadata.ruleset_version} — Freeze Gate  (frozen=${dict.metadata.frozen})`);
  results.forEach((r) => {
    console.log(`\n[${r.pass ? 'PASS' : 'FAIL'}] ${r.n}. ${r.title}`);
    r.info.forEach((i) => console.log('      ' + i));
    r.errors.slice(0, 40).forEach((e) => console.log('   ✗ ' + e));
    if (r.errors.length > 40) console.log(`   … ${r.errors.length - 40} more`);
  });
  console.log(`\nFreeze blockers (business decisions still open): ${blockers.length ? blockers.join(', ') : 'none'}`);
  console.log(allPass ? (blockers.length ? '\nRESULT: 5/5 checks pass — NOT READY TO FREEZE (blockers remain)' : '\nRESULT: 5/5 checks pass — READY for Freeze Gate Review') : '\nRESULT: CHECKS FAILED');
}
process.exit(allPass ? (blockers.length ? 2 : 0) : 1);
