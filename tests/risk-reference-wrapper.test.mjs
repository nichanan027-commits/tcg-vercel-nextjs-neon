import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.join(import.meta.dirname, '..');
const wrapper = path.join(root, 'competition-final-v3.html');
const vercel = path.join(root, 'vercel.json');

assert.ok(fs.existsSync(wrapper), 'competition-final-v3.html must exist');
const html = fs.readFileSync(wrapper, 'utf8');

assert.match(html, /const CORE_PATH = 'index\.html'/, 'must load existing System B index without changing it');
assert.match(html, /req\.ead\s*=\s*null/, 'per-case EAD must exist as reference data');
assert.match(html, /req\.eligibleNetLoss\s*=\s*null/, 'per-case Eligible Net Loss must exist as reference data');
assert.match(html, /req\.hardMaxClaim\s*=\s*null/, 'per-case HMC must exist as reference data');
assert.doesNotMatch(html, /req\.stopLoss\s*=/, 'Stop Loss must not be assigned per case');
assert.match(html, /compensationRiskControl/, 'portfolio risk-control object must exist');
assert.match(html, /stopLossLimit\s*:\s*null/, 'Stop Loss limit defaults to pending/null');
assert.match(html, /stopLossUtilizationPct\s*:\s*null/, 'Stop Loss utilization defaults to pending/null');
assert.match(html, /ข้อมูลประกอบการพิจารณา/, 'must identify the fields as reference data');
assert.match(html, /Risk \/ Claim Reference Data/, 'must include the reference-data label');
assert.match(html, /ไม่ใช่จำนวนเงินอนุมัติจ่ายอัตโนมัติ/, 'must disclaim automatic payout approval');
assert.doesNotMatch(html, /claimPayable\s*=|Math\.min\s*\(\s*eligibleNetLoss|ead\s*-\s*recovery/i,
  'must not restore legacy claim calculation formulas');
assert.doesNotMatch(html, /insertAdjacentElement\('afterend'/,
  'must not change the existing compensation-request table row model');

const config = JSON.parse(fs.readFileSync(vercel, 'utf8'));
assert.deepEqual(config.rewrites, [{ source: '/', destination: '/competition-final-v3.html' }]);

console.log('PASS: compensation risk/reference shell contract');
