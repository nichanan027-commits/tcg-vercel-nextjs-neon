/*
 * PGS 10 Claim Checker — case documents panel (stage 1).
 * Open any number of files next to the form: PDF and images are rendered as pages, JSON fills the form, anything else is listed as an attachment.
 * Nothing is uploaded, stored or read automatically — no OCR / text extraction. Rendered pages are for the reviewer's eyes
 * (Rulebook: the rendered image outranks any text layer for Critical documents).
 * All DOM is built with textContent (file names are arbitrary text).
 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
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

  // [key, label, critical (PRM-038 list — visual review required), filename hints]
  const TYPES = [
    ['APPROVAL_SEQUENCE', 'หนังสืออนุมัติสินเชื่อ / สัญญา', true, /อนุมัติ|สัญญา|approv|contract/i],
    ['LG', 'หนังสือค้ำประกัน (LG)', false, /\blg\b|ค้ำประกัน|guarantee/i],
    ['SCREEN', 'หน้าจอ บสย. (ข้อมูล LG / การเคลม)', false, /screen|หน้าจอ|บสย/i],
    ['BANK_SCREEN', 'หน้าจอธนาคาร (WebCSR / Loan Overview)', false, /webcsr|overview|profile/i],
    ['STATEMENT', 'Statement บัญชีเงินกู้', false, /statement|สเตทเมนต์|ledger/i],
    ['PAYOFF', 'Payoff Quote / ยอดหนี้ปัจจุบัน', false, /payoff|ยอดหนี้|ปิดบัญชี/i],
    ['CONFIRMATION_LETTER', 'หนังสือยืนยันการชำระหลังผิดนัด', true, /ยืนยัน|confirm/i],
    ['DEMAND_LETTER', 'หนังสือบอกกล่าว / บอกเลิกสัญญา', true, /บอกกล่าว|บอกเลิก|demand|termination/i],
    ['TRACKING_REPORT', 'รายงานติดตามหนี้', true, /ติดตาม|tracking|follow/i],
    ['POSTAL_ACK', 'ใบตอบรับ / หลักฐานไปรษณีย์', true, /ตอบรับ|ไปรษณีย์|postal|\bar\b|registered|track/i],
    ['RETURNED_ENVELOPE', 'ซองตีกลับ', true, /ซอง|return|envelope/i],
    ['RESTRUCTURE_AGREEMENT', 'สัญญา / ข้อตกลงปรับโครงสร้างหนี้', true, /ปรับโครงสร้าง|restructur/i],
    ['CLAIM_FORM', 'แบบคำขอรับเงินค่าประกันชดเชย', false, /คำขอ|claim.?form|แบบ/i],
    ['OTHER', 'อื่น ๆ', false, null],
  ];
  const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t[0], t[1]]));
  const guessType = (name) => { const t = TYPES.find((x) => x[3] && x[3].test(name)); return t ? t[0] : ''; };
  const kindOf = (f) => {
    const n = f.name.toLowerCase();
    if (f.type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
    if (f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|tiff?)$/.test(n)) return 'image';
    if (f.type === 'application/json' || n.endsWith('.json')) return 'json';
    return 'other';
  };
  const fmtSize = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB');

  const files = []; // {id, name, size, mime, kind, url, blob, type, guessed, pdf, pages, page, zoom, rot}
  let nextId = 1, currentId = null, lastEv = null, renderToken = 0, pdfLibPromise = null;

  // ------------------------------------------------------------ pdf.js (vendored, loaded on first PDF)
  function loadPdfLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfLibPromise) {
      pdfLibPromise = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'vendor/pdf.min.js';
        s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; res(window.pdfjsLib); };
        s.onerror = () => { pdfLibPromise = null; rej(new Error('โหลดตัวแสดง PDF ไม่ได้')); };
        document.head.append(s);
      });
    }
    return pdfLibPromise;
  }

  // ------------------------------------------------------------ DOM skeleton
  const panel = $('#docs');
  const dropzone = el('div', { class: 'dz', tabindex: '0', role: 'button', 'aria-label': 'เลือกไฟล์เอกสารเคส' }, [
    el('strong', { text: 'ลากไฟล์มาวางที่นี่ หรือกดเพื่อเลือก' }),
    el('span', { class: 'muted', text: 'ได้หลายไฟล์ · PDF / รูปภาพ แสดงเป็นหน้า · JSON นำเข้าเข้าฟอร์ม · ไฟล์อื่นเก็บเป็นเอกสารแนบ' }),
  ]);
  const picker = el('input', { type: 'file', multiple: true, hidden: true });
  const listEl = el('div', { class: 'dlist' });
  const checkEl = el('details', { class: 'dcheck' });
  const viewer = el('div', { class: 'viewer' });
  panel.append(
    el('p', { class: 'dnote', text: 'เปิดเอกสารดูข้างฟอร์ม — ระบบไม่อ่านหรือดึงข้อมูลจากเอกสารให้ ผู้ตรวจกรอกเอง ไฟล์อยู่ในเบราว์เซอร์นี้เท่านั้น (ไม่อัปโหลด ไม่บันทึก) และหายเมื่อปิดหน้า' }),
    dropzone, picker, listEl, checkEl, viewer);

  dropzone.addEventListener('click', () => picker.click());
  dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); } });
  picker.addEventListener('change', () => { addFiles(picker.files); picker.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => window.addEventListener(ev, (e) => { if (hasFiles(e)) { e.preventDefault(); dropzone.classList.add('over'); } }));
  ['dragleave', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => { if (ev === 'drop' || e.target === document.documentElement || !e.relatedTarget) dropzone.classList.remove('over'); }));
  window.addEventListener('drop', (e) => { if (hasFiles(e)) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
  const hasFiles = (e) => e.dataTransfer && [].includes.call(e.dataTransfer.types || [], 'Files');

  // remember which evidence-reference field the reviewer last used (so a page can be cited into it)
  document.addEventListener('focusin', (e) => { const t = e.target; if (t && t.matches && t.matches('input[data-k^="ev_"]')) { lastEv = t; renderViewerBar(); } });

  // ------------------------------------------------------------ adding / removing files
  function addFiles(list) {
    const arr = [].slice.call(list || []);
    let firstDoc = null, jsonDone = false, skippedJson = 0;
    arr.forEach((f) => {
      const kind = kindOf(f);
      if (kind === 'json') {
        if (jsonDone || !window.PGS10_UI) { skippedJson++; return; }
        jsonDone = true;
        f.text().then((t) => window.PGS10_UI.importJson(t));
        return;
      }
      const rec = { id: nextId++, name: f.name, size: f.size, mime: f.type, kind, blob: f, url: URL.createObjectURL(f), type: guessType(f.name), guessed: !!guessType(f.name),
                    pdf: null, pages: kind === 'image' ? 1 : 0, page: 1, zoom: 1, rot: 0, error: null };
      files.push(rec);
      if (!firstDoc) firstDoc = rec;
    });
    if (skippedJson) alert('นำเข้า JSON ได้ครั้งละ 1 ไฟล์ — ข้ามอีก ' + skippedJson + ' ไฟล์');
    if (firstDoc) { select(firstDoc.id); window.PGS10_TABS && window.PGS10_TABS.show('docs'); }
    renderList();
  }
  function remove(id) {
    const i = files.findIndex((f) => f.id === id);
    if (i < 0) return;
    const f = files[i];
    URL.revokeObjectURL(f.url);
    if (f.pdf) f.pdf.destroy();
    files.splice(i, 1);
    if (currentId === id) { currentId = files.length ? files[Math.min(i, files.length - 1)].id : null; }
    renderList(); show();
  }
  function select(id) { currentId = id; renderList(); show(); }
  const cur = () => files.find((f) => f.id === currentId) || null;

  // ------------------------------------------------------------ list + checklist
  function renderList() {
    listEl.replaceChildren(...files.map((f) => el('div', { class: 'drow' + (f.id === currentId ? ' on' : '') }, [
      el('button', { type: 'button', class: 'dname', title: f.name, on: { click: () => select(f.id) } }, [
        el('span', { class: 'dn', text: f.name }),
        el('small', { class: 'muted', text: [f.kind === 'pdf' ? (f.pages ? f.pages + ' หน้า' : 'PDF') : f.kind === 'image' ? 'รูปภาพ' : 'ไม่มีพรีวิว', fmtSize(f.size)].join(' · ') }),
      ]),
      el('select', { 'aria-label': 'ประเภทเอกสารของ ' + f.name, on: { change: (e) => { f.type = e.target.value; f.guessed = false; renderList(); renderViewerBar(); } } },
        [el('option', { value: '', text: '— ประเภทเอกสาร —' }), ...TYPES.map((t) => el('option', { value: t[0], text: (t[2] ? '◆ ' : '') + t[1], selected: f.type === t[0] }))]),
      f.guessed ? el('small', { class: 'guess', text: 'เดาจากชื่อไฟล์ — ตรวจสอบ' }) : null,
      el('button', { type: 'button', class: 'ghost x', 'aria-label': 'เอาออก ' + f.name, on: { click: () => remove(f.id) }, text: '✕' }),
    ])));
    listEl.hidden = !files.length;
    dropzone.classList.toggle('compact', files.length > 0);
    // informational only: which Critical types (PRM-038) are present — NOT a requirement check (need depends on the case path)
    const have = new Set(files.map((f) => f.type));
    checkEl.hidden = !files.length;
    checkEl.replaceChildren(el('summary', { text: 'ประเภทเอกสาร Critical ที่มีในชุดนี้ (' + TYPES.filter((t) => t[2] && have.has(t[0])).length + '/' + TYPES.filter((t) => t[2]).length + ')' }),
      el('ul', {}, TYPES.filter((t) => t[2]).map((t) => el('li', { class: have.has(t[0]) ? 'ok' : '', text: (have.has(t[0]) ? '✓ ' : '· ') + t[1] }))),
      el('p', { class: 'muted', text: 'ใช้ดูเท่านั้น ไม่ใช่การตรวจ — เอกสารที่ต้องมีขึ้นกับเส้นทางของเคส (เช่น หนังสือยืนยันการชำระหลังผิดนัดใช้เมื่อมีการชำระหลัง Default) ◆ = ต้องตรวจจากภาพจริง (รายการ PRM-038 ยังรอยืนยัน)' }));
  }

  // ------------------------------------------------------------ viewer
  const bar = el('div', { class: 'vbar' });
  const stage = el('div', { class: 'vstage', tabindex: '0' });
  viewer.append(bar, stage);

  function renderViewerBar() {
    const f = cur();
    if (!f) { bar.replaceChildren(); return; }
    const btn = (t, label, fn, dis) => el('button', { type: 'button', class: 'ghost', 'aria-label': label, title: label, text: t, disabled: dis || null, on: { click: fn } });
    const multi = f.pages > 1;
    const evLabel = lastEv ? (lastEv.closest('label') ? lastEv.closest('label').querySelector('span').textContent : lastEv.getAttribute('data-k')) : null;
    bar.replaceChildren(
      el('div', { class: 'vrow' }, [
        multi ? btn('◀', 'หน้าก่อนหน้า', () => go(f.page - 1), f.page <= 1) : null,
        f.pages ? el('label', { class: 'pg' }, [el('span', { class: 'vh', text: 'หน้า' }), el('input', { type: 'number', min: '1', max: String(f.pages), value: String(f.page), 'aria-label': 'หน้า', on: { change: (e) => go(parseInt(e.target.value, 10)) } }), el('span', { text: '/ ' + f.pages })]) : null,
        multi ? btn('▶', 'หน้าถัดไป', () => go(f.page + 1), f.page >= f.pages) : null,
        el('span', { class: 'sp' }),
        f.kind !== 'other' ? btn('−', 'ย่อ', () => zoom(-0.25)) : null,
        f.kind !== 'other' ? el('span', { class: 'zl', text: Math.round(f.zoom * 100) + '%' }) : null,
        f.kind !== 'other' ? btn('+', 'ขยาย', () => zoom(0.25)) : null,
        f.kind !== 'other' ? btn('⟳', 'หมุน 90°', () => { f.rot = (f.rot + 90) % 360; show(); }) : null,
        el('a', { class: 'dl', href: f.url, download: f.name, text: 'เปิด/ดาวน์โหลดไฟล์' }),
      ]),
      f.kind !== 'other' ? el('div', { class: 'vrow' }, [
        el('button', { type: 'button', class: 'cite', disabled: lastEv ? null : true, title: lastEv ? 'ใส่ชื่อเอกสารและหน้าลงในช่องอ้างอิงหลักฐานที่เลือกล่าสุด' : 'คลิกช่อง “อ้างอิงหลักฐาน” ในฟอร์มก่อน', on: { click: cite }, text: 'ใส่อ้างอิงหน้านี้' }),
        el('small', { class: 'muted', text: lastEv ? '→ ' + evLabel : 'คลิกช่อง “อ้างอิงหลักฐาน” ในฟอร์มก่อน แล้วกดปุ่มนี้' }),
      ]) : null);
  }
  function cite() {
    const f = cur(); if (!f || !lastEv) return;
    const ref = f.name + (f.type ? ' (' + TYPE_LABEL[f.type] + ')' : '') + (f.kind === 'pdf' ? ' หน้า ' + f.page : '');
    lastEv.value = lastEv.value.trim() ? lastEv.value.trim() + '; ' + ref : ref;
    lastEv.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function go(n) { const f = cur(); if (!f || !f.pages || !Number.isFinite(n)) return; f.page = Math.max(1, Math.min(f.pages, n)); show(); }
  function zoom(d) { const f = cur(); if (!f) return; f.zoom = Math.max(0.5, Math.min(4, Math.round((f.zoom + d) * 100) / 100)); show(); }
  stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(cur().page + 1); else if (e.key === 'ArrowLeft') go(cur().page - 1); });

  function message(text, kids) { stage.replaceChildren(el('div', { class: 'vmsg' }, [el('p', { text }), ...(kids || [])])); }

  async function show() {
    const f = cur(), token = ++renderToken;
    renderViewerBar();
    if (!f) { message(files.length ? 'เลือกเอกสารจากรายการ' : 'ยังไม่มีเอกสาร — เพิ่มไฟล์ด้านบน'); return; }
    if (f.kind === 'other') { message('ไม่มีพรีวิวสำหรับไฟล์ชนิดนี้ (' + (f.mime || f.name.split('.').pop()) + ') — เปิดด้วยโปรแกรมอื่น หรือแปลงเป็น PDF แล้วนำเข้าใหม่'); return; }
    const w = Math.max(260, stage.clientWidth - 16);
    if (f.kind === 'image') {
      const img = el('img', { src: f.url, alt: f.name, class: 'vimg' });
      img.style.width = Math.round(w * f.zoom) + 'px';
      img.style.transform = f.rot ? 'rotate(' + f.rot + 'deg)' : '';
      if (f.rot % 180) img.style.margin = '12% 0';
      stage.replaceChildren(img); return;
    }
    if (f.error) { message(f.error); return; }
    message('กำลังเปิด PDF…');
    try {
      const lib = await loadPdfLib();
      if (!f.pdf) {
        f.pdf = await lib.getDocument({ data: new Uint8Array(await f.blob.arrayBuffer()) }).promise;
        f.pages = f.pdf.numPages; renderList();
      }
      if (token !== renderToken) return;
      const page = await f.pdf.getPage(f.page);
      if (token !== renderToken) return;
      const base = page.getViewport({ scale: 1, rotation: f.rot });
      const scale = (w / base.width) * f.zoom, vp = page.getViewport({ scale, rotation: f.rot });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cv = el('canvas', { class: 'vcanvas', role: 'img', 'aria-label': f.name + ' หน้า ' + f.page });
      cv.width = Math.floor(vp.width * dpr); cv.height = Math.floor(vp.height * dpr);
      cv.style.width = Math.floor(vp.width) + 'px'; cv.style.height = Math.floor(vp.height) + 'px';
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
      if (token !== renderToken) return;
      stage.replaceChildren(cv); renderViewerBar();
    } catch (err) {
      if (token !== renderToken) return;
      const msg = /password/i.test(err && err.message) ? 'PDF นี้มีรหัสผ่าน — เปิดไม่ได้ในระบบนี้' : 'เปิด PDF ไม่ได้: ' + (err && err.message || err);
      f.error = msg; message(msg);
    }
  }
  let rzT; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { const f = cur(); if (f && f.kind !== 'other') show(); }, 200); });

  renderList(); show();
  window.PGS10_DOCS = { addFiles, count: () => files.length, TYPES, TYPE_LABEL, goto: (n) => go(n), _int: { cur, stage, loadPdfLib, renderViewerBar, panel, viewer, getFiles: () => files } };
})();
