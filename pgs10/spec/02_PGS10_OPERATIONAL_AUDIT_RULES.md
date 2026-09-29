# 02 · PGS 10 Operational Audit Rules

**Spec version:** 1.0.0-DRAFT (ยังไม่ Freeze) · **Rule set:** PGS10 Claim Audit Master Rules — 2026.09.29 (Rulebook 22 Controls) + ส่วนเพิ่มจาก Master Audit + คำสั่งล็อกล่าสุดของผู้ใช้
**ไฟล์นี้บรรจุ:** กฎตรวจที่ล็อกจากงานตรวจจริง — Identity, Page/Visual Completeness, Statement Classification, Default Exception, Postal, Address, Historical Balance, Tolerance, Timeline, รูปแบบผลลัพธ์
**นโยบายโครงการ** อยู่ใน `01_PGS10_POLICY_RULEBOOK.md` · **ความหมายฟิลด์/Reason Code เต็ม** อยู่ใน `03_PGS10_DATA_DICTIONARY.json` · **เคสทดสอบ** อยู่ใน `04_PGS10_GOLDEN_TESTS.json`

ป้ายที่มา: `R§n` Rulebook · `M§n` Master Audit · `V` บทสนทนาประเมินล่าสุด · `U` คำสั่งล็อกของผู้ใช้ · ข้อที่มีคำว่า **[A-nn]** คือจุดขัดแย้ง/กำกวมในภาคผนวก A

---

## 1. Locked Rules (ชนะทุกเอกสารเก่าเมื่อขัดกัน)

| ID | กฎที่ล็อก | ที่มา |
|---|---|---|
| L-01 | ภาพเอกสารจริงที่มองเห็น > OCR / Text Layer. OCR ใช้ค้นหาและอ่านเท่านั้น **ห้ามชดเชย Critical Document ส่วนที่มองไม่เห็นจริงในภาพ** [A-05] | R§2, R§8, M§1, M§15, M§37, U |
| L-02 | `default_date ≥ last_actual_payment_date` (ไม่ใช่ `>`) ถ้า `<` ต้องเข้า Exception (ห้าม Fail ทันที) | R§10, M§13, U |
| L-03 | **Historical Debt Snapshot** ณ วันออกหนังสือบอกกล่าว ต้องตรงกับหนังสือบอกกล่าว ณ Reference Date เดียวกัน ทั้ง Principal, Interest และ Total. ถ้าไม่ตรง → `case_status = HOLD`, `reason_code = HISTORICAL_BALANCE_MISMATCH` **ห้ามจัดเป็น Observation แม้ไม่กระทบ Claim Base** [A-04] | R§16, U |
| L-04 | Demand Principal เทียบกับ **Statement Principal ณ วันบอกกล่าว (as of Demand Date)** แยกจาก `current_principal` (Statement ล่าสุด) [A-02] | M§20, M§43.2, V, U |
| L-05 | Tolerance ส่วนต่างเงิน (0.01 บาท) เป็น **Configurable Rule** ไม่ Hardcode; ค่าเริ่มต้น = ปิด. ส่วนต่างที่เข้าเกณฑ์แสดงเป็น `OBSERVATION_CANDIDATE` และ **ห้าม Auto-pass** จนกว่ามี Config/การรับรองที่อนุมัติ [A-03] | M§26, M§43.3, V, U |
| L-06 | `default_date` และ `npl_date` เป็นคนละฟิลด์ ห้ามถือว่าเท่ากันโดยไม่มี Business Mapping ที่อนุมัติ [A-01] | M§4.1, M§43.1, U |
| L-07 | วันที่แจ้งผลอนุมัติสินเชื่อ = วันที่ทำสัญญาที่ใช้เป็นฐานตรวจ และต้องตรงวันที่สัญญาที่อ้างในหนังสือบอกกล่าว | R§6, M§9 |
| L-08 | Demand Principal Hard Match: เทียบ **เฉพาะเงินต้น**; ห้ามนำดอกเบี้ยในหนังสือบอกกล่าวไปเทียบ Current Statement (คนละ Cut-off) | R§15, M§19 |
| L-09 | **ห้ามเดา / ห้ามแก้ข้อมูลต้นทางเอง** — พบความต่างต้องแสดงค่าทั้งสองด้านและหลักฐานทั้งสองแหล่ง; หลักฐานไม่พอ → `HOLD` + Required Action | M (หัวข้อ “ระบบต้องไม่แก้ข้อมูลให้เอง” / “ต้องบอกเหตุผล”), V |
| L-10 | ถ้ากฎในเอกสารต่างเวอร์ชันขัดกัน ให้ใช้กฎที่มี Version/Effective Date ล่าสุด และ **รายงาน Conflict** แทนการเลือกเอง; ถ้าตัดสินไม่ได้ → `HOLD` | V |
| L-11 | HOLD ≠ FAIL: เอกสารขาด/ถูก Crop/ยังพิสูจน์ไม่ได้ = `HOLD` ไม่ใช่ตัดสินว่าผิดหลักเกณฑ์ | M§38, R§26 |
| L-12 | เงินคำนวณด้วย Decimal (จำนวนเต็มสตางค์) + `ROUND_HALF_UP`; ไม่ใช้ Floating Point; ต้องคำนวณ Claim ใหม่เองไม่เชื่อยอดหน้าจอ | R§23, M§29 |
| L-13 | PDF Page Number ≠ Document Page Number. ตรวจลำดับ “n of X” ของเอกสาร ไม่ใช่เลขหน้า PDF (หน้า PDF ว่างที่คั่นไม่ทำให้เอกสารขาด) | R§7 |
| L-14 | “วันที่ติดตาม” ≠ “วันที่ทำสัญญาปรับโครงสร้างหนี้” (คนละความหมาย) | R§12 |

## 2. ลำดับความน่าเชื่อถือของแหล่งข้อมูล (Source Hierarchy)

| ลำดับ | แหล่ง | ใช้เป็นหลักสำหรับ |
|---|---|---|
| P0 | หลักเกณฑ์ PGS 10 ทางการ / หนังสือแก้ไขหลักเกณฑ์ | Eligibility, Coverage, Claim Timing, Package Cap |
| P0′ | Operational Hard Controls ที่ล็อก (ไฟล์นี้) | วิธีตรวจ |
| P1 | LG · หนังสือแจ้งผลอนุมัติ/สัญญา · Loan Statement · หนังสือบอกกล่าว/บอกเลิก · เอกสารปรับโครงสร้าง · รายงานติดตาม · ใบตอบรับ/ซองตีกลับ · หนังสือยืนยันการชำระหลังผิดนัด | ค่าต้นทาง |
| P2 | หน้าจอระบบ | ค่าที่ต้อง **ตรวจเทียบ** ไม่ใช่หลักฐานต้นทาง |
| P3 | OCR / Text Layer / AI Extraction | ค้นตำแหน่งและช่วยอ่านเท่านั้น |

## 3. รูปแบบผลลัพธ์

### 3.1 Case Status (5 State) และ Reason Code

`case_status` ∈ { `PASS`, `PASS_WITH_SUPPORT`, `PASS_WITH_OBSERVATION`, `HOLD`, `FAIL` } — **รายละเอียดปลีกย่อยอยู่ที่ `reason_code`** ไม่ใช่การเพิ่มสถานะ (V, M§38) [A-06]

| Case status | เงื่อนไข |
|---|---|
| `FAIL` | มี Control ที่ `FAIL` (ดู 3.3 ขอบเขต FAIL) |
| `HOLD` | มี Control ที่ `HOLD`, `NOT_TESTABLE` (Hard Control) หรือ `OBSERVATION_CANDIDATE` ที่ยังไม่ถูกรับรอง |
| `PASS_WITH_OBSERVATION` | ไม่มีข้อข้างต้น แต่มี Control `OBSERVATION` [A-08] |
| `PASS_WITH_SUPPORT` | ไม่มีข้อข้างต้น แต่มี Control `PASS_WITH_SUPPORT` (Documentary Exception ที่สมบูรณ์) [A-08] |
| `PASS` | ทุก Hard Control `PASS` หรือ `NOT_APPLICABLE` |

### 3.2 Control Status

`PASS` · `PASS_WITH_SUPPORT` · `OBSERVATION` · `OBSERVATION_CANDIDATE` · `HOLD` · `FAIL` · `NOT_APPLICABLE` · `NOT_TESTABLE`

- `NOT_TESTABLE` = ข้อมูล/หลักฐานไม่พอจะตรวจ (เช่น CLAIM MAX ไม่มี paid/pending) — **ห้ามเดาตัวเลข**
- สถานะเดิมของ Rulebook §26 แมปเป็น `HOLD` + reason: `HOLD_MISSING_DOCUMENT`→ `*_MISSING`, `HOLD_INCOMPLETE_DOCUMENT` → `*_INCOMPLETE`/`*_VISUALLY_INCOMPLETE`, `HOLD_DATA_MISMATCH` → `*_MISMATCH`, `HOLD_NEED_CLARIFICATION` → `*_UNCONFIRMED`/`VERIFY_*`; `PASS_WITH_DOCUMENTARY_SUPPORT` = `PASS_WITH_SUPPORT`

### 3.3 ขอบเขตของ `FAIL` [A-07]

ค่าเริ่มต้น (`fail_scope = ELIGIBILITY_ONLY`, ตาม R§26): `FAIL` เฉพาะพิสูจน์ได้ชัดว่า **ไม่เข้า Eligibility** หรือผิดเงื่อนไขที่ **แก้ด้วยเอกสารเพิ่มไม่ได้**. ที่เหลือเป็น `HOLD`.
ตัวเลือก `EXTENDED_M39`: ยกระดับเป็น `FAIL` ตามตาราง Approval Gate ของ M§39 (NPL seasoning ไม่ผ่าน, Demand waiting ไม่ครบ, Filing Window ไม่ผ่าน, Coverage ratio ผิด, Claim calculation ผิด, Wrong borrower/LG/account, Product/PGS version ผิด). **ต้องให้ผู้ใช้เลือกก่อน Freeze.**

### 3.4 โครงผลลัพธ์ต่อ Control (ต้องตอบ 5 คำถาม — R§33)

`rule_id, control_no, name, severity, status, reason_code, expected_value, observed_value, message, required_action, evidence[{document_type, page, source_page_type: document_page|pdf_page}], rule_version` — ต้องย้อนเปิดหน้าเอกสารจริงได้

### 3.5 Provenance ต่อฟิลด์ที่อ่านได้ (R§2)

`value, normalized_value, source_document, source_page, document_type, visible_on_rendered_page, bounding_box, extraction_method, confidence, rule_used`

## 4. Pipeline มาตรฐาน [A-19]

ตรวจ **ทุก** Control ที่ Applicable (ไม่ Short-circuit) แล้วสรุป; ลำดับรายงาน:

`Program → Identity → Document Completeness → Visual Completeness → Contract → LG/NPL Eligibility → Statement Transactions → Last Actual Payment → Default → Post-Default Exception → Tracking → Restructure (Requirement / 7-Month Exception / Date Evidence) → Demand → Historical Debt → Postal → Address → Current Debt → Statement Cut-off → Filing Window → Coverage → Claim Base → Claim Amount → Claim Max → Timeline → Final`

ลำดับพึ่งพา (ต้องคำนวณก่อน): Address → Postal · Claim Base + Coverage → Claim Amount → Claim Max · Last Payment → Default → Exception · Exception → Timeline.

## 5. Controls

รูปแบบ: **Rule ID · ชื่อ** — ที่มา · ประเภท (`OPS` = กฎปฏิบัติการที่ล็อก, `POL` = ผูกกับนโยบายใน 01)
`R#` = เลข Control ใน Rulebook (1–22); Control ที่มีเฉพาะใน Master Audit ไม่มี R#

### PGS10-ELIG-001 · Project / Product Eligibility — R#1 · POL
- **Input:** `pgs_phase, pgs_revision, product, loan_is_new_business, loan_is_hire_purchase_or_leasing, total_exposure_per_borrower, guarantee_amount_this_transaction`
- **Logic:** ต้องระบุ PGS ระยะ/รุ่นปรับปรุง/กลุ่ม/รูปแบบ Product; ต้องเป็น PGS 10 rev.5; สินเชื่อใหม่เพื่อธุรกิจ; ไม่ใช่เช่าซื้อ/ลิสซิ่ง; วงเงินรวมต่อราย SSMEs ไม่เกินเพดาน (Small Biz 200,000 / Start up 100,000); ค้ำต่อครั้ง ≥ 10,000; รวมต่อราย ≤ 40 ล้าน
- **ผล:** ระบุ Product ไม่ได้ / รุ่นไม่ใช่ 5 / ยังไม่ยืนยัน → `HOLD` (`PRODUCT_UNKNOWN`, `PGS_REVISION_MISMATCH`, `ELIGIBILITY_UNCONFIRMED`); ระบุชัดว่าไม่เข้าเกณฑ์ → `FAIL` (`ELIGIBILITY_NOT_PGS10`, `ELIGIBILITY_PRODUCT_EXCLUDED`, `ELIGIBILITY_HIRE_PURCHASE_LEASING`, `ELIGIBILITY_NOT_NEW_BUSINESS_LOAN`, `ELIGIBILITY_EXPOSURE_LIMIT_EXCEEDED`, `ELIGIBILITY_GUARANTEE_BELOW_MINIMUM`)

### PGS10-ID-001 · Identity Integrity — R#2 · OPS
- **Input:** LG, ชื่อผู้กู้, เลขบัญชีสินเชื่อ, เลขสัญญา (ถ้ามี), ผู้ให้กู้, สาขา, วงเงิน, วันที่ LG, Product — จากทุกเอกสารของเคส
- **Normalization ที่อนุญาต:** LG ลบ `-`/ช่องว่าง/format (`67-026936 = 67026936`, `67-004092 = 67004092`); เลขบัญชี: ต่างเฉพาะ Leading Zero (`366023002710` vs `0366023002710`) เมื่อองค์ประกอบอื่นตรงทั้งหมด
- **ผล:** ตรงทั้งหมด → `PASS` · ต่างเฉพาะ Leading Zero → `OBSERVATION` (`FORMAT_VARIANCE`, ไม่ Fail ทันที) · เลขภายในต่าง (`208023002116` vs `208023002135`, `503023002695` vs `503023002676`) → `HOLD` `VERIFY_REFERENCE_MAPPING` **ห้าม Normalize ทิ้งเอง** · LG/ชื่อ/วงเงิน/วันที่ LG ไม่ตรง → `HOLD` `IDENTITY_MISMATCH`
- **Evidence:** ทุกเอกสารที่เทียบ

### PGS10-DOC-001 · Approval / Loan Agreement Page Completeness — R#4 · OPS (Hard)
- **Input:** `approval_total_pages (X)`, `approval_document_pages_found[]`, `page_unreadable_flag`
- **Logic:** เอกสารระบุ “1 of X” ต้องพบ `1 of X → … → X of X` ครบ (ไม่ใช่แค่หน้า 1 และ X) นับ **หน้าเอกสาร** ไม่ใช่หน้า PDF (L-13)
- **ผล:** ครบ → `PASS` · ขาดลำดับกลาง (เช่น 2–9 of 9) → `HOLD` `DOCUMENT_PAGE_SEQUENCE_GAP` · หน้าถัดจาก 1 of X เป็นเอกสารอื่น → `HOLD` `DOCUMENT_TRUNCATED` · หน้าที่ควรมีแต่ Crop/เสีย/อ่านไม่ได้ → `HOLD` `DOCUMENT_PAGE_UNREADABLE`
- **ขอบเขต:** ตอนนี้ใช้กับหนังสืออนุมัติ/สัญญา; การขยายไปเอกสารหลายหน้าอื่น — ดู [A-28]

### PGS10-VIS-001 · Visual Completeness of Critical Evidence — R#5 · OPS (Hard)
- **Logic:** Critical Document ต้อง **เห็นเนื้อหาจริงใน Rendered Page**; ห้ามใช้ Hidden Text Layer/OCR ทดแทนส่วนที่ไม่ปรากฏในภาพ (L-01)
- **หนังสือยืนยันการชำระหลังผิดนัด — ต้องเห็นอย่างน้อย 12 รายการ:** หัวหนังสือ/ตราธนาคาร · วันที่หนังสือ · เรื่อง · เรียน · ชื่อลูกหนี้ · เลขบัญชี/สัญญา · วันที่ผิดนัด · รายการชำระหลังผิดนัด · ข้อความว่าชำระไม่เป็นไปตามเงื่อนไข · ข้อความยืนยัน Default Date เดิม · ลายมือชื่อ · ชื่อ/ตำแหน่งผู้มีอำนาจ [A-16]
- **Critical Documents ที่ต้องตรวจภาพ (ตาม M§37)** [A-05]: Approval/Loan Agreement (ลำดับหน้า) · Confirmation Letter (เต็มหน้า) · Demand Letter (หัว/วันที่/ผู้กู้/ยอด/ลายเซ็น) · Tracking Report (รายการ/วันที่/ผล) · Postal Receipt (วันที่/ลายเซ็น) · Returned Envelope (สถานะตีกลับ + ที่อยู่) · Restructure Agreement (วันที่/คู่สัญญา/ลายเซ็น)
- **ผล:** เห็นครบ → `PASS` · ภาพเริ่มกลางตาราง/ถูก Crop แม้ Text Layer อ่านหัวได้ → `HOLD` `CONFIRMATION_LETTER_VISUALLY_INCOMPLETE` (หนังสือยืนยัน) หรือ `DOCUMENT_VISUALLY_INCOMPLETE` (อื่น ๆ) · ยังไม่ได้ตรวจภาพ → `NOT_TESTABLE` `VISUAL_CHECK_PENDING`
- **Regression (Negative Test):** LG 67-026936, 66-021663, 66-047662, 67-023862

### PGS10-CONTRACT-001 · Contract / Approval Date — R#3 · OPS
- `approval_date == demand_letter.contract_date` ตรง 100% → `PASS`; ไม่ตรง → `HOLD` `CONTRACT_DATE_MISMATCH`

### PGS10-LG-001 · Guarantee Validity — M§41 (ชื่อเท่านั้น) · POL [A-27]
- Master Audit ระบุเฉพาะชื่อ Rule; Logic ที่ **ถอดจากนโยบาย** (ต้องยืนยัน): มี `lg_number, lg_issue_date, lg_amount`; อายุ LG ≤ 10 ปี; ชำระค่าธรรมเนียมค้ำประกันต่อเนื่อง
- **ผล:** `HOLD` `LG_DATA_MISSING` / `LG_TENOR_EXCEEDED` / `LG_FEE_NOT_CONTINUOUS`

### PGS10-NPL-001 · NPL Seasoning — M§4.1, M§3.1 · POL [A-01][A-09]
- **Input:** `npl_date` (**ไม่ใช่** `default_date`), `lg_issue_date`, `product`
- **Logic:** Small Biz: `npl_date ≥ lg_issue_date + 6 เดือน` (config `npl_seasoning_months`); SMEs: `≥ guarantee_date + 9 เดือน`
- **ผล:** ไม่มี `npl_date` และไม่มี Mapping ที่อนุมัติ → `NOT_TESTABLE` `NPL_DATE_MAPPING_UNDEFINED` (Case = `HOLD`) · ไม่ผ่าน → `HOLD` `NPL_SEASONING_NOT_MET` (หรือ `FAIL` เมื่อ `fail_scope = EXTENDED_M39`) · ผ่าน → `PASS`

### PGS10-STM-001 · Statement Transaction Classification + Last Actual Payment — R#6 · OPS
- **Transaction types:** `PAYMENT, DRAWDOWN, INTEREST_ACCRUAL, FEE, ADJUSTMENT, REVERSAL, PRINCIPAL_ADJUSTMENT, UNKNOWN` (รวม R§9 กับ M§11) [A-14]
- **Logic:** `last_actual_payment_date = MAX(transaction_date WHERE type = PAYMENT)`. ไม่นับ: การตั้งดอกเบี้ย, Accrued Interest, ดอกเบี้ยผิดนัด, Fee, Adjustment, Reversal, Drawdown/รายการที่ทำให้ Principal เพิ่ม, System posting ที่ไม่มี Cash Receipt จริง
- **Transaction Code ของธนาคาร** ต้องมาจากตาราง Mapping ต่อธนาคาร (ห้าม Hardcode)
- **ผล:** `PASS` (พบ PAYMENT) · ไม่พบ PAYMENT เลย → `OBSERVATION` `NO_PAYMENT_FOUND` · มี `UNKNOWN` ใกล้วันผิดนัด → `HOLD` `UNKNOWN_TRANSACTION_NEAR_DEFAULT` (“ใกล้” ยังไม่นิยาม [A-15]) · ไม่มี Statement → `NOT_TESTABLE`

### PGS10-DEF-001 · Default Date vs Last Actual Payment — R#7 · OPS
- `default > last_payment` → `PASS` · `default = last_payment` → `PASS` · `default < last_payment` → `exception_required = true` → ผลของ Control นี้ = ผลของ DEF-002 (ไม่ Fail ทันที)
- ไม่มี Last Actual Payment → `NOT_APPLICABLE`

### PGS10-DEF-002 · Post-Default Payment Exception — R#8 · OPS
```
if default_date < last_actual_payment_date:
    exception_required = true
    if exception_letter_missing:                      HOLD  EXCEPTION_LETTER_MISSING
    elif not exception_visual_complete:               HOLD  CONFIRMATION_LETTER_VISUALLY_INCOMPLETE
    elif exception_confirmed_default_date != screen_default_date:
                                                      HOLD  CONFIRMED_DEFAULT_DATE_MISMATCH
    elif letter lacks (payment after default | payment does not change default | identifiers link to case):
                                                      HOLD  CONFIRMATION_CONTENT_INCOMPLETE / CONFIRMATION_IDENTIFIER_UNLINKED
    else:                                             PASS_WITH_SUPPORT  POST_DEFAULT_PAYMENT_SUPPORTED
else: NOT_APPLICABLE
```
- หนังสือต้องยืนยันอย่างน้อย: ลูกหนี้ผิดนัดวันที่ใด · ภายหลังมีการชำระเงิน (วันที่/ยอด) · ชำระบางส่วน/ไม่เป็นไปตามเงื่อนไข · ธนาคารยืนยัน Default Date เดิม · Default Date ในหนังสือ = หน้าจอ · Identifier (borrower/loan account/contract ref/demand date) ต้อง Link กลับเคส (M§16) — ถ้า Identifier ไม่ตรง → `HOLD` `CONFIRMATION_IDENTIFIER_UNLINKED` จนมี Mapping พิสูจน์

### PGS10-FUP-001 · Follow-up / Collection Evidence — R#9 · OPS
- ตรวจ ผู้กู้, LG, วันที่ติดตาม (หน้าจอ = รายงานติดตาม), วิธีติดตาม, ผลติดตาม
- `HOLD`: `TRACKING_REPORT_MISSING`, `TRACKING_DATE_MISMATCH`, `TRACKING_EVIDENCE_INCOMPLETE` · ห้ามตีความวันที่ติดตามเป็นวันปรับโครงสร้าง (L-14)

### PGS10-RST-001 · Restructure Requirement / Route — M§4.2, M§5, M§6 · POL
- ระบุเส้นทาง: `NORMAL_RESTRUCTURE_PATH` | `UNCONTACTABLE_7_MONTH_EXCEPTION` | `NOT_REQUIRED_AFTER_5Y` (Small Biz หลัง 5 ปี ใช้ (ง) แทน (ค))
- `restructure_date = null` **ต้องไม่ผ่านอัตโนมัติ** (POL-RST-003)
- **ผล:** เส้นทางยังไม่ระบุ → `HOLD` `RESTRUCTURE_PATH_UNDETERMINED` · NORMAL ไม่ครบเงื่อนไข (ยังไม่พ้น 3 เดือน / ยังชำระในช่วง 3 เดือน) → `HOLD` `RESTRUCTURE_REQUIREMENT_NOT_MET`
- **หมายเหตุ ID:** ต้นฉบับ Master Audit ใช้ `RST-001` = Restructure Requirement; ต้นแบบโค้ดเวอร์ชันแรกใช้ `RST-001` แทนการตรวจวันที่ปรับโครงสร้าง → ใช้ `RST-003` แทน [A-13]

### PGS10-RST-002 · 7-Month Uncontactable Exception — M§5 · POL [A-10]
- ใช้ได้เมื่อ config `enable_7m_exception = true` (ค่าเริ่มต้นปิด เพราะขอบเขตยัง OPEN): พ้น 7 เดือนจาก `uncontactable_start_date` + Certified Tracking Report + Demand/Termination ≥ 1
- **ผล:** เลือกเส้นทางนี้แต่ปิดอยู่ → `HOLD` `EXCEPTION_ROUTE_NOT_CONFIGURED` · ไม่ครบ → `HOLD` `UNCONTACTABLE_EXCEPTION_NOT_MET` / `TRACKING_REPORT_NOT_CERTIFIED` · ครบ → `PASS_WITH_SUPPORT`

### PGS10-RST-003 · Restructure Date Evidence — R#10 · OPS
- **Source hierarchy:** L1 เอกสารปรับโครงสร้างโดยตรง (สัญญา/ข้อตกลง/หนังสืออนุมัติ) → L2 หัว Statement (วันที่รับความช่วยเหลือ/ปรับโครงสร้าง/เริ่มเงื่อนไขใหม่) → L3 หน้าจอ
- ก่อนสรุป Date Mismatch ต้องแยก **วันที่ลงนาม / อนุมัติ / มีผล / ระบบเริ่มบันทึก**
- **ผล:** ตรง L1 → `PASS` · ไม่ตรง L1 แต่ตรงหัว Statement → `PASS_WITH_SUPPORT` `MATCHED_STATEMENT_HEADER` · ไม่ตรง L1 และยังไม่ตรวจหัว Statement → `HOLD` `CHECK_STATEMENT_HEADER` · ไม่ตรงทั้งสอง → `HOLD` `RESTRUCTURE_DATE_MISMATCH` · ไม่มีหลักฐาน → `HOLD` `RESTRUCTURE_EVIDENCE_MISSING` · ไม่มีการปรับโครงสร้าง → `NOT_APPLICABLE`

### PGS10-DMD-001 · Demand Letter Identity — R#11 · OPS
- ตรวจ ผู้กู้, Account, วันที่หนังสือ (ตรงหน้าจอ), วันที่สัญญาที่อ้าง (→ CONTRACT-001), วงเงิน, เงินต้น, ดอกเบี้ย, Total (`principal + interest = total`), ที่อยู่ผู้รับ (→ PST-002)
- `HOLD`: `DEMAND_LETTER_MISMATCH`, `DEMAND_IDENTITY_UNCONFIRMED`

### PGS10-DMD-002 · Demand Principal = Statement Principal as of Demand Date — R#12 (แก้ตาม L-04) · OPS
- **Logic:** `demand_principal == statement_principal_as_of_demand_date` ตรง 100%; ห้ามใช้ดอกเบี้ย
- ถ้าไม่มี Statement Principal ณ วันบอกกล่าว และยอดไม่เท่ากับ Statement ล่าสุด → `HOLD` `ASOF_DEMAND_PRINCIPAL_REQUIRED` (ไม่ Reject เพราะอาจมีการชำระหลังบอกกล่าว)
- **ผล:** `PASS` · `HOLD` `DEMAND_PRINCIPAL_MISMATCH`
- **แก้จากเดิม:** R§15 (“Statement Principal”) เขียนกำกวม และ M§19 ระบุเทียบ Statement โดยไม่บอกวันที่, M§20 ระบุ as-of → ใช้ as-of [A-02]

### PGS10-DMD-003 · Demand Waiting Period — M§24 · POL [A-21]
- `claim_eligibility_date ≥ demand_date + 1 เดือน` (ยกเว้นเส้นทางล้มละลาย); ตัวเลขเดือน/วิธีนับ เป็น config
- ไม่ผ่าน → `HOLD` `DEMAND_WAITING_PERIOD_NOT_MET` (`FAIL` เมื่อ `fail_scope = EXTENDED_M39`) · ขาดวันที่ → `NOT_TESTABLE`

### PGS10-HIS-001 · Historical Debt Snapshot — R#13 (แก้ตาม L-03) · OPS
- **Input:** `screen_historical_{principal,interest,total}` (ช่อง “สภาพหนี้ ณ วันฟ้อง/วันที่ออกหนังสือบอกกล่าวทวงถาม/วันพิทักษ์ทรัพย์เด็ดขาด”) vs `demand_{principal,interest,total}` ณ Reference Date เดียวกัน
- **Logic:** ทั้ง 3 ค่า Exact Match (Reference Event = Demand Date)
- **ผล:** ตรงทั้ง 3 → `PASS` · ต่างแม้ค่าเดียว → **`HOLD` `HISTORICAL_BALANCE_MISMATCH`** ไม่ขึ้นกับว่ากระทบ Claim Base หรือไม่ (เป็นความถูกต้องของ Field/Reference Date) · ห้ามนำ Current Interest มาใส่ซ้ำ
- **Pattern:** ระบบเอายอดปัจจุบันใส่ช่อง Historical (Demand 90,038.73 / 59,508.71 / 149,547.44 vs Screen 90,038.73 / 74,975.64 / 165,014.37 → เงินต้นผ่าน DMD-002 แต่ HIS-001 ต้อง HOLD)
- **Reference Event อื่น (ฟ้อง/พิทักษ์ทรัพย์):** ยังไม่มี Rule [A-20]
- **ต้องแก้ Master Audit:** ถ้อยคำใน M§27 (“Data Mapping Error / Observation หากไม่กระทบ Claim Base”) ขัดกับกฎนี้ — ต้องแก้ต้นฉบับก่อน Freeze

### PGS10-PST-001 · Postal / Demand Letter Evidence — R#14 · OPS (Hard ทุกเคส)
- **ส่งสำเร็จ:** `received_date ≠ null` AND ลายมือชื่อผู้รับ/ผู้รับแทน AND `address_match = true` → `PASS` (ชื่อผู้รับตัวบรรจง หรือมีเฉพาะลายมือชื่อเจ้าหน้าที่ไปรษณีย์ → ไม่เพียงพอ [A-17])
- **ส่งไม่สำเร็จ:** หน้าซองตีกลับ / “RETURNED” / “คืนผู้ฝาก” / Returned Mail ชัดเจน AND `address_match = true` → `PASS` (ไม่ต้องมีลายมือชื่อผู้รับ)
- **Linkage:** `tracking_number` ของใบตอบรับ/ซอง/Track & Trace เป็นชุดเดียวกัน (M§23) — ต่าง → `HOLD` `POSTAL_TRACKING_MISMATCH`
- **ผล:** `HOLD` `POSTAL_EVIDENCE_MISSING` (ใบตอบรับว่าง/ไม่มีวันที่/ไม่มีลายเซ็น/ไม่มีซองตีกลับ) · `DELIVERY_PROOF_INCOMPLETE` · `RETURN_PROOF_INCOMPLETE` · `ADDRESS_SOURCE_NOT_FOUND`

### PGS10-PST-002 · Address Match — R#15 · OPS
- **ตรวจ:** บ้านเลขที่, หมู่, ตำบล/แขวง, อำเภอ/เขต, จังหวัด, รหัสไปรษณีย์ เทียบกับ `documented_address_set[]` (หนังสืออนุมัติ, สัญญา, เอกสารผู้กู้, เอกสารเปลี่ยนที่อยู่, เอกสารอื่นใน PDF ที่เชื่อถือได้)
- **Normalize:** ต.=ตำบล, อ.=อำเภอ, จ.=จังหวัด, ช่องว่าง/เครื่องหมาย/รหัสไปรษณีย์ · **บ้านเลขที่ห้าม fuzzy match**
- **ผล:** ตรง → `PASS` · ต่างและมีหลักฐานแจ้งเปลี่ยน → ใช้ที่อยู่ล่าสุด [A-18] · ต่างและไม่มีหลักฐานเปลี่ยน → `HOLD` `ADDRESS_NOT_IN_DOCUMENTS` / `ADDRESS_DIFFERS_FROM_LATEST` · หา Source ไม่พบ → `HOLD` `ADDRESS_SOURCE_NOT_FOUND`

### PGS10-CUR-001 · Current Outstanding — R#16 · OPS
- หน้าจอ “สภาพหนี้ ณ ปัจจุบัน” vs Statement ล่าสุด (SSOT ของ `current_principal/interest/total`)
- **Principal:** Exact (`principal_tolerance = 0.00`) → ไม่ตรง `HOLD` `CURRENT_PRINCIPAL_MISMATCH`
- **Interest/Total:** `Total = principal + interest + other applicable amounts` [A-24]
  - ตรง → `PASS`
  - ต่างไม่เกิน `interest_tolerance` และ **Tolerance ยังไม่ได้อนุมัติ** (ค่าเริ่มต้น) → `OBSERVATION_CANDIDATE` `VARIANCE_PENDING_TOLERANCE_APPROVAL` (Case = `HOLD` จนกว่าผู้ตรวจรับรอง/Config อนุมัติ) [A-03]
  - ต่างไม่เกิน tolerance และ **อนุมัติแล้ว** และเงินต้นตรง (ไม่กระทบ Claim Base) → `OBSERVATION` `VARIANCE_WITHIN_APPROVED_TOLERANCE`
  - ต่างเกิน tolerance โดยไม่มีเหตุ → `HOLD` `CURRENT_BALANCE_MISMATCH`
- ระบบต้อง **ไม่แก้ค่า** (เช่น 31,628.49 vs 31,628.50 → แสดง VARIANCE = 0.01 ห้ามปรับเป็นค่าเดียวแล้วบอกผ่าน)

### PGS10-STM-002 · Statement Cut-off vs Later Payments — R#17 · OPS
- ถ้าเอกสารอื่นระบุการชำระ **หลัง** Statement cut-off (เช่น Statement ถึง 18/08/2569, หนังสือธนาคารระบุชำระ 19/08/2569 = 2,000 บาท) → ห้ามรับยอด Statement เป็น Current Debt สุดท้าย (ยังไม่รู้การจัดสรรดอกเบี้ย/เงินต้น)
- ผล: `HOLD` `PAYMENT_AFTER_STATEMENT_CUTOFF` — Required Action: ขอ Statement หลัง Payment (Regression: LG 66-044366)

### PGS10-CLM-001 · Claim Filing Window — M§25 · POL [A-21]
- `claim_date ≥ lg_issue_date + 1 ปี` และ `claim_date ≤ final_lg_expiry_date + 1 ปี`
- ไม่ผ่าน → `HOLD` `CLAIM_FILING_WINDOW_NOT_MET` (`FAIL` เมื่อ `fail_scope = EXTENDED_M39`) · วิธีนับวัน = config

### PGS10-CLM-002 · Coverage Ratio — R#19 · POL
- ค้นจาก `product_rule_matrix[product]` + อายุ LG ([A-12] วิธีนับ) · หน้าจอ ratio ≠ ที่คำนวณ → `HOLD` `COVERAGE_RATIO_MISMATCH` · Product ไม่มีกฎ → `HOLD` `NO_RULE_FOR_PRODUCT` [A-11]

### PGS10-CLM-003 · Claim Base — R#18 · POL
- `claim_base = MIN(current_principal, current_guarantee_obligation)`; ตรวจทั้งค่าและ mode (`BY_PRINCIPAL` เมื่อ Principal < Guarantee, `BY_GUARANTEE` เมื่อ ≥)
- `HOLD` `CLAIM_BASE_MISMATCH` / `CLAIM_BASE_MODE_MISMATCH`

### PGS10-CLM-004 · Claim Amount — R#20 · POL
- `claim_amount = round_half_up(claim_base × coverage_ratio, 2)` (66,477.40 × 70% = 46,534.18); เทียบ: จำนวนเงินค่าประกันชดเชยหน้าจอ, ยอดอนุมัติจ่าย
- `HOLD` `CLAIM_AMOUNT_MISMATCH` (`FAIL` เมื่อ `fail_scope = EXTENDED_M39`)

### PGS10-CAP-001 · CLAIM MAX / Portfolio Cap — R#21 · POL
- `available = claim_max − paid − pending`; `after = available − this_claim` ตรงหน้าจอทุกสตางค์
- มีเพียง CLAIM MAX ไม่มี paid/pending → `NOT_TESTABLE` `PAID_PENDING_MISSING` · เกิน Cap → `HOLD` `CLAIM_EXCEEDS_CAP` (ตาม Portfolio Rule) · ตัวเลขไม่ตรง → `HOLD` `CAP_ARITHMETIC_MISMATCH`

### PGS10-TIME-001 · Timeline Integrity — R#22 · OPS
- **Master Timeline:** Contract/Approval → LG Issue → Payments → Default → Follow-up → Demand Letter → Postal → Claim Application → Bank Submission → Complete Documents → Payment Approval; ต้องไม่ขัดกัน (วันเดียวกันได้)
- **Exception:** `Default → Later Payment` ได้ เมื่อ DEF-002 = `PASS_WITH_SUPPORT`
- `HOLD` `TIMELINE_CONFLICT`

---

## ภาคผนวก A · ทะเบียนความขัดแย้ง / จุดกำกวม (Conflict & Ambiguity Register)

ประเภท: **CONFLICT** = แหล่งข้อมูลขัดกัน · **AMBIGUOUS** = ข้อความไม่พอจะเขียน Logic · **SOURCE-ERROR** = ข้อผิดพลาดในเอกสารต้นทาง
**ขวาง Freeze?** = ต้องมีการตัดสินใจก่อนจึง Freeze v1.0 ได้

### A.1 ห้าประเด็นที่ผู้ใช้กำหนด

| ID | ประเด็น | ประเภท | ที่พบ | การแก้ใน Spec นี้ | ขวาง Freeze? |
|---|---|---|---|---|---|
| A-01 | `default_date` ≠ `npl_date` | AMBIGUOUS | M§4.1/§43.1 บอกให้แยก + ต้องมี Business Mapping; R ไม่กล่าวถึง; หน้าจอมีเฉพาะ “วันที่ผิดนัดชำระหนี้”. **ยังไม่มีนิยามว่าจะได้ `npl_date` จากไหน** | แยก 2 ฟิลด์ใน Data Dictionary; NPL-001 เป็น `NOT_TESTABLE` จนมี Mapping | **ใช่** — ต้องตัดสิน Mapping |
| A-02 | Demand Principal ต้องใช้ Statement as of Demand Date | CONFLICT (ภายใน M และ R↔M) | R§15 & M§19: “= Statement Principal” (ไม่ระบุวัน; ตีความเป็น Statement ล่าสุดได้); M§20/§43.2: as-of Demand Date; R Control 12 ตัวอย่างกฎเก่า | ใช้ as-of (L-04); ไม่มีข้อมูล as-of → `HOLD ASOF_DEMAND_PRINCIPAL_REQUIRED` ไม่ Reject. **ต้องแก้ถ้อยคำ R§15 และ M§19** | ไม่ (ตัดสินแล้ว) — แต่ต้องแก้ต้นฉบับ |
| A-03 | Tolerance 0.01 เป็น configurable | CONFLICT | R§19 (Control 16): 0.01 → Observation อัตโนมัติ; M§26/§43.3: ยังไม่ Hardcode, `principal_tolerance=0.00`, `interest_tolerance=configurable`; V/U: `OBSERVATION_CANDIDATE` ห้าม Auto-pass | ค่าเริ่มต้นปิด; ส่วนต่าง → `OBSERVATION_CANDIDATE` (Case = HOLD) จนอนุมัติ. **เปลี่ยนจากที่ต้นแบบโค้ดเวอร์ชันแรกทำ** (ต้นแบบถือ 0.01 เป็น Observation ทันที) | **ใช่** — ต้องมีผู้อนุมัติค่า tolerance ของ interest/total |
| A-04 | Historical Debt mismatch = HOLD | SOURCE-ERROR | R§16 = HOLD (ถูกต้อง); **M§27 ยังเขียนว่า “Data Mapping Error / Observation หากไม่กระทบ Claim Base”** | ใช้ L-03; **แก้ M§27 ให้ตรง** ก่อน Freeze | **ใช่** — ต้องแก้ต้นฉบับ |
| A-05 | OCR/Text Layer ห้ามชดเชย Critical Document ที่มองไม่เห็น | AMBIGUOUS (ขอบเขต) | หลักการตรงกันทุกเอกสาร; แต่ R Control 5 ระบุ “โดยเฉพาะหนังสือยืนยัน” และ M§37 ระบุ 7 ประเภท → **รายการ Critical Document ไม่ตรงกัน** และไม่มีนิยามว่า “เห็นครบ” ตรวจอย่างไร (คน/Vision) | ใช้รายการ M§37 (ซึ่งครอบ R); ผลตรวจภาพต้องบันทึก `visible_on_rendered_page` ต่อ Element | ไม่ (ยืนยันรายการเอกสาร) |

### A.2 ประเด็นอื่นที่พบ

| ID | ประเด็น | ประเภท | ที่พบ | การแก้ใน Spec นี้ | ขวาง Freeze? |
|---|---|---|---|---|---|
| A-06 | คำศัพท์สถานะ 3 ชุด | CONFLICT | R§26: 9 สถานะ Control; M§38: 5 State; V: 5 State + `reason_code` | 5 Case State + Control Status + `reason_code` (ข้อ 3) | ไม่ |
| A-07 | ขอบเขตของ `FAIL` | CONFLICT | R§26: FAIL เมื่อพิสูจน์ได้ว่าไม่เข้า Eligibility/แก้ด้วยเอกสารไม่ได้; M§39: FAIL สำหรับ Wrong borrower/LG, NPL seasoning, Demand waiting, Filing window, ratio ผิด, calculation ผิด; M§14: “HOLD / FAIL ตามข้อเท็จจริง” ไม่นิยาม | Config `fail_scope` (ค่าเริ่มต้น ELIGIBILITY_ONLY) | **ใช่** |
| A-08 | ลำดับความสำคัญของสถานะระดับเคส | AMBIGUOUS | ไม่มีเอกสารบอกว่ามีทั้ง Support และ Observation → เคสเป็นอะไร; `NOT_TESTABLE` ของ Hard Control ทำให้ HOLD หรือไม่ | Observation ชนะ Support; `NOT_TESTABLE` → HOLD | ไม่ (ยืนยัน) |
| A-09 | NPL Seasoning 6 เดือนเป็นกฎทั่วไปหรือไม่ | CONFLICT | M§4.1 เป็นเงื่อนไข (ข); R§32: หลักฐานไม่แข็งพอ → อย่า Hardcode | Rule POL-NPL-002 + config `npl_seasoning_months`; รอเทียบต้นฉบับหลักเกณฑ์ | **ใช่** |
| A-10 | 7-Month Exception ขอบเขต + วันเริ่มนับ | CONFLICT / AMBIGUOUS | M§5 ให้เป็น Route; R§32: ยังไม่แน่ใจว่าทุกกรณีหรือบาง workflow; “วันที่ติดต่อไม่ได้/วันแรกที่ตกลงไม่ได้” ไม่ตรงกับฟิลด์ใดในหน้าจอ (และห้ามใช้ “วันที่ติดตาม” แทนวันปรับโครงสร้าง — L-14) | `enable_7m_exception` ปิดเป็นค่าเริ่มต้น | **ใช่** |
| A-11 | Coverage Ratio นอก Small Biz | CONFLICT | R§22/§32: ต้องเป็น Matrix ห้าม Hardcode; M§7: “Small Biz และกลุ่ม SMEs หลัก” = 70/100, Start up = 100 | Matrix มี Small Biz (LOCKED), Start up (OFFICIAL M§7); SMEs อื่น = `NO_RULE_FOR_PRODUCT` | **ใช่** (ถ้าจะรองรับ Smart*) |
| A-12 | วิธีนับอายุ LG 5 ปี และวิธีนับเดือน/ปี | AMBIGUOUS | R§32; M§25 “นิยามธุรกิจที่ บสย. ล็อก”; “พ้น 3/6/7/9 เดือน”, “1 เดือน” นับรวมวันตั้งต้นหรือไม่, สิ้นเดือนอย่างไร | Config `lg_age_basis`, `date_arithmetic` | **ใช่** |
| A-13 | Rule ID ชนกัน / พิมพ์ผิด | SOURCE-ERROR | M§41 `PGS10-RST-001` = Restructure Requirement แต่ต้นแบบโค้ดใช้เป็น Restructure Date; ตัวอย่าง JSON ใน M§29 ใช้ `PGS10-DEF-002` กับ “Default Date vs Last Actual Payment” ทั้งที่ M§41 กำหนดเป็น `DEF-001`; R มี ID เฉพาะ Control 1 | ใช้ ID ตามข้อ 5 (`RST-003` = Date Evidence); โค้ดต้องเปลี่ยนตาม | ไม่ |
| A-14 | Transaction taxonomy + นิยาม “Payment” | CONFLICT / AMBIGUOUS | R§9: PAYMENT/INTEREST_ACCRUAL/ADJUSTMENT/REVERSAL/FEE/PRINCIPAL_ADJUSTMENT/UNKNOWN; M§11: PAYMENT/DRAWDOWN/INTEREST_ACCRUAL/FEE/ADJUSTMENT/OTHER. M§11 นับเป็น Payment เมื่อ “ลดภาระหนี้/เงินต้น” ส่วน R§9 นับเมื่อมี Cash Receipt จริง → เงินรับที่ตัดดอกเบี้ยอย่างเดียวนับหรือไม่? Code ธนาคารต้องมี Mapping (R§32) | Union ของทั้งสอง (`OTHER`→`UNKNOWN`); นิยาม Payment = Cash Receipt จริง (R) ; ประเด็นตัดดอกเบี้ยอย่างเดียวรอตัดสิน | **ใช่** |
| A-15 | “UNKNOWN ใกล้วันผิดนัด” | AMBIGUOUS | R§9 ไม่นิยามความใกล้ | ต้นแบบ: UNKNOWN ใด ๆ หลัง PAYMENT ล่าสุด → HOLD (เข้มกว่า) | ไม่ |
| A-16 | รายการภาพของหนังสือยืนยัน 12 vs 10 | CONFLICT | R Control 5: 12 รายการ; M§15: 10 รายการ (ไม่มี “ข้อความว่าชำระไม่เป็นไปตามเงื่อนไข” และรวมชื่อ/เลขอ้างอิง) | ใช้ 12 รายการ (ชุดใหญ่กว่า) | ไม่ |
| A-17 | Postal: ประเภทลายมือชื่อ + Tracking | CONFLICT (ระดับความเข้ม) | R Control 14 ไม่ระบุว่าลายเซ็นแบบใดไม่พอ; M§21 ระบุชื่อตัวบรรจง/เจ้าหน้าที่ไปรษณีย์อย่างเดียวไม่พอ; Tracking linkage มีเฉพาะ M§23 | ใช้ M§21 + linkage (ตรวจเมื่อมีทั้งสองเลข) | ไม่ |
| A-18 | Address: “ที่อยู่ล่าสุด” vs “ที่อยู่ใดก็ได้ในเอกสาร” | CONFLICT | R Control 15: มีหลักฐานแจ้งเปลี่ยน → ใช้ล่าสุด; M§22: ที่อยู่ใดก็ได้ใน PDF. ไม่มีนิยามวันที่มีผลของการเปลี่ยนที่อยู่เทียบกับวันส่งหนังสือ | ใช้ R (เข้มกว่า); ประเด็นวันที่มีผลรอตัดสิน | ไม่ |
| A-19 | ลำดับ Pipeline 3 ฉบับไม่ตรงกัน | CONFLICT (เล็กน้อย) | R§31, M§42, V ต่างกันที่ตำแหน่ง Contract/Doc Completeness/Historical/Coverage และมี LG/NPL เฉพาะ M, V | ใช้ลำดับข้อ 4 (ไม่ Short-circuit จึงไม่กระทบผล) | ไม่ |
| A-20 | Historical Debt เมื่อ Trigger ไม่ใช่ Demand Letter | AMBIGUOUS | ช่องหน้าจอครอบคลุม “วันฟ้อง / พิทักษ์ทรัพย์เด็ดขาด”; R, M มี Rule เฉพาะ Demand | ตรวจเฉพาะ Demand; Trigger อื่น → `NOT_TESTABLE` | ไม่ |
| A-21 | Demand waiting / Filing window: นับจากวันใด | AMBIGUOUS | M§24 “นับจากวันที่มีหนังสือบอกกล่าว” — วันที่ในหนังสือ หรือวันที่ผู้รับได้รับ; `claim_eligibility_date` ไม่นิยาม; M§25 นิยามวันนับ | Config; ค่าเริ่มต้น = วันที่ในหนังสือ | **ใช่** |
| A-22 | รูปแบบวันที่ พ.ศ./ค.ศ. | SOURCE-ERROR | ตัวอย่าง JSON ใน M§29 เก็บ `"2568-04-15"` (ปี พ.ศ. ในรูป ISO) | Data Dictionary: เก็บภายในเป็น ISO 8601 ค.ศ.; รับ/แสดง พ.ศ.; ห้ามใช้ปี พ.ศ. ในสตริง ISO | ไม่ |
| A-23 | Start up = รูปแบบ 2; เงื่อนไข Claim ของ Start up | AMBIGUOUS | R§4 “รูปแบบ 2 = 100,000” ไม่บอกชื่อ; M§2 “Start up = 100,000”; M§3–6 ไม่มีเงื่อนไข Claim ของ Start up | ถือ Start up = รูปแบบ 2 (อนุมานจากวงเงินตรงกัน); POL-CLM-003 = OPEN | ไม่ (ถ้าไม่รับ Start up) |
| A-24 | นิยาม `current_guarantee_obligation` และ “other applicable amounts” ใน Total | AMBIGUOUS | R§18/§19 ไม่ระบุแหล่งที่มา/องค์ประกอบ | Data Dictionary ระบุเป็นฟิลด์ที่ต้องยืนยัน | ไม่ |
| A-25 | Master Checklist เดิม 14 จุด vs 22 Controls; เคสอยู่หลายกลุ่ม | AMBIGUOUS | R§ท้าย: ไม่ย้อนใช้ 14 จุด; R§30: LG 66-067410, 66-029105, 67-037131, 66-073840 ฯลฯ อยู่ได้หลายกลุ่ม (เช่นทั้ง Postal และ Historical) | ใช้ 22+6 Controls; Golden Tests แท็กหลาย Control ต่อเคส | ไม่ |
| A-26 | ตัวเลขของเคสจริงใน Golden Tests ไม่มี | AMBIGUOUS | R§30 ให้เฉพาะเลข LG + กลุ่มผลลัพธ์ ไม่มี Input/ตัวเลข | Golden Tests แยก `unit_cases` (ตัวเลขจากเอกสาร) กับ `case_fixtures` (LG-only รอข้อมูล) | ใช่สำหรับ Regression จริง |
| A-27 | `PGS10-LG-001` ไม่มี Logic | AMBIGUOUS | M§41 ให้ชื่อเท่านั้น | Logic ถอดจาก POL-LG-001 (ต้องยืนยัน) | ไม่ |
| A-28 | ขอบเขต Page Completeness | AMBIGUOUS | R§7/M§10 ใช้กับหนังสืออนุมัติ/สัญญา; ไม่ระบุว่าเอกสารหลายหน้าอื่น (Statement, สัญญาปรับโครงสร้าง) ต้อง “n of X” ด้วยหรือไม่ | ใช้เฉพาะอนุมัติ/สัญญา | ไม่ |

### A.3 สิ่งที่ต้องแก้ใน Master Audit ก่อน Freeze

1. **M§27:** ตัดถ้อยคำ “Data Mapping Error / Observation หากไม่กระทบ Claim Base” → ใส่ L-03 (`HOLD` / `HISTORICAL_BALANCE_MISMATCH`)
2. **M§19:** ระบุ “Statement Principal **as of Demand Date**” (ให้ตรงกับ M§20)
3. **M§26 / §43.3:** เพิ่มพฤติกรรม `OBSERVATION_CANDIDATE` และค่าเริ่มต้น “ปิด”
4. **M§29:** แก้ Rule ID ในตัวอย่าง JSON (`DEF-002` → `DEF-001`) และรูปแบบวันที่ (ค.ศ. ISO)
5. **M§38:** เพิ่มตาราง `reason_code` และขอบเขต `FAIL`
6. **M§15 ↔ R Control 5:** ทำรายการภาพหนังสือยืนยันให้เหลือชุดเดียว (12 รายการ)
7. **R§15:** แก้ “Statement Principal” เป็น “as of Demand Date”; **R§19 (Control 16):** เปลี่ยน 0.01 เป็น configurable

## ภาคผนวก B · ตารางอ้างอิง Control ↔ ที่มา

| Rule ID | R# | M§ | ประเภท |
|---|---|---|---|
| ELIG-001 | 1 | 2 | POL |
| ID-001 | 2 | 8 | OPS |
| CONTRACT-001 | 3 | 9 | OPS |
| DOC-001 | 4 | 10 | OPS |
| VIS-001 | 5 | 15, 37 | OPS |
| LG-001 | — | 41 | POL |
| NPL-001 | — | 3.1, 4.1, 35 | POL |
| STM-001 | 6 | 11, 12 | OPS |
| DEF-001 | 7 | 13 | OPS |
| DEF-002 | 8 | 14, 16 | OPS |
| FUP-001 | 9 | 17 | OPS |
| RST-001 | — | 4.2, 5, 6 | POL |
| RST-002 | — | 5 | POL |
| RST-003 | 10 | 18 | OPS |
| DMD-001 | 11 | 19 | OPS |
| DMD-002 | 12 | 19, 20 | OPS |
| DMD-003 | — | 24 | POL |
| HIS-001 | 13 | 27 | OPS |
| PST-001 | 14 | 21, 23 | OPS |
| PST-002 | 15 | 22 | OPS |
| CUR-001 | 16 | 26 | OPS |
| STM-002 | 17 | — | OPS |
| CLM-001 | — | 25 | POL |
| CLM-002 | 19 | 7 | POL |
| CLM-003 | 18 | 28 | POL |
| CLM-004 | 20 | 29 | POL |
| CAP-001 | 21 | 30–32 | POL |
| TIME-001 | 22 | 36 | OPS |

## ภาคผนวก C · เนื้อหาใน Master Audit ที่ **ไม่นับเป็นกฎตัดสิน** (System Design — Non-normative)

สถาปัตยกรรม (Rule/Document/Calculation/Audit Engine, Web App, Database, File Storage), หน้าจอ 5 หน้า / Dashboard, Role Maker/Checker/Supervisor, Phase 1–5, API endpoints (`POST /pgs10/cases` ฯลฯ), ตัวอย่าง Timeline UI, ตัวอย่างเคสสาธิต (LG 67-036222 / 67-025162) — ใช้ประกอบการออกแบบเท่านั้น ห้ามอ้างเป็นเหตุผลตัดสิน Claim.
รายการนี้ **จำเป็นต่อ Audit Trail** แต่เป็นข้อกำหนดของระบบ: ผู้ Override ต้องบันทึก ใคร / เวลา / ค่าเดิม→ค่าใหม่ / เหตุผล / หน้าหลักฐาน (M§“Role ของเจ้าหน้าที่”) — ให้ย้ายไปเอกสาร System Requirements แยกต่างหาก
