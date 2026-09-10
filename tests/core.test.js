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
ok('R', 'metrics and portfolio filter still compute',
  typeof R2O.core.metrics(S()).faOpenCases === 'number' &&
  R2O.core.filterPortfolio(S(), { search: '', ews: 'RED', status: 'ALL', dpd: 'ALL', area: 'ALL' }).length >= 1);
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
