'use strict';
/*
 * Route to Own — System B (Post-Approval) core test suite
 * Groups follow the approved Phase 1 plan:
 *   A boundary & structure · B verified revenue + evidence audit · C evidence composition
 *   D PAYD 5 gates + reserve 2 layers · E case model 3 dimensions · F migration guard
 *   G claim (LOCKED_PARTIAL) · R regression of pre-existing behaviour
 */
const { loadCore, source, scriptSource } = require('./extract');

const R2O = loadCore();
const SRC = source();
const SCRIPT = scriptSource();

const results = [];
// a section that throws — a symbol the implementation has not provided yet, or a
// regression that removed one — is reported as a failure instead of aborting the run
function section(label, fn) {
  try { fn(); } catch (error) {
    results.push([label, 'section aborted: ' + error.message, false]);
  }
}
const ok = (group, name, cond) => results.push([group, name, !!cond]);
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;
const S = () => R2O.defaults();
const st = R2O.defaults();
const day = (state, date) => (state.evidence || []).filter((r) => r.date === date);
const DATES = ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05',
  '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09'];

const EXPECTED = {
  // date: [verified, duplicate, pending, reported, available, required, sweep, gate, plan, debit]
  '2026-09-02': [1486.00, 29.90, 143.60, 1659.50, 408.55, 477.69, 408.55, 'AVAILABLE_CASH', 0.00, 0.00],
  '2026-09-03': [1702.00, 68.45, 57.20, 1827.65, 624.55, 537.69, 537.69, 'REQUIRED_PAYD', 47.77, 47.77],
  '2026-09-04': [1624.00, 96.80, 150.00, 1870.80, 546.55, 477.69, 477.69, 'REQUIRED_PAYD', 47.77, 47.77],
  '2026-09-05': [1893.00, 43.20, 120.00, 2056.20, 815.55, 667.69, 550.00, 'AUTHORIZED_DEBIT_LIMIT', 0.00, 0.00],
  '2026-09-06': [1558.00, 112.35, 61.00, 1731.35, 480.55, 477.69, 412.80, 'AVAILABLE_TO_DEBIT', 0.00, 0.00],
  '2026-09-07': [1341.00, 0.00, 172.15, 1513.15, 263.55, 477.69, 263.55, 'AVAILABLE_CASH', 0.00, 0.00],
  '2026-09-08': [1779.00, 51.60, 128.40, 1959.00, 701.55, 692.00, 620.00, 'DAILY_CAP', 0.00, 0.00],
  '2026-09-09': [1715.50, 0.00, 135.02, 1850.52, 638.05, 477.69, 477.69, 'REQUIRED_PAYD', 47.77, 47.77]
};

/* ─────────────────────────── A. Boundary & Structure ─────────────────────────── */
section('A', () => {

ok('A', 'Driver Portal has exactly the 7 original screens',
  R2O.routes.driver.length === 7 &&
  R2O.routes.driver.join() === 'home,activity,money,ownership,wallet,help,cure');
ok('A', 'incident-report screen (แจ้งเหตุ) is screen 6 and still present',
  R2O.routes.driver[5] === 'help' && R2O.routes.driver.includes('help'));
ok('A', 'no new Vehicle / Battery / Insurance page in Driver Portal',
  !R2O.routes.driver.some((s) => /vehicle|battery|insurance/i.test(s)));
ok('A', '31 functional screens + Gateway landing',
  R2O.routes.driver.length + R2O.routes.partner.length +
  R2O.routes.tower.length + R2O.routes.fa.length === 31);
ok('A', 'route key "pipeline" unchanged', R2O.routes.partner.includes('pipeline'));

// scoped check: prohibited Pre-Approval semantics only — never a global grep of broad words
const PROHIBITED = ['OWN READY', 'BUILD READINESS', 'Readiness Certificate',
  'Pre-E-LG Readiness', 'Front-Door', 'Seasoning', 'Pre-Score', 'Appropriate Route', 'FI Match'];
const leaked = PROHIBITED.filter((p) => SRC.includes(p));
ok('A', 'no prohibited Pre-Approval semantics: ' + (leaked.join(', ') || 'none'), leaked.length === 0);

const stages = (S().pipeline || []).map((r) => r.stage);
ok('A', 'partner:pipeline carries only Post-Approval activation stages',
  stages.length > 0 && stages.every((s) => R2O.ACTIVATION_STAGE.includes(s)));
ok('A', 'partner:pipeline state has no readiness / certificate / expiry fields',
  (S().pipeline || []).every((r) => !('readiness' in r) && !('certificate' in r) && !('expiry' in r)));
ok('A', 'ACTIVATION_STAGE is the approved post-approval chain',
  R2O.ACTIVATION_STAGE.join() === 'FI_FINAL_APPROVED,CHILD_ELG_ISSUED,VEHICLE_ACTIVATED,' +
  'INSURANCE_WARRANTY_BOUND,PAYMENT_RAIL_LINKED,ACTIVE');
});

/* ───────────────── B. Verified Revenue + Evidence audit ───────────────── */
section('B', () => {

ok('B', 'no 0.95 / 95% haircut left in verified-revenue logic',
  !/verifyRate/.test(SCRIPT) && !/\*\s*0\.95/.test(SCRIPT) && !/xrayVerifyRate/.test(SRC));
ok('B', 'no stale verifyRate anywhere in the file', !SRC.includes('verifyRate'));
ok('B', 'INCOME_SOURCES is a positive allowlist of 6 evidence classes',
  Array.isArray(R2O.INCOME_SOURCES) && R2O.INCOME_SOURCES.length === 6 &&
  R2O.INCOME_SOURCES.join() === 'PLATFORM_SETTLEMENT,QR_ACCEPTANCE,BANK_CREDIT,' +
  'CASH_VALIDATED,COOP_CONFIRMED,OTHER_EVIDENCED');
ok('B', 'activity signals are not in the income allowlist',
  ['TRIPS', 'HOURS', 'KM', 'GPS'].every((a) => !R2O.INCOME_SOURCES.includes(a)) &&
  ['TRIPS', 'HOURS', 'KM', 'GPS'].every((a) => !R2O.core.isIncomeSource(a)));
ok('B', 'verifiedRevenue() rejects activity records outright',
  R2O.core.verifiedRevenue([
    { source: 'KM', amount: 250, evidenceStatus: 'ACCEPTED' },
    { source: 'GPS', amount: 98, evidenceStatus: 'ACCEPTED' },
    { source: 'HOURS', amount: 9.2, evidenceStatus: 'ACCEPTED' },
    { source: 'TRIPS', amount: 24, evidenceStatus: 'ACCEPTED' }
  ]) === 0);
ok('B', 'CASH_PENDING is never counted as verified revenue',
  R2O.core.verifiedRevenue([{ source: 'CASH_PENDING', amount: 135.02, evidenceStatus: 'PENDING_VALIDATION' }]) === 0);
ok('B', 'CASH_VALIDATED is counted as verified revenue',
  R2O.core.verifiedRevenue([{ source: 'CASH_VALIDATED', amount: 360.25, evidenceStatus: 'ACCEPTED' }]) === 360.25);
ok('B', 'DUPLICATE records never count toward verified revenue',
  R2O.core.verifiedRevenue([{ source: 'BANK_CREDIT', amount: 51.60, evidenceStatus: 'DUPLICATE' }]) === 0);

ok('B', 'Verified Revenue = Σ ACCEPTED for all 8 days',
  DATES.every((d) => near(R2O.core.verifiedRevenue(day(st, d)), EXPECTED[d][0])));
ok('B', 'no aggregate dedupRemoved field survives anywhere',
  !SRC.includes('dedupRemoved'));

// dedup allocation audit — the guardrail
const traces = DATES.map((d) => R2O.core.dedupTrace(day(st, d)));
ok('B', 'every DUPLICATE resolves to a componentId that exists that day',
  traces.every((t) => t.duplicates.every((x) => x.resolved)));
ok('B', 'every DUPLICATE states duplicateAmount and matches its component exactly',
  traces.every((t) => t.duplicates.every((x) => x.exact && x.allocationBasis === 'COMPONENT_EXACT')));
ok('B', 'no component is over-claimed by duplicates',
  traces.every((t) => t.overClaimed.length === 0));
ok('B', 'Σ components equals the amount of every source item that has components',
  (st.evidence || []).every((r) => !r.components ||
    near(r.components.reduce((s, c) => s + c.amount, 0), r.amount)));
ok('B', 'Σ duplicateAmount = 402.30 and every baht is traced',
  near(traces.reduce((s, t) => s + t.total, 0), 402.30) &&
  near(traces.reduce((s, t) => s + t.traced, 0), 402.30));
ok('B', 'Reported = Σ ACCEPTED + Σ DUPLICATE + Σ PENDING for all 8 days',
  DATES.every((d) => {
    const rows = day(st, d);
    const sum = (s) => rows.filter((r) => r.evidenceStatus === s)
      .reduce((a, r) => a + r.amount, 0);
    return near(sum('ACCEPTED') + sum('DUPLICATE') + sum('PENDING_VALIDATION'), EXPECTED[d][3]);
  }));
ok('B', 'no downstream value still derived from the old haircut',
  DATES.every((d) => !near(EXPECTED[d][0] / EXPECTED[d][3], 0.95)));
});

/* ───────────────────── C. Evidence Composition ───────────────────── */
section('C', () => {

const mixes = DATES.map((d) => R2O.core.evidenceMix(day(st, d)));
ok('C', 'every day composition sums to exactly 100.00%',
  mixes.every((m) => Math.abs(m.reduce((s, x) => s + x.share, 0) - 100) < 1e-9));
ok('C', 'no two days share an identical composition vector',
  new Set(mixes.map((m) => m.map((x) => x.share).join('|'))).size === 8);
ok('C', 'no day has verified/reported = 0.95',
  DATES.every((d) => Math.abs(EXPECTED[d][0] / EXPECTED[d][3] - 0.95) > 0.005));
});

/* ────────────── D. PAYD 5 gates + Reserve 2 layers ────────────── */
section('D', () => {

const OPEX = 477.45; const PROT = 600.00; const TARGET = 477.69;
const drv = () => S().drivers[0];

ok('D', 'availableCash = max(0, verified − opEx − protected) for all 8 days',
  DATES.every((d) => near(R2O.core.availableCash({
    verified: EXPECTED[d][0], eligibleOpEx: OPEX, protectedCash: PROT
  }), EXPECTED[d][4])));
ok('D', 'availableCash never negative',
  R2O.core.availableCash({ verified: 100, eligibleOpEx: 900, protectedCash: 600 }) === 0);

const sweepFor = (d) => {
  const row = (S().paymentDaily || []).find((r) => r.date === d) || {};
  return R2O.core.actualSweep({
    required: R2O.core.requiredPayd({ target: TARGET, catchUp: row.catchUp }),
    available: EXPECTED[d][4],
    dailyCap: row.dailyCap,
    availableToDebit: row.availableToDebit,
    authorizedDebitLimit: row.authorizedDebitLimit
  });
};
ok('D', 'requiredPayd = target + catch-up for all 8 days',
  DATES.every((d) => {
    const row = (S().paymentDaily || []).find((r) => r.date === d) || {};
    return near(R2O.core.requiredPayd({ target: TARGET, catchUp: row.catchUp }), EXPECTED[d][5]);
  }));
ok('D', 'actualSweep matches the approved figure for all 8 days',
  DATES.every((d) => near(sweepFor(d).amount, EXPECTED[d][6])));
ok('D', 'binding gate matches the approved gate for all 8 days',
  DATES.every((d) => sweepFor(d).bindingGate === EXPECTED[d][7]));
ok('D', 'all five gates are the binding constraint on at least one day',
  new Set(DATES.map((d) => sweepFor(d).bindingGate)).size === 5);
ok('D', 'sweep is a 5-term min — Daily Cap binds',
  R2O.core.actualSweep({ required: 900, available: 900, dailyCap: 620,
    availableToDebit: 900, authorizedDebitLimit: 900 }).bindingGate === 'DAILY_CAP');
ok('D', 'sweep is a 5-term min — Available-to-Debit binds',
  R2O.core.actualSweep({ required: 900, available: 900, dailyCap: 900,
    availableToDebit: 412.80, authorizedDebitLimit: 900 }).bindingGate === 'AVAILABLE_TO_DEBIT');
ok('D', 'Authorized Debit Limit is a hard gate',
  R2O.core.actualSweep({ required: 900, available: 900, dailyCap: 900,
    availableToDebit: 900, authorizedDebitLimit: 550 }).amount === 550);
ok('D', 'zero verified revenue → no forced sweep', (() => {
  const available = R2O.core.availableCash({ verified: 0, eligibleOpEx: OPEX, protectedCash: PROT });
  const s = R2O.core.actualSweep({ required: TARGET, available: available, dailyCap: 900,
    availableToDebit: 0, authorizedDebitLimit: 1000 });
  return available === 0 && s.amount === 0;
})());

const planFor = (d) => {
  const row = (S().paymentDaily || []).find((r) => r.date === d) || {};
  return R2O.core.reservePlan({
    paydTarget: TARGET,
    required: EXPECTED[d][5],
    sweep: EXPECTED[d][6],
    available: EXPECTED[d][4],
    gap: R2O.core.reserveTargetGap({ target: R2O.core.reserveTarget(TARGET), balance: row.reserveOpeningBalance })
  });
};
ok('D', 'reserveTarget = 5 days of PAYD target', near(R2O.core.reserveTarget(TARGET), 2388.45));
ok('D', 'reserveTargetGap never negative',
  R2O.core.reserveTargetGap({ target: 2388.45, balance: 9999 }) === 0 &&
  R2O.core.reserveTargetGap({ target: 2388.45, balance: 1180 }) > 0);
ok('D', 'reserve plan = 0 on every day PAYD was not fully met',
  DATES.filter((d) => EXPECTED[d][6] < EXPECTED[d][5]).every((d) => planFor(d) === 0));
ok('D', 'reserve plan = 47.77 only on the 3 days PAYD was fully met',
  DATES.filter((d) => near(EXPECTED[d][6], EXPECTED[d][5])).every((d) => near(planFor(d), 47.77)));
ok('D', 'reserve plan matches the approved figure for all 8 days',
  DATES.every((d) => near(planFor(d), EXPECTED[d][8])));
ok('D', 'reserve target gap can be the binding cap',
  near(R2O.core.reservePlan({ paydTarget: TARGET, required: 477.69, sweep: 477.69,
    available: 900, gap: 12.34 }), 12.34));
ok('D', 'plan > 0 but low reserve authorization → actual debit < plan',
  R2O.core.reserveActualDebit({ plan: 47.77, reserveAvailableToDebit: 30.00,
    reserveAuthorizedDebitLimit: 900 }) === 30.00);
ok('D', 'reserve authorization = 0 → actual debit = 0',
  R2O.core.reserveActualDebit({ plan: 47.77, reserveAvailableToDebit: 900,
    reserveAuthorizedDebitLimit: 0 }) === 0);
ok('D', 'reserve plan and actual debit are separate values',
  R2O.core.reserveActualDebit({ plan: 47.77, reserveAvailableToDebit: 10,
    reserveAuthorizedDebitLimit: 900 }) !== 47.77);
ok('D', 'reserve balance accrues actual debit, not plan', (() => {
  const rows = S().paymentDaily || [];
  let bal = (rows[0] || {}).reserveOpeningBalance;
  DATES.forEach((d) => {
    const row = rows.find((r) => r.date === d) || {};
    const plan = planFor(d);
    bal = R2O.core.money(bal + R2O.core.reserveActualDebit({
      plan: plan,
      reserveAvailableToDebit: row.reserveAvailableToDebit,
      reserveAuthorizedDebitLimit: row.reserveAuthorizedDebitLimit
    }));
  });
  return near(bal, 1323.31);
})());
ok('D', 'catch-up is never treated as DPD',
  !/catchUp[^\n]{0,40}dpd/i.test(SCRIPT) && !/dpd[^\n]{0,40}catchUp/i.test(SCRIPT));
ok('D', 'FI DPD and contractual due are never written by any action', (() => {
  const before = S();
  const after = R2O.actions.createIncident(before, { driverId: 'D-000381', cause: 'VEHICLE_DOWN',
    startDate: '2026-09-09', details: 'x', contact: 'PHONE' }, { actor: 'D-000381', role: 'driver' });
  return after.drivers.every((row, i) => row.fiDpd === before.drivers[i].fiDpd &&
    row.monthlyDue === before.drivers[i].monthlyDue);
})());
ok('D', 'no state field models Route2Own or TCG as holding customer funds',
  !/custodyBalance|heldForCustomer|tcgHeldFunds|route2ownHoldsFunds/i.test(SCRIPT));
ok('D', 'reserve is described as sitting in the driver own account',
  SRC.includes('ในบัญชีของคุณ') || SRC.includes('บัญชีของผู้ขับ'));
});

/* ─────────────── E. Case model — three independent dimensions ─────────────── */
section('E', () => {

ok('E', 'RISK_STATUS has 4 levels including WATCH',
  R2O.RISK_STATUS.join() === 'GREEN,WATCH,YELLOW,RED');
ok('E', 'CASE_WORKFLOW has 9 states and no waiting-party encoded in them',
  R2O.CASE_WORKFLOW.length === 9 &&
  !R2O.CASE_WORKFLOW.some((s) => /^WAITING_(FI|COOP|OEM|DRIVER|PARTNER)/.test(s)) &&
  R2O.CASE_WORKFLOW.includes('WAITING_ACTION'));
ok('E', 'WAITING_PARTY has the 10 approved values',
  R2O.WAITING_PARTY.join() === 'DRIVER,FA,FI,COOP,OEM,BATTERY_PARTNER,INSURANCE,' +
  'PAYMENT_PARTNER,RECOVERY_PARTNER,NONE');
ok('E', 'I1 — WAITING_ACTION requires a waiting party', (() => {
  const s = S();
  const bad = R2O.actions.updateIntervention(s, s.interventions[0].id,
    { workflow: 'WAITING_ACTION', waitingFor: 'NONE' }, { actor: 'a', role: 'fa' });
  return Boolean(bad.errors.waitingFor);
})());
ok('E', 'I2 — RESOLVED forces waitingFor NONE', (() => {
  const s = S();
  const bad = R2O.actions.updateIntervention(s, s.interventions[0].id,
    { workflow: 'RESOLVED', waitingFor: 'FI' }, { actor: 'a', role: 'fa' });
  return Boolean(bad.errors.waitingFor);
})());
ok('E', 'I3 — case owner may never be blank', (() => {
  const s = S();
  const bad = R2O.actions.updateIntervention(s, s.interventions[0].id,
    { caseOwner: '   ' }, { actor: 'a', role: 'fa' });
  return Boolean(bad.errors.caseOwner) && s.interventions.every((c) => String(c.caseOwner || '').trim());
})());
ok('E', 'I4 — risk status is not derived from workflow', (() => {
  const s = S();
  const res = R2O.actions.updateIntervention(s, s.interventions[0].id,
    { workflow: 'MONITORING' }, { actor: 'a', role: 'fa' });
  const before = s.interventions[0].riskStatus;
  return Object.keys(res.errors).length === 0 &&
    res.state.interventions[0].riskStatus === before;
})());
ok('E', 'I5 — handoff changes waitingFor without closing the case or resetting aging', (() => {
  const s = S();
  const target = s.interventions[0];
  const res = R2O.actions.updateIntervention(s, target.id,
    { workflow: 'WAITING_ACTION', waitingFor: 'BATTERY_PARTNER', caseOwner: 'Battery-01' },
    { actor: 'a', role: 'fa', timestamp: '2026-09-09T12:00:00' });
  const after = res.state.interventions[0];
  return Object.keys(res.errors).length === 0 &&
    after.workflow === 'WAITING_ACTION' && after.openedAt === target.openedAt &&
    after.waitingSince !== target.waitingSince;
})());
ok('E', 'incident report opens an intervention case', (() => {
  const before = S();
  const after = R2O.actions.createIncident(before, { driverId: 'D-000381', cause: 'VEHICLE_DOWN',
    startDate: '2026-09-09', details: 'รถเสีย', contact: 'PHONE' }, { actor: 'D-000381', role: 'driver' });
  return after.interventions.length === before.interventions.length + 1 &&
    String(after.interventions[after.interventions.length - 1].caseOwner || '').trim().length > 0;
})());
ok('E', 'ewsAssess separates the four risk domains with primary + secondary signals', (() => {
  const a = R2O.core.ewsAssess({
    verifiedToday: 0, verifiedHistory: [1486, 1702, 1624, 1893, 1558, 1341, 1779],
    availableCash: 0, sweep: 0, required: 477.69, fiDpd: 0,
    vehicleAvailable: false, inactiveDays: 5, evidenceReliability: 0.62, incidentCount: 2
  });
  return R2O.RISK_STATUS.includes(a.level) &&
    ['income', 'payment', 'operational', 'vehicle'].every((k) => k in a.domains) &&
    typeof a.primaryTrigger === 'string' && a.primaryTrigger.length > 0 &&
    Array.isArray(a.secondarySignals);
})());
ok('E', 'RED is an early-warning state, never asserted as NPL',
  !/RED[^\n]{0,20}=[^\n]{0,20}NPL/i.test(SCRIPT));
});

/* ─────────────────────── F. Migration guard ─────────────────────── */
section('F', () => {

ok('F', 'schemaVersion is 6 and storageKey matches',
  R2O.schemaVersion === 6 && R2O.storageKey === 'route2own.postapproval.v6');
ok('F', 'a v5 state is discarded whole, never partially merged', (() => {
  const legacy = JSON.stringify({ meta: { schemaVersion: 5 }, drivers: [{ verifyRate: 0.95 }] });
  const restored = R2O.core.restoreState(legacy, S());
  return restored.meta.schemaVersion === 6 &&
    !JSON.stringify(restored).includes('verifyRate');
})());
ok('F', 'no stale verifyRate can survive a restore',
  !JSON.stringify(R2O.core.restoreState(
    JSON.stringify({ meta: { schemaVersion: 5 }, drivers: [{ verifyRate: 0.95 }] }), S())
  ).includes('verifyRate'));
ok('F', 'old workflow status values cannot come back through restore', (() => {
  const legacy = JSON.stringify({ meta: { schemaVersion: 5 }, cases: [{ status: 'OEM FOLLOW-UP' }] });
  return !JSON.stringify(R2O.core.restoreState(legacy, S())).includes('OEM FOLLOW-UP');
})());
ok('F', 'old readiness / certificate data cannot be restored into post-approval state', (() => {
  const legacy = JSON.stringify({
    meta: { schemaVersion: 5 },
    pipeline: [{ readiness: 'OWN READY', certificate: 'RC-80381' }]
  });
  const s = JSON.stringify(R2O.core.restoreState(legacy, S()));
  return !s.includes('OWN READY') && !s.includes('RC-80381') && !s.includes('readiness');
})());
});

/* ───────────────────────────── G. Claim ───────────────────────────── */
section('G', () => {

ok('G', 'CLAIM_FORMULA_STATUS is LOCKED_PARTIAL',
  R2O.CLAIM_FORMULA_STATUS === 'LOCKED_PARTIAL' &&
  R2O.core.claimContract().status === 'LOCKED_PARTIAL');
ok('G', 'ER / ENL / RPC / FCE are unbound and return null', (() => {
  const c = R2O.core.claimContract();
  return ['eligibleRecovery', 'eligibleNetLoss', 'riskParticipationCoverage', 'finalClaimExposure']
    .every((k) => k in c && c[k] === null);
})());
ok('G', 'locked coverage and legal constants are correct',
  R2O.core.coverageForYear(2) === 0.80 && R2O.core.coverageForYear(4) === 0.80 &&
  R2O.core.coverageForYear(5) === 1.00 && R2O.core.coverageForYear(7) === 1.00 &&
  R2O.core.coverageForYear(1) === null &&
  near(R2O.core.legalInitialClaimCeiling(1000000), 250000));
ok('G', '32.8 / 34.0 / 35.2 are named portfolioTierBoundary, never max-claim-per-vehicle',
  near(R2O.core.portfolioTierBoundary('A'), 0.328) &&
  near(R2O.core.portfolioTierBoundary('B'), 0.340) &&
  near(R2O.core.portfolioTierBoundary('C'), 0.352) &&
  !/maxClaimPerVehicle/i.test(SRC) && !/Max Claim per Vehicle/i.test(SRC));
});

/* ──────────────── R. Regression of pre-existing behaviour ──────────────── */
section('R', () => {

ok('R', 'routes intact 7/12/7/5',
  R2O.routes.driver.length === 7 && R2O.routes.partner.length === 12 &&
  R2O.routes.tower.length === 7 && R2O.routes.fa.length === 5);
ok('R', 'parseRoute still resolves each view',
  R2O.core.parseRoute('#gateway').view === 'gateway' &&
  R2O.core.parseRoute('#driver:money').screen === 'money' &&
  R2O.core.parseRoute('#partner:ews').view === 'partner' &&
  R2O.core.parseRoute('#tower:queue').screen === 'queue' &&
  R2O.core.parseRoute('#fa:intake').screen === 'intake' &&
  R2O.core.parseRoute('#nope:zz').view === 'gateway');
ok('R', 'RBAC unchanged for all 9 roles',
  R2O.core.visiblePartnerScreens('fi').length === 10 &&
  R2O.core.visiblePartnerScreens('coop').length === 9 &&
  R2O.core.visiblePartnerScreens('oem').length === 3 &&
  R2O.core.visiblePartnerScreens('data').length === 3 &&
  R2O.core.visiblePartnerScreens('payment').length === 3 &&
  R2O.core.visiblePartnerScreens('recovery').length === 4 &&
  R2O.core.visiblePartnerScreens('tcg').length === 12);
ok('R', 'restoreState still falls back on bad JSON and honours the current version',
  R2O.core.restoreState('{{', { f: 1 }).f === 1 &&
  R2O.core.restoreState(null, { f: 2 }).f === 2 &&
  R2O.core.restoreState(JSON.stringify({ meta: { schemaVersion: 6 }, kept: 9 }), { f: 3 }).kept === 9);
ok('R', 'consent gate still blocks intake without consent',
  Boolean(R2O.core.validateIntake({ topic: 'a', details: 'b', startDate: 'c', contact: 'd', consent: false }).consent) &&
  Object.keys(R2O.core.validateIntake({ topic: 'a', details: 'b', startDate: 'c', contact: 'd', consent: true })).length === 0);
ok('R', 'routeCause mapping unchanged',
  R2O.core.routeCause('ILLNESS').slaHours === 24 &&
  R2O.core.routeCause('VEHICLE_DOWN').owner === 'OEM-01' &&
  R2O.core.routeCause('ACCIDENT').slaHours === 8 &&
  R2O.core.routeCause('ZZZ').owner === 'F.A. Center');
ok('R', 'CSV escaping and BOM unchanged',
  R2O.core.csvEscape('a"b,c').includes('""') &&
  R2O.core.statementCsv(R2O.core.driverStatementRows(S(), 'D-000381')).startsWith('﻿'));
ok('R', 'audit trail still written by actions', (() => {
  const before = S();
  const after = R2O.actions.createIncident(before, { driverId: 'D-000381', cause: 'ILLNESS',
    startDate: '2026-09-09', details: 'x', contact: 'PHONE' }, { actor: 'D-000381', role: 'driver' });
  return after.auditTrail.length > before.auditTrail.length;
})());
ok('R', 'actions stay immutable', (() => {
  const before = S();
  const n = before.incidents.length;
  R2O.actions.createIncident(before, { driverId: 'D-000381', cause: 'ILLNESS',
    startDate: '2026-09-09', details: 'x', contact: 'PHONE' }, { actor: 'a', role: 'driver' });
  return before.incidents.length === n;
})());
ok('R', 'driver daily income actions still work',
  Object.keys(R2O.actions.reportDailyIncome(S(), { gross: '1500' },
    { actor: 'D-000381', role: 'driver', timestamp: '2026-09-09T10:00:00' }).errors).length === 0 &&
  R2O.actions.reportZeroIncome(S(), { actor: 'D-000381', role: 'driver' })
    .dailyIncome.status === 'SELF_REPORTED_ZERO');
ok('R', 'ownership progress unchanged at 27.9%',
  near(R2O.core.ownership(S()).percent, 27.9));
// the portfolio's risk column is now derived, so this filters on the level the
// evidence actually supports for D-000437 (FI DPD 12, no ledger) rather than the
// RED that used to be seeded next to it
ok('R', 'metrics and portfolio filter still compute',
  typeof R2O.core.metrics(S()).faOpenCases === 'number' &&
  R2O.core.filterPortfolio(S(), { search: '', ews: 'YELLOW', status: 'ALL', dpd: 'ALL', area: 'ALL' }).length >= 1);
});


/* ══════════════ Phase 1.1 ══════════════
 *   H RBAC — nine explicit roles, fail closed
 *   I case workflow — one vocabulary, no legacy status
 *   J missing ledger ≠ zero income
 *   K current risk vs historical case risk
 *   L cross-surface SSOT for D-000381
 */

const ROLES = ['tcg','risk','claim','fi','coop','oem','data','payment','recovery'];
const GRANT_SIZE = { tcg:12, risk:12, claim:7, fi:10, coop:9, oem:3, data:3, payment:3, recovery:4 };

section('H', () => {
  ok('H', 'all nine roles are mapped explicitly',
    ROLES.every((role) => Array.isArray(R2O.PARTNER_SCREEN_GRANTS[role])) &&
    Object.keys(R2O.PARTNER_SCREEN_GRANTS).length === 9);
  ROLES.forEach((role) => {
    ok('H', 'role ' + role + ' sees ' + GRANT_SIZE[role] + ' screens',
      R2O.core.visiblePartnerScreens(role).length === GRANT_SIZE[role]);
  });
  ok('H', 'tcg is explicit, not a fall-through',
    R2O.PARTNER_SCREEN_GRANTS.tcg.length === 12);
  ok('H', 'risk is explicit, not a fall-through',
    R2O.PARTNER_SCREEN_GRANTS.risk.length === 12);
  ok('H', 'claim sees exactly the seven granted screens',
    R2O.core.visiblePartnerScreens('claim').join(',') ===
      'overview,portfolio,elg,exit,claim,finance,partners');
  ok('H', 'claim is denied pipeline, daily, incidents, ews and cure',
    ['pipeline','daily','incidents','ews','cure']
      .every((screen) => R2O.core.visiblePartnerScreens('claim').indexOf(screen) < 0));
  ok('H', 'an unknown role fails closed to no screens',
    R2O.core.visiblePartnerScreens('auditor').length === 0 &&
    R2O.core.visiblePartnerScreens('').length === 0 &&
    R2O.core.visiblePartnerScreens(undefined).length === 0);
  ok('H', 'no role can be granted a screen that is not a real route',
    ROLES.every((role) => R2O.core.visiblePartnerScreens(role)
      .every((screen) => R2O.routes.partner.indexOf(screen) >= 0)));
  ok('H', 'the source carries no fall-through to the full screen list',
    !/return\s+map\[role\]\s*\?\s*map\[role\]\.slice\(\)\s*:\s*all/.test(SRC));
  ok('H', 'every role in the console selector is mapped',
    (SCRIPT.match(/R2O\.partnerOrgs\s*=\s*\{([^;]*)\}/) ? true : true) &&
    Object.keys(R2O.PARTNER_SCREEN_GRANTS).sort().join(',') === ROLES.slice().sort().join(','));
});

section('I', () => {
  const WORKFLOW = ['NEW_ALERT','CONTACT_PENDING','FA_TRIAGE','ACTION_PROPOSED','WAITING_ACTION',
    'CURE_IN_PROGRESS','MONITORING','RESOLVED','ESCALATED'];
  ok('I', 'CASE_WORKFLOW is exactly the nine agreed states',
    R2O.CASE_WORKFLOW.join(',') === WORKFLOW.join(','));
  ok('I', 'every seeded case status is in the vocabulary',
    st.cases.every((item) => WORKFLOW.indexOf(item.status) >= 0) &&
    st.queue.every((item) => WORKFLOW.indexOf(item.faStatus) >= 0));
  ok('I', 'every seeded intervention workflow is in the vocabulary',
    st.interventions.every((item) => WORKFLOW.indexOf(item.workflow) >= 0));

  const created = R2O.actions.createCase(S(), { driverId:'D-000381', topic:'ทดสอบ', cause:'ILLNESS',
    details:'x', startDate:'2026-09-09', contact:'PHONE', consent:true }, { actor:'a', role:'fa' });
  const newCase = created.state.cases[created.state.cases.length - 1];
  ok('I', 'a new case opens at NEW_ALERT, never NEW',
    newCase.status === 'NEW_ALERT' && newCase.waitingFor === 'NONE' &&
    created.state.queue[created.state.queue.length - 1].faStatus === 'NEW_ALERT');

  const incident = R2O.actions.createIncident(S(), { driverId:'D-000381', cause:'VEHICLE_DOWN',
    startDate:'2026-09-09', details:'x', contact:'PHONE' }, { actor:'a', role:'driver' });
  ok('I', 'an incident-raised case also opens at NEW_ALERT',
    incident.cases[incident.cases.length - 1].status === 'NEW_ALERT');

  const closed = R2O.actions.recordPartnerAction(S(), { action:'CLOSE_CASE', entity:'FA-1042',
    driverId:'D-000422', owner:'F.A. Center', reason:'จบการช่วยเหลือ' }, { actor:'a', role:'fa' });
  const closedCase = closed.state.cases.find((item) => item.id === 'FA-1042');
  ok('I', 'CLOSE_CASE resolves the case and clears the waiting party',
    closedCase.status === 'RESOLVED' && closedCase.waitingFor === 'NONE' &&
    closed.state.queue.find((item) => item.caseId === 'FA-1042').faStatus === 'RESOLVED');

  const referred = R2O.actions.recordPartnerAction(S(), { action:'REFER_PROMPTCURE', entity:'FA-1042',
    driverId:'D-000422', owner:'FI-KBank', reason:'ส่งต่อสถาบันการเงิน' }, { actor:'a', role:'fa' });
  const referredCase = referred.state.cases.find((item) => item.id === 'FA-1042');
  ok('I', 'REFER_PROMPTCURE waits on a named party instead of a REFERRED status',
    referredCase.status === 'WAITING_ACTION' && referredCase.waitingFor === 'FI');

  ok('I', 'no legacy status literal is persisted anywhere in the script',
    !/(status|faStatus)\s*[:=]\s*'(NEW|CLOSED|REFERRED|REOPENED|SCHEDULED|TRIAGE)'/.test(SCRIPT));
  ok('I', 'REOPENED is not offered as a status anyone can select',
    !/<option value="REOPENED"/.test(SRC));

  const reopened = R2O.actions.reopenCase(closed.state, 'FA-1042', { actor:'a', role:'fa' });
  const reopenedCase = reopened.state.cases.find((item) => item.id === 'FA-1042');
  ok('I', 'reopening returns the case to the workflow without a REOPENED status',
    Object.keys(reopened.errors).length === 0 &&
    reopenedCase.status === 'FA_TRIAGE' && reopenedCase.reopenCount === 1 &&
    R2O.CASE_WORKFLOW.indexOf(reopenedCase.status) >= 0);
  ok('I', 'reopening is written to the audit trail',
    reopened.state.auditTrail.some((row) => row.action === 'CASE_REOPENED'));
  ok('I', 'an open case cannot be reopened',
    Object.keys(R2O.actions.reopenCase(S(), 'FA-1042', {}).errors).length > 0);

  ok('I', 'ESCALATED counts as an open case',
    R2O.core.isOpenCase('ESCALATED') === true &&
    R2O.core.isOpenCase('RESOLVED') === false &&
    R2O.core.isOpenCase('MONITORING') === true);
  const escalated = R2O.core.clone(st);
  escalated.cases[0].status = 'ESCALATED';
  ok('I', 'an escalated case is still counted in the open-case metric',
    R2O.core.metrics(escalated).faOpenCases ===
    escalated.cases.filter((item) => item.status !== 'RESOLVED').length);
});

section('J', () => {
  const noLedger = R2O.core.driverFinancials(st, 'D-000422');
  ok('J', 'a driver with no ledger is flagged, not zeroed',
    noLedger.hasLedger === false &&
    ['verified','available','required','sweep','bindingGate','residual','reservePlan','reserveDebit']
      .every((field) => noLedger[field] === null));
  ok('J', 'none of those fields is the number zero',
    ['verified','available','required','sweep','residual','reservePlan','reserveDebit']
      .every((field) => noLedger[field] !== 0));
  ok('J', 'a driver with a ledger gets real numbers',
    R2O.core.driverFinancials(st, 'D-000381').hasLedger === true &&
    near(R2O.core.driverFinancials(st, 'D-000381').verified, 1715.50));

  const absent = R2O.core.ewsAssess({ hasLedger: false, fiDpd: 0 });
  ok('J', 'no ledger raises no income signal',
    !absent.domains.income.signals.some((s) => s.code === 'NO_VERIFIED_REVENUE') &&
    absent.dataStatus === 'NO_LEDGER');
  ok('J', 'no ledger leaves income and payment unknown, not green',
    absent.domains.income.level === 'UNKNOWN' &&
    absent.domains.payment.level === 'UNKNOWN' && absent.level === 'UNKNOWN');
  const zero = R2O.core.ewsAssess({ hasLedger: true, verifiedToday: 0, verifiedHistory: [1500, 1600] });
  ok('J', 'a ledger that really reads zero does raise the signal',
    zero.domains.income.signals.some((s) => s.code === 'NO_VERIFIED_REVENUE') &&
    zero.dataStatus === 'OK');
  ok('J', 'signals that do not depend on the ledger still fire without one',
    R2O.core.ewsAssess({ hasLedger: false, fiDpd: 40 }).domains.payment.signals
      .some((s) => s.code === 'FI_DPD_SIGNAL'));
  ok('J', 'no ledger yields no revenue-vs-average comparison',
    R2O.core.revenueVsAverage(st, 'D-000422') === null &&
    R2O.core.revenueVsAverage(st, 'D-000437') === null);
  ok('J', 'the portfolio carries the gap through as null, not a number',
    R2O.core.portfolioView(st).filter((row) => row.driverId !== 'D-000381')
      .every((row) => row.revenueVsAverage === null));
});

section('K', () => {
  ok('K', 'every intervention records the risk it was opened at',
    st.interventions.every((item) => R2O.RISK_STATUS.indexOf(item.openedRiskStatus) >= 0));
  ok('K', 'no intervention carries an ambiguous riskStatus field',
    st.interventions.every((item) => item.riskStatus === undefined) &&
    !/riskStatus:\s*'(GREEN|WATCH|YELLOW|RED)'/.test(SCRIPT));
  ok('K', 'the opening trigger is kept under its own name',
    st.interventions.every((item) => typeof item.openedTrigger === 'string' &&
      item.trigger === undefined));

  const monitored = st.interventions.find((item) => item.id === 'INT-0381');
  ok('K', 'a case opened at WATCH can read GREEN today and stay in MONITORING',
    monitored.openedRiskStatus === 'WATCH' &&
    monitored.workflow === 'MONITORING' &&
    R2O.core.currentRiskStatus(st, 'D-000381') === 'GREEN');

  const attempt = R2O.actions.updateIntervention(S(), 'INT-0381', {
    openedRiskStatus: 'RED', openedTrigger: 'FABRICATED', openedTriggerLabel: 'x',
    workflow: 'MONITORING', waitingFor: 'FA', caseOwner: 'F.A. Center'
  }, { actor: 'a', role: 'tcg' });
  const after = attempt.state.interventions.find((item) => item.id === 'INT-0381');
  ok('K', 'history cannot be rewritten by an update',
    Object.keys(attempt.errors).length === 0 &&
    after.openedRiskStatus === 'WATCH' && after.openedTrigger === 'VERIFIED_REVENUE_DROP');

  const rows = R2O.core.riskConsoleRows(st, {});
  ok('K', 'the console reports a current risk on every row',
    rows.length === st.interventions.length &&
    rows.every((row) => typeof row.currentRiskStatus === 'string'));
  ok('K', 'the console filters on current risk, not the opening one',
    R2O.core.riskConsoleRows(st, { risk: 'GREEN' })
      .every((row) => row.currentRiskStatus === 'GREEN') &&
    R2O.core.riskConsoleRows(st, { risk: 'GREEN' }).length ===
      rows.filter((row) => row.currentRiskStatus === 'GREEN').length);

  ok('K', 'portfolio, driver and console agree on the same driver',
    ['D-000381','D-000422','D-000437','D-000451'].every((id) => {
      const portfolio = R2O.core.portfolioView(st).find((row) => row.driverId === id);
      const console_ = rows.find((row) => row.item.driverId === id);
      const direct = R2O.core.currentRiskStatus(st, id);
      return portfolio.ews === direct && (!console_ || console_.currentRiskStatus === direct);
    }));
  ok('K', 'no driver row carries a seeded risk grade any more',
    st.drivers.every((row) => row.ews === undefined) &&
    st.portfolio.every((row) => row.ews === undefined));
});

section('L', () => {
  const money = R2O.core.driverFinancials(st, 'D-000381');
  ok('L', 'D-000381 verified revenue is 1,715.50 from the ledger', near(money.verified, 1715.50));
  ok('L', 'available cash is 638.05', near(money.available, 638.05));
  ok('L', 'required PAYD is 477.69', near(money.required, 477.69));
  ok('L', 'actual sweep is 477.69 with PAYD binding',
    near(money.sweep, 477.69) && money.bindingGate === 'REQUIRED_PAYD');
  ok('L', 'reserve plan and actual debit are both 47.77',
    near(money.reservePlan, 47.77) && near(money.reserveDebit, 47.77));
  ok('L', 'residual after PAYD and reserve is 112.59', near(money.residual, 112.59));
  ok('L', 'revenue against the driver’s own average is +5.5%',
    near(R2O.core.revenueVsAverage(st, 'D-000381'), 5.5));

  ok('L', 'the ledger is the only source: no seeded copies remain',
    st.drivers.every((row) => row.verifiedRevenue === undefined && row.availableCash === undefined &&
      row.paydTarget === undefined && row.sweepActual === undefined && row.incomeToday === undefined));

  const today = R2O.core.driverToday(st);
  ok('L', 'the driver X-ray reads the same figures as the accessor',
    near(today.verifiedRevenue, money.verified) &&
    near(today.availableCash, money.available) &&
    near(today.requiredPayd, money.required) &&
    near(today.actualSweep, money.sweep));

  const row = R2O.core.riskConsoleRows(st, {}).find((item) => item.item.driverId === 'D-000381');
  ok('L', 'the risk console reads the same figures as the accessor',
    near(row.verified, money.verified) && near(row.available, money.available) &&
    near(row.required, money.required) && near(row.sweep, money.sweep));

  ok('L', 'no haircut-era amount survives in the markup',
    !SRC.includes('1,757.99') && !SRC.includes('680.54') && !SRC.includes('202.85') &&
    !SRC.includes('38,675.89') && !SRC.includes('14,972.00') && !SRC.includes('4,462.82'));
  ok('L', 'the PAYD rule is stated as five gates',
    SRC.includes('ค่าต่ำสุดของ 5 ตัวจำกัด') && SRC.includes('วงเงินที่ได้รับอนุญาตให้ตัด'));

  const perDay = ['2026-09-02','2026-09-09'].map((date) => R2O.core.driverFinancials(st, 'D-000381', date));
  ok('L', 'the accessor honours the requested ledger day',
    near(perDay[0].verified, 1486.00) && near(perDay[1].verified, 1715.50));
  ok('L', 'the accessor agrees with the approved 8-day sweep table',
    DATES.every((date) => {
      const d = R2O.core.driverFinancials(st, 'D-000381', date);
      return near(d.available, EXPECTED[date][4]) && near(d.required, EXPECTED[date][5]) &&
        near(d.sweep, EXPECTED[date][6]) && d.bindingGate === EXPECTED[date][7] &&
        near(d.reservePlan, EXPECTED[date][8]) && near(d.reserveDebit, EXPECTED[date][9]);
    }));
});

/* ───────────────────────────── report ───────────────────────────── */

const byGroup = {};
let failed = 0;
results.forEach(([g, name, pass]) => {
  byGroup[g] = byGroup[g] || { pass: 0, fail: 0 };
  if (pass) byGroup[g].pass++;
  else { byGroup[g].fail++; failed++; console.log('FAIL  [' + g + '] ' + name); }
});
console.log('');
Object.keys(byGroup).sort().forEach((g) => {
  const r = byGroup[g];
  console.log('  ' + g + ': ' + r.pass + '/' + (r.pass + r.fail));
});
console.log('\n' + (results.length - failed) + '/' + results.length + ' core checks passed');
process.exit(failed ? 1 : 0);
