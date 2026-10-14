/**
 * TCG Smart Claim Pitching — Google Apps Script backend
 *
 * - getBoardData()        : ข้อมูลแดชบอร์ด (กรองตามธนาคารที่หน้าเว็บ)
 * - getProposal(round)    : รายงานเสนอจ่ายค่าประกันชดเชยของรอบประชุม (รูปแบบเดียวกับวาระพิจารณาจ่ายในรายงานการประชุม)
 * - createProposalDoc(round) : สร้างรายงานเสนอเป็น Google Docs
 *
 * ไฟล์คู่กัน: Index.html (ต้องตั้งชื่อไฟล์ HTML ว่า "Index")
 */

// ===== ตั้งค่า =====
// ถ้าสคริปต์สร้างจากเมนู Extensions > Apps Script ในชีตนี้ ปล่อยว่างไว้ได้
// ถ้าเป็นโปรเจกต์แยก ให้ใส่ ID ของสเปรดชีต
var SPREADSHEET_ID = '';
// ชื่อชีตที่เก็บข้อมูล (ถ้าไม่พบ จะใช้ชีตแรกของไฟล์)
var SHEET_NAME = 'Bank Approved';
// ข้อความอ้างอิงแนวปฏิบัติสำหรับรายที่มีประเด็นพิจารณา (ใช้ในส่วนท้ายของรายงานเสนอ)
var POLICY_REFERENCE = 'ครั้งที่ 19/2568 เมื่อวันที่ 15 ตุลาคม 2568';

// หัวคอลัมน์ในชีตเทียบด้วย "ขึ้นต้นด้วย" (ไม่สนช่องว่าง/ขึ้นบรรทัดใหม่/ตัวพิมพ์เล็กใหญ่)
// รายการแรกที่พบก่อนจะถูกใช้
var COLUMN_PREFIXES = {
  bankCode: ['bank'],
  bankName: ['ธนาคาร'],
  guaranteeType: ['ประเภทการค้ำประกัน'],
  id: ['ลำดับที่'],
  name: ['โครงการ'],
  limit: ['วงเงินค้ำประกัน'],
  ratio: ['สัดส่วน'],
  payRound: ['ฉบับที่'],
  condition: ['เงื่อนไข'],
  amount: ['รอจ่าย', 'จำนวนเงิน'],
  businessStatus: ['สถานะกิจการ'],
  remain: ['จำนวนที่จ่ายไป', 'คงเหลือจ่ายได้'],
  round: ['appointment'],
  contact: ['สถานะการติดต่อ'],
  note: ['หมายเหตุ'],
  issueTitle: ['ประเด็นพิจารณา'],
  issueUnlock: ['การปลดล็อกกฎหมาย'],
  link: ['ลิงก์หลักฐาน']
};

// ===== Web app =====
function doGet() {
  var html = HtmlService.createTemplateFromFile('Index').evaluate();
  html.setTitle('TCG Smart Claim Pitching')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

// ===== API สำหรับหน้าเว็บ =====
function getBoardData() {
  var cases = readCases_();
  var bankMap = {};
  cases.forEach(function (c) { bankMap[c.bank] = c.bankName || c.bank; });

  var banks = Object.keys(bankMap).sort().map(function (code) {
    return { code: code, name: bankMap[code] };
  });
  return { banks: banks, cases: cases, rounds: listRounds_(cases) };
}

function getProposal(round) {
  var cases = readCases_();
  var rounds = listRounds_(cases);
  var selected = round || rounds[0] || '';
  var picked = cases.filter(function (c) { return !selected || c.round === selected; });

  var total = 0;
  var rows = picked.map(function (c, i) {
    total += c.amount;
    return {
      no: i + 1,
      name: c.name,
      type: (c.guaranteeType + ' ' + c.bankCode).trim(),
      limit: c.limit,
      amount: c.amount,
      note: c.note
    };
  });
  var issues = [];
  picked.forEach(function (c, i) {
    if (c.status === 'RED') {
      issues.push({ no: i + 1, name: c.name, title: c.issueTitle, unlock: c.issueUnlock });
    }
  });

  return {
    round: selected,
    rounds: rounds,
    count: rows.length,
    total: total,
    heading: 'พิจารณาจ่ายค่าประกันชดเชยโครงการ PGS จำนวน ' + rows.length +
             ' ราย จำนวน ' + formatMoney_(total) + ' บาท มีรายละเอียด ดังนี้',
    policyReference: POLICY_REFERENCE,
    rows: rows,
    issues: issues
  };
}

function createProposalDoc(round) {
  var p = getProposal(round);
  if (!p.count) throw new Error('ไม่พบรายการเสนอในรอบ ' + (round || ''));

  var doc = DocumentApp.create('รายงานเสนอจ่ายค่าประกันชดเชย ' + p.round);
  var body = doc.getBody();
  body.setAttributes((function () {
    var a = {};
    a[DocumentApp.Attribute.FONT_FAMILY] = 'Sarabun';
    a[DocumentApp.Attribute.FONT_SIZE] = 12;
    return a;
  })());
  body.setMarginLeft(42).setMarginRight(42).setMarginTop(56).setMarginBottom(56);

  body.appendParagraph('รายงานเสนอจ่ายค่าประกันชดเชย ' + p.round)
      .setHeading(DocumentApp.ParagraphHeading.HEADING2)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(p.heading).setBold(true);
  body.appendParagraph('หน่วย : บาท').setAlignment(DocumentApp.HorizontalAlignment.RIGHT);

  var cells = [['ลำดับ', 'ชื่อโครงการ', 'ประเภท', 'วงเงินค้ำประกัน (ล่าสุด)', 'ขออนุมัติจ่ายค่าประกันชดเชย', 'หมายเหตุ']];
  p.rows.forEach(function (r) {
    cells.push([String(r.no), r.name, r.type, formatMoney_(r.limit), formatMoney_(r.amount), r.note || '-']);
  });
  cells.push(['', 'รวม ' + p.count + ' ราย', '', '', formatMoney_(p.total), '']);

  var table = body.appendTable(cells);
  var widths = [34, 130, 120, 80, 85, 80];
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      if (r === 0) cell.setBackgroundColor('#fdba74');
      cell.setWidth(widths[c]);
      var para = cell.getChild(0).asParagraph();
      para.setSpacingAfter(0).setFontSize(10);
      if (r === 0 || r === table.getNumRows() - 1) para.setBold(true);
      if (r === 0 || c === 0) para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      else if (c === 3 || c === 4) para.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    }
  }

  if (p.issues.length) {
    body.appendParagraph('รายที่มีประเด็นพิจารณาเพิ่มเติม')
        .setBold(true).setSpacingBefore(14);
    p.issues.forEach(function (it) {
      body.appendParagraph('ลำดับที่ ' + it.no + ' ' + it.name).setBold(true).setSpacingBefore(6);
      body.appendParagraph('ประเด็น: ' + (it.title || '-'));
      body.appendParagraph('การปลดล็อก: ' + (it.unlock || '-'));
    });
    body.appendParagraph('ทั้งนี้ รายที่มีประเด็นพิจารณาเพิ่มเติมอยู่ในกรอบแนววิธีปฏิบัติที่นำเสนอต่อคณะกรรมการจ่ายค่าประกันชดเชย ' +
                         p.policyReference).setSpacingBefore(8);
  }

  // เอกสารใหม่มีย่อหน้าว่างบรรทัดแรก ลบทิ้งเพื่อไม่ให้มีช่องว่างหัวกระดาษ
  var first = body.getChild(0);
  if (first.getType() === DocumentApp.ElementType.PARAGRAPH &&
      first.asParagraph().getText() === '' && body.getNumChildren() > 1) {
    body.removeChild(first);
  }
  doc.saveAndClose();
  return { url: doc.getUrl(), name: doc.getName() };
}

// ===== อ่านและแปลงข้อมูลจากชีต =====
function getSheet_() {
  var ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

function readCases_() {
  var values = getSheet_().getDataRange().getValues();
  if (values.length < 2) return [];
  var col = locateColumns_(values[0]);
  var cases = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var bankCode = oneLine_(cell_(row, col, 'bankCode'));
    var bankName = firstLine_(cell_(row, col, 'bankName'));
    var bank = bankCode || bankName;
    if (!bank) continue;

    var issueTitle = cell_(row, col, 'issueTitle');
    var condition = oneLine_(cell_(row, col, 'condition'));

    // Smart Trigger: ตรวจจับประเด็นอัตโนมัติ
    var status = 'GREEN';
    if (issueTitle) status = 'RED';
    else if (condition.indexOf('ฟ้อง') >= 0 || condition.indexOf('คดี') >= 0) status = 'ORANGE';

    var ratioNum = toNumber_(cell_(row, col, 'ratio'));
    if (ratioNum > 0 && ratioNum <= 1) ratioNum = ratioNum * 100; // เซลล์ฟอร์แมตเป็นเปอร์เซ็นต์ (0.8 → 80)

    cases.push({
      globalIndex: r,
      bank: bank,
      bankCode: bankCode,
      bankName: bankName,
      id: oneLine_(cell_(row, col, 'id')) || '-',
      name: oneLine_(cell_(row, col, 'name')) || '-',
      payRound: oneLine_(cell_(row, col, 'payRound')) || '-',
      guaranteeType: oneLine_(cell_(row, col, 'guaranteeType')) || '-',
      condition: condition || '-',
      ratio: ratioNum ? String(Math.round(ratioNum * 100) / 100) + '%' : '-',
      limit: toNumber_(cell_(row, col, 'limit')),
      amount: toNumber_(cell_(row, col, 'amount')),
      remain: toNumber_(cell_(row, col, 'remain')),
      contact: oneLine_(cell_(row, col, 'contact')) || '-',
      businessStatus: oneLine_(cell_(row, col, 'businessStatus')) || '-',
      note: oneLine_(cell_(row, col, 'note')),
      round: normalizeRound_(cell_(row, col, 'round')),
      issueTitle: issueTitle,
      issueUnlock: cell_(row, col, 'issueUnlock'),
      link: cell_(row, col, 'link'),
      status: status
    });
  }
  return cases;
}

function locateColumns_(headers) {
  var normalized = headers.map(normalizeHeader_);
  var col = {};
  Object.keys(COLUMN_PREFIXES).forEach(function (key) {
    col[key] = -1;
    COLUMN_PREFIXES[key].some(function (prefix) {
      var p = normalizeHeader_(prefix);
      for (var i = 0; i < normalized.length; i++) {
        if (normalized[i].indexOf(p) === 0) { col[key] = i; return true; }
      }
      return false;
    });
  });
  return col;
}

function normalizeHeader_(text) {
  return String(text == null ? '' : text)
    .replace(/ํา/g, 'ำ') // นิคหิต+สระอา → สระอำ (เช่น "ดํา" กับ "ดำ")
    .replace(/\s+/g, '')
    .toLowerCase();
}

function listRounds_(cases) {
  var seen = {};
  cases.forEach(function (c) { if (c.round) seen[c.round] = true; });
  // เรียงรอบล่าสุดก่อน (ปี แล้วตามด้วยครั้งที่)
  return Object.keys(seen).sort(function (a, b) {
    var ka = roundKey_(a), kb = roundKey_(b);
    return kb[0] - ka[0] || kb[1] - ka[1];
  });
}

function roundKey_(round) {
  var m = /(\d+)\s*\/\s*(\d+)/.exec(round);
  return m ? [parseInt(m[2], 10), parseInt(m[1], 10)] : [0, 0];
}

function normalizeRound_(text) {
  return oneLine_(text).replace(/\s*\/\s*/g, '/');
}

// ===== ตัวช่วยแปลงค่า =====
function cell_(row, col, key) {
  return col[key] < 0 ? '' : cellText_(row[col[key]]);
}

function cellText_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'dd/MM/yyyy'); // Date ส่งผ่าน google.script.run ไม่ได้
  return String(v).trim();
}

function oneLine_(s) { return String(s).replace(/\s*[\r\n]+\s*/g, ' ').trim(); }

function firstLine_(s) { return String(s).split(/\r?\n/)[0].trim(); }

function toNumber_(v) {
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/,/g, '')) || 0;
}

function formatMoney_(n) {
  var parts = Number(n || 0).toFixed(2).split('.');
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + parts[1];
}
