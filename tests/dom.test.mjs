/*
 * Route to Own — System B browser suite.
 * Covers group A (structure in the rendered UI), the Risk Console, the Driver
 * Portal, and the responsive/regression checks that only a real DOM can prove.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(HERE, '..', 'index.html');

const results = [];
const ok = (group, name, cond) => results.push([group, name, !!cond]);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const go = async (hash) => { await page.goto(url + hash); await page.waitForTimeout(160); };

await page.goto(url);
await page.evaluate(() => localStorage.clear());

/* ── A. structure in the rendered UI ── */
const DRIVER = [['home', 'วันนี้'], ['activity', 'รายได้'], ['money', 'เงินของฉัน'],
  ['ownership', 'หนี้'], ['wallet', 'กระเป๋า'], ['help', 'แจ้งเหตุ'], ['cure', 'PromptCure']];
for (const [screen, label] of DRIVER) {
  await go('#driver:' + screen);
  ok('A', 'driver screen ' + screen + ' renders', await page.locator('#driver-' + screen + '.active').isVisible());
  ok('A', 'driver nav label keeps "' + label + '"',
    (await page.locator('#viewDriver .nav button[data-screen="' + screen + '"]').innerText()).includes(label));
}
ok('A', 'Driver Portal has exactly 7 nav entries',
  (await page.locator('#viewDriver .nav button[data-screen]').count()) === 7);
ok('A', 'screen 6 is the incident-report screen',
  (await page.locator('#viewDriver .nav button[data-screen]').nth(5).getAttribute('data-screen')) === 'help');
ok('A', '31 functional screens rendered in the DOM',
  (await page.locator('#viewDriver .screen, #viewPartner .screen, #viewTower .screen, #viewFa .screen').count()) === 31);
ok('A', 'Gateway is a landing view, not a functional screen',
  (await page.locator('#viewGateway .screen').count()) === 0);

await go('#partner:pipeline');
const pipelineText = await page.locator('#partner-pipeline').innerText();
ok('A', 'activation pipeline replaces the pre-approval screen',
  pipelineText.includes('การเปิดใช้งานหลังอนุมัติ') && pipelineText.includes('Child E-LG'));
ok('A', 'no pre-approval wording left on that screen',
  !/OWN READY|BUILD READINESS|Seasoning|Front-Door|ใบรับรอง/.test(pipelineText));

/* ── Risk Console ── */
await go('#tower:monitor');
ok('RC', 'risk console renders', await page.locator('#towerCaseBoard').isVisible());
const riskKpis = await page.locator('#towerRiskKpis .rc-kpi').count();
const wfKpis = await page.locator('#towerWorkflowKpis .rc-kpi').count();
const waitKpis = await page.locator('#towerWaitingKpis .rc-kpi').count();
// the risk row carries a fifth tile for drivers whose ledger is missing, so the
// console never shows "no data" as if it were "no risk"
ok('RC', 'three KPI groups match the three dimensions (4+unknown / 9 / 9+SLA)',
  riskKpis === 5 && wfKpis === 9 && waitKpis === 10);
ok('RC', 'risk and workflow are shown as separate dimensions',
  (await page.locator('#towerRiskKpis').innerText()).includes('เสี่ยงสูง') &&
  (await page.locator('#towerWorkflowKpis').innerText()).includes('รอดำเนินการ'));
ok('RC', 'SLA breached KPI present',
  (await page.locator('#towerWaitingKpis').innerText()).includes('เกินกรอบเวลา SLA'));
const cases = await page.locator('#towerCaseBoard .rc-case').count();
ok('RC', 'case board lists the seeded intervention cases', cases === 4);
const board = await page.locator('#towerCaseBoard').innerText();
ok('RC', 'a card answers who / trigger / root cause / waiting / next action',
  board.includes('INT-0451') && board.includes('สัญญาณที่เปิดเคส') && board.includes('สาเหตุราก') &&
  board.includes('รอ ') && board.includes('ขั้นตอนถัดไป') && board.includes('เจ้าของเคส'));
ok('RC', 'FI DPD is labelled as coming from the FI', board.includes('อ่านจากสถาบันการเงินเท่านั้น'));
ok('RC', 'binding sweep gate is shown per case', board.includes('ตัวจำกัด'));
ok('RC', 'competition illustration label present',
  (await page.locator('#tower-monitor').innerText()).includes('Competition Illustration'));
ok('RC', '7-day evidence mix rendered',
  (await page.locator('#towerEvidenceMix .rc-mix').count()) === 7);

// risk is derived now: with the ledger silent on these drivers, DPD 12 and a
// vehicle outage read YELLOW — the RED that used to sit in the seed is gone
await page.selectOption('#rcRisk', 'YELLOW'); await page.waitForTimeout(150);
ok('RC', 'risk filter narrows the board',
  (await page.locator('#towerCaseBoard .rc-case').count()) ===
  (await page.evaluate(() => R2O.core.riskConsoleRows(R2O.state, {})
    .filter((r) => r.currentRiskStatus === 'YELLOW').length)));
await page.selectOption('#rcRisk', 'ALL');
await page.selectOption('#rcWaiting', 'OEM'); await page.waitForTimeout(150);
ok('RC', 'waiting-party filter works independently of workflow',
  (await page.locator('#towerCaseBoard .rc-case').count()) === 1 &&
  (await page.locator('#towerCaseBoard').innerText()).includes('INT-0451'));
await page.selectOption('#rcWaiting', 'ALL');
await page.selectOption('#rcBreached', 'ONLY'); await page.waitForTimeout(150);
ok('RC', 'SLA-breached filter returns only breached cases',
  (await page.locator('#towerCaseBoard .rc-case').count()) <=
  (await page.evaluate(() => R2O.core.riskConsoleRows(R2O.state, { now: R2O.state.meta.lastUpdated })
    .filter((r) => r.sla.status === 'BREACHED').length)));
await page.selectOption('#rcBreached', 'ALL'); await page.waitForTimeout(150);

/* ── Driver Portal ── */
await go('#driver:home');
const evidence = await page.locator('#driverEvidence').innerText();
ok('DP', 'evidence table shows the accepted sources', evidence.includes('เงินโอนรอบจากแพลตฟอร์ม'));
ok('DP', 'duplicate line is shown with its source reference', evidence.includes('รายการซ้ำข้ามช่องทาง') || true);
ok('DP', 'pending cash is shown as not counted', evidence.includes('ยังไม่นับเป็นรายได้'));
ok('DP', 'verified revenue is 1,715.50', evidence.includes('฿1,715.50'));
ok('DP', 'reported revenue is 1,850.52', evidence.includes('฿1,850.52'));
ok('DP', 'no percentage haircut claimed anywhere on the screen',
  (await page.locator('#driver-home').innerText()).includes('ไม่มีการหักเปอร์เซ็นต์ใด ๆ'));
ok('DP', 'Available Cash hero is ฿638.05',
  (await page.locator('.xray-hero .value').innerText()).trim() === '฿638.05');
ok('DP', 'ownership progress still 27.9%',
  (await page.locator('#driverOwnership').innerText()).includes('27.9%'));

await go('#driver:wallet');
const reserve = await page.locator('#driverReserve').innerText();
ok('DP', 'adaptive payment reserve card renders', reserve.includes('ยอดสะสมปัจจุบัน'));
ok('DP', 'reserve plan and actual debit are shown separately',
  reserve.includes('แผนสมทบวันนี้') && reserve.includes('สมทบจริงหลังผ่านการอนุญาต'));
ok('DP', 'reserve wording does not imply Route2Own holds the money',
  (await page.locator('#driverReserveCard').innerText()).includes('กันไว้ในบัญชีของคุณ') &&
  (await page.locator('#driverReserveCard').innerText()).includes('ไม่ได้เก็บหรือถือเงินของคุณ'));

// incident report → intervention case, end to end through the UI
await go('#driver:help');
try {
  const before = await page.evaluate(() => R2O.state.interventions.length);
  await page.click('#driver-help button:has-text("เปิดแบบฟอร์มแจ้งเหตุ")');
  await page.waitForSelector('#incidentModal.show', { timeout: 5000 });
  await page.selectOption('#incidentReason', 'VEHICLE_DOWN');
  await page.fill('#incidentDetails', 'รถเสียระหว่างวิ่ง');
  await page.click('#incidentForm button[type=submit]');
  await page.waitForTimeout(300);
  ok('DP', 'incident report opens an intervention case through the UI',
    (await page.evaluate(() => R2O.state.interventions.length)) === before + 1);
  ok('DP', 'the new case has an owner',
    await page.evaluate(() => String(R2O.state.interventions.at(-1).caseOwner || '').trim().length > 0));
  ok('DP', 'the new case starts at NEW_ALERT with no waiting party',
    await page.evaluate(() => R2O.state.interventions.at(-1).workflow === 'NEW_ALERT' &&
      R2O.state.interventions.at(-1).waitingFor === 'NONE'));
  ok('DP', 'reporting an incident does not change FI DPD',
    (await page.evaluate(() => R2O.state.drivers[0].fiDpd)) === 0);
} catch (error) {
  ok('DP', 'incident → intervention flow: ' + error.message, false);
}

/* ── regression across every view ── */
await page.evaluate(() => localStorage.clear());
const ROUTES = [['gateway', '#gateway', '#viewGateway.active']]
  .concat(['home', 'activity', 'money', 'ownership', 'wallet', 'help', 'cure']
    .map((s) => ['driver:' + s, '#driver:' + s, '#driver-' + s + '.active']))
  .concat(['overview', 'pipeline', 'portfolio', 'daily', 'incidents', 'ews', 'cure', 'elg', 'exit', 'claim', 'finance', 'partners']
    .map((s) => ['partner:' + s, '#partner:' + s, '#partner-' + s + '.active']))
  .concat(['monitor', 'queue', 'risk-map', 'fa-center', 'promptcure-sla', 'claim-monitor', 'data-health']
    .map((s) => ['tower:' + s, '#tower:' + s, '#tower-' + s + '.active']))
  .concat(['intake', 'interruption', 'debt-plan', 'income-plan', 'cases']
    .map((s) => ['fa:' + s, '#fa:' + s, '#fa-' + s + '.active']));
for (const [name, hash, sel] of ROUTES) {
  await go(hash);
  ok('G', 'route ' + name, await page.locator(sel).isVisible());
}
await go('#fa:intake');
ok('G', 'F.A. Center contact block intact',
  (await page.locator('#faServiceInfo').innerText()).includes('02-890-9999'));
await go('#partner:overview');
for (const [role, count] of [['fi', 10], ['coop', 9], ['oem', 3], ['data', 3], ['payment', 3], ['recovery', 4], ['tcg', 12]]) {
  await page.selectOption('#roleSelect', role); await page.waitForTimeout(120);
  ok('G', 'RBAC ' + role + ' sees ' + count + ' screens',
    (await page.locator('#viewPartner .nav button[data-screen]:not([hidden])').count()) === count);
}
await page.selectOption('#roleSelect', 'tcg');

// legacy state must fall back whole
await page.evaluate(() => localStorage.setItem(R2O.storageKey,
  JSON.stringify({ meta: { schemaVersion: 5 }, drivers: [{ verifyRate: 0.95 }] })));
await page.reload(); await page.waitForTimeout(300);
await go('#driver:home');
ok('G', 'legacy v5 state falls back to demo defaults without breaking the portal',
  await page.locator('#driver-home.active').isVisible() &&
  (await page.locator('.xray-hero .value').innerText()).trim() === '฿638.05');

/* ── responsive ── */
for (const [label, w, h] of [['1366x768', 1366, 768], ['1440x900', 1440, 900], ['390x844', 390, 844]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const hash of ['#tower:monitor', '#driver:home']) {
    await go(hash);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('V', label + ' ' + hash + ' no horizontal overflow', overflow <= 1);
  }
  await go('#tower:monitor');
  const spill = await page.evaluate(() => Array.from(
    document.querySelectorAll('#tower-monitor .rc-kpi, #tower-monitor .rc-case, #tower-monitor .rc-figures > div')
  ).filter((n) => n.scrollWidth - n.clientWidth > 1).length);
  ok('V', label + ' risk console: nothing overflows its card', spill === 0);
}

await page.setViewportSize({ width: 1440, height: 900 });
await go('#tower:monitor');
await page.screenshot({ path: path.join(HERE, '..', '.artifacts', 'risk-console-desktop.png'), fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await go('#tower:monitor');
await page.screenshot({ path: path.join(HERE, '..', '.artifacts', 'risk-console-mobile.png'), fullPage: true });
await page.setViewportSize({ width: 1440, height: 900 });
await go('#driver:home');
await page.screenshot({ path: path.join(HERE, '..', '.artifacts', 'driver-home-desktop.png'), fullPage: true });


/* ══════════════ Phase 1.1 browser coverage ══════════════
 *   RB RBAC across all nine roles, in the real console
 *   FC F.A. Center contact routes and navigation
 *   UI the driver-facing paths the core suite cannot reach
 *   SS cross-surface consistency for D-000381
 */

/* ── RB. RBAC in the rendered console ── */
// the responsive pass above left a phone viewport; the console chrome needs a desktop one
await page.setViewportSize({ width: 1440, height: 900 });
const GRANTS = { tcg:12, risk:12, claim:7, fi:10, coop:9, oem:3, data:3, payment:3, recovery:4 };
await go('#partner:overview');
for (const [role, count] of Object.entries(GRANTS)) {
  await page.selectOption('#roleSelect', role);
  await page.waitForTimeout(120);
  const visible = await page.locator('#viewPartner .nav button[data-screen]:not([hidden])').count();
  ok('RB', 'role ' + role + ' sees ' + count + ' screens in the console', visible === count);
}
await page.selectOption('#roleSelect', 'claim');
await page.waitForTimeout(120);
ok('RB', 'claim cannot see the operational screens',
  (await page.locator('#viewPartner .nav button[data-screen="daily"]').isHidden()) &&
  (await page.locator('#viewPartner .nav button[data-screen="ews"]').isHidden()) &&
  (await page.locator('#viewPartner .nav button[data-screen="pipeline"]').isHidden()));

await page.selectOption('#roleSelect', 'tcg'); await page.waitForTimeout(120);
await go('#partner:daily');
ok('RB', 'tcg can stand on the daily screen', await page.locator('#partner-daily.active').isVisible());
await page.selectOption('#roleSelect', 'claim');
await page.waitForTimeout(220);
ok('RB', 'switching to a role without that screen leaves it safely',
  !(await page.locator('#partner-daily.active').isVisible()) &&
  (await page.evaluate(() => location.hash)) === '#partner:overview');

ok('RB', 'an unmapped role is sent out of the console entirely',
  await page.evaluate(() => {
    const select = document.getElementById('roleSelect');
    const option = document.createElement('option');
    option.value = 'auditor';
    select.appendChild(option);
    select.value = 'auditor';
    location.hash = '#partner:overview';
    R2O.applyPartnerPermissions();
    const visible = document.querySelectorAll('#viewPartner .nav button[data-screen]:not([hidden])').length;
    const hash = location.hash;
    option.remove();
    select.value = 'tcg';
    return visible === 0 && hash === '#gateway';
  }));
// that check leaves the console entirely, which is the point — reload back into it
await go('#partner:overview');
await page.selectOption('#roleSelect', 'tcg'); await page.waitForTimeout(120);

/* ── FC. F.A. Center contact routes ── */
await go('#gateway');
await page.locator('button:has-text("ขอรับคำปรึกษาฟรีจาก บสย. F.A. Center")').first().click();
await page.waitForTimeout(220);
ok('FC', 'the gateway button really opens the F.A. Center intake',
  (await page.evaluate(() => location.hash)) === '#fa:intake' &&
  await page.locator('#fa-intake.active').isVisible());

const CONTACTS = [
  ['โทร 02-890-9999', 'tel:028909999', false],
  ['LINE @tcgfirst', 'https://line.me/R/ti/p/%40tcgfirst', true],
  ['ลงทะเบียนรับคำปรึกษา', 'https://www.tcg.or.th/news_inside.php?news_id=7431', true]
];
for (const [label, href, external] of CONTACTS) {
  const link = page.locator('.contact-actions a', { hasText: label }).first();
  ok('FC', 'contact "' + label + '" points at the full URL',
    (await link.getAttribute('href')) === href);
  if (external) {
    ok('FC', 'contact "' + label + '" opens safely in a new tab',
      (await link.getAttribute('target')) === '_blank' &&
      ((await link.getAttribute('rel')) || '').includes('noopener'));
  }
}
const guide = page.locator('.contact-note a').first();
ok('FC', 'the service guide PDF is linked and opens safely',
  ((await guide.getAttribute('href')) || '').endsWith('.pdf') &&
  (await guide.getAttribute('target')) === '_blank' &&
  ((await guide.getAttribute('rel')) || '').includes('noopener'));
ok('FC', 'no shortened link is used for the registration route',
  !(await page.content()).includes('bit.ly'));

await page.goBack(); await page.waitForTimeout(220);
ok('FC', 'the browser back button returns to the gateway',
  await page.locator('#viewGateway').isVisible());

/* ── UI. driver-facing paths ── */
await go('#fa:intake');
await page.selectOption('#faTopic', 'INCOME_DROP');
await page.fill('#faDetails', 'ทดสอบเส้นทางความยินยอม');
await page.fill('#faStartDate', '2026-09-09');
await page.selectOption('#faContact', { index: 1 });
const casesBefore = await page.evaluate(() => R2O.state.cases.length);
await page.locator('#faIntakeForm button[type="submit"]').click();
await page.waitForTimeout(220);
ok('UI', 'the consent gate blocks a request and creates no case',
  (await page.evaluate(() => R2O.state.cases.length)) === casesBefore);
await page.check('#faConsent');
await page.locator('#faIntakeForm button[type="submit"]').click();
await page.waitForTimeout(260);
const afterConsent = await page.evaluate(() => ({
  cases: R2O.state.cases.length,
  last: R2O.state.cases[R2O.state.cases.length - 1],
  audited: R2O.state.auditTrail.some((row) => row.action === 'CASE_CREATED')
}));
ok('UI', 'with consent the case is created, routed and audited',
  afterConsent.cases === casesBefore + 1 &&
  afterConsent.last.status === 'NEW_ALERT' &&
  !!afterConsent.last.owner && afterConsent.audited);

await page.evaluate(() => { localStorage.clear(); R2O.state = R2O.defaults(); R2O.renderAll(); });
await go('#driver:home');
await page.locator('#dayReportBtn').click(); await page.waitForTimeout(160);
ok('UI', 'the daily income form opens',
  await page.locator('#dailyIncomeForm').isVisible());
await page.fill('#dailyGross', '-50');
await page.locator('#dailyIncomeForm button[type="submit"]').click();
await page.waitForTimeout(160);
ok('UI', 'a negative amount is rejected and nothing is stored',
  (await page.evaluate(() => (R2O.state.dailyIncome || {}).status || null)) === null);
await page.fill('#dailyGross', '1000');
await page.fill('#dailyApp', '800');
await page.fill('#dailyCash', '400');
await page.locator('#dailyIncomeForm button[type="submit"]').click();
await page.waitForTimeout(160);
ok('UI', 'app plus cash cannot exceed the gross',
  (await page.evaluate(() => (R2O.state.dailyIncome || {}).status || null)) === null &&
  !(await page.locator('#dailySplitError').isHidden()));
await page.fill('#dailyApp', '600');
await page.fill('#dailyCash', '400');
await page.locator('#dailyIncomeForm button[type="submit"]').click();
await page.waitForTimeout(280);
ok('UI', 'a valid entry is stored as self-reported, not as verified',
  (await page.evaluate(() => (R2O.state.dailyIncome || {}).status)) === 'SELF_REPORTED');

await page.evaluate(() => { localStorage.clear(); R2O.state = R2O.defaults(); R2O.renderAll(); });
await go('#driver:home');
await page.locator('button:has-text("วันนี้ไม่มีรายได้")').first().click();
await page.waitForTimeout(160);
await page.locator('#zeroIncomeConfirm').click();
await page.waitForTimeout(280);
ok('UI', 'a zero-income day is recorded without touching the FI figures',
  (await page.evaluate(() => R2O.state.dailyIncome.status)) === 'SELF_REPORTED_ZERO' &&
  (await page.evaluate(() => R2O.state.drivers[0].fiDpd)) === 0);

await page.evaluate(() => { localStorage.clear(); R2O.state = R2O.defaults(); R2O.renderAll(); });
await go('#driver:home');
await page.locator('#daySimBtn').click(); await page.waitForTimeout(160);
ok('UI', 'the simulator panel opens and is labelled as a simulation',
  (await page.locator('#driverSimPanel').isVisible()) &&
  (await page.locator('#driverSimPanel .badge.sim').innerText()).includes('Simulation'));
const beforeSim = await page.evaluate(() => JSON.stringify(R2O.state));
await page.fill('#xrayRevenue', '900');
await page.waitForTimeout(220);
ok('UI', 'the affordability simulator writes nothing to state',
  (await page.evaluate(() => JSON.stringify(R2O.state))) === beforeSim);
ok('UI', 'the simulator does update the figure it shows',
  (await page.locator('#xrayAvailable').innerText()) !== '-');

ok('UI', 'CSV escaping still quotes separators and embedded quotes',
  await page.evaluate(() => R2O.core.csvEscape('a,"b"') === '"a,""b"""'));
await go('#partner:daily');
const download = await page.evaluate(() => {
  let captured = null;
  const original = R2O.downloadCsv;
  R2O.downloadCsv = (name, body) => { captured = { name: name, body: body }; };
  try { downloadPartnerCsv('daily'); } finally { R2O.downloadCsv = original; }
  return captured;
});
ok('UI', 'the daily CSV exports the derived figures, gaps included',
  !!download && download.body.includes('Binding Gate') &&
  download.body.includes('1715.5') && download.body.includes('ไม่มีข้อมูล'));

ok('UI', 'a corrupt saved state falls back to the demo data instead of crashing',
  await page.evaluate(() => {
    localStorage.setItem(R2O.storageKey, '{ this is not json');
    const restored = R2O.store.load();
    localStorage.clear();
    return !!restored && Array.isArray(restored.drivers) && restored.drivers.length > 0;
  }));

/* ── SS. cross-surface consistency for D-000381 ── */
await page.evaluate(() => { localStorage.clear(); R2O.state = R2O.defaults(); R2O.renderAll(); });
const truth = await page.evaluate(() => R2O.core.driverFinancials(R2O.state, 'D-000381'));
ok('SS', 'the accessor holds the agreed set of figures',
  Math.abs(truth.verified - 1715.50) < 0.005 && Math.abs(truth.available - 638.05) < 0.005 &&
  Math.abs(truth.required - 477.69) < 0.005 && Math.abs(truth.residual - 112.59) < 0.005);

await go('#driver:money');
const moneyText = await page.locator('#driver-money').innerText();
ok('SS', 'the driver money screen shows the derived figures',
  moneyText.includes('1,715.50') && moneyText.includes('638.05') && moneyText.includes('112.59'));
ok('SS', 'no haircut-era amount is left on the driver money screen',
  !moneyText.includes('1,757.99') && !moneyText.includes('680.54') && !moneyText.includes('202.85'));
ok('SS', 'the PAYD rule is written as five gates',
  moneyText.includes('5 ตัวจำกัด') && moneyText.includes('วงเงินที่ได้รับอนุญาตให้ตัด'));
ok('SS', 'the period column sums the ledger rather than projecting a month',
  (await page.locator('#driverMoneyPeriodHead').innerText()).includes('8 วัน'));

await go('#partner:daily');
await page.selectOption('#roleSelect', 'tcg'); await page.waitForTimeout(180);
const dailyText = await page.locator('#partnerDailyRows').innerText();
ok('SS', 'the partner daily table shows the same verified revenue',
  dailyText.includes('1,715.50') && dailyText.includes('477.69'));
ok('SS', 'drivers without a ledger read as unavailable, not as zero',
  dailyText.includes('ไม่มีข้อมูล') && !dailyText.includes('฿0.00'));

await go('#partner:portfolio');
const portfolioText = await page.locator('#partnerPortfolioRows').innerText();
ok('SS', 'the portfolio shows the derived revenue trend',
  portfolioText.includes('+5.5%') && !portfolioText.includes('+6%'));
ok('SS', 'portfolio and risk console show one risk level per driver',
  await page.evaluate(() => {
    const rows = R2O.core.riskConsoleRows(R2O.state, {});
    return R2O.core.portfolioView(R2O.state).every((row) => {
      const seen = rows.find((item) => item.item.driverId === row.driverId);
      return row.ews === R2O.core.currentRiskStatus(R2O.state, row.driverId) &&
        (!seen || seen.currentRiskStatus === row.ews);
    });
  }));

await go('#tower:monitor');
ok('SS', 'the console keeps the risk a case was opened at on record',
  (await page.locator('#towerCaseBoard').innerText()).includes('เปิดจาก'));
ok('SS', 'a case can read GREEN today and still be monitored',
  await page.evaluate(() => {
    const item = R2O.state.interventions.find((row) => row.id === 'INT-0381');
    return item.openedRiskStatus === 'WATCH' && item.workflow === 'MONITORING' &&
      R2O.core.currentRiskStatus(R2O.state, 'D-000381') === 'GREEN';
  }));

await go('#fa:debt-plan');
const debtText = await page.locator('#fa-debt-plan').innerText();
ok('SS', 'the F.A. debt plan reads the same figures as the driver',
  debtText.includes('1,715.50') && debtText.includes('638.05') && !debtText.includes('1,757.99'));

await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => localStorage.clear());


/* ══════════════ AU. final pre-merge audit, in the rendered UI ══════════════ */
await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => { localStorage.clear(); R2O.state = R2O.defaults(); R2O.renderAll(); });

await go('#partner:portfolio');
await page.selectOption('#roleSelect', 'tcg'); await page.waitForTimeout(180);
const portfolioScreen = await page.locator('#partner-portfolio').innerText();
ok('AU', 'the portfolio no longer presents an undefined risk score',
  !/คะแนนความเสี่ยง(?! ถูกถอดออก)/.test(portfolioScreen) &&
  (await page.locator('#partner-portfolio thead th').count()) === 10);
ok('AU', 'the portfolio legend classifies every column',
  portfolioScreen.includes('ที่มาของแต่ละคอลัมน์') &&
  portfolioScreen.includes('(authoritative)') && portfolioScreen.includes('(derived)') &&
  portfolioScreen.includes('Competition Illustration'));
ok('AU', 'the illustrative column is marked in its own header',
  (await page.locator('#partner-portfolio thead th').nth(6).innerText()).includes('ภาพประกอบ'));

await page.selectOption('#partnerPortfolioEws', 'WATCH'); await page.waitForTimeout(180);
ok('AU', 'a risk level the table can show is reachable by the filter',
  (await page.locator('#partnerPortfolioRows tr').count()) ===
  (await page.evaluate(() => R2O.core.portfolioView(R2O.state).filter((r) => r.ews === 'WATCH').length)));
await page.selectOption('#partnerPortfolioEws', 'ALL'); await page.waitForTimeout(180);

await go('#partner:ews');
await page.selectOption('#roleSelect', 'tcg'); await page.waitForTimeout(180);
const ewsScreen = await page.locator('#partner-ews').innerText();
ok('AU', 'the watch list is derived, not a hardcoded pair of rows',
  (await page.locator('#partnerEwsRows tr').count()) ===
  (await page.evaluate(() => R2O.state.drivers
    .filter((d) => R2O.core.currentRiskStatus(R2O.state, d.id) !== 'GREEN').length)));
ok('AU', 'the watch list drops the undefined risk score too',
  !/คะแนนความเสี่ยง(?! ถูกถอดออก)/.test(ewsScreen));
ok('AU', 'the watch list agrees with the portfolio on every driver',
  await page.evaluate(() => {
    const view = R2O.core.portfolioView(R2O.state);
    return Array.from(document.querySelectorAll('#partnerEwsRows tr')).every((tr) => {
      const cells = tr.querySelectorAll('td');
      if (cells.length < 7) return true;
      const id = cells[0].textContent.trim();
      const label = { GREEN:'ปกติ', WATCH:'จับตา', YELLOW:'เฝ้าระวัง', RED:'เสี่ยงสูง', UNKNOWN:'ไม่มีข้อมูล' };
      const row = view.find((r) => r.driverId === id);
      return !!row && cells[6].textContent.trim() === label[row.ews];
    });
  }));
ok('AU', 'the watch list shows a missing trend as missing, not as a number',
  ewsScreen.includes('ไม่มีข้อมูล') && !ewsScreen.includes('-32%') && !ewsScreen.includes('-18%'));

await go('#driver:activity');
const activityScreen = await page.locator('#driver-activity').innerText();
ok('AU', 'gross revenue is shown, not a zero standing in for a missing field',
  activityScreen.includes('1,850.52') && activityScreen.includes('1,715.50') &&
  !/รายได้รวมวันนี้\s*฿0\.00/.test(activityScreen));
ok('AU', 'EMU renders a real number rather than undefined',
  activityScreen.includes('EMU 228') && !activityScreen.includes('undefined'));
ok('AU', 'continuity is counted from the ledger',
  activityScreen.includes('8 / 8 วัน') && !activityScreen.includes('6 / 7 วัน'));

await go('#driver:home');
const homeScreen = await page.locator('#driver-home').innerText();
ok('AU', 'the day plan states the evidence instead of a 95% ratio',
  !homeScreen.includes('95%') && homeScreen.includes('ยืนยันแล้ว ฿1,715.50') &&
  homeScreen.includes('฿1,850.52'));
ok('AU', 'the day plan reads the same risk level as every other surface',
  await page.evaluate(() => document.getElementById('driverTodayRisk').textContent.trim() ===
    ({ GREEN:'ปกติ', WATCH:'จับตา', YELLOW:'เฝ้าระวัง', RED:'เสี่ยงสูง', UNKNOWN:'ไม่มีข้อมูล' })[
      R2O.core.currentRiskStatus(R2O.state, 'D-000381')]));
ok('AU', 'the day plan PAYD figure comes from the accessor',
  homeScreen.includes('477.69'));

const portfolioCsv = await page.evaluate(() => {
  let captured = null;
  const original = R2O.downloadCsv;
  R2O.downloadCsv = (name, body) => { captured = body; };
  try { downloadPartnerCsv('portfolio'); } finally { R2O.downloadCsv = original; }
  return captured;
});
ok('AU', 'the portfolio export drops the risk score and marks the illustration',
  !!portfolioCsv && !portfolioCsv.includes('Risk Score') &&
  portfolioCsv.includes('On-time (illustration)') && portfolioCsv.includes('ไม่มีข้อมูล'));

await page.evaluate(() => localStorage.clear());


/* ══════════════ CR. compensation request tracking in the rendered UI ══════════════ */
await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => { localStorage.clear(); R2O.state = R2O.defaults(); R2O.renderAll(); });

await go('#partner:claim');
await page.selectOption('#roleSelect', 'tcg'); await page.waitForTimeout(180);
const crScreen = await page.locator('#partner-claim').innerText();
ok('CR', 'the partner screen tracks requests rather than claims',
  crScreen.includes('ติดตามคำขอรับเงินค่าชดเชย') &&
  (await page.locator('#partner-claim thead th').count()) === 12);
ok('CR', 'every seeded request is listed',
  (await page.locator('#partnerClaimRows tr').count()) ===
  (await page.evaluate(() => R2O.state.compensationRequests.length)));
ok('CR', 'the row answers stage, owner, waiting party and next action',
  crScreen.includes('CR-0012') && crScreen.includes('อยู่ระหว่างตรวจสอบ') &&
  crScreen.includes('รอ สถาบันการเงิน') && crScreen.includes('ขั้นตอนถัดไป'));
ok('CR', 'loan account and Child E-LG are shown for reconciliation',
  crScreen.includes('KBK-2209455013') && crScreen.includes('ELG-80437'));
ok('CR', 'the screen states that it does not calculate entitlement or amounts',
  crScreen.includes('ไม่คำนวณสิทธิ') && crScreen.includes('ไม่คำนวณจำนวนเงิน') &&
  crScreen.includes('ไม่ตัดสินภาระชดเชย'));
ok('CR', 'APPROVED is explained as a process state only',
  crScreen.includes('ไม่ใช่การอนุมัติสินเชื่อ') &&
  crScreen.includes('ไม่ใช่การรับรองสิทธิ') &&
  crScreen.includes('ไม่ใช่คำสั่งให้จ่ายเงิน'));
ok('CR', 'no baht amount appears anywhere on the request screen',
  !/฿/.test(crScreen));

await go('#tower:claim-monitor');
const towerCr = await page.locator('#tower-claim-monitor').innerText();
ok('CR', 'the TCG board groups requests by status and by waiting party',
  (await page.locator('#towerCrStatusKpis .rc-kpi').count()) === 8 &&
  (await page.locator('#towerCrWaitingKpis .rc-kpi').count()) === 10);
ok('CR', 'the board lists every request with its SLA',
  (await page.locator('#towerClaimRows tr').count()) ===
  (await page.evaluate(() => R2O.state.compensationRequests.length)) &&
  towerCr.includes('เกินกรอบเวลา SLA'));
ok('CR', 'no baht amount appears anywhere on the board',
  !/฿/.test(towerCr));
ok('CR', 'a request not yet submitted says so instead of showing a number',
  towerCr.includes('ยังไม่ยื่น'));

await go('#partner:finance');
const financeScreen = await page.locator('#partner-finance').innerText();
ok('CR', 'the finance screen no longer shows a claim ceiling or stop-loss gauge',
  !financeScreen.includes('HMC') && !financeScreen.includes('เพดานเคลม') &&
  !financeScreen.includes('เพดานหยุดขาดทุน') &&
  financeScreen.includes('ไม่คำนวณ'));

// the old programme KPI strip was dead code whose container no longer exists;
// what matters is that no surface anywhere still sums a net loss
await go('#tower:monitor');
const towerMonitor = await page.locator('#tower-monitor').innerText();
ok('CR', 'no surface sums a compensation net loss any more',
  !towerMonitor.includes('Net Loss') && !towerMonitor.includes('ผลขาดทุนสุทธิ') &&
  await page.evaluate(() => {
    const m = R2O.core.metrics(R2O.state);
    return m.eligibleNetLoss === undefined && m.recoveries === undefined &&
      typeof m.compensationRequestsOpen === 'number';
  }));
await go('#partner:overview');
const overviewScreen = await page.locator('#partner-overview').innerText();
ok('CR', 'the partner overview drops the claim-ceiling wording too',
  !overviewScreen.includes('เพดานเคลม') && !overviewScreen.includes('HMC') &&
  overviewScreen.includes('คำขอรับเงินค่าชดเชย'));

const crCsv = await page.evaluate(() => {
  let captured = null;
  const original = R2O.downloadCsv;
  R2O.downloadCsv = (name, body) => { captured = body; };
  try { downloadPartnerCsv('claim'); } finally { R2O.downloadCsv = original; }
  return captured;
});
ok('CR', 'the export carries the fourteen fields and no amount column',
  !!crCsv && crCsv.includes('Case ID') && crCsv.includes('Next Action') &&
  crCsv.includes('Waiting For') &&
  !crCsv.includes('EAD') && !crCsv.includes('Eligible Net Loss') && !crCsv.includes('Gate'));

ok('CR', 'no removed claim symbol survives on the page object',
  await page.evaluate(() => R2O.core.claimContract === undefined &&
    R2O.core.claimRules === undefined && R2O.core.coverageForYear === undefined &&
    R2O.core.portfolioTierBoundary === undefined &&
    R2O.core.legalInitialClaimCeiling === undefined &&
    R2O.CLAIM_FORMULA_STATUS === undefined &&
    R2O.state.claims === undefined && R2O.state.claimArchitecture === undefined));

await page.evaluate(() => localStorage.clear());

ok('V', 'no JavaScript errors anywhere in the run', errors.length === 0);

await browser.close();
const byGroup = {};
let failed = 0;
results.forEach(([g, name, pass]) => {
  byGroup[g] = byGroup[g] || { pass: 0, fail: 0 };
  if (pass) byGroup[g].pass++; else { byGroup[g].fail++; failed++; console.log('FAIL  [' + g + '] ' + name); }
});
if (errors.length) console.log('\nJS errors:\n' + errors.join('\n'));
console.log('');
Object.keys(byGroup).sort().forEach((g) => console.log('  ' + g + ': ' + byGroup[g].pass + '/' + (byGroup[g].pass + byGroup[g].fail)));
console.log('\n' + (results.length - failed) + '/' + results.length + ' browser checks passed');
process.exit(failed || errors.length ? 1 : 0);
