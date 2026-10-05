# PGS 10 Claim Checker — Prototype

Rule Engine สำหรับตรวจคำขอรับเงินค่าประกันชดเชย PGS 10 ตาม **PGS10 Claim Audit Master Rules — Version 2026.09.29** (Master Audit Rulebook, 22 Controls)
เป็น Phase 1 ของแผนใน Master Audit: *Manual Input → Rule Engine → (ต่อไป) PDF Extraction → Visual Check → API*

เปิดใช้: เปิด `pgs10/index.html` (static, ไม่มี build) หรือเข้า `/pgs10/` บน deployment เดิม · เทสต์: `node --test pgs10/engine.test.js`

| ไฟล์ | หน้าที่ |
|---|---|
| `engine.js` | Rule Engine (pure JS, ใช้ได้ทั้งเบราว์เซอร์และ Node) — เงินเป็นสตางค์จำนวนเต็ม, ปัดแบบ ROUND_HALF_UP |
| `samples.js` | เคสตัวอย่าง **สมมติ** 6 เคส (ไม่ใช่ข้อมูลจริง) |
| `app.js`, `index.html`, `style.css` | หน้ากรอกข้อมูล + แสดงผล 22 Controls |
| `engine.test.js` | 25 เทสต์ครอบทุก Control |

## Spec ชุด v1.0-DRAFT (`pgs10/spec/`) — ยังไม่ Freeze

| ไฟล์ | เนื้อหา |
|---|---|
| `01_PGS10_POLICY_RULEBOOK.md` | นโยบายโครงการ (Eligibility, NPL, Restructure, Demand, Filing Window, Coverage, Claim Max) พร้อมป้าย OFFICIAL / LOCKED / OPEN |
| `02_PGS10_OPERATIONAL_AUDIT_RULES.md` | กฎที่ล็อก L-01…L-14, 28 Controls, รูปแบบผลลัพธ์ (5 Case State + reason_code), **ภาคผนวก A: ทะเบียน Conflict/Ambiguity 28 รายการ** |
| `03_PGS10_DATA_DICTIONARY.json` | ฟิลด์, Reason Code 77 ตัว, Config ที่ห้าม Hardcode |
| `04_PGS10_GOLDEN_TESTS.json` | 78 unit cases + 17 fixtures (15 เคส LG-only รอข้อมูลจริง) |

**Rule Engine ในโฟลเดอร์นี้ยังเป็นรุ่นก่อน Spec และยังไม่ได้ปรับ** (รอ Freeze). ส่วนที่ต่างจาก Spec:
- 0.01 บาท: โค้ดถือเป็น `OBSERVATION` ทันที → Spec: `OBSERVATION_CANDIDATE` ห้าม auto-pass จนอนุมัติ tolerance (A-03)
- Control 12: โค้ดเทียบ Statement ล่าสุดเป็นค่าเริ่มต้น → Spec: Statement ณ วันบอกกล่าว (A-02)
- Status: โค้ดใช้ 10 สถานะ + case 4 ค่า → Spec: Case 5 State + `reason_code` (A-06)
- Rule ID: โค้ดใช้ `PGS10-RST-001` สำหรับวันที่ปรับโครงสร้าง → Spec ใช้ `RST-003` (A-13)
- ยังไม่มี Control: `LG-001`, `NPL-001`, `RST-001/002`, `DMD-003`, `CLM-001`
- Historical Debt mismatch = HOLD: โค้ดทำถูกแล้ว (reason ยังเป็น `HISTORICAL_BALANCE_MISMATCH` ตรงกับ Spec)

## Controls → Rule ID (ตามโค้ดปัจจุบัน)

| # | Rule ID | # | Rule ID |
|---|---|---|---|
| 1 | PGS10-ELIG-001 | 12 | PGS10-DMD-002 |
| 2 | PGS10-ID-001 | 13 | PGS10-HIS-001 |
| 3 | PGS10-CONTRACT-001 | 14 | PGS10-PST-001 |
| 4 | PGS10-DOC-001 | 15 | PGS10-PST-002 |
| 5 | PGS10-VIS-001 | 16 | PGS10-CUR-001 |
| 6 | PGS10-STM-001 | 17 | PGS10-STM-002 |
| 7 | PGS10-DEF-001 | 18 | PGS10-CLM-003 |
| 8 | PGS10-DEF-002 | 19 | PGS10-CLM-002 |
| 9 | PGS10-FUP-001 | 20 | PGS10-CLM-004 |
| 10 | PGS10-RST-001 | 21 | PGS10-CAP-001 |
| 11 | PGS10-DMD-001 | 22 | PGS10-TIME-001 |

Rulebook ระบุ Rule ID เฉพาะ Control 1; ที่เหลือใช้ชื่อตามตัวอย่างใน Master Audit §41 (`DEF-002`, `VIS-001`, `CAP-001` ฯลฯ) และตั้งเพิ่มให้ Control ที่ไม่มีชื่อ

## เมื่อ Rulebook กับ Master Audit ขัดกัน — ยึด Rulebook

- Historical Balance ไม่ตรง Demand → **HOLD** (Blocking) ไม่ใช่ Observation
- ส่วนต่าง 0.01 บาท (ดอกเบี้ย/รวม เมื่อเงินต้นตรง) → **OBSERVATION**; ค่า tolerance ปรับได้ในส่วน “ตั้งค่ากฎ”
- Status ใช้ 10 ค่าของ Rulebook §26 และสรุปเคสเป็น ผ่าน / ผ่านโดยมีข้อสังเกต / พักการพิจารณา / ไม่ผ่าน
- ไม่ได้ใส่กฎที่มีเฉพาะใน Master Audit: NPL seasoning 6 เดือน, Demand waiting period 1 เดือน, Claim filing window, ทางออก 7 เดือน (Rulebook §32 ให้เป็น config จนกว่าจะมีเอกสารยืนยัน), เงินสมทบรัฐบาล, ค่าธรรมเนียมจ่ายชดเชย 2%, Ledger ของ Package Cap

## การตีความที่ผู้ตรวจควรรับรู้ (ตัดสินเองในโค้ด ไม่ได้มาจาก Rulebook ตรง ๆ)

1. **`NOT_TESTABLE` ถือเป็น Blocking** — ข้อมูลไม่ครบ = สรุปเคสเป็นพักการพิจารณา (ไม่เดา)
2. **Control 12** เทียบเงินต้นบอกกล่าวกับ *Statement ล่าสุด* ตาม Rulebook แต่ถ้าผู้ตรวจกรอก “เงินต้น Statement ณ วันบอกกล่าว” จะใช้ค่านั้นแทน (กัน false reject เมื่อมีการชำระหลังบอกกล่าว — Master Audit §20)
3. **Control 6** รายการ `UNKNOWN` ที่ลงวันหลังรับชำระจริงล่าสุด → พัก (Rulebook: “UNKNOWN ใกล้วันผิดนัด → HOLD”; ที่นี่เลือกแบบเข้มกว่า คือทุก UNKNOWN หลัง PAYMENT ล่าสุด)
4. **Control 8** นอกจากเนื้อหาที่ Rulebook กำหนด ยังให้ยืนยันว่าชื่อ/เลขบัญชีในหนังสือเป็นเคสเดียวกัน (Master Audit §16)
5. **Control 14** ชื่อผู้รับตัวบรรจง หรือลายมือชื่อเจ้าหน้าที่ไปรษณีย์อย่างเดียว ไม่นับเป็นหลักฐานรับ (Master Audit §21) และ Control 14 ผ่านได้ต่อเมื่อ Control 15 (ที่อยู่) ผ่าน
6. **Control 19** ตาราง ratio มีเฉพาะ Small Biz (70/100 — Rulebook) และ Start up (100 — Master Audit §7); Product อื่นจะ HOLD จนกว่าจะเพิ่มใน `productRuleMatrix` · วิธีนับ “อายุ LG 5 ปี” ยังไม่ยืนยัน จึงเป็นตัวเลือก (ตามวันที่ยื่น / ตามปีที่ยื่น) — ค่าเริ่มต้นตามวันที่ยื่น, ครบ 5 ปีพอดี = 70%
7. **Control 22** ไม่นับ “วันชำระล่าสุด” ใน Timeline เพราะ Control 7/8 รายงานเรื่องชำระหลังผิดนัดอยู่แล้ว

## ยังไม่ทำ (ขอบเขตของ Prototype)

- **แท็บ “เอกสารเคส” (ขั้น 1 ของการนำเข้าไฟล์):** นำเข้าได้หลายไฟล์ — PDF/รูปแสดงเป็นหน้า (ซูม/หมุน/เปลี่ยนหน้า), JSON เติมฟอร์ม, ไฟล์อื่นเก็บเป็นเอกสารแนบ; ติดป้ายประเภทเอกสาร (เดาจากชื่อไฟล์ ต้องตรวจสอบ) และกด “ใส่อ้างอิงหน้านี้” ลงช่องอ้างอิงหลักฐานได้ ทำงานในเบราว์เซอร์ล้วน (ไม่อัปโหลด/ไม่บันทึก); ตัวแสดง PDF = pdf.js 3.11.174 (Apache-2.0) ใน `vendor/`
- **อ่านเอกสารด้วย AI (ขั้น 2–3, ทดลอง — `extract.js`):** ปุ่ม “อ่านหน้านี้ด้วย AI” ส่งภาพหน้าเอกสาร (และ text layer ถ้ามี) ให้ Claude ผ่าน capability `sample` ของ claude.ai (ใช้ได้เฉพาะเมื่อเปิดผ่านลิงก์ที่เผยแพร่; ผู้เปิดเป็นผู้จ่ายและต้องยินยอมทุกครั้ง) ผลเป็น *ค่าแนะนำ* ต้องกด “ใช้ค่า” ทีละรายการ และเก็บ provenance (ไฟล์/หน้า/วิธี/ความมั่นใจ/ข้อความบนเอกสาร) ลงไฟล์ JSON ที่ดาวน์โหลด. ภาพถูกย่อเหลือราว 1.2 ล้านพิกเซลก่อนส่ง — ตัวเลขเล็กให้ซูมแล้วเลือก “เฉพาะส่วนที่เห็นบนจอ”. `FI_PROFILES` ใน `extract.js` = ต้นแบบ FI Evidence Adapter (GSB มาจากเคสเดียว — UNVERIFIED เป็น mapping ทั่วไป; รหัสรายการ CMP → PAYMENT, อื่น ๆ → UNKNOWN)
- ยังไม่มี OCR ฝั่งเครื่อง และไม่ตัดสิน/คำนวณแทนผู้ตรวจ; ผู้ตรวจติ๊กเองว่า “เห็นจริงในภาพ” (Control 5)
- ยังไม่เก็บ provenance ต่อฟิลด์ครบตาม Rulebook §2 (bounding box, extraction method ฯลฯ) — ตอนนี้มีเพียงช่อง “อ้างอิงหลักฐาน” ต่อหัวข้อ
- ไม่มี Maker/Checker/Supervisor, Override log, ฐานข้อมูล หรือ API — ไม่มีการบันทึกข้อมูลใด ๆ (ส่งออกได้เฉพาะเมื่อกดดาวน์โหลด JSON)
- ตัวอย่างใน `samples.js` เป็นข้อมูลสมมติ; Golden Test Cases จริง (เช่น 67-035527, 66-100217 ฯลฯ ใน Rulebook §30) ยังไม่ได้ใส่เพราะเอกสารมีเฉพาะเลข LG ไม่มีตัวเลขจริงของเคส
