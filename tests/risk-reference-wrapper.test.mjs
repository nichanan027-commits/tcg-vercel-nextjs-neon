import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');
const page = path.join(root, 'competition-final-v3.html');
const vercel = path.join(root, 'vercel.json');

assert.ok(fs.existsSync(page), 'competition-final-v3.html must exist');
const html = fs.readFileSync(page, 'utf8');

assert.match(html, /EAD · Exposure at Default/, 'case-level EAD must be visible');
assert.match(html, /Eligible Net Loss/, 'case-level Eligible Net Loss must be visible');
assert.match(html, /HMC · Hard Max Claim/, 'case-level HMC must be visible');
assert.match(html, /Stop Loss Limit/, 'portfolio-level Stop Loss limit must be visible');
assert.match(html, /Stop Loss Utilization/, 'portfolio-level Stop Loss utilization must be visible');

assert.match(html, /ead:null/, 'EAD must default to pending/null rather than an invented amount');
assert.match(html, /eligibleNetLoss:null/, 'Eligible Net Loss must default to pending/null');
assert.match(html, /hardMaxClaim:null/, 'HMC must default to pending/null');
assert.match(html, /stopLossLimit:null/, 'Stop Loss limit must default to pending/null');
assert.match(html, /stopLossUtilizationPct:null/, 'Stop Loss utilization must default to pending/null');

assert.match(html, /ระดับรายคำขอ/, 'case-level scope must be stated');
assert.match(html, /ตัวควบคุมระดับพอร์ต/, 'portfolio-level scope must be stated');
assert.match(html, /ไม่ใช่จำนวนเงินอนุมัติจ่ายอัตโนมัติ/, 'automatic payout approval must be disclaimed');

assert.doesNotMatch(
  html,
  /claimPayable\s*=|Math\.min\s*\(\s*eligibleNetLoss|ead\s*-\s*recovery/i,
  'legacy claim-calculation formulas must not be restored'
);

assert.match(html, /driver:\['home','activity','money','ownership','wallet','help','cure'\]/,
  'Driver Portal must keep 7 routes');
assert.match(html, /partner:\['overview','pipeline','portfolio','daily','incidents','ews','cure','elg','exit','claim','finance','partners'\]/,
  'Partner workspace must keep 12 routes');
assert.match(html, /tower:\['monitor','queue','risk-map','fa-center','promptcure-sla','claim-monitor','data-health'\]/,
  'Control Tower must keep 7 routes');
assert.match(html, /fa:\['intake','interruption','debt-plan','income-plan','cases'\]/,
  'F.A. Center must keep 5 routes');

const config = JSON.parse(fs.readFileSync(vercel, 'utf8'));
assert.deepEqual(config.rewrites, [{ source: '/', destination: '/competition-final-v3.html' }]);

console.log('PASS: competition risk/reference contract');
