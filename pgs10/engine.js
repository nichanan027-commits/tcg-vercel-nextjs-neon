/*
 * PGS 10 Claim Audit — Rule Engine (prototype)
 * Rule set: "PGS10 Claim Audit Master Rules — Version 2026.09.29" (Master Audit Rulebook, 22 Controls).
 * Where the Rulebook and the longer Master Audit disagree, this engine follows the Rulebook.
 *
 * Pure functions, no DOM. Works in the browser (window.PGS10) and in Node (module.exports).
 * Money is handled as integer satang and rounded with ROUND_HALF_UP — never floating point.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PGS10 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RULE_VERSION = 'PGS10 Claim Audit Master Rules — Version 2026.09.29';

  // Items the Rulebook (§32) says must stay configurable until a rule source confirms them.
  const DEFAULT_CONFIG = {
    moneyToleranceSatang: 1, // Control 16: interest/total variance that is only an OBSERVATION (0.01 baht)
    lgAgeBasis: 'CLAIM_DATE', // 'CLAIM_DATE' | 'CLAIM_YEAR' — how "LG age" is counted (UNCONFIRMED, §32)
    ssmeLimits: { SMALL_BIZ: 20000000, START_UP: 10000000 }, // satang per borrower (Control 01)
    productRuleMatrix: {
      SMALL_BIZ: {
        source: 'Rulebook Control 19',
        tiers: [{ maxYears: 5, ratioBp: 7000 }, { maxYears: Infinity, ratioBp: 10000 }],
      },
      START_UP: {
        source: 'Master Audit §7 (not locked in Rulebook)',
        tiers: [{ maxYears: Infinity, ratioBp: 10000 }],
      },
    },
  };

  const STATUS_LABEL_TH = {
    PASS: 'ผ่าน',
    PASS_WITH_DOCUMENTARY_SUPPORT: 'ผ่าน (มีเอกสารรองรับ)',
    OBSERVATION: 'ข้อสังเกต',
    HOLD_MISSING_DOCUMENT: 'พัก · เอกสารขาด',
    HOLD_INCOMPLETE_DOCUMENT: 'พัก · เอกสารไม่สมบูรณ์',
    HOLD_DATA_MISMATCH: 'พัก · ข้อมูลไม่ตรง',
    HOLD_NEED_CLARIFICATION: 'พัก · ต้องชี้แจง',
    FAIL_ELIGIBILITY: 'ไม่ผ่าน · ขาดคุณสมบัติ',
    NOT_APPLICABLE: 'ไม่เกี่ยวข้อง',
    NOT_TESTABLE: 'ตรวจไม่ได้ · ข้อมูลไม่ครบ',
  };

  const TXN_TYPES = ['PAYMENT', 'INTEREST_ACCRUAL', 'ADJUSTMENT', 'REVERSAL', 'FEE', 'PRINCIPAL_ADJUSTMENT', 'UNKNOWN'];

  const CONFIRM_ITEMS = [
    ['header', 'หัวหนังสือ / ตราธนาคาร'],
    ['date', 'วันที่หนังสือ'],
    ['subject', 'เรื่อง'],
    ['recipient', 'เรียน'],
    ['debtor', 'ชื่อลูกหนี้'],
    ['account', 'เลขบัญชี / สัญญา'],
    ['default_date', 'วันที่ผิดนัด'],
    ['payments', 'รายการชำระหลังผิดนัด'],
    ['not_per_terms', 'ข้อความว่าชำระไม่เป็นไปตามเงื่อนไข'],
    ['confirm_default', 'ข้อความยืนยัน Default Date เดิม'],
    ['signature', 'ลายมือชื่อ'],
    ['authority', 'ชื่อ / ตำแหน่งผู้มีอำนาจ'],
  ];

  const VIS_DOCS = [
    ['approval', 'หนังสือแจ้งผลอนุมัติ / สัญญา'],
    ['demand', 'หนังสือบอกกล่าว'],
    ['tracking', 'รายงานติดตามหนี้'],
    ['postal', 'ใบตอบรับ / ซองตีกลับ'],
    ['restructure', 'เอกสารปรับโครงสร้างหนี้'],
  ];

  const ID_COLS = [
    ['screen', 'หน้าจอ'],
    ['lg', 'หนังสือค้ำประกัน'],
    ['approval', 'อนุมัติ/สัญญา'],
    ['statement', 'Statement'],
    ['demand', 'หนังสือบอกกล่าว'],
  ];
  const ID_ROWS = [
    ['lg', 'เลข LG', 'text'],
    ['name', 'ชื่อผู้กู้', 'text'],
    ['acct', 'เลขบัญชีสินเชื่อ', 'text'],
    ['limit', 'วงเงินสินเชื่อ', 'money'],
    ['lgdate', 'วันที่ LG', 'date'],
  ];

  // ---------------------------------------------------------------- field schema (= data dictionary)
  const FIELDS = {};
  const F = (key, t, label) => { FIELDS[key] = { t, label }; };

  F('pgs_phase', 'text', 'PGS ระยะ');
  F('pgs_revision', 'text', 'ปรับปรุงครั้งที่');
  F('product', 'text', 'Product');
  F('loan_new_business', 'text', 'สินเชื่อใหม่เพื่อธุรกิจ');
  F('loan_hp_leasing', 'text', 'สินเชื่อเช่าซื้อ/ลิสซิ่ง');
  F('total_exposure_per_person', 'money', 'วงเงินรวมต่อราย');
  ID_ROWS.forEach(([r, rl, t]) => ID_COLS.forEach(([c, cl]) => F(`id_${r}_${c}`, t, `${rl} (${cl})`)));
  F('approval_date', 'date', 'วันที่แจ้งผลอนุมัติ (= วันที่ทำสัญญา)');
  F('demand_contract_date', 'date', 'วันที่สัญญาที่อ้างในหนังสือบอกกล่าว');
  F('approval_total_pages', 'int', 'จำนวนหน้าเอกสารอนุมัติ (X ใน "1 of X")');
  F('approval_pages_found', 'text', 'หมายเลขหน้าเอกสารที่พบ');
  F('default_date_screen', 'date', 'วันที่ผิดนัดชำระหนี้ (หน้าจอ)');
  F('exc_letter_present', 'text', 'มีหนังสือยืนยันการชำระหลังวันผิดนัด');
  F('exc_confirmed_default_date', 'date', 'Default Date ที่ระบุในหนังสือยืนยัน');
  F('fup_screen_date', 'date', 'วันที่ติดตาม (หน้าจอ)');
  F('fup_report_date', 'date', 'วันที่ติดตาม (รายงานติดตาม)');
  F('fup_method', 'text', 'วิธีติดตาม');
  F('fup_result', 'text', 'ผลติดตาม');
  F('rst_has', 'text', 'มีการปรับโครงสร้างหนี้');
  F('rst_screen_date', 'date', 'วันที่ปรับโครงสร้าง (หน้าจอ)');
  F('rst_doc_signing', 'date', 'วันที่ลงนาม (เอกสารปรับโครงสร้าง)');
  F('rst_doc_approval', 'date', 'วันที่อนุมัติ (เอกสารปรับโครงสร้าง)');
  F('rst_doc_effective', 'date', 'วันที่มีผล (เอกสารปรับโครงสร้าง)');
  F('rst_stmt_header_date', 'date', 'วันที่ปรับโครงสร้าง/รับความช่วยเหลือ (หัว Statement)');
  F('dmd_date_screen', 'date', 'วันที่หนังสือบอกกล่าว (หน้าจอ)');
  F('dmd_date_letter', 'date', 'วันที่หนังสือบอกกล่าว (ตัวหนังสือ)');
  F('dmd_principal', 'money', 'เงินต้นในหนังสือบอกกล่าว');
  F('dmd_interest', 'money', 'ดอกเบี้ยในหนังสือบอกกล่าว');
  F('dmd_total', 'money', 'ยอดรวมในหนังสือบอกกล่าว');
  F('stmt_principal_at_demand', 'money', 'เงินต้น Statement ณ วันบอกกล่าว');
  F('hist_principal', 'money', 'สภาพหนี้ ณ วันบอกกล่าว — เงินต้น (หน้าจอ)');
  F('hist_interest', 'money', 'สภาพหนี้ ณ วันบอกกล่าว — ดอกเบี้ย (หน้าจอ)');
  F('hist_total', 'money', 'สภาพหนี้ ณ วันบอกกล่าว — รวม (หน้าจอ)');
  F('pst_outcome', 'text', 'ผลการส่งไปรษณีย์');
  F('pst_send_date', 'date', 'วันที่ส่งหนังสือ');
  F('pst_received_date', 'date', 'วันที่ผู้รับลงนามรับ');
  F('pst_signature', 'text', 'ลายมือชื่อในใบตอบรับ');
  F('pst_returned_evidence', 'text', 'หลักฐานซองตีกลับ/คืนผู้ฝาก');
  F('pst_tracking_linked', 'text', 'เลขไปรษณีย์ใบตอบรับ/ซองเป็นชุดเดียวกัน');
  F('cur_screen_principal', 'money', 'ภาระหนี้ปัจจุบัน — เงินต้น (หน้าจอ)');
  F('cur_screen_interest', 'money', 'ภาระหนี้ปัจจุบัน — ดอกเบี้ย (หน้าจอ)');
  F('cur_screen_total', 'money', 'ภาระหนี้ปัจจุบัน — รวม (หน้าจอ)');
  F('cur_stmt_principal', 'money', 'Statement ล่าสุด — เงินต้น');
  F('cur_stmt_interest', 'money', 'Statement ล่าสุด — ดอกเบี้ย');
  F('cur_stmt_other', 'money', 'Statement ล่าสุด — ยอดอื่น ๆ');
  F('stm_cutoff_date', 'date', 'Statement ถึงวันที่ (cut-off)');
  F('later_payment_date', 'date', 'วันที่ชำระหลัง cut-off (จากเอกสารอื่น)');
  F('later_payment_amount', 'money', 'ยอดชำระหลัง cut-off');
  F('later_stmt_covers', 'text', 'มี Statement ใหม่ครอบคลุมการชำระนั้น');
  F('guarantee_exposure', 'money', 'ภาระค้ำประกันปัจจุบัน');
  F('cb_screen_base', 'money', 'ฐานคำนวณค่าประกันชดเชย (หน้าจอ)');
  F('cb_screen_mode', 'text', 'โหมดฐานคำนวณ (หน้าจอ)');
  F('claim_app_date', 'date', 'วันที่ยื่นคำขอรับเงิน');
  F('cr_screen_ratio', 'pct', 'อัตราค่าประกันชดเชย % (หน้าจอ)');
  F('claim_amount_screen', 'money', 'จำนวนเงินค่าประกันชดเชย (หน้าจอ)');
  F('claim_paid_screen', 'money', 'ยอดอนุมัติจ่าย (หน้าจอ)');
  F('cap_max', 'money', 'CLAIM MAX');
  F('cap_paid', 'money', 'ยอดจ่ายจริง');
  F('cap_pending', 'money', 'ยอดรอจ่าย');
  F('cap_screen_available', 'money', 'คงเหลือจ่ายได้อีก (หน้าจอ)');
  F('cap_screen_after', 'money', 'คงเหลือหลังอนุมัติ (หน้าจอ)');
  F('tl_bank_submission_date', 'date', 'วันที่ธนาคารส่งคำขอ');
  F('tl_complete_docs_date', 'date', 'วันที่เอกสารครบ');
  F('tl_payment_approval_date', 'date', 'วันที่อนุมัติจ่าย');

  // ---------------------------------------------------------------- parsing / formatting
  const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
  const latinDigits = (s) => String(s).replace(/[๐-๙]/g, (c) => THAI_DIGITS.indexOf(c));

  function parseDate(raw) {
    const s = latinDigits(String(raw == null ? '' : raw).trim());
    if (!s) return { state: 'missing' };
    let m, y, mo, d;
    if ((m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else return { state: 'invalid' };
    if (y >= 2400) y -= 543; // Buddhist Era
    const t = Date.UTC(y, mo - 1, d);
    const dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { state: 'invalid' };
    return { state: 'ok', value: t };
  }
  const pad2 = (n) => String(n).padStart(2, '0');
  function fmtDate(t) {
    if (t == null) return '—';
    const d = new Date(t);
    return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear() + 543}`;
  }
  function addYears(t, n) {
    const d = new Date(t);
    const y = d.getUTCFullYear() + n, m = d.getUTCMonth();
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return Date.UTC(y, m, Math.min(d.getUTCDate(), last));
  }

  function parseMoney(raw) {
    const s = latinDigits(String(raw == null ? '' : raw)).replace(/[,\s฿]|บาท/g, '');
    if (!s) return { state: 'missing' };
    const m = /^(-?)(\d{1,13})(?:\.(\d{1,2}))?$/.exec(s);
    if (!m) return { state: 'invalid' };
    const v = Number(m[2]) * 100 + Number((m[3] || '').padEnd(2, '0') || 0);
    return { state: 'ok', value: m[1] ? -v : v };
  }
  function fmtMoney(satang) {
    if (satang == null) return '—';
    const neg = satang < 0, a = Math.abs(satang);
    const baht = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${neg ? '-' : ''}${baht}.${pad2(a % 100)}`;
  }
  function parsePercent(raw) {
    const s = latinDigits(String(raw == null ? '' : raw)).replace(/[%\s]/g, '');
    if (!s) return { state: 'missing' };
    const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(s);
    if (!m) return { state: 'invalid' };
    return { state: 'ok', value: Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0') || 0) }; // basis points
  }
  const fmtPct = (bp) => (bp == null ? '—' : `${(bp / 100).toFixed(bp % 100 ? 2 : 0)}%`);
  function parseInteger(raw) {
    const s = latinDigits(String(raw == null ? '' : raw)).trim();
    if (!s) return { state: 'missing' };
    return /^\d{1,4}$/.test(s) ? { state: 'ok', value: Number(s) } : { state: 'invalid' };
  }
  // claim = round_half_up(satang * ratioBp / 10000), exact via BigInt
  const mulRoundHalfUp = (satang, bp) => Number((BigInt(satang) * BigInt(bp) + 5000n) / 10000n);

  function parsePages(raw) {
    const s = latinDigits(String(raw || '')).replace(/\s+/g, '');
    if (!s) return null;
    const out = new Set();
    for (const part of s.split(',')) {
      let m;
      if ((m = /^(\d+)$/.exec(part))) out.add(+m[1]);
      else if ((m = /^(\d+)[-–](\d+)$/.exec(part)) && +m[1] <= +m[2] && +m[2] < 10000) for (let i = +m[1]; i <= +m[2]; i++) out.add(i);
      else return null;
    }
    return out;
  }

  // ---------------------------------------------------------------- normalisation helpers
  const normLG = (s) => latinDigits(s).toLowerCase().replace(/[\s\-–—_./]/g, '');
  const normName = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const digitsOnly = (s) => latinDigits(s).replace(/\D/g, '');

  const ADDR_FIELDS = [
    ['house', 'บ้านเลขที่'], ['moo', 'หมู่'], ['tambon', 'ตำบล/แขวง'],
    ['amphoe', 'อำเภอ/เขต'], ['province', 'จังหวัด'], ['zip', 'รหัสไปรษณีย์'],
  ];
  // Abbreviation normalisation only (ต.=ตำบล, อ.=อำเภอ, จ.=จังหวัด). House number is never fuzzy-matched.
  function normAddrPart(kind, raw) {
    let s = latinDigits(String(raw || '')).toLowerCase().replace(/\s+/g, '');
    if (kind === 'moo') s = s.replace(/^(หมู่ที่|หมู่|ม\.?)/, '');
    else if (kind === 'tambon') s = s.replace(/^(ตำบล|แขวง|ต\.?)/, '');
    else if (kind === 'amphoe') s = s.replace(/^(อำเภอ|เขต|อ\.?)/, '');
    else if (kind === 'province') s = s.replace(/^(จังหวัด|จ\.?)/, '');
    return s.replace(/[.,]/g, '');
  }
  const addrEmpty = (a) => !a || ADDR_FIELDS.every(([k]) => !String((a || {})[k] || '').trim());
  function addrDiff(a, b) {
    return ADDR_FIELDS.filter(([k]) => normAddrPart(k, a[k]) !== normAddrPart(k, b[k])).map(([k, l]) => l);
  }
  const fmtAddr = (a) => ADDR_FIELDS.map(([k]) => String(a[k] || '').trim()).filter(Boolean).join(' ') || '—';

  // ---------------------------------------------------------------- context
  function makeCtx(input) {
    const rawOf = (k) => (input[k] == null ? '' : String(input[k]).trim());
    const cache = {};
    function f(k) {
      if (cache[k]) return cache[k];
      const def = FIELDS[k] || { t: 'text' };
      const raw = rawOf(k);
      let r;
      if (def.t === 'date') r = parseDate(raw);
      else if (def.t === 'money') r = parseMoney(raw);
      else if (def.t === 'pct') r = parsePercent(raw);
      else if (def.t === 'int') r = parseInteger(raw);
      else r = raw ? { state: 'ok', value: raw } : { state: 'missing' };
      return (cache[k] = r);
    }
    return {
      input,
      raw: rawOf,
      f,
      has: (k) => f(k).state === 'ok',
      v: (k) => (f(k).state === 'ok' ? f(k).value : undefined),
      label: (k) => (FIELDS[k] ? FIELDS[k].label : k),
      problems(keys) {
        const missing = [], invalid = [];
        keys.forEach((k) => {
          const s = f(k).state;
          if (s === 'missing') missing.push(this.label(k));
          else if (s === 'invalid') invalid.push(this.label(k));
        });
        return missing.length || invalid.length ? { missing, invalid } : null;
      },
    };
  }

  // ---------------------------------------------------------------- control metadata + result builder
  const META = {
    1: { id: 'PGS10-ELIG-001', name: 'Project / Product Eligibility', sec: 'prog' },
    2: { id: 'PGS10-ID-001', name: 'Identity Integrity', sec: 'id' },
    3: { id: 'PGS10-CONTRACT-001', name: 'Contract / Approval Date', sec: 'contract' },
    4: { id: 'PGS10-DOC-001', name: 'Document Page Completeness', sec: 'doc' },
    5: { id: 'PGS10-VIS-001', name: 'Visual Completeness', sec: 'vis' },
    6: { id: 'PGS10-STM-001', name: 'Last Actual Payment', sec: 'stm' },
    7: { id: 'PGS10-DEF-001', name: 'Default Date ≥ Last Actual Payment', sec: 'def' },
    8: { id: 'PGS10-DEF-002', name: 'Post-Default Payment Exception', sec: 'def' },
    9: { id: 'PGS10-FUP-001', name: 'Follow-up / Collection Evidence', sec: 'fup' },
    10: { id: 'PGS10-RST-001', name: 'Restructuring Date', sec: 'rst' },
    11: { id: 'PGS10-DMD-001', name: 'Demand Letter Identity', sec: 'dmd' },
    12: { id: 'PGS10-DMD-002', name: 'Demand Principal = Statement Principal', sec: 'dmd' },
    13: { id: 'PGS10-HIS-001', name: 'Historical Debt ณ วันออกหนังสือบอกกล่าว', sec: 'hist' },
    14: { id: 'PGS10-PST-001', name: 'Postal / Demand Letter Evidence', sec: 'pst' },
    15: { id: 'PGS10-PST-002', name: 'Address Match', sec: 'addr' },
    16: { id: 'PGS10-CUR-001', name: 'Current Outstanding', sec: 'cur' },
    17: { id: 'PGS10-STM-002', name: 'Statement Cut-off vs Later Payments', sec: 'cutoff' },
    18: { id: 'PGS10-CLM-003', name: 'Claim Base', sec: 'claim' },
    19: { id: 'PGS10-CLM-002', name: 'Coverage Ratio', sec: 'claim' },
    20: { id: 'PGS10-CLM-004', name: 'Claim Amount', sec: 'claim' },
    21: { id: 'PGS10-CAP-001', name: 'CLAIM MAX / Portfolio Cap', sec: 'cap' },
    22: { id: 'PGS10-TIME-001', name: 'Timeline Integrity', sec: 'time' },
  };

  function mk(no, status, o) {
    const m = META[no];
    return Object.assign(
      { control_no: no, control_id: m.id, name: m.name, severity: 'HARD', status, reason_code: '', message: '', expected: null, observed: null, details: [], derived: null, evidence: '', rule_version: RULE_VERSION },
      o || {}
    );
  }
  function blocked(no, p) {
    if (p.invalid.length) return mk(no, 'HOLD_NEED_CLARIFICATION', { reason_code: 'INVALID_INPUT', message: `รูปแบบข้อมูลไม่ถูกต้อง: ${p.invalid.join(', ')}`, details: p.missing.length ? [`ขาดข้อมูล: ${p.missing.join(', ')}`] : [] });
    return mk(no, 'NOT_TESTABLE', { reason_code: 'MISSING_INPUT', message: `ขาดข้อมูล: ${p.missing.join(', ')}` });
  }
  const isBlocking = (s) => s.startsWith('HOLD') || s.startsWith('FAIL') || s === 'NOT_TESTABLE';

  // ---------------------------------------------------------------- controls
  function c01(ctx, cfg) {
    const phase = ctx.raw('pgs_phase'), prod = ctx.raw('product'), rev = ctx.raw('pgs_revision');
    const nb = ctx.raw('loan_new_business'), hp = ctx.raw('loan_hp_leasing');
    const fails = [], holds = [];
    if (phase === 'OTHER') fails.push('ไม่ใช่ PGS ระยะที่ 10');
    if (prod === 'NOT_PGS10') fails.push('Product ไม่อยู่ในโครงการที่เข้าเกณฑ์');
    if (hp === 'Y') fails.push('เป็นสินเชื่อเช่าซื้อ/ลิสซิ่ง (ข้อยกเว้นของโครงการ)');
    if (nb === 'N') fails.push('ไม่ใช่สินเชื่อใหม่เพื่อธุรกิจ');
    const limit = cfg.ssmeLimits[prod];
    if (limit != null && ctx.has('total_exposure_per_person') && ctx.v('total_exposure_per_person') > limit)
      fails.push(`วงเงินรวมต่อราย ${fmtMoney(ctx.v('total_exposure_per_person'))} เกินเพดาน ${fmtMoney(limit)} ของ ${prod}`);
    if (ctx.f('total_exposure_per_person').state === 'invalid') holds.push('รูปแบบวงเงินรวมต่อรายไม่ถูกต้อง');
    if (!phase) holds.push('ยังไม่ระบุ PGS ระยะ');
    if (!prod) holds.push('ยังระบุ Product ไม่ได้');
    if (!rev) holds.push('ยังไม่ระบุรุ่นปรับปรุงของหลักเกณฑ์');
    else if (rev !== '5') holds.push(`ชุดกฎนี้ล็อกไว้ที่ "ปรับปรุงครั้งที่ 5" แต่ระบุ ${rev}`);
    if (!nb) holds.push('ยังไม่ยืนยันว่าเป็นสินเชื่อใหม่เพื่อธุรกิจ');
    if (!hp) holds.push('ยังไม่ยืนยันว่าไม่ใช่เช่าซื้อ/ลิสซิ่ง');
    if (fails.length) return mk(1, 'FAIL_ELIGIBILITY', { reason_code: 'NOT_ELIGIBLE', message: fails[0], details: fails.concat(holds) });
    if (holds.length) return mk(1, 'HOLD_NEED_CLARIFICATION', { reason_code: prod ? 'ELIGIBILITY_UNCONFIRMED' : 'PRODUCT_UNKNOWN', message: holds[0], details: holds });
    return mk(1, 'PASS', { message: `PGS 10 ปรับปรุงครั้งที่ 5 · ${prod}`, observed: prod });
  }

  function c02(ctx) {
    const need = ['id_lg_screen', 'id_name_screen', 'id_acct_screen'];
    const p = ctx.problems(need);
    if (p) return blocked(2, p);
    const mism = [], mapping = [], fmt = [], invalid = [];
    let compared = 0;
    ID_ROWS.forEach(([r, rl, t]) => {
      const sk = `id_${r}_screen`;
      if (!ctx.has(sk)) { if (ctx.f(sk).state === 'invalid') invalid.push(ctx.label(sk)); return; }
      ID_COLS.slice(1).forEach(([c, cl]) => {
        const k = `id_${r}_${c}`, st = ctx.f(k).state;
        if (st === 'missing') return;
        if (st === 'invalid') { invalid.push(ctx.label(k)); return; }
        compared++;
        const a = ctx.v(sk), b = ctx.v(k);
        let eq;
        if (r === 'lg') eq = normLG(a) === normLG(b);
        else if (r === 'name') eq = normName(a) === normName(b);
        else if (r === 'acct') {
          const da = digitsOnly(a), db = digitsOnly(b);
          eq = da === db;
          if (!eq) {
            const line = `${rl}: หน้าจอ ${a} ≠ ${cl} ${b}`;
            if (da.replace(/^0+/, '') === db.replace(/^0+/, '')) fmt.push(`${rl}: หน้าจอ ${a} ↔ ${cl} ${b} (ต่างเฉพาะ Leading Zero)`);
            else mapping.push(line);
            return;
          }
        } else eq = a === b;
        if (!eq) mism.push(`${rl}: หน้าจอ ${t === 'money' ? fmtMoney(a) : t === 'date' ? fmtDate(a) : a} ≠ ${cl} ${t === 'money' ? fmtMoney(b) : t === 'date' ? fmtDate(b) : b}`);
      });
    });
    if (invalid.length) return blocked(2, { missing: [], invalid });
    if (!compared) return mk(2, 'NOT_TESTABLE', { reason_code: 'NO_SECOND_SOURCE', message: 'ยังไม่มีเอกสารอื่นให้เทียบกับหน้าจอ' });
    if (mism.length) return mk(2, 'HOLD_DATA_MISMATCH', { reason_code: 'IDENTITY_MISMATCH', message: mism[0], details: mism.concat(mapping, fmt) });
    if (mapping.length) return mk(2, 'HOLD_NEED_CLARIFICATION', { reason_code: 'VERIFY_REFERENCE_MAPPING', message: mapping[0], details: mapping.concat(fmt) });
    if (fmt.length) return mk(2, 'OBSERVATION', { reason_code: 'FORMAT_VARIANCE', message: 'เลขบัญชีต่างเฉพาะ Leading Zero — องค์ประกอบอื่นของเคสตรงกันทั้งหมด', details: fmt });
    return mk(2, 'PASS', { message: `LG · ผู้กู้ · เลขบัญชี ตรงกันทุกเอกสารที่กรอก (${compared} การเทียบ)` });
  }

  function c03(ctx) {
    const p = ctx.problems(['approval_date', 'demand_contract_date']);
    if (p) return blocked(3, p);
    const a = ctx.v('approval_date'), d = ctx.v('demand_contract_date');
    if (a !== d) return mk(3, 'HOLD_DATA_MISMATCH', { reason_code: 'CONTRACT_DATE_MISMATCH', expected: fmtDate(a), observed: fmtDate(d), message: `วันที่แจ้งผลอนุมัติ ${fmtDate(a)} ≠ วันที่สัญญาที่อ้างในหนังสือบอกกล่าว ${fmtDate(d)}` });
    return mk(3, 'PASS', { expected: fmtDate(a), observed: fmtDate(d), message: `approval_date = demand_letter.contract_date = ${fmtDate(a)}` });
  }

  function c04(ctx) {
    const p = ctx.problems(['approval_total_pages']);
    if (p) return blocked(4, p);
    const total = ctx.v('approval_total_pages');
    const found = parsePages(ctx.raw('approval_pages_found'));
    if (!found) return mk(4, 'HOLD_NEED_CLARIFICATION', { reason_code: 'INVALID_INPUT', message: 'ระบุหมายเลข "หน้าเอกสาร" ที่พบ เช่น 1-9 หรือ 1,2,3,5-9' });
    const missing = [];
    for (let i = 1; i <= total; i++) if (!found.has(i)) missing.push(i);
    const extra = [...found].filter((n) => n > total);
    const unreadable = ctx.raw('approval_pages_unreadable') === 'Y';
    const exp = `1 of ${total} → ${total} of ${total}`;
    if (missing.length) return mk(4, 'HOLD_INCOMPLETE_DOCUMENT', { reason_code: 'PAGE_SEQUENCE_GAP', expected: exp, observed: `ขาด ${missing.map((n) => `${n} of ${total}`).join(', ')}`, message: `ลำดับหน้าเอกสารขาด: ${missing.map((n) => `${n} of ${total}`).join(', ')}` });
    if (unreadable) return mk(4, 'HOLD_INCOMPLETE_DOCUMENT', { reason_code: 'PAGE_UNREADABLE', expected: exp, message: 'มีหน้าที่ควรมีแต่ Crop / เสีย / อ่านไม่ได้' });
    return mk(4, 'PASS', { expected: exp, observed: `${found.size} หน้า${extra.length ? ` (มีเลขหน้าเกิน ${extra.join(',')})` : ''}`, message: `ครบ 1–${total} of ${total} (นับหน้าเอกสาร ไม่ใช่หน้า PDF)` });
  }

  // visual check for the confirmation letter; shared by Control 05 and Control 08
  function confirmVisual(ctx) {
    if (ctx.raw('exc_letter_present') !== 'Y') return null;
    const missing = CONFIRM_ITEMS.filter(([k]) => ctx.raw(`vis_conf_${k}`) !== 'Y').map(([, l]) => l);
    return { complete: missing.length === 0, missing };
  }

  function c05(ctx) {
    const bad = [], unknown = [], ok = [];
    const cv = confirmVisual(ctx);
    if (cv) (cv.complete ? ok : bad).push(cv.complete ? 'หนังสือยืนยันการชำระหลังผิดนัด' : `หนังสือยืนยันการชำระหลังผิดนัด — ไม่เห็นในภาพจริง: ${cv.missing.join(', ')}`);
    VIS_DOCS.forEach(([k, l]) => {
      const v = ctx.raw(`vis_${k}`);
      if (v === 'N') bad.push(`${l} — ภาพจริงไม่ครบ`);
      else if (v === 'Y') ok.push(l);
      else if (v === '') unknown.push(l);
    });
    if (bad.length) return mk(5, 'HOLD_INCOMPLETE_DOCUMENT', { reason_code: cv && !cv.complete ? 'CONFIRMATION_LETTER_VISUALLY_INCOMPLETE' : 'DOCUMENT_VISUALLY_INCOMPLETE', message: bad[0], details: bad, expected: 'เห็นเนื้อหาจริงใน Rendered Page (OCR/Text Layer ไม่นับ)' });
    if (unknown.length) return mk(5, 'NOT_TESTABLE', { reason_code: 'VISUAL_CHECK_PENDING', message: `ยังไม่ได้ตรวจภาพจริง: ${unknown.join(', ')}` });
    return mk(5, 'PASS', { message: ok.length ? `ภาพจริงครบ: ${ok.join(', ')}` : 'ไม่มีเอกสารสำคัญที่ต้องตรวจภาพ', expected: 'เห็นเนื้อหาจริงใน Rendered Page' });
  }

  function parseTransactions(ctx) {
    const rows = (ctx.input.transactions || []).filter((t) => t && (String(t.date || '').trim() || String(t.amount || '').trim() || String(t.desc || '').trim()));
    const out = [], invalid = [];
    rows.forEach((t, i) => {
      const d = parseDate(t.date), a = parseMoney(t.amount);
      const type = TXN_TYPES.includes(t.type) ? t.type : 'UNKNOWN';
      if (d.state !== 'ok') { invalid.push(`รายการ #${i + 1}: วันที่ไม่ถูกต้อง`); return; }
      if (a.state === 'invalid') { invalid.push(`รายการ #${i + 1}: จำนวนเงินไม่ถูกต้อง`); return; }
      out.push({ t: d.value, type, amount: a.state === 'ok' ? a.value : null, desc: t.desc || '' });
    });
    return { rows: out, invalid };
  }

  function c06(ctx, st) {
    const { rows, invalid } = parseTransactions(ctx);
    if (invalid.length) return mk(6, 'HOLD_NEED_CLARIFICATION', { reason_code: 'INVALID_INPUT', message: invalid[0], details: invalid });
    if (!rows.length) return mk(6, 'NOT_TESTABLE', { reason_code: 'MISSING_INPUT', message: 'ยังไม่มีรายการ Statement' });
    const pays = rows.filter((r) => r.type === 'PAYMENT');
    const last = pays.length ? Math.max(...pays.map((r) => r.t)) : null;
    const first = pays.length ? Math.min(...pays.map((r) => r.t)) : null;
    st.lastPayment = last; st.firstPayment = first;
    const counts = {};
    rows.forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });
    const unknownAfter = rows.filter((r) => r.type === 'UNKNOWN' && (last == null || r.t > last));
    const derived = { last_actual_payment_date: last, counts };
    const details = Object.keys(counts).map((k) => `${k}: ${counts[k]} รายการ`);
    if (unknownAfter.length)
      return mk(6, 'HOLD_NEED_CLARIFICATION', { reason_code: 'UNKNOWN_TRANSACTION', derived, details, message: `มีรายการ UNKNOWN หลังรายการรับชำระล่าสุด (${unknownAfter.map((r) => fmtDate(r.t)).join(', ')}) — ไม่เดาว่าเป็นเงินรับจริงหรือไม่` });
    if (last == null) return mk(6, 'OBSERVATION', { reason_code: 'NO_PAYMENT_FOUND', derived, details, message: 'ไม่พบรายการรับชำระจริงใน Statement (นับเฉพาะ PAYMENT)' });
    return mk(6, 'PASS', { derived, details, observed: fmtDate(last), message: `รับชำระจริงครั้งสุดท้าย ${fmtDate(last)} (นับเฉพาะ PAYMENT; ไม่นับดอกเบี้ย/ปรับปรุง/Reversal/ค่าธรรมเนียม)` });
  }

  // Control 08 is computed first because Control 07 delegates to it.
  function c08(ctx, st) {
    const def = ctx.v('default_date_screen');
    if (st.lastPayment == null || def == null || def >= st.lastPayment) return mk(8, 'NOT_APPLICABLE', { message: 'ไม่มีการชำระหลังวันผิดนัด — ไม่ต้องใช้หนังสือยืนยัน' });
    const letter = ctx.raw('exc_letter_present');
    const base = { expected: `ยืนยัน Default Date = ${fmtDate(def)}`, derived: { exception_required: true } };
    if (letter !== 'Y') return mk(8, 'HOLD_MISSING_DOCUMENT', Object.assign(base, { reason_code: 'EXCEPTION_LETTER_MISSING', message: `Default ${fmtDate(def)} < ชำระจริงล่าสุด ${fmtDate(st.lastPayment)} — ต้องมีหนังสือแจ้งยืนยันการชำระหลังวันผิดนัด` }));
    const cv = confirmVisual(ctx);
    if (!cv.complete) return mk(8, 'HOLD_INCOMPLETE_DOCUMENT', Object.assign(base, { reason_code: 'CONFIRMATION_LETTER_VISUALLY_INCOMPLETE', message: 'หนังสือยืนยันไม่สมบูรณ์ทางภาพ — หลักฐานรองรับ Default Date ยังไม่ครบ (HOLD ≠ FAIL)', details: cv.missing.map((m) => `ไม่เห็นในภาพจริง: ${m}`) }));
    const cd = ctx.f('exc_confirmed_default_date');
    if (cd.state !== 'ok') return mk(8, cd.state === 'invalid' ? 'HOLD_NEED_CLARIFICATION' : 'NOT_TESTABLE', Object.assign(base, { reason_code: cd.state === 'invalid' ? 'INVALID_INPUT' : 'MISSING_INPUT', message: `ระบุ ${ctx.label('exc_confirmed_default_date')}` }));
    if (cd.value !== def) return mk(8, 'HOLD_DATA_MISMATCH', Object.assign(base, { reason_code: 'CONFIRMED_DEFAULT_DATE_MISMATCH', observed: fmtDate(cd.value), message: `Default Date ในหนังสือ ${fmtDate(cd.value)} ≠ หน้าจอ ${fmtDate(def)}` }));
    const lacks = [];
    if (ctx.raw('exc_states_payment') !== 'Y') lacks.push('หนังสือไม่ระบุว่ามีการชำระหลังวันผิดนัด');
    if (ctx.raw('exc_states_no_change') !== 'Y') lacks.push('หนังสือไม่ยืนยันว่าการชำระนั้นไม่เปลี่ยน Default Date');
    if (ctx.raw('exc_identity_ok') !== 'Y') lacks.push('ยังไม่ยืนยันว่าชื่อ/เลขบัญชีในหนังสือเป็นเคสเดียวกัน');
    if (lacks.length) return mk(8, 'HOLD_NEED_CLARIFICATION', Object.assign(base, { reason_code: 'CONFIRMATION_CONTENT_INCOMPLETE', message: lacks[0], details: lacks }));
    return mk(8, 'PASS_WITH_DOCUMENTARY_SUPPORT', Object.assign(base, { observed: fmtDate(cd.value), message: `หนังสือสมบูรณ์ทางภาพ ยืนยัน Default Date เดิม ${fmtDate(cd.value)} ตรงหน้าจอ` }));
  }

  function c07(ctx, st, r8) {
    const p = ctx.problems(['default_date_screen']);
    if (p) return blocked(7, p);
    if (st.lastPayment == null) return mk(7, 'NOT_APPLICABLE', { message: 'ไม่มีรายการรับชำระจริงให้เทียบ' });
    const def = ctx.v('default_date_screen'), lp = st.lastPayment;
    const o = { expected: `Default ≥ ${fmtDate(lp)}`, observed: fmtDate(def) };
    if (def > lp) return mk(7, 'PASS', Object.assign(o, { message: `Default ${fmtDate(def)} > ชำระจริงล่าสุด ${fmtDate(lp)}` }));
    if (def === lp) return mk(7, 'PASS', Object.assign(o, { message: `Default = ชำระจริงล่าสุด (${fmtDate(def)}) — ผ่านตามกฎ ≥` }));
    return mk(7, r8.status === 'PASS_WITH_DOCUMENTARY_SUPPORT' ? 'PASS_WITH_DOCUMENTARY_SUPPORT' : r8.status, Object.assign(o, { reason_code: 'POST_DEFAULT_PAYMENT', message: `Default ${fmtDate(def)} < ชำระจริงล่าสุด ${fmtDate(lp)} → เข้า Control 8 (${STATUS_LABEL_TH[r8.status]})` }));
  }

  function c09(ctx) {
    const p = ctx.problems(['fup_screen_date']);
    if (p) return blocked(9, p);
    if (ctx.f('fup_report_date').state === 'missing') return mk(9, 'HOLD_MISSING_DOCUMENT', { reason_code: 'TRACKING_REPORT_MISSING', message: 'ไม่มีรายงานติดตามหนี้ที่ระบุวันที่ติดตาม' });
    const p2 = ctx.problems(['fup_report_date']);
    if (p2) return blocked(9, p2);
    const s = ctx.v('fup_screen_date'), r = ctx.v('fup_report_date');
    if (s !== r) return mk(9, 'HOLD_DATA_MISMATCH', { reason_code: 'TRACKING_DATE_MISMATCH', expected: fmtDate(r), observed: fmtDate(s), message: `วันที่ติดตามหน้าจอ ${fmtDate(s)} ≠ รายงานติดตาม ${fmtDate(r)} (ห้ามตีความเป็นวันปรับโครงสร้างหนี้)` });
    const lacks = [];
    if (!ctx.raw('fup_method')) lacks.push('วิธีติดตาม');
    if (!ctx.raw('fup_result')) lacks.push('ผลติดตาม');
    if (ctx.raw('fup_report_identity_ok') !== 'Y') lacks.push('ยืนยันผู้กู้/LG ในรายงานตรงกับเคส');
    if (lacks.length) return mk(9, 'HOLD_NEED_CLARIFICATION', { reason_code: 'TRACKING_EVIDENCE_INCOMPLETE', message: `ยังไม่ครบ: ${lacks.join(', ')}`, details: lacks });
    return mk(9, 'PASS', { expected: fmtDate(r), observed: fmtDate(s), message: `วันที่ติดตาม ${fmtDate(s)} ตรงรายงาน · ${ctx.raw('fup_method')} → ${ctx.raw('fup_result')}` });
  }

  function c10(ctx) {
    const has = ctx.raw('rst_has');
    if (has === 'N') return mk(10, 'NOT_APPLICABLE', { message: 'ไม่มีการปรับโครงสร้างหนี้' });
    if (has !== 'Y') return mk(10, 'NOT_TESTABLE', { reason_code: 'MISSING_INPUT', message: 'ยังไม่ระบุว่ามีการปรับโครงสร้างหนี้หรือไม่' });
    const p = ctx.problems(['rst_screen_date']);
    if (p) return blocked(10, p);
    const bad = ['rst_doc_signing', 'rst_doc_approval', 'rst_doc_effective', 'rst_stmt_header_date'].filter((k) => ctx.f(k).state === 'invalid');
    if (bad.length) return blocked(10, { missing: [], invalid: bad.map((k) => ctx.label(k)) });
    const s = ctx.v('rst_screen_date');
    const L1 = [['rst_doc_signing', 'วันที่ลงนาม'], ['rst_doc_approval', 'วันที่อนุมัติ'], ['rst_doc_effective', 'วันที่มีผล']].filter(([k]) => ctx.has(k));
    const L2 = ctx.has('rst_stmt_header_date');
    if (!L1.length && !L2) return mk(10, 'HOLD_MISSING_DOCUMENT', { reason_code: 'RESTRUCTURE_EVIDENCE_MISSING', message: 'ไม่มีเอกสารปรับโครงสร้างหรือหัว Statement ให้ยืนยันวันที่' });
    const hit = L1.find(([k]) => ctx.v(k) === s);
    if (hit) return mk(10, 'PASS', { expected: fmtDate(s), observed: fmtDate(ctx.v(hit[0])), message: `ตรง${hit[1]}ในเอกสารปรับโครงสร้าง (Level 1) ${fmtDate(s)}` });
    if (L2 && ctx.v('rst_stmt_header_date') === s) return mk(10, 'PASS_WITH_DOCUMENTARY_SUPPORT', { expected: fmtDate(s), observed: fmtDate(s), message: `ตรงหัว Statement (Level 2) ${fmtDate(s)} — วันที่ในระบบต่างจากวันลงนาม/อนุมัติ/มีผลในเอกสาร` });
    const lines = L1.map(([k, l]) => `${l}: ${fmtDate(ctx.v(k))}`).concat(L2 ? [`หัว Statement: ${fmtDate(ctx.v('rst_stmt_header_date'))}`] : []);
    if (!L2) return mk(10, 'HOLD_NEED_CLARIFICATION', { reason_code: 'CHECK_STATEMENT_HEADER', expected: fmtDate(s), message: 'ไม่ตรงวันที่ในเอกสาร — ตรวจหัว Statement ใบแรกก่อนสรุปว่า Date Mismatch (ลงนาม/อนุมัติ/มีผล/ระบบเริ่มบันทึก คนละความหมาย)', details: lines });
    return mk(10, 'HOLD_DATA_MISMATCH', { reason_code: 'RESTRUCTURE_DATE_MISMATCH', expected: fmtDate(s), message: `วันที่ปรับโครงสร้างหน้าจอ ${fmtDate(s)} ไม่ตรงทั้งเอกสารและหัว Statement`, details: lines });
  }

  function c11(ctx) {
    const p = ctx.problems(['dmd_date_screen', 'dmd_date_letter', 'dmd_principal', 'dmd_interest', 'dmd_total']);
    if (p) return blocked(11, p);
    const issues = [];
    const ds = ctx.v('dmd_date_screen'), dl = ctx.v('dmd_date_letter');
    if (ds !== dl) issues.push(`วันที่หนังสือบอกกล่าว หน้าจอ ${fmtDate(ds)} ≠ ตัวหนังสือ ${fmtDate(dl)}`);
    const sum = ctx.v('dmd_principal') + ctx.v('dmd_interest');
    if (sum !== ctx.v('dmd_total')) issues.push(`เงินต้น + ดอกเบี้ย = ${fmtMoney(sum)} ≠ ยอดรวมในหนังสือ ${fmtMoney(ctx.v('dmd_total'))}`);
    if (ctx.raw('dmd_identity_ok') !== 'Y') issues.push('ยังไม่ยืนยันผู้กู้/Account/วงเงิน/ที่อยู่ผู้รับในหนังสือ (ดู Control 2, 3, 15)');
    if (issues.length) return mk(11, issues[0].startsWith('ยังไม่') ? 'HOLD_NEED_CLARIFICATION' : 'HOLD_DATA_MISMATCH', { reason_code: issues[0].startsWith('ยังไม่') ? 'DEMAND_IDENTITY_UNCONFIRMED' : 'DEMAND_LETTER_MISMATCH', message: issues[0], details: issues });
    return mk(11, 'PASS', { message: `วันที่ ${fmtDate(dl)} · ต้น ${fmtMoney(ctx.v('dmd_principal'))} + ดอก ${fmtMoney(ctx.v('dmd_interest'))} = ${fmtMoney(ctx.v('dmd_total'))}` });
  }

  function c12(ctx) {
    const p = ctx.problems(['dmd_principal']);
    if (p) return blocked(12, p);
    const asOf = ctx.f('stmt_principal_at_demand');
    if (asOf.state === 'invalid') return blocked(12, { missing: [], invalid: [ctx.label('stmt_principal_at_demand')] });
    const p2 = asOf.state === 'ok' ? null : ctx.problems(['cur_stmt_principal']);
    if (p2) return blocked(12, p2);
    const basis = asOf.state === 'ok' ? 'Statement ณ วันบอกกล่าว' : 'Statement ล่าสุด';
    const sp = asOf.state === 'ok' ? asOf.value : ctx.v('cur_stmt_principal');
    const dp = ctx.v('dmd_principal');
    if (dp !== sp) return mk(12, 'HOLD_DATA_MISMATCH', { reason_code: 'DEMAND_PRINCIPAL_MISMATCH', expected: fmtMoney(sp), observed: fmtMoney(dp), message: `เงินต้นในหนังสือบอกกล่าว ${fmtMoney(dp)} ≠ ${basis} ${fmtMoney(sp)}`, details: asOf.state === 'ok' ? [] : ['เทียบกับ Statement ล่าสุดตาม Rulebook; หากมีการชำระหลังบอกกล่าว ให้กรอก "เงินต้น Statement ณ วันบอกกล่าว"'] });
    return mk(12, 'PASS', { expected: fmtMoney(sp), observed: fmtMoney(dp), message: `เงินต้นตรง 100% กับ${basis} (${fmtMoney(dp)}) · ไม่นำดอกเบี้ยบอกกล่าวไปเทียบ Statement ปัจจุบัน` });
  }

  function c13(ctx) {
    const p = ctx.problems(['hist_principal', 'hist_interest', 'hist_total', 'dmd_principal', 'dmd_interest', 'dmd_total']);
    if (p) return blocked(13, p);
    const pairs = [['เงินต้น', 'hist_principal', 'dmd_principal'], ['ดอกเบี้ย', 'hist_interest', 'dmd_interest'], ['รวม', 'hist_total', 'dmd_total']];
    const diffs = pairs.filter(([, h, d]) => ctx.v(h) !== ctx.v(d)).map(([l, h, d]) => `${l}: หน้าจอ ${fmtMoney(ctx.v(h))} ≠ หนังสือบอกกล่าว ${fmtMoney(ctx.v(d))}`);
    if (!diffs.length) return mk(13, 'PASS', { message: 'Historical เงินต้น/ดอกเบี้ย/รวม ตรงหนังสือบอกกล่าวทุกช่อง' });
    const details = diffs.slice();
    if (ctx.has('cur_screen_interest') && ctx.v('hist_interest') === ctx.v('cur_screen_interest') && ctx.v('hist_interest') !== ctx.v('dmd_interest'))
      details.push('ดอกเบี้ย Historical เท่ากับยอดปัจจุบัน — น่าจะนำยอดปัจจุบันมาใส่ซ้ำในช่อง Historical (Data Mapping Error)');
    return mk(13, 'HOLD_DATA_MISMATCH', { reason_code: 'HISTORICAL_BALANCE_MISMATCH', message: `Historical Balance Mismatch (Blocking) — ${diffs[0]}`, details, expected: `เท่ากับหนังสือบอกกล่าว ณ วันเดียวกัน` });
  }

  function c15(ctx) {
    const postal = {};
    ADDR_FIELDS.forEach(([k]) => { postal[k] = ctx.raw(`addr_postal_${k}`); });
    if (addrEmpty(postal)) return mk(15, 'NOT_TESTABLE', { reason_code: 'MISSING_INPUT', message: 'ยังไม่ได้กรอกที่อยู่ที่จ่าหน้าซอง/หนังสือบอกกล่าว' });
    const docs = (ctx.input.addr_docs || []).filter((a) => !addrEmpty(a));
    if (!docs.length) return mk(15, 'HOLD_MISSING_DOCUMENT', { reason_code: 'ADDRESS_SOURCE_NOT_FOUND', message: 'หาแหล่งอ้างอิงที่อยู่ใน PDF ไม่พบ (Address Source not traceable)' });
    const changed = docs.filter((a) => a.changed);
    const ref = changed.length ? [changed[changed.length - 1]] : docs; // change-of-address evidence → latest address rules
    const results = ref.map((a) => ({ a, diff: addrDiff(postal, a) }));
    const ok = results.find((r) => !r.diff.length);
    if (ok) return mk(15, 'PASS', { observed: fmtAddr(postal), expected: fmtAddr(ok.a), message: `ที่อยู่ตรงกับ${ok.a.source ? ` "${ok.a.source}"` : 'เอกสารอ้างอิง'}${changed.length ? ' (ที่อยู่ล่าสุดตามเอกสารแจ้งเปลี่ยน)' : ''}`, derived: { matched_source: ok.a.source || '' } });
    const best = results.slice().sort((x, y) => x.diff.length - y.diff.length)[0];
    return mk(15, 'HOLD_DATA_MISMATCH', {
      reason_code: changed.length ? 'ADDRESS_DIFFERS_FROM_LATEST' : 'ADDRESS_NOT_IN_DOCUMENTS',
      observed: fmtAddr(postal), expected: fmtAddr(best.a),
      message: `ที่อยู่จัดส่งไม่ตรงกับ${changed.length ? 'ที่อยู่ล่าสุดตามเอกสารแจ้งเปลี่ยน' : 'ที่อยู่ในเอกสารใดเลย'} — ต่างที่: ${best.diff.join(', ')}`,
      details: results.map((r) => `${r.a.source || 'เอกสาร'}: ${fmtAddr(r.a)} (ต่าง: ${r.diff.join(', ') || '—'})`),
    });
  }

  function c14(ctx, st, r15) {
    const outcome = ctx.raw('pst_outcome');
    if (!outcome) return mk(14, 'NOT_TESTABLE', { reason_code: 'MISSING_INPUT', message: 'ยังไม่ระบุผลการส่งไปรษณีย์' });
    if (outcome === 'NONE') return mk(14, 'HOLD_MISSING_DOCUMENT', { reason_code: 'POSTAL_EVIDENCE_MISSING', message: 'ใบตอบรับว่าง / ไม่มีวันที่ / ไม่มีลายเซ็น / ไม่มีซองตีกลับ' });
    const bad = ['pst_received_date', 'pst_send_date'].filter((k) => ctx.f(k).state === 'invalid');
    if (bad.length) return blocked(14, { missing: [], invalid: bad.map((k) => ctx.label(k)) });
    const lacks = [];
    if (outcome === 'DELIVERED') {
      if (!ctx.has('pst_received_date')) lacks.push('ไม่มีวันที่รับ');
      const sig = ctx.raw('pst_signature');
      if (sig !== 'RECIPIENT' && sig !== 'AUTHORIZED') lacks.push(sig === 'PRINTED_NAME_ONLY' ? 'มีเฉพาะชื่อผู้รับแบบตัวบรรจง — ไม่เพียงพอ' : sig === 'POSTAL_OFFICER_ONLY' ? 'มีเฉพาะลายมือชื่อเจ้าหน้าที่ไปรษณีย์ — ไม่เพียงพอ' : 'ไม่มีลายมือชื่อผู้รับ/ผู้รับแทน');
    } else if (outcome === 'RETURNED') {
      if (ctx.raw('pst_returned_evidence') !== 'Y') lacks.push('ไม่มีหน้าซองตีกลับ / "คืนผู้ฝาก" / Returned Mail ที่ชัดเจน');
    }
    if (r15.status !== 'PASS') lacks.push(`ที่อยู่ยัง Traceable ไม่ได้ (Control 15: ${STATUS_LABEL_TH[r15.status]})`);
    if (ctx.raw('pst_tracking_linked') === 'N') lacks.push('เลขไปรษณีย์ของใบตอบรับ/ซองไม่ใช่ชุดเดียวกัน');
    if (lacks.length) return mk(14, ctx.raw('pst_tracking_linked') === 'N' ? 'HOLD_DATA_MISMATCH' : 'HOLD_MISSING_DOCUMENT', { reason_code: outcome === 'DELIVERED' ? 'DELIVERY_PROOF_INCOMPLETE' : 'RETURN_PROOF_INCOMPLETE', message: lacks[0], details: lacks });
    return mk(14, 'PASS', { message: outcome === 'DELIVERED' ? `ส่งสำเร็จ: วันที่รับ ${fmtDate(ctx.v('pst_received_date'))} · มีลายมือชื่อผู้รับ · ที่อยู่ Traceable` : 'ส่งไม่สำเร็จ: มีซองตีกลับ/คืนผู้ฝาก · ที่อยู่ Traceable' });
  }

  function c16(ctx, cfg) {
    const keys = ['cur_screen_principal', 'cur_screen_interest', 'cur_screen_total', 'cur_stmt_principal', 'cur_stmt_interest'];
    const p = ctx.problems(keys);
    if (p) return blocked(16, p);
    if (ctx.f('cur_stmt_other').state === 'invalid') return blocked(16, { missing: [], invalid: [ctx.label('cur_stmt_other')] });
    const other = ctx.has('cur_stmt_other') ? ctx.v('cur_stmt_other') : 0;
    const sTotal = ctx.v('cur_stmt_principal') + ctx.v('cur_stmt_interest') + other;
    const dP = ctx.v('cur_screen_principal') - ctx.v('cur_stmt_principal');
    const dI = ctx.v('cur_screen_interest') - ctx.v('cur_stmt_interest');
    const dT = ctx.v('cur_screen_total') - sTotal;
    const tol = cfg.moneyToleranceSatang;
    const lines = [`เงินต้น: หน้าจอ ${fmtMoney(ctx.v('cur_screen_principal'))} / Statement ${fmtMoney(ctx.v('cur_stmt_principal'))}`, `ดอกเบี้ย: หน้าจอ ${fmtMoney(ctx.v('cur_screen_interest'))} / Statement ${fmtMoney(ctx.v('cur_stmt_interest'))}`, `รวม: หน้าจอ ${fmtMoney(ctx.v('cur_screen_total'))} / Statement (ต้น+ดอก+อื่น ๆ) ${fmtMoney(sTotal)}`];
    if (dP !== 0) return mk(16, 'HOLD_DATA_MISMATCH', { reason_code: 'CURRENT_PRINCIPAL_MISMATCH', message: `เงินต้นปัจจุบันไม่ตรง Statement (ต่าง ${fmtMoney(dP)}) — ต้อง Exact`, details: lines });
    if (dI === 0 && dT === 0) return mk(16, 'PASS', { message: 'เงินต้น/ดอกเบี้ย/รวม ตรง Statement ล่าสุด', details: lines });
    if (Math.abs(dI) <= tol && Math.abs(dT) <= tol) return mk(16, 'OBSERVATION', { reason_code: 'VARIANCE_WITHIN_TOLERANCE', message: `ต่าง ${fmtMoney(Math.max(Math.abs(dI), Math.abs(dT)))} บาท — เงินต้นตรง ไม่กระทบ Claim Base (Observation)`, details: lines });
    return mk(16, 'HOLD_DATA_MISMATCH', { reason_code: 'CURRENT_BALANCE_MISMATCH', message: `ดอกเบี้ย/รวม ต่างเกิน ${fmtMoney(tol)} บาท โดยไม่มีเหตุ (ดอกเบี้ยต่าง ${fmtMoney(dI)}, รวมต่าง ${fmtMoney(dT)})`, details: lines });
  }

  function c17(ctx) {
    const p = ctx.problems(['stm_cutoff_date']);
    if (p) return blocked(17, p);
    const bad = ['later_payment_date', 'later_payment_amount'].filter((k) => ctx.f(k).state === 'invalid');
    if (bad.length) return blocked(17, { missing: [], invalid: bad.map((k) => ctx.label(k)) });
    const cut = ctx.v('stm_cutoff_date');
    if (!ctx.has('later_payment_date')) return mk(17, 'PASS', { message: `Statement ถึง ${fmtDate(cut)} — ไม่มีเอกสารอื่นระบุการชำระหลัง cut-off` });
    const lp = ctx.v('later_payment_date');
    if (lp <= cut) return mk(17, 'PASS', { message: `การชำระ ${fmtDate(lp)} อยู่ในช่วง Statement (ถึง ${fmtDate(cut)})` });
    if (ctx.raw('later_stmt_covers') === 'Y') return mk(17, 'PASS', { message: `มี Statement ใหม่ครอบคลุมการชำระ ${fmtDate(lp)}` });
    return mk(17, 'HOLD_MISSING_DOCUMENT', { reason_code: 'PAYMENT_AFTER_STATEMENT_CUTOFF', message: `มีการชำระ ${fmtDate(lp)}${ctx.has('later_payment_amount') ? ` = ${fmtMoney(ctx.v('later_payment_amount'))} บาท` : ''} หลัง Statement cut-off ${fmtDate(cut)} — ยังไม่รู้ว่าจัดสรรดอกเบี้ย/เงินต้น ห้ามรับ Statement เป็น Current Debt สุดท้าย: ขอ Statement หลัง Payment` });
  }

  function c18(ctx, st) {
    const p = ctx.problems(['cur_stmt_principal', 'guarantee_exposure', 'cb_screen_base']);
    if (p) return blocked(18, p);
    const pr = ctx.v('cur_stmt_principal'), ge = ctx.v('guarantee_exposure');
    const mode = pr < ge ? 'BY_PRINCIPAL' : 'BY_GUARANTEE';
    const base = Math.min(pr, ge);
    st.claimBase = base;
    const sb = ctx.v('cb_screen_base'), sm = ctx.raw('cb_screen_mode');
    const lbl = { BY_PRINCIPAL: 'ตามภาระหนี้ต้นเงินคงเหลือ', BY_GUARANTEE: 'ตามวงเงินค้ำประกัน' };
    const details = [`min(เงินต้น ${fmtMoney(pr)}, ภาระค้ำประกัน ${fmtMoney(ge)}) = ${fmtMoney(base)}`, `โหมดที่ควรเป็น: ${lbl[mode]}`];
    const derived = { claim_base: base, mode };
    if (!sm) return mk(18, 'NOT_TESTABLE', { reason_code: 'MISSING_INPUT', message: 'ยังไม่ระบุโหมดฐานคำนวณที่หน้าจอเลือก', derived, details });
    if (sb !== base) return mk(18, 'HOLD_DATA_MISMATCH', { reason_code: 'CLAIM_BASE_MISMATCH', expected: fmtMoney(base), observed: fmtMoney(sb), message: `ฐานคำนวณหน้าจอ ${fmtMoney(sb)} ≠ ที่คำนวณได้ ${fmtMoney(base)}`, derived, details });
    if (sm !== mode) return mk(18, 'HOLD_DATA_MISMATCH', { reason_code: 'CLAIM_BASE_MODE_MISMATCH', expected: mode, observed: sm, message: `โหมดที่เลือก (${lbl[sm] || sm}) ไม่ตรง — ควรเป็น ${lbl[mode]}`, derived, details });
    return mk(18, 'PASS', { expected: fmtMoney(base), observed: fmtMoney(sb), message: `ฐาน ${fmtMoney(base)} ${lbl[mode]}`, derived, details });
  }

  function c19(ctx, st, cfg) {
    const prod = ctx.raw('product');
    const rule = cfg.productRuleMatrix[prod];
    if (!prod) return mk(19, 'NOT_TESTABLE', { reason_code: 'MISSING_INPUT', message: 'ยังไม่ระบุ Product' });
    if (!rule) return mk(19, 'HOLD_NEED_CLARIFICATION', { reason_code: 'NO_RULE_FOR_PRODUCT', message: `ยังไม่มีกฎ Coverage Ratio ที่ยืนยันสำหรับ ${prod} — เพิ่มใน product_rule_matrix (ห้าม Hardcode ratio เดียวให้ทุก Product)` });
    const p = ctx.problems(['id_lgdate_screen', 'claim_app_date', 'cr_screen_ratio']);
    if (p) return blocked(19, p);
    const lg = ctx.v('id_lgdate_screen'), cl = ctx.v('claim_app_date');
    const within = (maxYears) => (maxYears === Infinity ? true : cfg.lgAgeBasis === 'CLAIM_YEAR'
      ? new Date(cl).getUTCFullYear() - new Date(lg).getUTCFullYear() <= maxYears
      : cl <= addYears(lg, maxYears));
    const tier = rule.tiers.find((t) => within(t.maxYears));
    st.ratioBp = tier.ratioBp;
    const sr = ctx.v('cr_screen_ratio');
    const basis = cfg.lgAgeBasis === 'CLAIM_YEAR' ? 'นับตามปีที่ยื่น' : 'นับตามวันที่ยื่น';
    const derived = { coverage_ratio_bp: tier.ratioBp, lg_age_basis: cfg.lgAgeBasis };
    const details = [`LG ${fmtDate(lg)} · ยื่น ${fmtDate(cl)} (${basis} — วิธีนับอายุ LG ยังไม่ยืนยันเป็นทางการ)`, `ที่มาของกฎ: ${rule.source}`];
    if (sr !== tier.ratioBp) return mk(19, 'HOLD_DATA_MISMATCH', { reason_code: 'COVERAGE_RATIO_MISMATCH', expected: fmtPct(tier.ratioBp), observed: fmtPct(sr), message: `อัตราหน้าจอ ${fmtPct(sr)} ≠ ที่ควรเป็น ${fmtPct(tier.ratioBp)}`, derived, details });
    const ageText = rule.tiers.length > 1 ? (tier.maxYears === Infinity ? 'อายุ LG มากกว่า 5 ปี' : 'อายุ LG ไม่เกิน 5 ปี') : 'อัตราคงที่';
    return mk(19, 'PASS', { expected: fmtPct(tier.ratioBp), observed: fmtPct(sr), message: `${prod} ${ageText} → ${fmtPct(tier.ratioBp)}`, derived, details });
  }

  function c20(ctx, st, r18, r19) {
    if (st.claimBase == null || st.ratioBp == null) return mk(20, 'NOT_TESTABLE', { reason_code: 'UPSTREAM_NOT_COMPUTABLE', message: 'คำนวณไม่ได้ — Claim Base (Control 18) หรือ Coverage Ratio (Control 19) ยังไม่พร้อม' });
    const p = ctx.problems(['claim_amount_screen', 'claim_paid_screen']);
    const calc = mulRoundHalfUp(st.claimBase, st.ratioBp);
    st.claim = calc;
    const derived = { claim_amount: calc };
    const details = [`${fmtMoney(st.claimBase)} × ${fmtPct(st.ratioBp)} = ${fmtMoney(calc)} (Decimal, ROUND_HALF_UP; คำนวณใหม่เอง ไม่เชื่อยอดหน้าจอ)`];
    if (p) return Object.assign(blocked(20, p), { derived, details });
    const diffs = [];
    if (ctx.v('claim_amount_screen') !== calc) diffs.push(`จำนวนเงินค่าประกันชดเชย หน้าจอ ${fmtMoney(ctx.v('claim_amount_screen'))} ≠ ${fmtMoney(calc)}`);
    if (ctx.v('claim_paid_screen') !== calc) diffs.push(`ยอดอนุมัติจ่าย หน้าจอ ${fmtMoney(ctx.v('claim_paid_screen'))} ≠ ${fmtMoney(calc)}`);
    if (diffs.length) return mk(20, 'HOLD_DATA_MISMATCH', { reason_code: 'CLAIM_AMOUNT_MISMATCH', expected: fmtMoney(calc), observed: fmtMoney(ctx.v('claim_amount_screen')), message: diffs[0], derived, details: details.concat(diffs) });
    return mk(20, 'PASS', { expected: fmtMoney(calc), observed: fmtMoney(ctx.v('claim_amount_screen')), message: `${fmtMoney(calc)} บาท ตรงทั้งจำนวนค่าประกันชดเชยและยอดอนุมัติจ่าย`, derived, details });
  }

  function c21(ctx, st) {
    const p = ctx.problems(['cap_max']);
    if (p) return blocked(21, p);
    if (!ctx.has('cap_paid') || !ctx.has('cap_pending'))
      return mk(21, 'NOT_TESTABLE', { reason_code: 'PAID_PENDING_MISSING', message: 'มีเพียง CLAIM MAX แต่ไม่มียอดจ่าย/รอจ่าย — ไม่เดาตัวเลข' });
    const bad = ['cap_screen_available', 'cap_screen_after'].filter((k) => ctx.f(k).state === 'invalid');
    if (bad.length) return blocked(21, { missing: [], invalid: bad.map((k) => ctx.label(k)) });
    if (st.claim == null) return mk(21, 'NOT_TESTABLE', { reason_code: 'UPSTREAM_NOT_COMPUTABLE', message: 'ยังไม่มี Claim Amount ที่คำนวณได้ (Control 20)' });
    const avail = ctx.v('cap_max') - ctx.v('cap_paid') - ctx.v('cap_pending');
    const after = avail - st.claim;
    const derived = { available_capacity: avail, remaining_after_claim: after };
    const details = [`CLAIM MAX ${fmtMoney(ctx.v('cap_max'))} − จ่ายจริง ${fmtMoney(ctx.v('cap_paid'))} − รอจ่าย ${fmtMoney(ctx.v('cap_pending'))} = คงเหลือจ่ายได้อีก ${fmtMoney(avail)}`, `${fmtMoney(avail)} − Claim ${fmtMoney(st.claim)} = คงเหลือหลังอนุมัติ ${fmtMoney(after)}`];
    const diffs = [];
    if (ctx.has('cap_screen_available') && ctx.v('cap_screen_available') !== avail) diffs.push(`คงเหลือจ่ายได้อีก หน้าจอ ${fmtMoney(ctx.v('cap_screen_available'))} ≠ ${fmtMoney(avail)}`);
    if (ctx.has('cap_screen_after') && ctx.v('cap_screen_after') !== after) diffs.push(`คงเหลือหลังอนุมัติ หน้าจอ ${fmtMoney(ctx.v('cap_screen_after'))} ≠ ${fmtMoney(after)}`);
    if (diffs.length) return mk(21, 'HOLD_DATA_MISMATCH', { reason_code: 'CAP_ARITHMETIC_MISMATCH', message: diffs[0], derived, details: details.concat(diffs) });
    if (after < 0) return mk(21, 'HOLD_NEED_CLARIFICATION', { reason_code: 'CLAIM_EXCEEDS_CAP', message: `Claim ${fmtMoney(st.claim)} เกินวงเงินคงเหลือ ${fmtMoney(avail)} — ตัดสินตาม Portfolio Rule`, derived, details });
    if (!ctx.has('cap_screen_available') && !ctx.has('cap_screen_after')) return mk(21, 'PASS', { message: `คำนวณได้ คงเหลือหลังอนุมัติ ${fmtMoney(after)} (ไม่ได้กรอกตัวเลขหน้าจอให้เทียบ)`, derived, details });
    return mk(21, 'PASS', { message: `ตรงทุกสตางค์ · คงเหลือหลังอนุมัติ ${fmtMoney(after)}`, derived, details });
  }

  function c22(ctx, st) {
    const bad = ['approval_date', 'id_lgdate_screen', 'default_date_screen', 'fup_screen_date', 'dmd_date_screen', 'pst_send_date', 'pst_received_date', 'claim_app_date', 'tl_bank_submission_date', 'tl_complete_docs_date', 'tl_payment_approval_date'].filter((k) => ctx.f(k).state === 'invalid');
    if (bad.length) return blocked(22, { missing: [], invalid: bad.map((k) => ctx.label(k)) });
    const postalT = ctx.has('pst_send_date') ? ctx.v('pst_send_date') : ctx.v('pst_received_date');
    // Last payment is deliberately not in the chain: a payment after Default is handled by Control 7/8.
    const chain = [
      ['สัญญา/อนุมัติ', ctx.v('approval_date')], ['ออก LG', ctx.v('id_lgdate_screen')], ['ชำระครั้งแรก', st.firstPayment],
      ['ผิดนัด', ctx.v('default_date_screen')], ['ติดตาม', ctx.v('fup_screen_date')], ['หนังสือบอกกล่าว', ctx.v('dmd_date_screen')],
      ['ไปรษณีย์', postalT], ['ยื่นคำขอรับเงิน', ctx.v('claim_app_date')], ['ธนาคารส่งคำขอ', ctx.v('tl_bank_submission_date')],
      ['เอกสารครบ', ctx.v('tl_complete_docs_date')], ['อนุมัติจ่าย', ctx.v('tl_payment_approval_date')],
    ].filter(([, t]) => t != null);
    if (chain.length < 2) return mk(22, 'NOT_TESTABLE', { reason_code: 'MISSING_INPUT', message: 'มีวันที่ไม่พอให้สร้าง Timeline' });
    const viol = [];
    for (let i = 1; i < chain.length; i++) if (chain[i][1] < chain[i - 1][1]) viol.push(`${chain[i][0]} (${fmtDate(chain[i][1])}) มาก่อน ${chain[i - 1][0]} (${fmtDate(chain[i - 1][1])})`);
    const timeline = chain.map(([l, t]) => `${fmtDate(t)}  ${l}`);
    const derived = { timeline: chain.map(([label, t]) => ({ label, date: fmtDate(t) })) };
    if (viol.length) return mk(22, 'HOLD_DATA_MISMATCH', { reason_code: 'TIMELINE_CONFLICT', message: viol[0], details: viol, derived });
    return mk(22, 'PASS', { message: `ลำดับเหตุการณ์ไม่ขัดกัน (${chain.length} จุด)`, details: timeline, derived });
  }

  // ---------------------------------------------------------------- audit
  function runAudit(input, userCfg) {
    input = input || {};
    const cfg = Object.assign({}, DEFAULT_CONFIG, userCfg || {});
    const ctx = makeCtx(input);
    const st = {};
    const R = {};
    R[1] = c01(ctx, cfg);
    R[2] = c02(ctx);
    R[3] = c03(ctx);
    R[4] = c04(ctx);
    R[5] = c05(ctx);
    R[6] = c06(ctx, st);
    R[8] = c08(ctx, st);
    R[7] = c07(ctx, st, R[8]);
    R[9] = c09(ctx);
    R[10] = c10(ctx);
    R[11] = c11(ctx);
    R[12] = c12(ctx);
    R[13] = c13(ctx);
    R[15] = c15(ctx);
    R[14] = c14(ctx, st, R[15]);
    R[16] = c16(ctx, cfg);
    R[17] = c17(ctx);
    R[18] = c18(ctx, st);
    R[19] = c19(ctx, st, cfg);
    R[20] = c20(ctx, st, R[18], R[19]);
    R[21] = c21(ctx, st);
    R[22] = c22(ctx, st);

    const results = Object.keys(R).map(Number).sort((a, b) => a - b).map((n) => {
      const r = R[n];
      r.evidence = ctx.raw(`ev_${META[n].sec}`);
      return r;
    });
    const statuses = results.map((r) => r.status);
    const counts = {};
    statuses.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
    let caseStatus;
    if (statuses.includes('FAIL_ELIGIBILITY')) caseStatus = 'FAIL';
    else if (statuses.some(isBlocking)) caseStatus = 'HOLD';
    else if (statuses.includes('OBSERVATION')) caseStatus = 'PASS_WITH_OBSERVATION';
    else caseStatus = 'PASS';
    const CASE_LABEL = { PASS: '✅ ผ่าน', PASS_WITH_OBSERVATION: '✅ ผ่านโดยมีข้อสังเกต', HOLD: '⛔ พักการพิจารณา', FAIL: '❌ ไม่ผ่าน' };
    return {
      rule_version: RULE_VERSION,
      case_status: caseStatus,
      case_status_label: CASE_LABEL[caseStatus],
      counts,
      blocking: results.filter((r) => isBlocking(r.status)).map((r) => ({ control_id: r.control_id, status: r.status, reason_code: r.reason_code, message: r.message })),
      claim_amount: st.claim == null ? null : st.claim,
      claim_amount_text: st.claim == null ? null : fmtMoney(st.claim),
      results,
    };
  }

  return {
    RULE_VERSION, DEFAULT_CONFIG, STATUS_LABEL_TH, TXN_TYPES, CONFIRM_ITEMS, VIS_DOCS, ID_COLS, ID_ROWS, ADDR_FIELDS, FIELDS, META,
    runAudit, isBlocking,
    util: { parseDate, fmtDate, addYears, parseMoney, fmtMoney, parsePercent, fmtPct, mulRoundHalfUp, parsePages, normAddrPart },
  };
});
