/* PGS 10 Claim Checker — UI. All rendering uses textContent (no innerHTML) because inputs can contain arbitrary text. */
(function () {
  'use strict';
  const E = window.PGS10, SAMPLES = window.PGS10_SAMPLES;
  const $ = (s, r) => (r || document).querySelector(s);

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'on') Object.entries(v).forEach(([ev, fn]) => n.addEventListener(ev, fn));
      else n.setAttribute(k, v === true ? '' : v);
    });
    [].concat(kids || []).forEach((c) => c != null && n.append(c));
    return n;
  }

  // ------------------------------------------------------------ form builders
  const field = (k, label, o = {}) =>
    el('label', { class: 'f' }, [
      el('span', { text: label }),
      el('input', { type: 'text', 'data-k': k, placeholder: o.ph || '', inputmode: o.mode || null, value: o.value || null }),
      o.hint ? el('small', { text: o.hint }) : null,
    ]);
  const date = (k, label, hint) => field(k, label, { ph: 'วว/ดด/ปปปป (พ.ศ.)', hint });
  const money = (k, label, hint) => field(k, label, { ph: '0.00', mode: 'decimal', hint });
  const select = (k, label, opts, hint) =>
    el('label', { class: 'f' }, [
      el('span', { text: label }),
      el('select', { 'data-k': k }, opts.map(([v, t]) => el('option', { value: v, text: t }))),
      hint ? el('small', { text: hint }) : null,
    ]);
  const check = (k, label) => el('label', { class: 'chk' }, [el('input', { type: 'checkbox', 'data-k': k }), el('span', { text: label })]);
  const ev = (sec) => el('div', { class: 'ev' }, [field(`ev_${sec}`, 'อ้างอิงหลักฐาน (เอกสาร/หน้า) — ไม่บังคับ', { ph: 'เช่น Statement PDF หน้า 27' })]);
  const YN = [['', '— เลือก —'], ['Y', 'ใช่'], ['N', 'ไม่ใช่']];
  const grid = (kids) => el('div', { class: 'grid' }, kids);

  function tableEditor(name, cols, seedRows, addLabel) {
    const tbody = el('tbody');
    const addRow = (vals = {}) => {
      const tr = el('tr', {}, cols.map((c) => {
        let inp;
        if (c.type === 'select') inp = el('select', { 'data-c': c.k }, c.opts.map(([v, t]) => el('option', { value: v, text: t })));
        else if (c.type === 'check') inp = el('input', { type: 'checkbox', 'data-c': c.k });
        else inp = el('input', { type: 'text', 'data-c': c.k, placeholder: c.ph || '' });
        if (c.type === 'check') inp.checked = !!vals[c.k];
        else if (vals[c.k] != null) inp.value = vals[c.k];
        return el('td', {}, [inp]);
      }).concat([el('td', {}, [el('button', { type: 'button', class: 'rm ghost', title: 'ลบแถว', 'aria-label': 'ลบแถว', text: '✕', on: { click: () => tr.remove() } })])]));
      tbody.append(tr);
    };
    (seedRows || [{}]).forEach(addRow);
    const wrap = el('div', { class: 'tblwrap', 'data-table': name }, [
      el('table', { class: 'in' }, [el('thead', {}, [el('tr', {}, cols.map((c) => el('th', { text: c.label })).concat([el('th')]))]), tbody]),
      el('button', { type: 'button', class: 'ghost', text: addLabel, on: { click: () => addRow() } }),
    ]);
    wrap._addRow = addRow;
    wrap._clear = () => { tbody.textContent = ''; };
    return wrap;
  }

  const TXN_OPTS = E.TXN_TYPES.map((t) => [t, t]);
  const txnTable = () => tableEditor('transactions', [
    { k: 'date', label: 'วันที่', ph: 'วว/ดด/ปปปป' },
    { k: 'type', label: 'ประเภทรายการ', type: 'select', opts: TXN_OPTS },
    { k: 'amount', label: 'จำนวนเงิน', ph: '0.00' },
    { k: 'desc', label: 'คำอธิบาย (ไม่บังคับ)' },
  ], [{}], '+ เพิ่มรายการ');
  const addrCols = [
    { k: 'source', label: 'แหล่งเอกสาร', ph: 'เช่น หนังสืออนุมัติ' },
    ...E.ADDR_FIELDS.map(([k, l]) => ({ k, label: l })),
    { k: 'changed', label: 'แจ้งเปลี่ยนที่อยู่', type: 'check' },
  ];
  const addrDocTable = () => tableEditor('addr_docs', addrCols, [{}], '+ เพิ่มที่อยู่อ้างอิง');

  const SECTIONS = [
    { id: 'prog', title: '1 · โครงการ / Product', ctl: [1], build: () => [
      grid([
        select('pgs_phase', 'PGS ระยะ', [['', '— เลือก —'], ['10', 'PGS ระยะที่ 10'], ['OTHER', 'ระยะอื่น']]),
        field('pgs_revision', 'หลักเกณฑ์ปรับปรุงครั้งที่', { ph: '5' }),
        select('product', 'Product', [['', '— เลือก —'], ['SMALL_BIZ', 'Small Biz (SSMEs รูปแบบ 1)'], ['START_UP', 'Start up (SSMEs รูปแบบ 2)'], ['SMART_BIZ', 'Smart Biz'], ['SMART_ONE', 'Smart One'], ['SMART_GREEN', 'Smart Green'], ['SMART_PLUS', 'Smart Plus & Top up'], ['NOT_PGS10', 'ไม่อยู่ใน Product ที่เข้าเกณฑ์']]),
        select('loan_new_business', 'เป็นสินเชื่อใหม่เพื่อธุรกิจ', YN),
        select('loan_hp_leasing', 'เป็นเช่าซื้อ/ลิสซิ่ง', YN),
        money('total_exposure_per_person', 'วงเงินรวมต่อราย (ทุกสถาบัน)', 'Small Biz ≤ 200,000 · Start up ≤ 100,000'),
      ]),
    ] },
    { id: 'id', title: '2 · ตัวตนของเคส และวันที่สัญญา', ctl: [2, 3], build: () => [
      el('p', { class: 'note', text: 'กรอกค่าที่อ่านได้จากแต่ละเอกสาร (เว้นช่องที่ไม่มีเอกสารนั้น) — ต้องมีคอลัมน์ “หน้าจอ” สำหรับ LG / ชื่อ / เลขบัญชี' }),
      el('div', { class: 'tblwrap' }, [el('table', { class: 'in' }, [
        el('thead', {}, [el('tr', {}, [el('th')].concat(E.ID_COLS.map(([, l]) => el('th', { text: l }))))]),
        el('tbody', {}, E.ID_ROWS.map(([r, rl, t]) => el('tr', {}, [el('th', { text: rl })].concat(E.ID_COLS.map(([c]) =>
          el('td', {}, [el('input', { type: 'text', 'data-k': `id_${r}_${c}`, 'aria-label': `${rl} ${c}`, placeholder: t === 'date' ? 'วว/ดด/ปปปป' : '' })])))))),
      ])]),
      grid([
        date('approval_date', 'วันที่แจ้งผลอนุมัติ (= วันที่ทำสัญญา)'),
        date('demand_contract_date', 'วันที่สัญญาที่อ้างในหนังสือบอกกล่าว'),
      ]),
      ev('id'), ev('contract'),
    ] },
    { id: 'doc', title: '3 · ความครบถ้วนของเอกสาร (ลำดับหน้า + ภาพจริง)', ctl: [4, 5], build: () => [
      el('p', { class: 'sub2', text: 'หนังสืออนุมัติ / สัญญา — “1 of X”' }),
      grid([
        field('approval_total_pages', 'จำนวนหน้าเอกสาร (X)', { ph: '9', mode: 'numeric' }),
        field('approval_pages_found', 'หมายเลขหน้าเอกสารที่พบ', { ph: '1-9 หรือ 1,2,3,5-9', hint: 'นับ “หน้าของเอกสาร” ไม่ใช่หน้า PDF — หน้า PDF ว่างที่คั่นไม่นับ' }),
      ]),
      check('approval_pages_unreadable', 'มีหน้าที่ควรมีแต่ Crop / เสีย / อ่านไม่ได้'),
      el('p', { class: 'sub2', text: 'ภาพจริงเห็นเนื้อหาครบตามที่ต้องเห็นหรือไม่ (ห้ามใช้ OCR/Text Layer ทดแทน)' }),
      grid(E.VIS_DOCS.map(([k, l]) => select(`vis_${k}`, l, [['', '— ยังไม่ตรวจ —'], ['Y', 'ครบ'], ['N', 'ไม่ครบ / ถูก Crop'], ['NA', 'ไม่มีเอกสารนี้ในเคส']]))),
      el('p', { class: 'note', text: 'หนังสือยืนยันการชำระหลังวันผิดนัด ตรวจ 12 รายการที่หัวข้อ 5' }),
      ev('doc'), ev('vis'),
    ] },
    { id: 'stm', title: '4 · Statement และวันตัดยอด', ctl: [6, 17], build: () => [
      el('p', { class: 'note', text: 'จำแนกทุกรายการ — “รับชำระล่าสุด” นับเฉพาะ PAYMENT (ไม่นับดอกเบี้ย/ปรับปรุง/Reversal/ค่าธรรมเนียม) รายการที่ไม่แน่ใจให้เลือก UNKNOWN' }),
      txnTable(),
      grid([
        date('stm_cutoff_date', 'Statement ถึงวันที่ (cut-off)'),
        date('later_payment_date', 'วันที่ชำระหลัง cut-off (จากเอกสารอื่น)', 'เว้นว่างถ้าไม่มี'),
        money('later_payment_amount', 'ยอดที่ชำระหลัง cut-off'),
        select('later_stmt_covers', 'มี Statement ใหม่ครอบคลุมการชำระนั้น', YN),
      ]),
      ev('stm'), ev('cutoff'),
    ] },
    { id: 'def', title: '5 · วันที่ผิดนัด และหนังสือยืนยันการชำระหลังผิดนัด', ctl: [7, 8], build: () => [
      grid([
        date('default_date_screen', 'วันที่ผิดนัดชำระหนี้ (หน้าจอ)'),
        select('exc_letter_present', 'มีหนังสือยืนยันการชำระหลังวันผิดนัด', YN, 'ใช้เมื่อ Default < รับชำระจริงล่าสุด'),
        date('exc_confirmed_default_date', 'Default Date ที่ระบุในหนังสือ'),
      ]),
      check('exc_states_payment', 'หนังสือระบุว่ามีการชำระหลังวันผิดนัด'),
      check('exc_states_no_change', 'หนังสือยืนยันว่าการชำระนั้นไม่เปลี่ยน Default Date'),
      check('exc_identity_ok', 'ชื่อลูกหนี้/เลขบัญชีในหนังสือเป็นเคสเดียวกัน'),
      el('p', { class: 'sub2', text: 'ติ๊กเฉพาะสิ่งที่ “เห็นจริงในภาพหน้าเอกสาร” (ไม่ใช่แค่ที่ OCR อ่านได้)' }),
      el('div', { class: 'grid' }, E.CONFIRM_ITEMS.map(([k, l]) => check(`vis_conf_${k}`, l))),
      ev('def'),
    ] },
    { id: 'fup', title: '6 · ติดตามหนี้ และปรับโครงสร้างหนี้', ctl: [9, 10], build: () => [
      grid([
        date('fup_screen_date', 'วันที่ติดตาม (หน้าจอ)'),
        date('fup_report_date', 'วันที่ติดตาม (รายงานติดตาม)'),
        field('fup_method', 'วิธีติดตาม', { ph: 'โทรศัพท์ / จดหมาย / ลงพื้นที่' }),
        field('fup_result', 'ผลติดตาม'),
      ]),
      check('fup_report_identity_ok', 'ผู้กู้ / LG ในรายงานติดตามตรงกับเคส'),
      el('p', { class: 'note', text: '“วันที่ติดตาม” ไม่ใช่ “วันที่ทำสัญญาปรับโครงสร้างหนี้” — คนละความหมาย' }),
      grid([
        select('rst_has', 'มีการปรับโครงสร้างหนี้', YN),
        date('rst_screen_date', 'วันที่ปรับโครงสร้าง (หน้าจอ)'),
        date('rst_doc_signing', 'เอกสาร: วันที่ลงนาม', 'Level 1'),
        date('rst_doc_approval', 'เอกสาร: วันที่อนุมัติ', 'Level 1'),
        date('rst_doc_effective', 'เอกสาร: วันที่มีผล', 'Level 1'),
        date('rst_stmt_header_date', 'หัว Statement ใบแรก', 'Level 2 — ใช้เมื่อไม่ตรง Level 1'),
      ]),
      ev('fup'), ev('rst'),
    ] },
    { id: 'dmd', title: '7 · หนังสือบอกกล่าว และสภาพหนี้ ณ วันบอกกล่าว', ctl: [11, 12, 13], build: () => [
      grid([
        date('dmd_date_screen', 'วันที่หนังสือบอกกล่าว (หน้าจอ)'),
        date('dmd_date_letter', 'วันที่หนังสือบอกกล่าว (ตัวหนังสือ)'),
        money('dmd_principal', 'เงินต้นในหนังสือ'),
        money('dmd_interest', 'ดอกเบี้ยในหนังสือ'),
        money('dmd_total', 'ยอดรวมในหนังสือ'),
        money('stmt_principal_at_demand', 'เงินต้น Statement ณ วันบอกกล่าว', 'ไม่บังคับ — กรอกเมื่อมีการชำระหลังบอกกล่าว ไม่เช่นนั้นเทียบกับ Statement ล่าสุด'),
      ]),
      check('dmd_identity_ok', 'ผู้กู้ / Account / วงเงิน / ที่อยู่ผู้รับ ในหนังสือตรงกับเคส'),
      el('p', { class: 'sub2', text: 'หน้าจอ: สภาพหนี้ ณ วันฟ้อง / วันออกหนังสือบอกกล่าว / วันพิทักษ์ทรัพย์เด็ดขาด' }),
      grid([money('hist_principal', 'เงินต้น'), money('hist_interest', 'ดอกเบี้ย'), money('hist_total', 'รวม')]),
      ev('dmd'), ev('hist'),
    ] },
    { id: 'pst', title: '8 · ไปรษณีย์ และที่อยู่', ctl: [14, 15], build: () => [
      grid([
        select('pst_outcome', 'ผลการส่ง', [['', '— เลือก —'], ['DELIVERED', 'ส่งสำเร็จ (มีใบตอบรับ)'], ['RETURNED', 'ส่งไม่สำเร็จ (ซองตีกลับ)'], ['NONE', 'ไม่พบหลักฐาน / ใบตอบรับว่าง']]),
        date('pst_send_date', 'วันที่ส่ง', 'ไม่บังคับ'),
        date('pst_received_date', 'วันที่ผู้รับลงนามรับ'),
        select('pst_signature', 'ลายมือชื่อในใบตอบรับ', [['', '— เลือก —'], ['RECIPIENT', 'ผู้รับ'], ['AUTHORIZED', 'ผู้รับแทน'], ['PRINTED_NAME_ONLY', 'ชื่อตัวบรรจงเท่านั้น'], ['POSTAL_OFFICER_ONLY', 'เจ้าหน้าที่ไปรษณีย์เท่านั้น'], ['NONE', 'ไม่มี']]),
        select('pst_returned_evidence', 'หลักฐานซองตีกลับ / คืนผู้ฝาก', YN),
        select('pst_tracking_linked', 'เลขไปรษณีย์ใบตอบรับ/ซองเป็นชุดเดียวกัน', [['', '— ไม่ได้ตรวจ —'], ['Y', 'ใช่'], ['N', 'ไม่ใช่']]),
      ]),
      el('p', { class: 'sub2', text: 'ที่อยู่ที่จัดส่ง' }),
      grid(E.ADDR_FIELDS.map(([k, l]) => field(`addr_postal_${k}`, l))),
      el('p', { class: 'sub2', text: 'ที่อยู่ที่อ้างอิงได้จากเอกสารใน PDF (อนุมัติ / สัญญา / เอกสารผู้กู้ / แจ้งเปลี่ยนที่อยู่)' }),
      addrDocTable(),
      el('p', { class: 'note', text: 'ต. อ. จ. ม. ถือเป็นคำย่อเดียวกับ ตำบล อำเภอ จังหวัด หมู่ · บ้านเลขที่ไม่ใช้ fuzzy match · ถ้ามีเอกสารแจ้งเปลี่ยนที่อยู่ ระบบเทียบกับที่อยู่ล่าสุดที่ติ๊ก' }),
      ev('pst'), ev('addr'),
    ] },
    { id: 'cur', title: '9 · ภาระหนี้ปัจจุบัน (หน้าจอ vs Statement ล่าสุด)', ctl: [16], build: () => [
      grid([
        money('cur_screen_principal', 'หน้าจอ: เงินต้น'), money('cur_screen_interest', 'หน้าจอ: ดอกเบี้ย'), money('cur_screen_total', 'หน้าจอ: รวม'),
        money('cur_stmt_principal', 'Statement: เงินต้น'), money('cur_stmt_interest', 'Statement: ดอกเบี้ย'), money('cur_stmt_other', 'Statement: ยอดอื่น ๆ', 'ไม่บังคับ (ค่าปรับ/ค่าธรรมเนียมที่นับรวม)'),
      ]),
      ev('cur'),
    ] },
    { id: 'claim', title: '10 · ฐานคำนวณ อัตรา และจำนวนเงินค่าประกันชดเชย', ctl: [18, 19, 20], build: () => [
      grid([
        money('guarantee_exposure', 'ภาระค้ำประกันปัจจุบัน'),
        money('cb_screen_base', 'ฐานคำนวณ (หน้าจอ)'),
        select('cb_screen_mode', 'โหมดที่หน้าจอเลือก', [['', '— เลือก —'], ['BY_PRINCIPAL', 'ตามภาระหนี้ต้นเงินคงเหลือ'], ['BY_GUARANTEE', 'ตามวงเงินค้ำประกัน']]),
        date('claim_app_date', 'วันที่ยื่นคำขอรับเงิน', 'วันที่ออก LG กรอกที่ตารางข้อ 2'),
        field('cr_screen_ratio', 'อัตราค่าประกันชดเชย % (หน้าจอ)', { ph: '70', mode: 'decimal' }),
        money('claim_amount_screen', 'จำนวนเงินค่าประกันชดเชย (หน้าจอ)'),
        money('claim_paid_screen', 'ยอดอนุมัติจ่าย (หน้าจอ)'),
      ]),
      ev('claim'),
    ] },
    { id: 'cap', title: '11 · CLAIM MAX / Portfolio Cap', ctl: [21], build: () => [
      grid([
        money('cap_max', 'CLAIM MAX'), money('cap_paid', 'ยอดจ่ายจริง'), money('cap_pending', 'ยอดรอจ่าย'),
        money('cap_screen_available', 'คงเหลือจ่ายได้อีก (หน้าจอ)'), money('cap_screen_after', 'คงเหลือหลังอนุมัติ (หน้าจอ)'),
      ]),
      ev('cap'),
    ] },
    { id: 'time', title: '12 · Timeline (วันที่ปลายทาง)', ctl: [22], build: () => [
      el('p', { class: 'note', text: 'ระบบดึงวันที่จากข้อ 2–10 มาเรียงเอง กรอกเฉพาะขั้นท้ายที่ยังไม่มีที่อื่น' }),
      grid([date('tl_bank_submission_date', 'ธนาคารส่งคำขอ'), date('tl_complete_docs_date', 'เอกสารครบ'), date('tl_payment_approval_date', 'อนุมัติจ่าย')]),
      ev('time'),
    ] },
    { id: 'cfg', title: 'ตั้งค่ากฎ (ยังไม่มีเอกสารยืนยัน — Rulebook §32)', ctl: [], build: () => [
      grid([
        select('cfg_lgAgeBasis', 'วิธีนับอายุ LG (Control 19)', [['CLAIM_DATE', 'ตามวันที่ยื่น: ยื่น ≤ วันออก LG + 5 ปี → 70%'], ['CLAIM_YEAR', 'ตามปีที่ยื่น: ปียื่น − ปีออก LG ≤ 5 → 70%']]),
        field('cfg_tol', 'เกณฑ์ข้อสังเกต ดอกเบี้ย/รวม (บาท) — Control 16', { value: '0.01', mode: 'decimal' }),
      ]),
    ] },
  ];

  // ------------------------------------------------------------ form <-> data
  const form = $('#form');
  const sectionEls = {};
  SECTIONS.forEach((s, i) => {
    const st = el('span', { class: 'st', hidden: true });
    const d = el('details', { open: i < 2 }, [
      el('summary', {}, [el('span', { text: s.title }), s.ctl.length ? el('span', { class: 'ctl', text: `Control ${s.ctl.join(', ')}` }) : null, st]),
      el('div', { class: 'body' }, s.build()),
    ]);
    sectionEls[s.id] = { d, st };
    form.append(d);
  });
  $('#ruleVersion').textContent = E.RULE_VERSION;

  const tableEl = (name) => $(`[data-table="${name}"]`, form);

  function readForm() {
    const data = {};
    form.querySelectorAll('[data-k]').forEach((n) => {
      const k = n.getAttribute('data-k');
      data[k] = n.type === 'checkbox' ? (n.checked ? 'Y' : '') : n.value;
    });
    ['transactions', 'addr_docs'].forEach((name) => {
      data[name] = [...tableEl(name).querySelectorAll('tbody tr')].map((tr) => {
        const row = {};
        tr.querySelectorAll('[data-c]').forEach((n) => { row[n.getAttribute('data-c')] = n.type === 'checkbox' ? n.checked : n.value; });
        return row;
      });
    });
    return data;
  }
  function writeForm(data) {
    form.querySelectorAll('[data-k]').forEach((n) => {
      const k = n.getAttribute('data-k');
      if (n.type === 'checkbox') n.checked = data[k] === 'Y';
      else if (k === 'cfg_tol') n.value = data[k] != null ? data[k] : '0.01';
      else n.value = data[k] != null ? data[k] : (n.tagName === 'SELECT' && k === 'cfg_lgAgeBasis' ? 'CLAIM_DATE' : n.tagName === 'SELECT' ? '' : '');
    });
    ['transactions', 'addr_docs'].forEach((name) => {
      const t = tableEl(name);
      t._clear();
      const rows = data[name] && data[name].length ? data[name] : [{}];
      rows.forEach((r) => t._addRow(r));
    });
  }
  function currentConfig(data) {
    const cfg = { lgAgeBasis: data.cfg_lgAgeBasis || 'CLAIM_DATE' };
    const tol = E.util.parseMoney(data.cfg_tol);
    if (tol.state === 'ok' && tol.value >= 0) cfg.moneyToleranceSatang = tol.value;
    return cfg;
  }

  // ------------------------------------------------------------ results
  const CLS = { PASS: 'ok', PASS_WITH_DOCUMENTARY_SUPPORT: 'ok', OBSERVATION: 'warn', NOT_APPLICABLE: 'na', NOT_TESTABLE: 'nt', FAIL_ELIGIBILITY: 'fail' };
  const clsOf = (s) => CLS[s] || 'hold';
  const badge = (s) => el('span', { class: `badge s-${clsOf(s)}`, text: E.STATUS_LABEL_TH[s] });
  const SEV = ['fail', 'hold', 'nt', 'warn', 'ok', 'na'];

  let lastRun = null, autoRun = false, onlyIssues = false;

  function render(audit, data) {
    lastRun = { audit, data };
    const box = $('#result');
    box.textContent = '';
    const b = audit.blocking.length;
    const banner = el('div', { class: `banner ${audit.case_status}` }, [
      el('h2', { text: audit.case_status_label }),
      el('p', {}, [
        audit.claim_amount_text ? el('span', {}, ['ค่าประกันชดเชยที่คำนวณได้ ', el('span', { class: 'claim', text: `${audit.claim_amount_text} บาท` }), ' · ']) : null,
        b ? `${b} Control ที่ต้องดำเนินการก่อนอนุมัติ` : 'ไม่มี Control ที่ขวางการอนุมัติ',
      ]),
    ]);
    const c = audit.counts;
    const passN = (c.PASS || 0) + (c.PASS_WITH_DOCUMENTARY_SUPPORT || 0);
    const holdN = Object.keys(c).filter((k) => k.startsWith('HOLD')).reduce((a, k) => a + c[k], 0);
    const chips = el('div', { class: 'chips' }, [
      el('span', { class: 'chip s-ok', text: `ผ่าน ${passN}` }),
      el('span', { class: 'chip s-warn', text: `ข้อสังเกต ${c.OBSERVATION || 0}` }),
      el('span', { class: 'chip s-hold', text: `พัก ${holdN}` }),
      el('span', { class: 'chip s-nt', text: `ตรวจไม่ได้ ${c.NOT_TESTABLE || 0}` }),
      el('span', { class: 'chip s-fail', text: `ไม่ผ่าน ${c.FAIL_ELIGIBILITY || 0}` }),
      el('span', { class: 'chip s-na', text: `ไม่เกี่ยวข้อง ${c.NOT_APPLICABLE || 0}` }),
      el('label', { class: 'opt' }, [el('input', { type: 'checkbox', checked: onlyIssues, on: { change: (e) => { onlyIssues = e.target.checked; render(audit, data); } } }), 'เฉพาะที่ต้องดูต่อ']),
    ]);
    const list = el('div', { class: 'ctls' });
    audit.results.forEach((r) => {
      const issue = E.isBlocking(r.status) || r.status === 'OBSERVATION';
      if (onlyIssues && !issue) return;
      const kv = (k, v) => (v ? el('div', { class: 'kv' }, [el('span', { text: k }), el('span', { text: v })]) : null);
      const dtl = el('div', { class: 'dtl' }, [
        kv('รหัสกฎ', r.control_id),
        r.reason_code ? kv('Reason code', r.reason_code) : null,
        kv('คาดหวัง', r.expected == null ? '' : String(r.expected)),
        kv('ที่พบ', r.observed == null ? '' : String(r.observed)),
        kv('หลักฐาน', r.evidence),
        r.details && r.details.length ? el('ul', {}, r.details.map((d) => el('li', { text: d }))) : null,
        kv('Rule version', r.rule_version),
      ]);
      list.append(el('details', { open: E.isBlocking(r.status) && r.status !== 'NOT_TESTABLE' }, [
        el('summary', {}, [
          el('span', { class: 'no', text: String(r.control_no).padStart(2, '0') }),
          el('span', { class: 'ttl' }, [el('b', { text: r.name }), badge(r.status)]),
          el('span', { class: 'msg', text: r.message }),
        ]),
        dtl,
      ]));
    });
    if (!list.children.length) list.append(el('p', { class: 'muted', text: 'ไม่มี Control ที่ต้องดูต่อ' }));
    const foot = el('div', { class: 'foot' }, [
      el('button', { type: 'button', text: 'ดาวน์โหลดผล + ข้อมูล (JSON)', on: { click: downloadJson } }),
      el('small', { text: 'ไฟล์ JSON มีข้อมูลที่กรอกทั้งหมด (อาจมีชื่อผู้กู้/เลขบัญชี) — เก็บตามระดับชั้นความลับของเคส' }),
    ]);
    box.append(banner, chips, list, foot);

    // per-section badge in the form
    SECTIONS.forEach((s) => {
      const { st } = sectionEls[s.id];
      if (!s.ctl.length) return;
      const statuses = audit.results.filter((r) => s.ctl.includes(r.control_no)).map((r) => clsOf(r.status));
      const w = SEV.find((x) => statuses.includes(x)) || 'na';
      st.hidden = false;
      st.className = `st s-${w}`;
      st.textContent = { fail: 'ไม่ผ่าน', hold: 'พัก', nt: 'ตรวจไม่ได้', warn: 'ข้อสังเกต', ok: 'ผ่าน', na: 'ไม่เกี่ยวข้อง' }[w];
    });
  }

  const narrow = window.matchMedia('(max-width:980px)');
  function run(reveal) {
    const data = readForm();
    render(E.runAudit(data, currentConfig(data)), data);
    autoRun = true;
    if (reveal === true && narrow.matches) $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function downloadJson() {
    if (!lastRun) return;
    const lg = String(lastRun.data.id_lg_screen || 'case').replace(/[^\w.-]+/g, '_');
    const blob = new Blob([JSON.stringify({ rule_version: E.RULE_VERSION, exported_at: new Date().toISOString(), input: lastRun.data, result: lastRun.audit }, null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `pgs10-${lg}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ------------------------------------------------------------ wiring
  SAMPLES.list.forEach((s) => $('#sampleSel').append(el('option', { value: s.id, text: s.label })));
  $('#sampleSel').addEventListener('change', (e) => {
    const s = SAMPLES.list.find((x) => x.id === e.target.value);
    if (!s) return;
    writeForm(s.data);
    run(true);
  });
  $('#btnRun').addEventListener('click', () => run(true));
  $('#btnClear').addEventListener('click', () => { writeForm({}); $('#sampleSel').value = ''; autoRun = false; lastRun = null; $('#result').replaceChildren(el('div', { class: 'empty' }, [el('p', { text: 'ล้างฟอร์มแล้ว' })])); SECTIONS.forEach((s) => { sectionEls[s.id].st.hidden = true; }); });
  $('#btnImport').addEventListener('click', () => $('#fileImport').click());
  $('#fileImport').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    f.text().then((t) => {
      try {
        const j = JSON.parse(t);
        writeForm(j.input || j);
        run(true);
      } catch (err) {
        alert('อ่านไฟล์ JSON ไม่ได้: ' + err.message);
      }
    });
    e.target.value = '';
  });
  // after the first run, re-check as the reviewer edits
  let timer;
  form.addEventListener('input', () => { if (autoRun) { clearTimeout(timer); timer = setTimeout(() => run(false), 250); } });
  form.addEventListener('change', () => { if (autoRun) { clearTimeout(timer); timer = setTimeout(() => run(false), 250); } });
  writeForm({});
})();
