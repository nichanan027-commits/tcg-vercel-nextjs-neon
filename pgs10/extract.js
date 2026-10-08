/*
 * PGS 10 Claim Checker — AI-assisted reading of case documents (stages 2 + 3).
 *
 *  - Stage 2: if a PDF page has a text layer its text is sent along as a hint (scans such as bank/WebCSR prints usually have none).
 *  - Stage 3: the rendered page image is sent to Claude (runtime capability `sample`, viewer's own account, per-call consent) and Claude
 *    returns SUGGESTED values. Nothing reaches the form until the reviewer presses “ใช้ค่า”; every accepted value keeps provenance
 *    (file, page, method, confidence, quote) which is exported with the case JSON.
 *  - The image outranks any text layer (Rulebook): the reviewer must still look at the page. This never produces a verdict.
 *  - Bank-specific knowledge lives in FI_PROFILES (prototype of the “FI Evidence Adapter”): label equivalences + transaction-code map.
 *    The GSB profile comes from ONE real case (LG 67-011373) and is marked UNVERIFIED as a general mapping.
 * All DOM is built with textContent (document text is arbitrary).
 */
(function () {
  'use strict';
  const D = window.PGS10_DOCS, UI = window.PGS10_UI;
  if (!D || !UI) return;
  const I = D._int;
  const el = (tag, attrs, kids) => {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'on') Object.entries(v).forEach(([e, fn]) => n.addEventListener(e, fn));
      else n.setAttribute(k, v === true ? '' : v);
    });
    [].concat(kids || []).forEach((c) => c != null && n.append(c));
    return n;
  };

  // ------------------------------------------------------------ what can be read from which document type  [key, Thai label, hint]
  const ID = (c) => [[`id_lg_${c}`, 'เลข LG'], [`id_name_${c}`, 'ชื่อผู้กู้'], [`id_acct_${c}`, 'เลขบัญชีสินเชื่อ'], [`id_limit_${c}`, 'วงเงินสินเชื่อ'], [`id_lgdate_${c}`, 'วันที่ LG']];
  const DOC_FIELDS = {
    SCREEN: { fields: [...ID('screen'), ['default_date_screen', 'วันที่ผิดนัดชำระหนี้'], ['fup_screen_date', 'วันที่ติดตามให้ชำระหนี้/ปรับโครงสร้างหนี้'], ['rst_screen_date', 'วันที่ทำสัญญาปรับโครงสร้างหนี้'],
      ['dmd_date_screen', 'วันที่บอกเลิกสัญญา/บอกกล่าวชำระหนี้ (1)'], ['tl_bank_submission_date', 'วันที่ธนาคารส่งคำขอ'], ['tl_complete_docs_date', 'วันที่ได้รับเอกสารครบถ้วน'], ['tl_payment_approval_date', 'วันที่อนุมัติเสนอจ่าย'],
      ['guarantee_exposure', 'ภาระค้ำประกันปัจจุบัน'], ['hist_principal', 'สภาพหนี้ ณ วันฟ้อง/วันออกหนังสือบอกกล่าว: เงินต้น'], ['hist_interest', '… ดอกเบี้ย'], ['hist_total', '… รวม'],
      ['cur_screen_principal', 'สภาพหนี้ ณ ปัจจุบัน: เงินต้น'], ['cur_screen_interest', '… ดอกเบี้ย'], ['cur_screen_total', '… รวม'],
      ['cb_screen_base', 'ภาระค้ำประกันที่นำมาคำนวณ (ฐานคำนวณ)'], ['cr_screen_ratio', 'สัดส่วน (%)'], ['claim_amount_screen', 'จำนวนเงินจ่ายค่าประกันชดเชย']],
      note: 'หน้าจอของ บสย. (ข้อมูลหนังสือค้ำประกัน / สภาพหนี้ / รายละเอียดวงเงิน). ช่องที่ว่างบนหน้าจอให้ข้าม ห้ามเดา' },
    BANK_SCREEN: { fields: [...ID('statement').filter((x) => x[0].startsWith('id_acct') || x[0].startsWith('id_name')), ['cur_stmt_principal', 'เงินต้นคงเหลือ (Current/Principal Balance)']],
      note: 'หน้าจอระบบของธนาคาร (เช่น WebCSR Loan Account Overview). วันที่ผิดนัดไม่ได้อยู่ในหน้าจอนี้' },
    PAYOFF: { fields: [['id_acct_statement', 'เลขบัญชี'], ['id_name_statement', 'ชื่อผู้กู้'], ['cur_stmt_principal', 'เงินต้นคงเหลือ (Principal Balance)'], ['cur_stmt_interest', 'ดอกเบี้ยค้างรับ (Interest due)'], ['cur_stmt_other', 'ค่าปรับ/ค่าธรรมเนียมอื่น (Late charges / fees)']],
      note: 'ใบสอบถามยอดชำระปิดบัญชี. ถ้าไม่ได้แยกชัดเจนให้ใส่เฉพาะที่เห็นจริง. ยอด Net Payoff ให้บันทึกใน observations (ไม่มีช่องรับ)' },
    STATEMENT: { fields: [...ID('statement').filter((x) => x[0].startsWith('id_acct') || x[0].startsWith('id_name')), ['stm_cutoff_date', 'Statement ถึงวันที่ (วันสุดท้ายที่ Statement ครอบคลุม — ถ้าระบุชัดเจนเท่านั้น)']],
      tx: true, note: 'Loan Account Statement: อ่านทุกบรรทัดรายการ (ทั้งแถวจำนวนเงินและแถวเงินต้น/ดอกเบี้ย) ลงใน transactions; อย่าคำนวณเอง' },
    LG: { fields: [['id_lg_lg', 'เลขที่หนังสือค้ำประกัน'], ['id_name_lg', 'ผู้ขอสินเชื่อ/ผู้กู้'], ['id_limit_lg', 'วงเงินสินเชื่อที่ค้ำ'], ['id_lgdate_lg', 'วันที่ออกหนังสือค้ำประกัน']],
      note: 'หนังสือค้ำประกัน (LG). ระยะเวลาค้ำประกัน (เช่น "3 ปี") ไม่มีช่องในแบบฟอร์ม — ใส่ใน observations พร้อมคำที่เขียนจริง' },
    APPROVAL_SEQUENCE: { fields: [['approval_date', 'วันที่ทำสัญญา/วันที่แจ้งผลอนุมัติ (ตามที่ระบุในเอกสาร ระบุว่าเป็นวันไหนใน quote)'], ['id_name_approval', 'ชื่อผู้กู้'], ['id_acct_approval', 'เลขบัญชีสินเชื่อ (ถ้ามี)'], ['id_limit_approval', 'วงเงินกู้'], ['id_lg_approval', 'เลขที่หนังสือค้ำประกันที่อ้างถึง'], ['id_lgdate_approval', 'วันที่ออกหนังสือค้ำประกันที่อ้างถึง']],
      note: 'หนังสืออนุมัติ/สัญญากู้. ระบุลำดับหน้าของเอกสาร (เช่น "1 of X", "—2—") ใน observations' },
    DEMAND_LETTER: { fields: [['dmd_date_letter', 'วันที่ของหนังสือบอกกล่าว'], ['dmd_principal', 'เงินต้นที่เรียกให้ชำระ'], ['dmd_interest', 'ดอกเบี้ย (เฉพาะที่ระบุว่าดอกเบี้ย; เบี้ยปรับให้แยกใน observations)'], ['dmd_total', 'ยอดรวมทั้งสิ้น'], ['demand_contract_date', 'วันที่ของสัญญาที่อ้างถึงในหนังสือ'], ['id_name_demand', 'ผู้รับ/ผู้กู้'], ['id_acct_demand', 'เลขบัญชีสินเชื่อ'], ['id_limit_demand', 'วงเงินกู้'], ['id_lg_demand', 'เลขที่หนังสือค้ำประกันที่อ้างถึง'], ['id_lgdate_demand', 'วันที่หนังสือค้ำประกันที่อ้างถึง']],
      note: 'หนังสือบอกกล่าว/บอกเลิกสัญญา. "นับถึงวันที่ …" (as-of date ของยอดหนี้) ให้ใส่ใน observations' },
    TRACKING_REPORT: { fields: [['fup_report_date', 'วันที่ติดตาม'], ['fup_method', 'วิธีติดตาม'], ['fup_result', 'ผลติดตาม/รายละเอียดการติดตาม']],
      note: 'รายงานความคืบหน้าการติดตามหนี้ (อาจหมุน 90° — อ่านตามทิศที่ถูกต้อง). ถ้ามีการระบุผู้ติดต่อ/เบอร์ ให้ข้ามข้อมูลส่วนบุคคลนั้น' },
    POSTAL_ACK: { fields: [['pst_send_date', 'วันที่ส่ง (ตราประทับไปรษณีย์ของต้นทาง)'], ['pst_received_date', 'วันที่ผู้รับลงนามรับ (ถ้ามีเขียนชัดเจน)'], ['addr_postal_house', 'ที่อยู่ผู้รับ: บ้านเลขที่'], ['addr_postal_moo', 'หมู่'], ['addr_postal_tambon', 'ตำบล/แขวง'], ['addr_postal_amphoe', 'อำเภอ/เขต'], ['addr_postal_province', 'จังหวัด'], ['addr_postal_zip', 'รหัสไปรษณีย์']],
      note: 'ใบตอบรับ/ซอง/ตราไปรษณีย์. ผลการส่ง (ส่งสำเร็จ/ตีกลับ) และลายมือชื่อให้บรรยายสิ่งที่เห็นใน observations เท่านั้น — ห้ามสรุปเอง' },
    CLAIM_FORM: { fields: [['claim_app_date', 'วันที่ของแบบคำขอรับเงินค่าประกันชดเชย']],
      note: 'แบบคำขอรับเงินค่าประกันชดเชย. วันผิดนัด วันที่บอกกล่าว สภาพหนี้ ณ วันยื่น และ checkbox ที่ติ๊กไว้ ให้ใส่ใน observations ตามที่เห็น' },
  };

  // ------------------------------------------------------------ FI profiles (prototype of the FI Evidence Adapter)
  const FI_PROFILES = {
    GSB: {
      label: 'ธนาคารออมสิน (GSB)',
      hint: [
        'เอกสารธนาคารออมสิน: WebCSR "Loan Account Overview", "สอบถามยอดเงินชำระปิดบัญชี (Payoff Quote)", "Loan Account Statement".',
        'ความหมายของป้ายชื่อ: Current Balance / Principal Balance = เงินต้นคงเหลือ; ดอกเบี้ยค้างรับ = ดอกเบี้ยที่ค้าง; Total Late Charges = ค่าปรับ; Payoff Amount / Net Payoff Amount = ยอดชำระปิดบัญชีรวม (เงินต้น+ดอกเบี้ย+ค่าปรับ).',
        'Statement คอลัมน์: วันที่ / วันที่มีผล, คำย่อ (รหัสรายการ), รายการ, เลขที่ตั๋ว/เช็ค, วันครบกำหนด, จำนวนเงิน, คงเหลือ; แถวที่สองของแต่ละรายการแสดง ค่าธรรมเนียม / ดอกเบี้ยผิดนัด / ดอกเบี้ยปกติ / เงินต้น.',
        'รหัสที่พบ: CMP = ชำระหนี้อัตโนมัติ; CMDTR = จ่ายเงินกู้โดยโอน; "-" = บรรทัดยอดคงเหลือ (ไม่ใช่รายการเงิน); B/F = ยอดยกมา; C/F = ยอดยกไป. "Collection Records" ไม่ใช่รายการชำระ.',
      ].join('\n'),
      txn: { CMP: 'PAYMENT' }, // everything else -> UNKNOWN (Safe-Hold). Evidence: one case only.
      txnNote: 'รหัส CMP → PAYMENT มาจากเคสเดียว (UNVERIFIED เป็น mapping ทั่วไป); รหัสอื่น → UNKNOWN',
      noRow: new Set(['B/F', 'C/F', '-']),
    },
    TCG: { label: 'ไทยเครดิต (Thai Credit)', hint: 'เอกสารธนาคารไทยเครดิต: ไม่มี mapping สำเร็จรูปในหน้านี้ — อ่านตามที่เขียนจริง', txn: {}, txnNote: 'ไม่มี mapping — ทุกรหัส → UNKNOWN', noRow: new Set(['B/F', 'C/F', '-']) },
    OTHER: { label: 'อื่น ๆ (ไม่มี mapping)', hint: 'ไม่มีข้อมูล mapping ของธนาคารนี้ — อ่านตามที่เขียนจริง', txn: {}, txnNote: 'ไม่มี mapping — ทุกรหัส → UNKNOWN', noRow: new Set(['B/F', 'C/F', '-']) },
  };

  // ------------------------------------------------------------ provenance (exported with the case JSON)
  const prov = [];
  window.PGS10_PROV = { list: () => prov.slice() };

  // ------------------------------------------------------------ helpers
  const THAI_DIGITS = /[๐-๙]/g;
  const toArabic = (s) => String(s).replace(THAI_DIGITS, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)));
  // CE -> BE for the form (the form is BE dd/mm/yyyy); everything else is passed through as read
  function formDate(v, cal) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(toArabic(v).trim());
    if (!m) return { value: String(v), converted: false, bad: true };
    let y = +m[3];
    const isCE = cal === 'CE' || (cal !== 'BE' && y < 2400);
    if (isCE) y += 543;
    return { value: `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${y}`, converted: isCE, bad: false };
  }
  const isDateKey = (k) => /date|_date_|^id_lgdate|^tl_|^approval_date|^claim_app_date|^fup_screen_date|^fup_report_date|^rst_/.test(k) && !/_ratio$/.test(k);

  // ------------------------------------------------------------ capture the current page (or the part on screen) as an image
  const TARGET_PX = 1.2e6, MAX_PX = 25e6;
  async function pageSource(f) {
    if (f.kind === 'image') {
      const bmp = await createImageBitmap(f.blob);
      return { w: bmp.width, h: bmp.height, draw: (ctx, sx, sy, sw, sh, dw, dh) => ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, dw, dh), swap: !!(f.rot % 180), rot: f.rot, kind: 'image' };
    }
    const lib = await I.loadPdfLib();
    if (!f.pdf) f.pdf = await lib.getDocument({ data: new Uint8Array(await f.blob.arrayBuffer()) }).promise;
    const page = await f.pdf.getPage(f.page);
    return { page, kind: 'pdf' };
  }
  async function capture(f, scope, px) {
    const TARGET = px || TARGET_PX;
    const src = await pageSource(f);
    // visible fraction of the displayed page (0..1) — whole page when scope = 'page'
    let fx0 = 0, fy0 = 0, fx1 = 1, fy1 = 1;
    const shown = I.stage.querySelector('canvas,img');
    if (scope === 'visible' && shown) {
      const sr = I.stage.getBoundingClientRect(), cr = shown.getBoundingClientRect();
      fx0 = Math.max(0, (sr.left - cr.left) / cr.width); fy0 = Math.max(0, (sr.top - cr.top) / cr.height);
      fx1 = Math.min(1, (sr.right - cr.left) / cr.width); fy1 = Math.min(1, (sr.bottom - cr.top) / cr.height);
      if (fx1 - fx0 < 0.05 || fy1 - fy0 < 0.05) { fx0 = fy0 = 0; fx1 = fy1 = 1; }
    }
    const frac = (fx1 - fx0) * (fy1 - fy0);
    let full = document.createElement('canvas');
    if (src.kind === 'pdf') {
      const base = src.page.getViewport({ scale: 1, rotation: f.rot });
      let scale = Math.sqrt((TARGET / frac) / (base.width * base.height));
      scale = Math.min(scale, Math.sqrt(MAX_PX / (base.width * base.height)));
      const vp = src.page.getViewport({ scale, rotation: f.rot });
      full.width = Math.floor(vp.width); full.height = Math.floor(vp.height);
      await src.page.render({ canvasContext: full.getContext('2d'), viewport: vp }).promise;
    } else {
      const rw = src.swap ? src.h : src.w, rh = src.swap ? src.w : src.h;
      let k = Math.min(1, Math.sqrt(MAX_PX / (rw * rh)));
      full.width = Math.floor(rw * k); full.height = Math.floor(rh * k);
      const ctx = full.getContext('2d');
      ctx.translate(full.width / 2, full.height / 2); ctx.rotate((f.rot * Math.PI) / 180);
      const dw = src.swap ? full.height : full.width, dh = src.swap ? full.width : full.height;
      ctx.translate(-dw / 2, -dh / 2); src.draw(ctx, 0, 0, src.w, src.h, dw, dh);
    }
    let out = full;
    if (frac < 1) {
      out = document.createElement('canvas');
      out.width = Math.max(1, Math.floor(full.width * (fx1 - fx0))); out.height = Math.max(1, Math.floor(full.height * (fy1 - fy0)));
      out.getContext('2d').drawImage(full, full.width * fx0, full.height * fy0, out.width, out.height, 0, 0, out.width, out.height);
    }
    const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
    return { blob, width: out.width, height: out.height, fraction: frac };
  }
  async function textLayer(f) {
    if (f.kind !== 'pdf') return null;
    try {
      const lib = await I.loadPdfLib();
      if (!f.pdf) f.pdf = await lib.getDocument({ data: new Uint8Array(await f.blob.arrayBuffer()) }).promise;
      const tc = await (await f.pdf.getPage(f.page)).getTextContent();
      const t = tc.items.map((x) => x.str).join(' ').replace(/\s+/g, ' ').trim();
      return t.length >= 30 ? t.slice(0, 4000) : '';
    } catch (e) { return null; }
  }

  // ------------------------------------------------------------ prompt
  function buildPrompt(f, spec, fi, text) {
    const keys = spec.fields.map(([k, l]) => `- ${k}: ${l}`).join('\n');
    return [
      'คุณอ่านภาพหน้าเอกสารภาษาไทยหนึ่งหน้า เพื่อช่วยผู้ตรวจเคสค้ำประกัน (PGS 10) ผู้ตรวจจะยืนยันทุกค่าเอง — งานของคุณคือ "อ่านตามที่เขียน" ไม่ใช่ตีความหรือตัดสิน',
      `ประเภทเอกสารที่ผู้ใช้ระบุ: ${D.TYPE_LABEL[f.type]} (ไฟล์ ${f.name}, หน้า ${f.page}). ภาพอาจเอียง/หมุน/สแกนไม่ชัด/มีลายมือ`,
      spec.note, `ข้อมูลรูปแบบเอกสารของ ${fi.label}:\n${fi.hint}`,
      text ? `ข้อความจาก text layer ของหน้านี้ (ใช้ประกอบเท่านั้น หากขัดกับภาพ ให้เชื่อภาพและบอกใน observations):\n"""${text}"""` : 'หน้านี้ไม่มี text layer (สแกน/ภาพ) — อ่านจากภาพอย่างเดียว',
      'ฟิลด์ที่ขอ (ใช้ key ตามนี้เท่านั้น):\n' + keys,
      spec.tx ? 'และให้อ่านรายการเดินบัญชีทุกบรรทัดลง "transactions".' : '',
      'กติกา:',
      '1. ใส่เฉพาะค่าที่เห็นชัดเจน. ถ้าไม่เห็น/ไม่แน่ใจ/ช่องว่าง ให้ "ไม่ใส่ key นั้น" แล้วบอกใน observations. ห้ามเดา ห้ามคำนวณ ห้ามปัดเศษ ห้ามแก้ตัวเลขให้ตรงกัน ห้ามนำค่าจากฟิลด์หนึ่งไปใส่อีกฟิลด์.',
      '2. ตัวเลขเงิน: คัดลอกตามที่พิมพ์ (คงจุลภาค/ทศนิยม) เช่น "25,833.35". ข้อความ: คัดลอกตามที่เขียน.',
      '3. วันที่: ใส่เป็น dd/mm/yyyy (แปลงชื่อเดือนไทยเป็นเลขเดือน, แปลงเลขไทยเป็นอารบิก แต่ **ห้ามเปลี่ยนปี**) แล้วระบุ "calendar": "BE" ถ้าปีเป็น พ.ศ. (≥ 2400), "CE" ถ้าเป็น ค.ศ.',
      '4. "quote" = ข้อความสั้น ๆ ที่เห็นบนเอกสารรอบค่านั้น (ไม่เกิน 80 ตัวอักษร) เพื่อให้ผู้ตรวจค้นหาเจอ; "confidence" = high | medium | low (ลายมือ/เบลอ/ขอบตัด = low).',
      '5. observations = สิ่งที่ผู้ตรวจควรรู้ในหน้านี้ที่ไม่มีช่องรับ หรือความผิดปกติที่เห็น (เช่น วันที่หัวเอกสารหลังวันที่พิมพ์, ตัวเลขไม่รวมกัน, หน้าถูกตัด, ตราประทับอ่านไม่ออก) — บรรยายสิ่งที่เห็น ไม่สรุปว่าผ่าน/ไม่ผ่านเกณฑ์.',
      'ตอบเป็น JSON อย่างเดียว ตามรูปแบบ:',
      '{"readable": true, "fields": [{"key": "...", "value": "...", "calendar": "BE|CE|null", "confidence": "high|medium|low", "quote": "..."}], ' +
        (spec.tx ? '"transactions": [{"date": "dd/mm/yyyy", "raw_code": "...", "description": "...", "amount": "...", "balance": "...", "confidence": "high|medium|low"}], ' : '') +
        '"observations": ["..."]}',
      '"readable": false ถ้าหน้านี้อ่านไม่ได้เลย.',
    ].filter(Boolean).join('\n\n');
  }

  // ------------------------------------------------------------ UI
  const box = el('section', { class: 'xt' });
  I.panel.append(box);
  const fiSel = el('select', { 'aria-label': 'รูปแบบเอกสารของธนาคาร' }, Object.entries(FI_PROFILES).map(([k, v]) => el('option', { value: k, text: v.label })));
  const scopeSel = el('select', { 'aria-label': 'ส่วนที่จะส่งให้ AI อ่าน' }, [el('option', { value: 'page', text: 'ทั้งหน้า' }), el('option', { value: 'visible', text: 'เฉพาะส่วนที่เห็นบนจอ (ละเอียดกว่า — ซูมก่อน)' })]);
  const runBtn = el('button', { type: 'button', class: 'primary', text: 'อ่านหน้านี้ด้วย AI' });
  const allBtn = el('button', { type: 'button', text: 'อ่านทั้งไฟล์ (ทุกหน้า) แล้วสรุป' });
  const stopBtn = el('button', { type: 'button', class: 'ghost', text: 'หยุด', hidden: true });
  const status = el('p', { class: 'xstatus muted', role: 'status', 'aria-live': 'polite' });
  const results = el('div', { class: 'xres' });
  const consentChk = el('input', { type: 'checkbox', id: 'xConsent' });
  box.append(
    el('h3', { text: 'อ่านเอกสารด้วย AI (ทดลอง)' }),
    el('p', { class: 'muted xnote', text: 'ภาพของหน้าที่เลือกจะถูกส่งให้ Claude ประมวลผลผ่านบัญชีของผู้เปิดหน้านี้ (ไม่ถูกเก็บโดยหน้านี้) ผลเป็น “ค่าแนะนำ” — ต้องกด “ใช้ค่า” ทีละรายการ และต้องดูภาพประกอบเสมอ' }),
    el('label', { class: 'chk' }, [consentChk, el('span', { text: 'ยืนยัน: อนุญาตให้ส่งภาพหน้าเอกสารนี้ไปให้ AI อ่าน' })]),
    el('div', { class: 'xrow' }, [el('label', { class: 'f' }, [el('span', { text: 'รูปแบบเอกสารธนาคาร' }), fiSel]), el('label', { class: 'f' }, [el('span', { text: 'ส่วนที่ส่ง' }), scopeSel])]),
    el('div', { class: 'xrow' }, [runBtn, allBtn, stopBtn]), status, results);

  let sample = null, canImages = false, ctl = null;
  function setStatus(t, bad) { status.textContent = t || ''; status.classList.toggle('bad', !!bad); }
  let diag = '';
  const notice = el('div', { class: 'xnotice', hidden: true });
  I.panel.insertBefore(notice, I.panel.firstChild);
  (async () => {
    let lim = null, limErr = null;
    try {
      sample = window.claude && (await window.claude.use('sample'));
      if (sample) { try { lim = await sample.limits(); } catch (e) { limErr = (e && (e.code || e.message)) || 'error'; } }
    } catch (e) { sample = null; limErr = (e && (e.code || e.message)) || 'error'; }
    // images: usable when limits() says so; when limits() itself fails we still let the viewer try (an images_unavailable error is handled)
    canImages = !!(lim && lim.images) || (!!sample && !lim);
    diag = 'window.claude: ' + (window.claude ? 'มี' : 'ไม่มี') + ' · sample: ' + (sample ? 'ใช้ได้' : 'ไม่ได้') + ' · limits(): ' + (lim ? JSON.stringify(lim) : 'ไม่ได้ค่า' + (limErr ? ' (' + limErr + ')' : '')) + ' · ' + (navigator.userAgent || '').slice(0, 90);
    if (!sample || !canImages) {
      runBtn.disabled = true; allBtn.disabled = true; consentChk.disabled = true; autoChk.disabled = true;
      const why = !sample ? 'หน้านี้เรียก Claude ไม่ได้ในมุมมองที่เปิดอยู่ (ต้องเปิดผ่านลิงก์ที่เผยแพร่ใน claude.ai ด้วยบัญชีที่มีสิทธิ์)' : 'มุมมองที่เปิดอยู่ (เวอร์ชันของแอป/เว็บ) ไม่รองรับการส่งภาพให้ AI — ปุ่ม “อ่านด้วย AI” จึงใช้ไม่ได้';
      notice.hidden = false;
      notice.replaceChildren(el('strong', { text: 'ปุ่ม AI ถูกปิดไว้: ' }), el('span', { text: why + '. ยังใช้ดูเอกสาร กรอกเอง และกด “ตรวจสอบ” ได้ตามปกติ' }),
        el('p', { class: 'muted', text: 'ทางออก: ส่งไฟล์ให้ Claude อ่านในแชต แล้วนำเข้าไฟล์ JSON ที่ได้ด้วยปุ่ม “นำเข้าไฟล์” — ค่าจะเข้าฟอร์มและตรวจให้ทันที' }),
        el('details', {}, [el('summary', { text: 'รายละเอียดทางเทคนิค (ส่งให้ผู้พัฒนาดูได้)' }), el('code', { text: diag })]));
      setStatus('', false);
    }
  })();

  runBtn.addEventListener('click', async () => {
    const f = I.cur();
    results.replaceChildren();
    if (!f || f.kind === 'other') return setStatus('เลือกเอกสาร PDF หรือรูปภาพก่อน', true);
    if (!f.type || !DOC_FIELDS[f.type]) return setStatus('เลือก “ประเภทเอกสาร” ของไฟล์นี้ในรายการด้านบนก่อน (ยังไม่รองรับประเภท: ' + (f.type ? D.TYPE_LABEL[f.type] : 'ไม่ได้เลือก') + ')', true);
    if (!consentChk.checked) return setStatus('ติ๊กยืนยันการส่งภาพให้ AI ก่อน', true);
    const spec = DOC_FIELDS[f.type], fi = FI_PROFILES[fiSel.value];
    ctl = new AbortController(); runBtn.disabled = true; stopBtn.hidden = false;
    try {
      setStatus('กำลังเตรียมภาพหน้า ' + f.page + '…');
      const [cap, text] = await Promise.all([capture(f, scopeSel.value), textLayer(f)]);
      setStatus('กำลังให้ AI อ่าน (ใช้เวลาประมาณ 10–60 วินาที)…');
      const out = await sample.json(buildPrompt(f, spec, fi, text), { images: cap.blob, signal: ctl.signal, cache: false });
      renderResults(f, spec, fi, out, { text: text === null ? 'unknown' : text ? 'yes' : 'no', scope: scopeSel.value, w: cap.width, h: cap.height });
      setStatus('AI อ่านเสร็จ — ตรวจเทียบกับภาพก่อนกด “ใช้ค่า” (ภาพที่ส่งขนาด ' + cap.width + '×' + cap.height + ' px; ถ้าตัวเลขเล็กมาก ให้ซูมแล้วเลือก “เฉพาะส่วนที่เห็นบนจอ”)');
    } catch (e) {
      const m = { cancelled: 'ยกเลิกแล้ว', not_granted: 'ไม่ได้รับอนุญาตให้ใช้ Claude ในหน้านี้', rate_limited: 'เรียกบ่อยเกินไปหรือถึงขีดจำกัดการใช้งาน — ลองใหม่ภายหลัง', image_rejected: 'ภาพถูกปฏิเสธ (ชนิด/ขนาดไม่รองรับ)', images_unavailable: 'มุมมองนี้ส่งภาพให้ AI ไม่ได้ (ต้องใช้แอป/เว็บเวอร์ชันที่รองรับ) — ใช้ทางออก: ให้ Claude อ่านในแชตแล้วนำเข้า JSON', invalid_json: 'AI ตอบในรูปแบบที่อ่านไม่ได้ — ลองใหม่ หรือเลือกเฉพาะส่วนที่เห็นบนจอ', refused: 'AI ไม่ตอบคำขอนี้', session_expired: 'ต้องเข้าสู่ระบบ claude.ai ใหม่' }[e && e.code] || 'เรียก AI ไม่สำเร็จ (' + ((e && e.code) || (e && e.message) || 'unknown') + ')';
      setStatus(m, e && e.code !== 'cancelled');
    } finally { runBtn.disabled = allBtn.disabled = !sample || !canImages; stopBtn.hidden = true; ctl = null; }
  });
  stopBtn.addEventListener('click', () => ctl && ctl.abort());


  // ------------------------------------------------------------ whole file: classify every page, read it, and consolidate
  // Real case bundles are ONE PDF holding many document types (claim form, LG, contract, WebCSR, statements, demand letter, postal slip…),
  // so the document type is decided per page by the AI (shown to the reviewer), not by a tag on the file.
  const CAT = Object.entries(DOC_FIELDS).map(([t, sp]) => `* ${t} — ${D.TYPE_LABEL[t]}: ${sp.fields.map(([k, l]) => `${k} (${l})`).join('; ')}${sp.tx ? '; + transactions' : ''}. ${sp.note}`).join('\n');
  function buildBatchPrompt(f, pageNo, fi, text) {
    return [
      'คุณอ่านภาพหน้าเอกสารภาษาไทยหนึ่งหน้า (จากไฟล์ที่รวมเอกสารหลายชนิดของเคสค้ำประกัน PGS 10) ผู้ตรวจจะยืนยันทุกค่าเอง — งานของคุณคือ "จัดประเภทหน้า" และ "อ่านตามที่เขียน" ไม่ใช่ตีความหรือตัดสิน',
      `ไฟล์ ${f.name}, หน้า ${pageNo}. ภาพอาจเอียง/หมุน/สแกนไม่ชัด/มีลายมือ`,
      `ข้อมูลรูปแบบเอกสารของ ${fi.label}:\n${fi.hint}`,
      text ? `ข้อความจาก text layer (ใช้ประกอบ ถ้าขัดกับภาพให้เชื่อภาพและบอกใน observations):\n"""${text}"""` : 'หน้านี้ไม่มี text layer — อ่านจากภาพอย่างเดียว',
      'ประเภทเอกสารที่ระบบรู้จัก และฟิลด์ที่ขอของแต่ละประเภท:\n' + CAT,
      'ขั้นตอน: (1) เลือก "doc_type" ให้ตรงที่สุดจากรายการด้านบน; ถ้าเป็นเอกสารประเภทอื่น (เช่น KYC, แผนที่, ข้อความสัญญาล้วน, ใบปะหน้า) ให้ "OTHER"; ถ้าอ่านไม่ได้เลย ให้ "UNREADABLE". (2) อ่านเฉพาะฟิลด์ของประเภทที่เลือก (ใช้ key ตามรายการเท่านั้น).',
      'กติกา:',
      '1. ใส่เฉพาะค่าที่เห็นชัดเจน ถ้าไม่เห็น/ไม่แน่ใจ/ช่องว่าง ให้ไม่ใส่ key นั้น. ห้ามเดา ห้ามคำนวณ ห้ามปัดเศษ ห้ามแก้ตัวเลขให้ตรงกัน ห้ามนำค่าจากฟิลด์หนึ่งไปใส่อีกฟิลด์ ห้ามนำค่าจากหน้าอื่นมาใส่.',
      '2. ตัวเลขเงิน/ข้อความ: คัดลอกตามที่เขียน (คงจุลภาค/ทศนิยม).',
      '3. วันที่: dd/mm/yyyy (แปลงชื่อเดือนไทยเป็นเลข เลขไทยเป็นอารบิก **ห้ามเปลี่ยนปี**) และระบุ "calendar": "BE" ถ้า ≥ 2400 หรือ "CE" ถ้าเป็น ค.ศ.',
      '4. "quote" = ข้อความสั้น ๆ รอบค่านั้นบนเอกสาร (≤ 80 ตัวอักษร); "confidence" = high | medium | low (ลายมือ/เบลอ/ขอบตัด = low).',
      '5. observations = สิ่งที่ผู้ตรวจควรรู้ที่ไม่มีช่องรับ หรือความผิดปกติที่เห็น (วันที่หัวเอกสารหลังวันที่พิมพ์, ตัวเลขไม่รวมกัน, หน้าถูกตัด) — บรรยายสิ่งที่เห็น ไม่สรุปว่าผ่าน/ไม่ผ่านเกณฑ์.',
      'ตอบเป็น JSON อย่างเดียว: {"doc_type": "...", "readable": true, "fields": [{"key": "...", "value": "...", "calendar": "BE|CE|null", "confidence": "high|medium|low", "quote": "..."}], "transactions": [{"date": "dd/mm/yyyy", "raw_code": "...", "description": "...", "amount": "...", "balance": "...", "confidence": "high|medium|low"}], "observations": ["..."]}  (transactions เฉพาะหน้า Statement)',
    ].join('\n\n');
  }

  // two passes so a 20+ page bundle finishes in minutes: (A) quick classification of every page, (B) full read of the pages whose type has fields
  const POOL = 2, MAX_PAGES = 60, FATAL = ['images_unavailable', 'cancelled', 'not_granted', 'rate_limited', 'session_expired', 'sampling_disabled', 'capability_disabled'];
  const TYPE_KEYS = Object.keys(DOC_FIELDS);
  function buildClassifyPrompt(f, p) {
    return ['จัดประเภทหน้าเอกสารภาษาไทยหนึ่งหน้า (ไฟล์ ' + f.name + ' หน้า ' + p + ') ที่อยู่ในชุดเอกสารเคสค้ำประกัน PGS 10. ภาพอาจเอียง/หมุน/สแกน.',
      'ประเภท:\n' + TYPE_KEYS.map((t) => `- ${t}: ${D.TYPE_LABEL[t]}. ${DOC_FIELDS[t].note}`).join('\n') + '\n- OTHER: เอกสารอื่น (บัตรประชาชน/KYC, แผนที่, ข้อความสัญญาล้วน, ใบปะหน้า ฯลฯ)\n- UNREADABLE: อ่านไม่ได้เลย',
      'ถ้าเป็นหน้าต่อของเอกสารที่เห็นเป็นตาราง Statement ให้เป็น STATEMENT. ตอบ JSON อย่างเดียว: {"doc_type": "<ชื่อประเภท>"}'].join('\n\n');
  }
  async function runPool(items, n, worker, signal) {
    let i = 0, fatal = null;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
      while (!fatal && i < items.length && !signal.aborted) { const it = items[i++]; try { await worker(it); } catch (e) { if (e && FATAL.includes(e.code)) fatal = e; } }
    }));
    if (fatal) throw fatal;
    if (signal.aborted) throw { code: 'cancelled' };
  }
  async function runBatch(f, auto) {
    results.replaceChildren();
    const fi = FI_PROFILES[fiSel.value];
    ctl = new AbortController(); runBtn.disabled = allBtn.disabled = true; stopBtn.hidden = false;
    const pages = [];
    try {
      if (f.kind === 'pdf' && !f.pdf) { const lib = await I.loadPdfLib(); f.pdf = await lib.getDocument({ data: new Uint8Array(await f.blob.arrayBuffer()) }).promise; f.pages = f.pdf.numPages; }
      const n = Math.min(f.kind === 'pdf' ? f.pdf.numPages : 1, MAX_PAGES);
      const cls = {}; let done = 0;
      // pass A — classify (fast tier, smaller image)
      await runPool(Array.from({ length: n }, (_, i) => i + 1), POOL, async (p) => {
        const g = Object.assign({}, f, { page: p });
        try {
          const cap = await capture(g, 'page', 0.5e6);
          const o = await sample.json(buildClassifyPrompt(f, p), { images: cap.blob, signal: ctl.signal, cache: false, modelTier: 'quick' });
          cls[p] = o && o.doc_type;
        } catch (e) { if (e && FATAL.includes(e.code)) throw e; cls[p] = null; }
        setStatus(`จัดประเภทหน้า ${++done}/${n}…`);
      }, ctl.signal);
      // pass B — read the pages that have fields to fill
      const todo = Object.keys(cls).map(Number).filter((p) => DOC_FIELDS[cls[p]]).sort((x, y) => x - y);
      done = 0;
      const out = {};
      await runPool(todo, POOL, async (p) => {
        const g = Object.assign({}, f, { page: p, type: cls[p] });
        try {
          const [cap, text] = await Promise.all([capture(g, 'page'), textLayer(g)]);
          const o = await sample.json(buildPrompt(g, DOC_FIELDS[cls[p]], fi, text), { images: cap.blob, signal: ctl.signal, cache: false });
          out[p] = { page: p, out: Object.assign({}, o, { doc_type: cls[p] }), text: text === null ? 'unknown' : text ? 'yes' : 'no', w: cap.width, h: cap.height };
        } catch (e) { if (e && FATAL.includes(e.code)) throw e; out[p] = { page: p, error: (e && e.code) || 'error' }; }
        setStatus(`อ่านรายละเอียดหน้าที่มีข้อมูล ${++done}/${todo.length}…`);
      }, ctl.signal);
      for (let p = 1; p <= n; p++) pages.push(out[p] || (cls[p] ? { page: p, out: { doc_type: cls[p] === 'UNREADABLE' ? 'UNREADABLE' : 'OTHER' } } : { page: p, error: 'classify_failed' }));
      setStatus(auto ? 'อ่านครบแล้ว — กำลังใส่ค่าและตรวจ…' : `อ่านครบ ${n} หน้า — ตรวจสรุปด้านล่างแล้วกด “ใช้ค่าที่มั่นใจ แล้วตรวจสอบ”`);
    } catch (e) {
      const ok = Object.keys(pages).length;
      setStatus(e && e.code === 'images_unavailable' ? 'มุมมองนี้ส่งภาพให้ AI ไม่ได้ — ให้ Claude อ่านในแชตแล้วนำเข้า JSON ด้วยปุ่ม “นำเข้าไฟล์”' : (e && e.code === 'cancelled' ? 'หยุดแล้ว' : 'หยุดกลางทาง (' + ((e && e.code) || (e && e.message) || 'error') + ')') + ' — ไม่มีการใส่ค่าให้อัตโนมัติ', !(e && e.code === 'cancelled'));
      auto = false;
    } finally {
      runBtn.disabled = allBtn.disabled = !sample || !canImages; stopBtn.hidden = true; ctl = null;
      if (pages.some((x) => !x.error)) renderBatch(f, fi, pages, auto);
    }
  }
  allBtn.addEventListener('click', () => {
    const f = I.cur();
    if (!f || f.kind === 'other') return setStatus('เลือกเอกสาร PDF หรือรูปภาพก่อน', true);
    if (!consentChk.checked) return setStatus('ติ๊กยืนยันการส่งภาพให้ AI ก่อน', true);
    runBatch(f, false);
  });

  // “throw the file in and get a result”: remembered consent + auto toggle (browser storage is only a convenience; may be unavailable)
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };
  const autoChk = el('input', { type: 'checkbox', id: 'xAuto' });
  box.insertBefore(el('label', { class: 'chk' }, [autoChk, el('span', { text: 'นำเข้าไฟล์แล้วอ่าน + ตรวจให้อัตโนมัติ' })]), box.querySelector('.xrow'));
  if (store.get('pgs10.ai.consent') === '1') { consentChk.checked = true; autoChk.checked = store.get('pgs10.ai.auto') !== '0'; }
  consentChk.addEventListener('change', () => store.set('pgs10.ai.consent', consentChk.checked ? '1' : '0'));
  autoChk.addEventListener('change', () => store.set('pgs10.ai.auto', autoChk.checked ? '1' : '0'));
  let pendingAuto = null;
  function auto(f) {
    if (!f || f.kind === 'other') return;
    if (!sample || !canImages) return; // the notice at the top of the panel already explains why
    if (!consentChk.checked) {
      pendingAuto = f;
      const go = el('button', { type: 'button', class: 'primary', text: 'ตกลง — ส่งภาพให้ AI อ่านและตรวจให้เลย' });
      go.addEventListener('click', () => { consentChk.checked = true; autoChk.checked = true; store.set('pgs10.ai.consent', '1'); store.set('pgs10.ai.auto', '1'); if (pendingAuto) runBatch(pendingAuto, true); pendingAuto = null; });
      results.replaceChildren(el('div', { class: 'xconsent' }, [el('p', { text: 'ระบบจะส่งภาพทุกหน้าของไฟล์ “' + f.name + '” ไปให้ Claude ประมวลผล (ผ่านบัญชีของผู้เปิดหน้านี้) แล้วใส่ค่าและตรวจให้อัตโนมัติ จำการยืนยันนี้ไว้ในเบราว์เซอร์' }), go]));
      return setStatus('รอการยืนยันครั้งแรก');
    }
    if (autoChk.checked) runBatch(f, true);
  }
  window.PGS10_EXTRACT = { DOC_FIELDS, FI_PROFILES, formDate, auto };

  function renderBatch(f, fi, pages, autoApply) {
    const cand = {}; // key -> [{value, fd, page, type, conf, quote}]
    const txAll = [];
    const perPage = pages.map((pg) => {
      if (pg.error) return { page: pg.page, type: null, error: pg.error, n: 0, obs: [] };
      const o = pg.out || {}, type = DOC_FIELDS[o.doc_type] ? o.doc_type : (o.doc_type === 'UNREADABLE' ? 'UNREADABLE' : 'OTHER');
      let n = 0;
      if (type !== 'OTHER' && type !== 'UNREADABLE') {
        const allowed = new Set(DOC_FIELDS[type].fields.map(([k]) => k));
        (Array.isArray(o.fields) ? o.fields : []).forEach((r) => {
          if (!r || !allowed.has(r.key) || r.value == null || String(r.value).trim() === '') return;
          const fd = isDateKey(r.key) ? formDate(r.value, r.calendar) : { value: String(r.value).trim(), converted: false, bad: false };
          if (fd.bad) return;
          (cand[r.key] = cand[r.key] || []).push({ value: fd.value, fd, page: pg.page, type, conf: r.confidence || 'low', quote: r.quote || '', calendar: r.calendar || null }); n++;
        });
        if (DOC_FIELDS[type].tx) (Array.isArray(o.transactions) ? o.transactions : []).forEach((t) => { if (t && (t.amount != null || t.raw_code)) txAll.push({ t, page: pg.page }); });
      }
      return { page: pg.page, type, n, obs: (Array.isArray(o.observations) ? o.observations : []).filter((x) => typeof x === 'string' && x.trim()) };
    });
    const labelOf = (k) => { for (const sp of Object.values(DOC_FIELDS)) { const hit = sp.fields.find(([kk]) => kk === k); if (hit) return hit[1]; } return k; };
    const apply = (key, c, how) => {
      if (!UI.setField(key, c.value)) return false;
      prov.push({ field: key, value: c.value, source_file: f.name, source_page: c.page, doc_type: c.type, fi: fiSel.value, method: how, confidence: c.conf, quote: c.quote || null, calendar_read: c.calendar, converted_ce_to_be: c.fd.converted, scope: 'page', accepted_at: new Date().toISOString() });
      return true;
    };
    // classify each key: consistent (all pages agree) / conflict / low-only / already filled differently
    const rows = Object.entries(cand).map(([key, list]) => {
      const vals = [...new Set(list.map((c) => c.value))], cur = (UI.getField(key) || '').trim();
      const best = list.find((c) => c.conf !== 'low') || null;
      let state = vals.length > 1 ? 'conflict' : !best ? 'low' : cur && cur !== vals[0] ? 'differs' : cur === vals[0] ? 'same' : 'ready';
      return { key, list, vals, cur, state, pick: best || list[0] };
    });
    const parts = [el('p', { class: 'xhead', text: `${f.name} · สรุปจาก ${pages.filter((x) => !x.error).length}/${pages.length} หน้า` })];
    // per page strip
    parts.push(el('details', { class: 'xpages' }, [el('summary', { text: 'หน้าที่ AI จัดประเภทให้ (ตรวจว่าตรงกับภาพ)' }), el('ul', {}, perPage.map((p) => el('li', {}, [
      el('button', { type: 'button', class: 'ghost lnk', text: 'หน้า ' + p.page, on: { click: () => { f.page = p.page; I.renderViewerBar(); window.PGS10_DOCS.goto && window.PGS10_DOCS.goto(p.page); } } }),
      el('span', { text: ' — ' + (p.error ? 'อ่านไม่สำเร็จ (' + p.error + ')' : p.type === 'OTHER' ? 'เอกสารอื่น (ไม่มีฟิลด์)' : p.type === 'UNREADABLE' ? 'อ่านไม่ได้' : D.TYPE_LABEL[p.type] + ' · ' + p.n + ' ค่า') }),
      p.obs.length ? el('ul', {}, p.obs.map((o) => el('li', { class: 'muted', text: o }))) : null,
    ])))]));
    const stLabel = { ready: 'พร้อมใช้', same: 'ตรงกับฟอร์ม', differs: 'ต่างจากฟอร์ม', conflict: 'ขัดกันระหว่างหน้า', low: 'มั่นใจต่ำ' };
    const tb = el('tbody'); const applicable = [];
    rows.forEach((r) => {
      const btns = r.state === 'same' ? [] : r.list.map((c) => { const b = el('button', { type: 'button', class: 'ghost', text: `ใช้ค่านี้ (น.${c.page})` }); b.addEventListener('click', () => { if (apply(r.key, c, 'AI_VISION_BATCH_REVIEWER_PICKED')) { b.textContent = '✓ ใช้แล้ว'; b.disabled = true; } }); return b; });
      if (r.state === 'ready') applicable.push(r);
      tb.append(el('tr', { class: 's-' + r.state }, [
        el('td', { text: labelOf(r.key) }),
        el('td', {}, r.list.map((c) => el('div', {}, [el('strong', { text: c.value }), el('small', { class: 'muted', text: ` น.${c.page} · ${CONF[c.conf] || '?'}${c.fd.converted ? ' · ค.ศ.→พ.ศ.' : ''}${c.quote ? ' · “' + c.quote + '”' : ''}` })]))),
        el('td', { text: r.cur || '—' }), el('td', { text: stLabel[r.state] }), el('td', {}, btns),
      ]));
    });
    if (rows.length) parts.push(el('div', { class: 'tblwrap' }, [el('table', { class: 'in xt-tbl' }, [el('thead', {}, [el('tr', {}, ['ช่อง', 'ค่าที่อ่านได้ (หน้า · ความมั่นใจ)', 'ค่าในฟอร์มตอนนี้', 'สถานะ', ''].map((h) => el('th', { text: h })))]), tb])]));
    // transactions (PAYMENT rows by profile are pre-selected; dedupe by date+amount+code)
    let txPick = [];
    if (txAll.length) {
      const seen = new Set(), uniq = txAll.filter(({ t }) => { const k = [t.date, t.raw_code, t.amount].join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
      parts.push(txBlock(f, fi, uniq.map((u) => u.t)));
      txPick = uniq;
    }
    const obsAll = perPage.filter((p) => p.obs.length).length;
    if (obsAll) parts.push(el('p', { class: 'muted xnote', text: `มีข้อสังเกตจาก AI ใน ${obsAll} หน้า (เปิด “หน้าที่ AI จัดประเภทให้” ด้านบน) — ไม่ใช่ผลตรวจ` }));
    const goBtn = el('button', { type: 'button', class: 'primary', text: `ใช้ค่าที่มั่นใจ (${applicable.length}) แล้วตรวจสอบ` });
    goBtn.addEventListener('click', () => {
      const added = applicable.filter((r) => apply(r.key, r.pick, 'AI_VISION_BATCH_REVIEWER_ACCEPTED_BULK')).length;
      goBtn.textContent = `ใช้แล้ว ${added} ค่า — ข้ามค่าที่ขัดกัน/ต่างจากฟอร์ม/มั่นใจต่ำ`; goBtn.disabled = true;
      document.querySelector('#btnRun').click(); window.PGS10_TABS && window.PGS10_TABS.show('result');
    });
    parts.push(el('div', { class: 'xrow' }, [goBtn]), el('p', { class: 'muted xnote', text: 'ปุ่มนี้ใช้เฉพาะค่าที่ “ไม่ขัดกันระหว่างหน้า ความมั่นใจไม่ต่ำ และช่องยังว่าง” — ค่าที่ขัดกันหรือต่างจากฟอร์มต้องเลือกเองทีละค่า. ผลตรวจจะยังมี “ตรวจไม่ได้/พัก” ในข้อที่ต้องให้ผู้ตรวจยืนยันจากภาพ (เช่น เอกสารครบถ้วนทางภาพ) และช่องที่ AI อ่านไม่ได้ — เป็นไปตามหลัก ไม่ใช่ข้อผิดพลาด' }));
    results.replaceChildren(...parts);
    if (autoApply) {
      const added = applicable.filter((r) => apply(r.key, r.pick, 'AI_VISION_BATCH_AUTO_APPLIED')).length;
      const txBtn = results.querySelector('.xtx button');
      if (txBtn && !txBtn.disabled) txBtn.click();
      goBtn.textContent = `ใช้แล้ว ${added} ค่า (อัตโนมัติ)`; goBtn.disabled = true;
      const skipped = rows.length - added - rows.filter((r) => r.state === 'same').length;
      setStatus(`ใส่ค่าให้อัตโนมัติ ${added} ค่า` + (skipped > 0 ? ` · ข้าม ${skipped} ค่า (ขัดกันระหว่างหน้า / ต่างจากฟอร์ม / มั่นใจต่ำ — ดูตารางในแท็บนี้)` : '') + ' · ผลตรวจอยู่ในแท็บ “ผลตรวจ”');
      document.querySelector('#btnRun').click(); window.PGS10_TABS && window.PGS10_TABS.show('result');
    }
  }

  // ------------------------------------------------------------ suggestions
  const CONF = { high: 'สูง', medium: 'กลาง', low: 'ต่ำ' };
  function renderResults(f, spec, fi, out, meta) {
    const labels = Object.fromEntries(spec.fields);
    const head = el('p', { class: 'xhead', text: `${f.name} · หน้า ${f.page} · ${D.TYPE_LABEL[f.type]} · text layer: ${meta.text === 'yes' ? 'มี (ส่งประกอบ)' : meta.text === 'no' ? 'ไม่มี (สแกน)' : 'ไม่ทราบ'}` });
    const parts = [head];
    if (out && out.readable === false) parts.push(el('p', { class: 'xwarn', text: 'AI รายงานว่าอ่านหน้านี้ไม่ได้' }));
    const rows = (Array.isArray(out && out.fields) ? out.fields : []).filter((x) => x && labels[x.key] && x.value != null && String(x.value).trim() !== '');
    const emptyKeys = [];
    if (rows.length) {
      const tb = el('tbody');
      rows.forEach((r) => {
        const dk = isDateKey(r.key);
        const fd = dk ? formDate(r.value, r.calendar) : { value: String(r.value), converted: false, bad: false };
        const cur = UI.getField(r.key);
        const same = cur != null && cur.trim() === fd.value;
        const btn = el('button', { type: 'button', class: 'ghost', text: same ? 'ตรงกับฟอร์ม' : cur ? 'ใช้ค่า (แทนที่)' : 'ใช้ค่า', disabled: same || fd.bad || null });
        btn.addEventListener('click', () => {
          if (!UI.setField(r.key, fd.value)) return;
          prov.push({ field: r.key, value: fd.value, source_file: f.name, source_page: f.page, doc_type: f.type, fi: fiSel.value, method: 'AI_VISION_SUGGESTION_REVIEWER_ACCEPTED', confidence: r.confidence || null, quote: r.quote || null, calendar_read: r.calendar || null, converted_ce_to_be: fd.converted, scope: meta.scope, accepted_at: new Date().toISOString() });
          btn.textContent = '✓ ใช้แล้ว'; btn.disabled = true;
        });
        if (!cur) emptyKeys.push([r, fd, btn]);
        tb.append(el('tr', { class: 'c-' + (r.confidence || 'low') }, [
          el('td', { text: labels[r.key] }),
          el('td', {}, [el('strong', { text: fd.value }), fd.converted ? el('small', { class: 'muted', text: ` (ในเอกสารเป็น ค.ศ. ${r.value} → แปลง +543)` }) : null, fd.bad ? el('small', { class: 'xwarn', text: ' รูปแบบวันที่ไม่ถูกต้อง' }) : null]),
          el('td', { text: cur ? cur : '—' }),
          el('td', { text: CONF[r.confidence] || '?' }),
          el('td', { class: 'q', text: r.quote || '' }),
          el('td', {}, [btn]),
        ]));
      });
      parts.push(el('div', { class: 'tblwrap' }, [el('table', { class: 'in xt-tbl' }, [
        el('thead', {}, [el('tr', {}, ['ช่อง', 'ค่าที่อ่านได้', 'ค่าในฟอร์มตอนนี้', 'มั่นใจ', 'ข้อความบนเอกสาร', ''].map((h) => el('th', { text: h })))]), tb])]));
      if (emptyKeys.length > 1) parts.push(el('button', { type: 'button', class: 'ghost', text: `ใช้ค่าทั้งหมดที่ช่องยังว่าง (${emptyKeys.length})`, on: { click: (e) => { emptyKeys.forEach(([, , b]) => !b.disabled && b.click()); e.target.disabled = true; } } }));
    } else if (!(out && out.readable === false)) parts.push(el('p', { class: 'muted', text: 'ไม่พบค่าสำหรับฟิลด์ของเอกสารประเภทนี้ในหน้านี้' }));

    const tx = Array.isArray(out && out.transactions) ? out.transactions.filter((t) => t && (t.amount != null || t.raw_code)) : [];
    if (spec.tx && tx.length) parts.push(txBlock(f, fi, tx));
    const obs = (Array.isArray(out && out.observations) ? out.observations : []).filter((x) => typeof x === 'string' && x.trim());
    if (obs.length) parts.push(el('div', { class: 'xobs' }, [el('strong', { text: 'ข้อสังเกตจาก AI (ไม่ใช่ผลตรวจ — ตรวจเทียบภาพ):' }), el('ul', {}, obs.map((o) => el('li', { text: o })))]));
    parts.push(el('p', { class: 'muted xnote', text: 'ค่าที่ AI ไม่ใส่ = มองไม่เห็นหรือไม่แน่ใจ — ให้ดูภาพแล้วกรอกเอง. ค่าที่ “ใช้แล้ว” จะถูกบันทึกที่มา (ไฟล์/หน้า/วิธี/ความมั่นใจ) ไว้ในไฟล์ JSON ที่ดาวน์โหลด' }));
    results.replaceChildren(...parts);
  }

  function txBlock(f, fi, tx) {
    const items = tx.map((t) => {
      const code = String(t.raw_code || '').trim();
      const type = fi.txn[code] || 'UNKNOWN';
      const skip = fi.noRow.has(code) || t.amount == null || String(t.amount).trim() === '';
      const fd = formDate(t.date || '', t.calendar);
      return { t, code, type, fd, row: { date: fd.value, type, amount: String(t.amount || '').trim(), desc: (code + ' ' + (t.description || '')).trim() }, pick: !skip && type === 'PAYMENT', skip };
    });
    const tb = el('tbody');
    items.forEach((it) => {
      it.chk = el('input', { type: 'checkbox', checked: it.pick || null, disabled: it.skip || it.fd.bad || null, 'aria-label': 'เพิ่มรายการ ' + it.row.desc });
      tb.append(el('tr', { class: it.skip ? 'skip' : '' }, [
        el('td', {}, [it.chk]), el('td', { text: it.fd.value }), el('td', { text: it.code || '—' }), el('td', { text: it.t.description || '' }),
        el('td', { text: it.t.amount != null ? String(it.t.amount) : '' }), el('td', { text: it.skip ? 'ไม่ใช่รายการเงิน' : it.type + (it.type === 'UNKNOWN' ? ' (ไม่มี mapping)' : '') }),
        el('td', { text: CONF[it.t.confidence] || '?' }),
      ]));
    });
    const addBtn = el('button', { type: 'button', class: 'ghost', text: 'เพิ่มรายการที่เลือกลงตาราง Statement (หัวข้อ 4)' });
    addBtn.addEventListener('click', () => {
      const chosen = items.filter((i) => i.chk.checked && !i.chk.disabled);
      const n = UI.addTransactions(chosen.map((i) => i.row));
      chosen.forEach((i) => prov.push({ field: 'transactions[]', value: i.row, source_file: f.name, source_page: f.page, doc_type: f.type, fi: fiSel.value, method: 'AI_VISION_SUGGESTION_REVIEWER_ACCEPTED', confidence: i.t.confidence || null, raw_code: i.code || null, type_basis: fi.txn[i.code] ? 'FI_PROFILE_UNVERIFIED' : 'DEFAULT_UNKNOWN', accepted_at: new Date().toISOString() }));
      addBtn.textContent = n + ' รายการถูกเพิ่ม (ข้ามรายการที่ซ้ำ)'; addBtn.disabled = true;
    });
    return el('div', { class: 'xtx' }, [
      el('strong', { text: 'รายการเดินบัญชีที่ AI อ่านได้' }),
      el('p', { class: 'muted', text: fi.txnNote + ' — รายการที่เลือกไว้ล่วงหน้าเฉพาะที่เป็น PAYMENT ตาม mapping; รายการประเภทอื่นเลือกเองหลังตรวจ' }),
      el('div', { class: 'tblwrap' }, [el('table', { class: 'in xt-tbl' }, [el('thead', {}, [el('tr', {}, ['', 'วันที่', 'รหัส', 'รายการ', 'จำนวนเงิน', 'ประเภทที่จะใส่', 'มั่นใจ'].map((h) => el('th', { text: h })))]), tb])]),
      addBtn,
    ]);
  }

})();
