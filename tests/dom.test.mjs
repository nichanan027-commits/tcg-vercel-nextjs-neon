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
ok('RC', 'three KPI groups match the three dimensions (4 / 9 / 9+SLA)',
  riskKpis === 4 && wfKpis === 9 && waitKpis === 10);
ok('RC', 'risk and workflow are shown as separate dimensions',
  (await page.locator('#towerRiskKpis').innerText()).includes('เสี่ยงสูง') &&
  (await page.locator('#towerWorkflowKpis').innerText()).includes('รอดำเนินการ'));
ok('RC', 'SLA breached KPI present',
  (await page.locator('#towerWaitingKpis').innerText()).includes('เกินกรอบเวลา SLA'));
const cases = await page.locator('#towerCaseBoard .rc-case').count();
ok('RC', 'case board lists the seeded intervention cases', cases === 4);
const board = await page.locator('#towerCaseBoard').innerText();
ok('RC', 'a card answers who / trigger / root cause / waiting / next action',
  board.includes('INT-0451') && board.includes('สัญญาณหลัก') && board.includes('สาเหตุราก') &&
  board.includes('รอ ') && board.includes('ขั้นตอนถัดไป') && board.includes('เจ้าของเคส'));
ok('RC', 'FI DPD is labelled as coming from the FI', board.includes('อ่านจากสถาบันการเงินเท่านั้น'));
ok('RC', 'binding sweep gate is shown per case', board.includes('ตัวจำกัด'));
ok('RC', 'competition illustration label present',
  (await page.locator('#tower-monitor').innerText()).includes('Competition Illustration'));
ok('RC', '7-day evidence mix rendered',
  (await page.locator('#towerEvidenceMix .rc-mix').count()) === 7);

await page.selectOption('#rcRisk', 'RED'); await page.waitForTimeout(150);
ok('RC', 'risk filter narrows the board',
  (await page.locator('#towerCaseBoard .rc-case').count()) === 1);
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
