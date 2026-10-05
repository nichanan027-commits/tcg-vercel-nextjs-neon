# 02 · PGS 10 Operational Audit Rules — v1.2.0-candidate.3 (NOT FROZEN)

**Ruleset:** PGS10 1.2.0-candidate.3 · กฎตรวจเชิงปฏิบัติการ (เอกสาร / Statement / ไปรษณีย์ / ภาพ / Cross-document) — **ไม่แทนที่นโยบายใน 01**; ไม่มี UI/System design
ID ทั้งหมดเป็น Canonical (Master Audit §41); ID เก่าต้องอ้างเป็น `id@version` (ดู `05_PGS10_RULE_REGISTRY.json`)

## 0. Locked rules ที่ใช้ทุก Control
| # | กฎ | ที่มา |
|---|---|---|
| L-01 | ภาพจริงที่มองเห็น > OCR/Text Layer; OCR ทดแทน Critical Document ที่มองไม่เห็นไม่ได้ | R§2, R§8, DEC-13, DEC-23 |
| L-02 | `default_date >= last_actual_payment_date`; `<` → DEF-002 (ไม่ Fail ทันที) | R§10, M§13 |
| L-03 | Historical mismatch (ต้น/ดอก/รวม ค่าใดค่าหนึ่ง) → HOLD `HISTORICAL_BALANCE_MISMATCH` ไม่ว่ากระทบ Claim Base หรือไม่ | DEC-07 |
| L-04 | Demand Principal เทียบ `principal_as_of_demand_date`; ห้ามใช้ 'ยอดล่าสุดเท่ากันพอดี' | DEC-08, DEC-16 |
| L-05 | tolerance ปิด; ส่วนต่าง → `NUMERIC_VARIANCE` + OBSERVATION_CANDIDATE; ห้าม tolerance กับ principal/claim_base/coverage/claim_amount/claim_max/historical | DEC-09, DEC-18 |
| L-06 | `default_date` ≠ `npl_date`; NPL anchor = `lg_issue_date` (APPROVED_OPERATIONAL, ไม่ใช่ OFFICIAL); `guarantee_effective_date` เป็น field แยก | DEC-01, DEC-29 |
| L-07 | ห้ามเดา / ห้ามแก้ข้อมูลต้นทาง / ห้าม auto-correct หรือ merge เลข LG — แสดงค่าทั้งสองด้านและหลักฐานทั้งสองแหล่ง | DEC-03 |
| L-08 | Auto-pass เฉพาะ non-semantic format normalization ที่เป็น field-specific (FORMAT_NORMALIZED) | DEC-15 |
| L-09 | Decimal (สตางค์) + ROUND_HALF_UP; คำนวณ Claim ใหม่เองไม่เชื่อหน้าจอ | R§23 |
| L-10 | PDF Page ≠ Document Page; วันที่ติดตาม ≠ วันปรับโครงสร้าง | R§7, R§12 |
| L-11 | HOLD ≠ FAIL; FAIL = policy_disqualifying ∧ ¬remediable_by_document ∧ evidence_verified (ไม่ผูกกับ prefix ของ reason_code) | DEC-19, DEC-31 |
| L-12 | กฎขัดกัน/ตัดสินไม่ได้ → HOLD `RULE_VERSION_CONFLICT` และรายงาน Conflict | V, DEC-28 |

## 1. Status model
- `case_status` ∈ PASS · PASS_WITH_SUPPORT · PASS_WITH_OBSERVATION · HOLD · FAIL — **ห้ามค่าอื่น และห้ามสร้าง `HOLD_*`**; รายละเอียดอยู่ที่ `reason_code`
- `control_status` ∈ PASS · PASS_WITH_SUPPORT · OBSERVATION · HOLD · FAIL · NOT_APPLICABLE · NOT_TESTABLE
- `review_flag` ∈ OBSERVATION_CANDIDATE · FORMAT_NORMALIZED; `support_code` = เหตุที่ Control ผ่านด้วย support (**ไม่ใช่ reason_code**); `support_used` (boolean ระดับเคส); `review_stage` ∈ PRE_REVIEW · FINAL_APPROVAL
- ลำดับรวมผล: (1) มี FAIL → **FAIL** (2) มี HOLD หรือ NOT_TESTABLE ของ Control ที่ REQUIRED_HARD ใน stage นั้น → **HOLD** (3) มี OBSERVATION หรือ FORMAT_NORMALIZED → **PASS_WITH_OBSERVATION** (+`support_used=true` ถ้ามี Support) (4) มี PASS_WITH_SUPPORT → **PASS_WITH_SUPPORT** (5) มิฉะนั้น **PASS**
- NOT_TESTABLE ของ OPTIONAL/CONDITIONAL ที่ไม่ applicable ไม่กระทบเคส

## 2. ผลลัพธ์ต่อ Control และ Provenance
`rule_id, control_status, reason_code | support_code, review_flag, expected_value, observed_value, evidence[{document_type, page, page_type: document_page|pdf_page}], required_action, rule_version` · ทุกฟิลด์เก็บ `raw_value`/`normalized_value`, `source_document`, `source_page`, `visible_on_rendered_page`, `extraction_method`, `confidence`

## 3. Pipeline (ไม่ Short-circuit — ตรวจทุก Control ที่ Applicable)
Program → Identity → Document Completeness → Visual Completeness → Contract → LG/NPL → Transaction Classification → Last Actual Payment → Statement Cut-off → Default → Post-Default Exception → Tracking → Restructure (Route / Exception / Date) → Demand → Historical Debt → Postal → Address → Current Debt → Filing Window → Coverage → Claim Base → Claim Amount → Claim Max → Timeline → Final
พึ่งพา: Address → Postal · Transaction → Last Payment → Default → Exception → Timeline · Claim Base + Coverage → Claim Amount → Claim Max

## 4. Controls (33)

### PGS10-ELIG-001 · Project / Product Eligibility
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#1, M§2 · **Decisions:** DEC-12, DEC-19, DEC-27, DEC-31 · **Legacy aliases:** `PGS10-POL-001@v1.1.0`, `PGS10-POL-003@v1.1.0`
**Inputs:** `pgs_phase`, `pgs_revision`, `product`, `loan_is_new_business`, `loan_purpose_business`, `loan_is_hire_purchase_or_leasing`, `total_exposure_per_borrower`, `guarantee_amount_this_transaction`
**Logic:**
- ต้องระบุ PGS ระยะ / รุ่นปรับปรุง / Product ได้ชัด (ระยะ 10, ปรับปรุงครั้งที่ 5)
- เงื่อนไข: สินเชื่อใหม่ + เพื่อวัตถุประสงค์ธุรกิจ + ไม่ใช่ประเภทต้องห้าม (Hire Purchase / Leasing)
- วงเงิน: ค้ำต่อครั้ง ≥ PRM-002; รวมต่อรายภายใต้โครงการ ≤ PRM-003; Small Biz ≤ PRM-004, Start up ≤ PRM-005 (รวมทุกผู้ให้สินเชื่อ)
- FAIL เฉพาะพิสูจน์ได้ว่าขาดคุณสมบัติตามนโยบายและแก้ด้วยเอกสารเพิ่มไม่ได้ (DEC-19); ข้อมูลไม่ครบ/ยังไม่ยืนยัน → HOLD
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-008` (ASSUMPTION): ยังไม่ทราบวัตถุประสงค์ธุรกิจ → HOLD → `ELIGIBILITY_UNCONFIRMED`
**Evidence:** LG, หนังสืออนุมัติ/สัญญา, ข้อมูลวงเงินรวมต่อราย

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `ELIGIBILITY_EXPOSURE_LIMIT_EXCEEDED` | FAIL | วงเงินรวมต่อรายเกินเพดาน | CANDIDATE |
| `ELIGIBILITY_GUARANTEE_BELOW_MINIMUM` | FAIL | วงเงินค้ำต่อครั้งต่ำกว่า 10,000 บาท | CANDIDATE |
| `ELIGIBILITY_NOT_BUSINESS_PURPOSE` | FAIL | สินเชื่อไม่ใช่เพื่อวัตถุประสงค์ธุรกิจ (DEC-12) | APPROVED_BY_OWNER |
| `ELIGIBILITY_NOT_NEW_BUSINESS_LOAN` | FAIL | ไม่ใช่สินเชื่อใหม่ | CANDIDATE |
| `ELIGIBILITY_NOT_PGS10` | FAIL | ไม่ใช่ PGS ระยะที่ 10 | CANDIDATE |
| `ELIGIBILITY_PRODUCT_EXCLUDED` | FAIL | Product ไม่อยู่ในกลุ่มที่เข้าเกณฑ์ | CANDIDATE |
| `ELIGIBILITY_PROHIBITED_CREDIT_TYPE` | FAIL | สินเชื่อเป็นประเภทที่นโยบายไม่อนุญาต (Hire Purchase / Leasing) — แยกจาก NOT_BUSINESS_PURPOSE | APPROVED_BY_OWNER |
| `ELIGIBILITY_UNCONFIRMED` | HOLD | ยังไม่ยืนยันคุณสมบัติบางข้อ | CANDIDATE |
| `PGS_REVISION_MISMATCH` | HOLD | รุ่นปรับปรุงไม่ใช่ครั้งที่ 5 | CANDIDATE |
| `PRODUCT_UNKNOWN` | HOLD | ระบุ Product ไม่ได้ | CANDIDATE |

### PGS10-ID-001 · Identity Integrity
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#2, M§8 · **Decisions:** DEC-03, DEC-12, DEC-15, DEC-33 · **Legacy aliases:** `PGS10-ID-001@v1.1.0`
**Inputs:** `fi_id`, `fi_normalization_profile`, `lg_no`, `borrower_name`, `loan_account_no`, `contract_no`, `lender_branch`, `loan_limit`, `lg_issue_date`
**Logic:**
- ต้องเป็นลูกหนี้ / LG / บัญชีเดียวกันทั้งชุดเอกสาร
- **Auto-normalize ได้เฉพาะ non-semantic format และเป็น field-specific (DEC-15):** LG ตัดขีด/ช่องว่าง (`67-026936` = `67026936`); ตัวเลขไทย↔อารบิก → `control_status=PASS`, `review_flag=FORMAT_NORMALIZED`; เก็บ `raw_value`, `normalized_value`, `normalization_rule`, `fi_profile`
- **Leading Zero (DEC-33):** ทำได้เฉพาะ `loan_account_no` และเฉพาะ FI ที่มี normalization profile (`FI_CONFIGURABLE`, PRM-050) — FI ไม่มี profile → HOLD `VERIFY_REFERENCE_MAPPING`; **LG / customer / contract ID ห้ามตัด 0 นำหน้า** จนมี evidence ว่าเป็น padding
- ต่างที่ตัวเลขภายใน (`208023002116` vs `208023002135`) → HOLD `VERIFY_REFERENCE_MAPPING` (ห้ามแก้เอง)
- ชื่อ / วงเงิน / วันที่ LG / เลข LG ไม่ตรง → HOLD `IDENTITY_MISMATCH` (ไม่ใช่ FAIL — DEC-19)
- **ห้ามแก้/รวมเลข LG อัตโนมัติ** (DEC-03): `66-037410` และ `66-067410` เป็นคนละเคส
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-050` (OPERATIONAL_LOCKED_SCOPED): FI ไม่มี profile หรือ field ไม่อยู่ใน eligible_fields → ต่าง Leading Zero = HOLD → `VERIFY_REFERENCE_MAPPING`
**Evidence:** ทุกเอกสารที่เทียบ (บันทึก raw_value และ normalized_value)

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `FORMAT_VARIANCE` | PASS + flag `FORMAT_NORMALIZED` | ต่างเฉพาะรูปแบบที่ไม่มีนัยเชิงความหมาย: LG ตัดขีด/ช่องว่าง, ตัวเลขไทย↔อารบิก, และ Leading Zero ของ `loan_account_no` เฉพาะ FI ที่มี normalization profile — เก็บ raw_value/normalized_value/normalization_rule/fi_profile | APPROVED_BY_OWNER |
| `IDENTIFIER_LINKAGE_UNRESOLVED` | HOLD | Identifier ในหนังสือ/เอกสารไม่ลิงก์กลับเคสได้ | CANDIDATE |
| `IDENTITY_MISMATCH` | HOLD | LG/ชื่อ/วงเงิน/วันที่ LG ไม่ตรงกันข้ามเอกสาร (ห้ามแก้เลขเอง — DEC-03) | CANDIDATE |
| `VERIFY_REFERENCE_MAPPING` | HOLD | เลขบัญชี/สัญญาต่างที่ตัวเลขภายใน ต้องพิสูจน์ Mapping | CANDIDATE |

### PGS10-DOC-001 · Approval / Contract Page Completeness
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ (มีเอกสารอนุมัติ/สัญญา) · **ที่มา:** R#4, M§10 · **Decisions:** — · **Legacy aliases:** `PGS10-DOC-001@v1.1.0`
**Inputs:** `approval_total_pages`, `approval_document_pages_found`, `approval_next_page_is_other_document`, `approval_pages_unreadable`, `pdf_blank_pages`
**Logic:**
- ถ้าเอกสารระบุ `1 of X` ต้องพบ `1 of X … X of X` ครบและเรียงต่อเนื่อง — นับ 'หน้าเอกสาร' ไม่ใช่หน้า PDF; หน้า PDF ว่างที่คั่นไม่ทำให้ขาด
- ขาดลำดับ → HOLD `APPROVAL_DOCUMENT_INCOMPLETE` (detail: PAGE_SEQUENCE_GAP); หน้าถัดจาก 1 of X เป็นเอกสารอื่น (detail: DOCUMENT_TRUNCATED); หน้าที่ควรมีแต่ Crop/เสีย (detail: PAGE_UNREADABLE)
- ขอบเขต: หนังสืออนุมัติ / สัญญา (A-28)
**Evidence:** หนังสืออนุมัติ/สัญญา (หน้าเอกสาร n of X)

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `APPROVAL_DOCUMENT_INCOMPLETE` | HOLD | เอกสารอนุมัติ/สัญญาไม่ครบ | CANDIDATE |

### PGS10-VIS-001 · Confirmation Letter Visual Completeness
**Requirement:** CONDITIONAL · **ใช้เมื่อ:** DEF-002 ต้องใช้หนังสือยืนยัน (default < last payment) หรือมีหนังสือยืนยันในเคส · **ที่มา:** R#5, M§15, M§41 · **Decisions:** DEC-13, DEC-23 · **Legacy aliases:** `PGS10-VIS-001@v1.1.0`, `PGS10-VIS-001@draft1.0`
**Inputs:** `exception_letter_present`, `confirmation_visual_elements`, `confirmation_letter_total_pages`, `confirmation_letter_pages_found`, `text_layer_reads_header`
**Logic:**
- ใช้เมื่อมีหนังสือยืนยันการชำระหลังวันผิดนัด (หรือ DEF-002 ต้องการ)
- ต้อง**เห็นจริงในภาพหน้าเอกสาร** 11 Atomic elements: (1) Header/ชื่อหรือเครื่องหมาย FI (2) วันที่หนังสือ (3) เรื่อง (4) ผู้รับ (5) ผู้กู้ + Account/LG/Case Reference (6) Original Default Date (7) Post-default Payment วันที่ + จำนวน (8) ข้อความว่าชำระบางส่วน/ไม่เป็นไปตามเงื่อนไข (9) ข้อความยืนยันว่า Original Default Date ยังคงเดิม (10) ลายเซ็น (11) ชื่อ + ตำแหน่ง/อำนาจผู้ลงนาม
- `multi_page_document_continuity` = REQUIRED: ถ้าหนังสือหลายหน้า ต้องครบทุกหน้าตามลำดับ
- OCR/Text Layer อ่านได้แต่ภาพไม่มี → HOLD `CONFIRMATION_LETTER_VISUALLY_INCOMPLETE`; ไม่มีภาพต้นฉบับให้ตรวจ → NOT_TESTABLE `VISUAL_RECHECK_REQUIRED`
- Regression (Negative): LG 67-026936 (DEC-13)
**Evidence:** ภาพหน้าเอกสาร (Rendered Page) ของหนังสือยืนยัน

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CONFIRMATION_LETTER_VISUALLY_INCOMPLETE` | HOLD | หนังสือยืนยันการชำระหลังผิดนัดไม่สมบูรณ์ทางภาพ | CANDIDATE |
| `VISUAL_RECHECK_REQUIRED` | NOT_TESTABLE | ยังไม่มีภาพต้นฉบับให้ตรวจ/Render ใหม่ตามกฎ Visual Completeness | CANDIDATE |

### PGS10-VIS-002 · Critical Evidence Visual Authority
**Requirement:** CONDITIONAL · **ใช้เมื่อ:** มีเอกสาร Critical ในเคส · **ที่มา:** M§37 · **Decisions:** DEC-14 · **Legacy aliases:** `PGS10-VIS-002@v1.1.0`, `PGS10-VIS-001@draft1.0`
**Inputs:** `critical_document_visual_check`
**Logic:**
- Critical Document อื่นต้องเห็นจริงในภาพ: หนังสืออนุมัติ (ลำดับหน้า), หนังสือบอกกล่าว (หัว/วันที่/ผู้กู้/ยอด/ลายเซ็น), รายงานติดตาม (รายการ/วันที่/ผล), ใบตอบรับ (วันที่/ลายเซ็น), ซองตีกลับ (สถานะ + ที่อยู่), เอกสารปรับโครงสร้าง (วันที่/คู่สัญญา/ลายเซ็น) — รายการ 7 ประเภทของ M§37 เป็น Safe-Hold (PRM-038)
- Text extraction ใช้ค้นตำแหน่งได้ แต่ทดแทนช่องที่มองไม่เห็นไม่ได้ → HOLD `DOCUMENT_VISUALLY_INCOMPLETE`
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-038` (OPEN): ใช้ 7 ประเภทของ M§37 เป็น Critical ทั้งหมด (superset) → `DOCUMENT_VISUALLY_INCOMPLETE`
**Evidence:** ภาพหน้าเอกสาร Critical

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `DOCUMENT_VISUALLY_INCOMPLETE` | HOLD | Critical Document อื่นไม่ครบในภาพจริง | CANDIDATE |
| `VISUAL_RECHECK_REQUIRED` | NOT_TESTABLE | ยังไม่มีภาพต้นฉบับให้ตรวจ/Render ใหม่ตามกฎ Visual Completeness | CANDIDATE |

### PGS10-CONTRACT-001 · Contract / Approval Date
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ; ฐานวันที่ทำสัญญาใช้ได้เฉพาะ Thai Credit revolving-loan · **ที่มา:** R#3, M§9 · **Decisions:** DEC-10 · **Legacy aliases:** `PGS10-CON-001@v1.1.0`
**Inputs:** `fi_id`, `product_family`, `approval_date`, `demand_contract_date`
**Logic:**
- **ใช้ได้เฉพาะ Thai Credit revolving-loan (DEC-10):** `approval_date` = วันที่ทำสัญญาที่ใช้เป็นฐานตรวจ และต้อง `== demand_contract_date`
- ไม่ตรง → HOLD `CONTRACT_DATE_MISMATCH`; FI / product_family อื่นที่ยังไม่มีกฎ → HOLD `CONTRACT_DATE_BASIS_UNDEFINED`
**Evidence:** หนังสือแจ้งผลอนุมัติ + หนังสือบอกกล่าว

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CONTRACT_DATE_BASIS_UNDEFINED` | HOLD | FI/Product นี้ยังไม่มีกฎกำหนดวันที่ทำสัญญา (กฎ Approval=Contract ใช้เฉพาะ Thai Credit revolving-loan — DEC-10) | APPROVED_BY_OWNER |
| `CONTRACT_DATE_MISMATCH` | HOLD | วันที่อนุมัติ ≠ วันที่สัญญาที่อ้างในหนังสือบอกกล่าว | CANDIDATE |

### PGS10-LG-001 · Guarantee Validity
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** M§41 (ชื่อเท่านั้น) · **Decisions:** — · **Legacy aliases:** `PGS10-POL-002@v1.1.0`
**Inputs:** `lg_no`, `lg_issue_date`, `final_lg_expiry_date`, `guarantee_fee_paid_continuously`
**Logic:**
- Logic ถอดจากนโยบาย (A-27 — ต้องยืนยัน): มีเลข LG / วันที่ออก / วันสิ้นอายุ; อายุ LG ≤ PRM-006 (10 ปี); ชำระค่าธรรมเนียมค้ำประกันต่อเนื่อง
- ผล: HOLD `LG_DATA_MISSING` / `LG_TENOR_EXCEEDED` / `LG_FEE_NOT_CONTINUOUS`
**Evidence:** LG

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `LG_DATA_MISSING` | HOLD | ขาดข้อมูล LG | CANDIDATE |
| `LG_FEE_NOT_CONTINUOUS` | HOLD | ชำระค่าธรรมเนียมค้ำประกันไม่ต่อเนื่อง | CANDIDATE |
| `LG_TENOR_EXCEEDED` | HOLD | อายุ LG เกิน 10 ปี | CANDIDATE |

### PGS10-NPL-001 · NPL Date & Seasoning
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** M§3.1, M§4.1 · **Decisions:** DEC-01, DEC-29, DEC-31 · **Legacy aliases:** `PGS10-NPL-001@v1.1.0`, `PGS10-NPL-002@v1.1.0`
**Inputs:** `product`, `npl_date`, `npl_date_verified`, `lg_issue_date`, `guarantee_effective_date`, `default_date`
**Logic:**
- `npl_date` เป็นฟิลด์จากข้อมูล FI ที่ verify แล้ว (`npl_date_verified`) **ห้าม derive จาก `default_date`** (`allow_default_date_as_npl_date=false`) — ไม่มี/ยังไม่ verify → HOLD `NPL_DATE_MISSING`
- seasoning: Small Biz และ Start up ≥ 6 เดือนปฏิทิน (เงื่อนไข (ข)); SMEs (Smart Biz/One/Green/Plus & Top up) ≥ 9 เดือนปฏิทิน (เงื่อนไข (ก)); เงื่อนไข: `npl_date ≥ add_calendar_months(anchor, n)`
- **anchor = `lg_issue_date` (APPROVED_OPERATIONAL — ไม่ใช่ OFFICIAL; DEC-29)**; `guarantee_effective_date` เก็บแยกได้เมื่อมี source จริงแต่ไม่ใช้เป็น anchor; เปลี่ยน Mapping ได้โดยไม่แก้ Rule ID
- ไม่มี `lg_issue_date` หรือพิสูจน์ไม่ได้ → HOLD `NPL_ANCHOR_DATE_UNDEFINED` (defensive HOLD)
- **FAIL:** `npl_date` verified + anchor verified + Policy ครบ แต่ยังไม่พ้น seasoning → **FAIL `NPL_SEASONING_NOT_MET`** (policy_disqualifying ∧ แก้ด้วยเอกสารเพิ่มไม่ได้ ∧ evidence_verified — DEC-31)
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-013` (APPROVED_OPERATIONAL): ไม่มี lg_issue_date หรือพิสูจน์ไม่ได้ → NPL-001 = HOLD → `NPL_ANCHOR_DATE_UNDEFINED`
- `PRM-028` (OPEN): ใช้ CALENDAR_MONTH_CLAMP_END_OF_MONTH (ไม่นับวันตั้งต้น); ถ้าผลต่างกันเมื่อเปลี่ยนเป็นวิธีอื่น (นับรวมวัน/ rollover) → HOLD → `POLICY_PARAMETER_UNRESOLVED`
**Evidence:** ข้อมูล FI (npl_date), LG/ข้อมูลวันที่ค้ำประกัน

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `NPL_ANCHOR_DATE_UNDEFINED` | HOLD | ไม่มี lg_issue_date (anchor ที่อนุมัติ) หรือพิสูจน์ไม่ได้ จึงคำนวณ NPL seasoning ไม่ได้ — defensive HOLD | APPROVED_BY_OWNER |
| `NPL_DATE_MISSING` | HOLD | ไม่มี npl_date จากข้อมูล FI หรือยังไม่ผ่านการ verify (ห้าม derive จาก default_date) | APPROVED_BY_OWNER |
| `NPL_SEASONING_NOT_MET` | FAIL | npl_date + anchor + Policy verify ครบแล้ว และ npl_date ยังไม่พ้นระยะ seasoning — Proven Policy Ineligibility (DEC-31) | CANDIDATE |

### PGS10-TXN-001 · Transaction Classification
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ (มี Statement) · **ที่มา:** R#6, M§11 · **Decisions:** DEC-02, DEC-12, DEC-14 · **Legacy aliases:** `PGS10-STM-001@v1.1.0`, `PGS10-STM-001@draft1.0`
**Inputs:** `bank_id`, `transactions`
**Logic:**
- จำแนกทุกรายการ Statement เป็น PAYMENT / DRAWDOWN / INTEREST_ACCRUAL / FEE / ADJUSTMENT / REVERSAL / PRINCIPAL_ADJUSTMENT / UNKNOWN
- ใช้ตาราง transaction code **ต่อ bank_id** (06_PGS10_POLICY_PARAMETERS.json → `transaction_code_map`); ไม่ใช่ Global
- Code ที่กระทบ Last Payment/Principal แต่ไม่มี Mapping ที่มีหลักฐาน (`UNVERIFIED_UNTIL_SOURCE`, เช่น 6921, 6680) → HOLD `TRANSACTION_CODE_UNMAPPED`
- ไม่มี Statement → NOT_TESTABLE `STATEMENT_MISSING`
**Evidence:** Statement + ตาราง bank transaction code

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `STATEMENT_MISSING` | NOT_TESTABLE | ไม่มี Statement | CANDIDATE |
| `TRANSACTION_CODE_UNMAPPED` | HOLD | Transaction code ที่อาจกระทบ Last Payment/Principal ไม่มี Mapping ที่อนุมัติ (DEC-02) | APPROVED_BY_OWNER |

### PGS10-STM-001 · Last Actual Payment
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#6, M§12 · **Decisions:** DEC-14, DEC-34 · **Legacy aliases:** `PGS10-STM-002@v1.1.0`, `PGS10-STM-001@draft1.0`
**Inputs:** `transactions`, `last_actual_payment_date`, `payment_history_status`, `statement_period_start`, `statement_period_end`, `statement_has_gap`, `loan_origination_date`, `statement_cutoff_date`
**Logic:**
- `last_actual_payment_date = max(transaction_date WHERE type = PAYMENT)` — ไม่นับ interest accrual, fee, adjustment, reversal, drawdown/release, principal adjustment, system posting ที่ไม่มีเงินรับจริง
- `payment_history_status`: **PAYMENTS_FOUND** (มี PAYMENT) · **NO_PAYMENT_VERIFIED** (Statement ครอบคลุม Origination→Cut-off ไม่มี gap และไม่มี PAYMENT → `last_actual_payment_date = null`, control = PASS, **ไม่ใช่ Error**) · **INCOMPLETE** (นอกจากนั้น) → HOLD `PAYMENT_HISTORY_INCOMPLETE`
- มี UNKNOWN หลัง PAYMENT ล่าสุด → HOLD `UNKNOWN_TRANSACTION_NEAR_DEFAULT` (Safe-Hold PRM-042)
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-042` (OPEN): UNKNOWN ใด ๆ หลัง PAYMENT ล่าสุด → HOLD → `UNKNOWN_TRANSACTION_NEAR_DEFAULT`
**Evidence:** Statement

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `PAYMENT_HISTORY_INCOMPLETE` | HOLD | Statement ไม่ครบ Origination→Cut-off / มี gap จึงไม่รู้ว่ามี payment หรือไม่ | APPROVED_BY_OWNER |
| `STATEMENT_MISSING` | NOT_TESTABLE | ไม่มี Statement | CANDIDATE |
| `UNKNOWN_TRANSACTION_NEAR_DEFAULT` | HOLD | มีรายการ UNKNOWN ที่อาจเป็นเงินรับจริง ไม่เดา | CANDIDATE |

### PGS10-STM-002 · Statement Cut-off vs Later Payments
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#17 · **Decisions:** DEC-12 · **Legacy aliases:** —
**Inputs:** `statement_cutoff_date`, `later_payment_date`, `later_payment_amount`, `later_statement_covers`
**Logic:**
- ถ้าเอกสารอื่นระบุการชำระ**หลัง** Statement cut-off และยังไม่มี Statement ใหม่ที่ครอบคลุม (`later_statement_covers`=false) → HOLD `PAYMENT_AFTER_STATEMENT_CUTOFF`
- ห้ามรับยอด Statement เป็น Current Debt สุดท้าย (ยังไม่รู้การจัดสรรดอกเบี้ย/เงินต้น); Required Action: ขอ Statement หลัง Payment (Regression: LG 66-044366)
**Evidence:** Statement + หนังสือธนาคารที่ระบุการชำระหลัง cut-off

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `PAYMENT_AFTER_STATEMENT_CUTOFF` | HOLD | มีการชำระหลัง Statement cut-off และยังไม่มี Statement ใหม่ (Regression 66-044366) | CANDIDATE |

### PGS10-DEF-001 · Default Date ≥ Last Actual Payment
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#7, M§13 · **Decisions:** DEC-34 · **Legacy aliases:** `PGS10-DEF-001@v1.1.0`
**Inputs:** `default_date`, `last_actual_payment_date`, `payment_history_status`
**Logic:**
- `default_date >= last_actual_payment_date` → PASS (เท่ากันผ่าน); `<` → เรียก DEF-002 (ไม่ Fail ทันที)
- `payment_history_status = NO_PAYMENT_VERIFIED` → ต้องใช้ alternative evidence (due-date / FI evidence) ตาม Rule ที่อนุมัติ — **ยังไม่มี Rule (PRM-055)** → Safe-Hold: HOLD `POLICY_PARAMETER_UNRESOLVED`
- ไม่พบ Statement ให้เทียบ (INCOMPLETE) → STM-001 เป็นผู้ HOLD; DEF-001 = NOT_APPLICABLE
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-055` (OPEN): payment_history_status=NO_PAYMENT_VERIFIED → DEF-001 = HOLD จนมี alternative evidence rule → `POLICY_PARAMETER_UNRESOLVED`
**Evidence:** Statement + หน้าจอ

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `POST_DEFAULT_PAYMENT` | HOLD | default_date < last_actual_payment_date → เข้า DEF-002 (สถานะตามผล DEF-002) | CANDIDATE |
| `POST_DEFAULT_PAYMENT_SUPPORTED` (support_code) | PASS_WITH_SUPPORT | มีการชำระหลังผิดนัด และหนังสือยืนยันสมบูรณ์ทางภาพ/เนื้อหา ตรง Default Date หน้าจอ | APPROVED |

### PGS10-DEF-002 · Post-Default Payment Exception
**Requirement:** CONDITIONAL · **ใช้เมื่อ:** default_date < last_actual_payment_date · **ที่มา:** R#8, M§14, M§16 · **Decisions:** DEC-04, DEC-13 · **Legacy aliases:** `PGS10-DEF-002@v1.1.0`
**Inputs:** `default_date`, `last_actual_payment_date`, `exception_letter_present`, `exception_confirmed_default_date`, `exception_states_payment_after_default`, `exception_states_default_unchanged`, `exception_identifiers_link_to_case`, `confirmation_visual_elements`
**Logic:**
- ใช้เมื่อ `default_date < last_actual_payment_date`
- ลำดับตรวจ: (1) ไม่มีหนังสือ → HOLD `POST_DEFAULT_SUPPORT_MISSING` (2) VIS-001 ไม่ผ่าน → HOLD `CONFIRMATION_LETTER_VISUALLY_INCOMPLETE` (3) Default Date ในหนังสือ ≠ หน้าจอ → HOLD `CONFIRMED_DEFAULT_DATE_MISMATCH` (4) ไม่ระบุสาระ (ชำระหลังผิดนัด / ไม่เปลี่ยน Default Date) → HOLD `CONFIRMATION_CONTENT_INCOMPLETE` (5) Identifier ไม่ลิงก์กลับเคส → HOLD `IDENTIFIER_LINKAGE_UNRESOLVED`
- ผ่านทั้งหมด → `PASS_WITH_SUPPORT` `support_code=POST_DEFAULT_PAYMENT_SUPPORTED` (case `support_used=true`)
**Evidence:** หนังสือยืนยันการชำระหลังวันผิดนัด (ภาพจริง) + Statement + หน้าจอ

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CONFIRMATION_CONTENT_INCOMPLETE` | HOLD | หนังสือไม่ระบุสาระที่ต้องมี | CANDIDATE |
| `CONFIRMATION_LETTER_VISUALLY_INCOMPLETE` | HOLD | หนังสือยืนยันการชำระหลังผิดนัดไม่สมบูรณ์ทางภาพ | CANDIDATE |
| `CONFIRMED_DEFAULT_DATE_MISMATCH` | HOLD | Default Date ในหนังสือ ≠ หน้าจอ | CANDIDATE |
| `IDENTIFIER_LINKAGE_UNRESOLVED` | HOLD | Identifier ในหนังสือ/เอกสารไม่ลิงก์กลับเคสได้ | CANDIDATE |
| `POST_DEFAULT_SUPPORT_MISSING` | HOLD | ไม่มีหนังสือยืนยันการชำระหลังวันผิดนัด | CANDIDATE |
| `POST_DEFAULT_PAYMENT_SUPPORTED` (support_code) | PASS_WITH_SUPPORT | มีการชำระหลังผิดนัด และหนังสือยืนยันสมบูรณ์ทางภาพ/เนื้อหา ตรง Default Date หน้าจอ | APPROVED |

### PGS10-FUP-001 · Follow-up / Tracking Evidence
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#9, M§17 · **Decisions:** — · **Legacy aliases:** `PGS10-FUP-001@v1.1.0`
**Inputs:** `tracking_date_screen`, `tracking_date_report`, `tracking_method`, `tracking_result`
**Logic:**
- วันที่ติดตามหน้าจอ = รายงานติดตาม; ตรวจผู้กู้ / LG / วิธี / ผล
- HOLD: `TRACKING_REPORT_MISSING`, `TRACKING_EVIDENCE_MISMATCH`, `TRACKING_EVIDENCE_INCOMPLETE`; วันที่ติดตาม ≠ วันปรับโครงสร้างหนี้ (L-14)
**Evidence:** รายงานติดตามหนี้

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `TRACKING_EVIDENCE_INCOMPLETE` | HOLD | ขาดวิธี/ผลติดตาม | CANDIDATE |
| `TRACKING_EVIDENCE_MISMATCH` | HOLD | วันที่/ผู้กู้/LG ในรายงานติดตามไม่ตรงหน้าจอ | CANDIDATE |
| `TRACKING_REPORT_MISSING` | HOLD | ไม่มีรายงานติดตาม | CANDIDATE |

### PGS10-RST-001 · Restructure Requirement / Route
**Requirement:** CONDITIONAL · **ใช้เมื่อ:** Case 1 (SMEs ≤5 ปี) และ Case 3 (Small Biz ≤5 ปี) — path ที่มีเงื่อนไข (ค); Case 2, 4, 5 → NOT_APPLICABLE · **ที่มา:** M§4.2, M§5, M§6 · **Decisions:** DEC-20, DEC-24, DEC-32 · **Legacy aliases:** `PGS10-RST-001@v1.1.0`
**Inputs:** `product`, `claim_path`, `claim_case_no`, `restructure_route`, `restructure_date`, `restructure_doc_signing_date`, `last_actual_payment_date`, `claim_submission_date`
**Logic:**
- ใช้กับ **Case 1 (SMEs ≤ 5 ปี) และ Case 3 (Small Biz ≤ 5 ปี)** — path ที่มีเงื่อนไข (ค); Case 2, 4, 5 (รวม Start up) → NOT_APPLICABLE (DEC-32)
- band ≤5/>5 ปีของ Case นับจากวันที่ยื่นเทียบวันออก LG (PRM-054, APPROVED_OPERATIONAL — DEC-39); ข้อมูลไม่ครบ → HOLD `LG_DATA_MISSING`
- ระบุ `restructure_route`: `NORMAL_RESTRUCTURE_PATH` (ปรับโครงสร้าง ≥ 1 ครั้ง + พ้น 3 เดือนหลังวันทำสัญญาปรับโครงสร้าง + ไม่ชำระติดต่อกันอีก 3 เดือน) | `UNCONTACTABLE_EXCEPTION_PATH` (→ RST-002)
- `restructure_date = null` **ไม่ผ่านอัตโนมัติ** → HOLD `RESTRUCTURE_PATH_UNDETERMINED`; ไม่ครบเงื่อนไข → HOLD `RESTRUCTURE_REQUIREMENT_NOT_MET`
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-054` (APPROVED_OPERATIONAL): ไม่มี claim_submission_date หรือ lg_issue_date → claim_path กำหนดไม่ได้ → HOLD → `LG_DATA_MISSING`
**Evidence:** เอกสารปรับโครงสร้าง / รายงานติดตาม

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `RESTRUCTURE_PATH_UNDETERMINED` | HOLD | ยังไม่ระบุเส้นทาง Restructure (restructure_date=null ไม่ผ่านอัตโนมัติ) | CANDIDATE |
| `RESTRUCTURE_REQUIREMENT_NOT_MET` | HOLD | เส้นทางปกติยังไม่ครบเงื่อนไข | CANDIDATE |

### PGS10-RST-002 · Uncontactable / Unable-to-agree Exception
**Requirement:** CONDITIONAL · **ใช้เมื่อ:** route=UNCONTACTABLE_EXCEPTION_PATH (ใช้ได้เฉพาะ path ที่มี (ค) = กรณี 1 และ 3 — DEC-20) · **ที่มา:** M§5, R§32 · **Decisions:** DEC-20, DEC-32, DEC-36 · **Legacy aliases:** `PGS10-RST-002@v1.1.0`, `PGS10-RST-OP-002@v1.1.0`
**Inputs:** `restructure_route`, `first_uncontactable_date`, `first_contacted_restructure_failed_date`, `exception_start_date`, `exception_maturity_date`, `certified_tracking_report_present`, `demand_or_termination_letter_count`, `claim_submission_date`
**Logic:**
- OFFICIAL (หน้า 7 **กรณี 1 และ 3** — DEC-20/32): ติดต่อไม่ได้ **หรือ** ติดต่อได้แต่ตกลงปรับเงื่อนไข/โครงสร้างไม่ได้
- `exception_start_date = first_uncontactable_date OR first_contacted_but_restructure_failed_date`; `exception_maturity_date = add_calendar_months(exception_start_date, 7)`
- ต้อง `claim_submission_date ≥ exception_maturity_date` + Certified Tracking Report + หนังสือบอกกล่าว/บอกเลิก ≥ 1 → PASS_WITH_SUPPORT `support_code=UNCONTACTABLE_7_MONTH_EXCEPTION`
- ไม่ครบ → HOLD `UNCONTACTABLE_EXCEPTION_NOT_MET` / `TRACKING_REPORT_NOT_CERTIFIED`; config ปิด → HOLD `EXCEPTION_ROUTE_NOT_CONFIGURED`; **ไม่ขยายไป Start up (Case 5)**
**Evidence:** Certified Tracking Report + หนังสือบอกกล่าว/บอกเลิก

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `EXCEPTION_ROUTE_NOT_CONFIGURED` | HOLD | เลือกเส้นทางยกเว้นแต่ Config ปิดอยู่ | CANDIDATE |
| `TRACKING_REPORT_NOT_CERTIFIED` | HOLD | รายงานติดตามไม่ใช่ Certified | CANDIDATE |
| `UNCONTACTABLE_EXCEPTION_NOT_MET` | HOLD | เส้นทางยกเว้นยังไม่ครบเงื่อนไข | CANDIDATE |
| `UNCONTACTABLE_7_MONTH_EXCEPTION` (support_code) | PASS_WITH_SUPPORT | ครบเงื่อนไขทางออก (หน้า 7 กรณี 1 และ 3): start + 7 เดือนปฏิทิน + Certified Tracking Report + หนังสือบอกกล่าว/บอกเลิก ≥ 1 | APPROVED |

### PGS10-RST-003 · Restructure Date Evidence
**Requirement:** CONDITIONAL · **ใช้เมื่อ:** มีการปรับโครงสร้างหนี้ · **ที่มา:** R#10, M§18 · **Decisions:** DEC-14 · **Legacy aliases:** `PGS10-RST-OP-001@v1.1.0`
**Inputs:** `restructure_date`, `restructure_doc_signing_date`, `restructure_doc_approval_date`, `restructure_doc_effective_date`, `restructure_stmt_header_date`
**Logic:**
- Source: L1 เอกสารปรับโครงสร้างโดยตรง → L2 หัว Statement ใบแรก → L3 หน้าจอ; แยก วันที่ลงนาม / อนุมัติ / มีผล / เริ่มบัญชี ก่อนสรุป mismatch
- ตรง L1 → PASS; ตรง L2 → PASS_WITH_SUPPORT `support_code=MATCHED_STATEMENT_HEADER`; ไม่ตรง L1 และยังไม่ตรวจ L2 → HOLD `RESTRUCTURE_DATE_SEMANTICS_UNRESOLVED`; ไม่ตรงทั้งคู่ → HOLD `RESTRUCTURE_DATE_MISMATCH`; ไม่มีหลักฐาน → HOLD `RESTRUCTURE_EVIDENCE_MISSING`
**Evidence:** สัญญา/ข้อตกลง/หนังสืออนุมัติปรับโครงสร้าง + หัว Statement ใบแรก

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `RESTRUCTURE_DATE_MISMATCH` | HOLD | ไม่ตรงทั้งเอกสารและหัว Statement | CANDIDATE |
| `RESTRUCTURE_DATE_SEMANTICS_UNRESOLVED` | HOLD | ความหมายของวันที่ (ลงนาม/อนุมัติ/มีผล/เริ่มบัญชี) ยังไม่ถูกแยก ต้องตรวจหัว Statement | CANDIDATE |
| `RESTRUCTURE_EVIDENCE_MISSING` | HOLD | ไม่มีเอกสารปรับโครงสร้าง/หัว Statement | CANDIDATE |
| `MATCHED_STATEMENT_HEADER` (support_code) | PASS_WITH_SUPPORT | วันที่ปรับโครงสร้างตรงหัว Statement (Level 2) แม้ไม่ตรงวันลงนามในเอกสาร | APPROVED |

### PGS10-NPY-001 · Consecutive Non-payment (ง)
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** Case 2, 4, 5 (เงื่อนไข (ง)); Case 1 และ 3 → NOT_APPLICABLE · **ที่มา:** PGS10 หน้า 7 (ง); M§6 · **Decisions:** DEC-44, DEC-45 · **Legacy aliases:** —
**Inputs:** `product`, `claim_path`, `claim_case_no`, `default_date`, `claim_submission_date`, `first_payment_after_default_date`, `payment_history_status`
**Logic:**
- ใช้กับ **Case 2 (SMEs >5 ปี), Case 4 (Small Biz >5 ปี), Case 5 (Start up)** — เงื่อนไข (ง) (หลักเกณฑ์หน้า 7); Case 1 และ 3 → NOT_APPLICABLE (ใช้ (ค) ผ่าน RST-001)
- `non_payment_period_end = add_calendar_months(default_date, PRM-057 = 3)` (วิธีนับตาม PRM-028)
- `default_date` หรือ `claim_submission_date` ไม่มี → NOT_TESTABLE `MISSING_INPUT` (REQUIRED_HARD → เคส HOLD ตาม stage); `payment_history_status = INCOMPLETE` → NOT_TESTABLE (STM-001 เป็นผู้ HOLD)
- `claim_submission_date < non_payment_period_end` → HOLD `NON_PAYMENT_PERIOD_NOT_ELAPSED` (แก้ได้ด้วยเวลา)
- `first_payment_after_default_date` มีค่าและ `<= non_payment_period_end` → HOLD `CONSECUTIVE_NON_PAYMENT_NOT_MET` (**ไม่ FAIL** จนเจ้าของกำหนด — Q-11)
- นอกนั้น → PASS (ข้อเสนอของ Claude: ยังไม่ได้บังคับว่าต้องไม่ชำระต่อเนื่องจนถึงวันยื่น — Q-11)
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-028` (OPEN): ใช้ CALENDAR_MONTH_CLAMP_END_OF_MONTH (ไม่นับวันตั้งต้น); ถ้าผลต่างกันเมื่อเปลี่ยนเป็นวิธีอื่น (นับรวมวัน/ rollover) → HOLD → `POLICY_PARAMETER_UNRESOLVED`
**Evidence:** Statement ครบ Origination→Cut-off + หน้าจอ (default_date) + แบบคำขอ (claim_submission_date)

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CONSECUTIVE_NON_PAYMENT_NOT_MET` | HOLD | มีรายการ PAYMENT ภายใน 3 เดือนปฏิทินนับจาก default_date จึงยังไม่ครบเงื่อนไข (ง) (HOLD ไม่ใช่ FAIL จนกว่าเจ้าของกำหนด — Q-11) | PROPOSED_BY_CLAUDE |
| `NON_PAYMENT_PERIOD_NOT_ELAPSED` | HOLD | วันที่ยื่น Claim ยังไม่ถึง default_date + 3 เดือนปฏิทิน (แก้ได้ด้วยเวลา) | PROPOSED_BY_CLAUDE |

### PGS10-DMD-001 · Demand Letter Identity & Existence
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#11, M§19 · **Decisions:** — · **Legacy aliases:** `PGS10-DMD-POL-001@v1.1.0`, `PGS10-DMD-001@v1.1.0`
**Inputs:** `demand_date_screen`, `demand_date_letter`, `demand_principal`, `demand_interest`, `demand_total`, `demand_or_termination_letter_count`
**Logic:**
- ตรวจผู้กู้ / Account / วงเงิน / วันที่หนังสือ (หน้าจอ = ตัวหนังสือ) / `principal + interest = total` และมีหนังสือบอกกล่าว/บอกเลิก ≥ 1 ฉบับ
- HOLD: `DEMAND_LETTER_MISMATCH`, `DEMAND_IDENTITY_UNCONFIRMED`
**Evidence:** หนังสือบอกกล่าว

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `DEMAND_IDENTITY_UNCONFIRMED` | HOLD | ยังไม่ยืนยันผู้กู้/Account/วงเงิน/ที่อยู่ในหนังสือ | CANDIDATE |
| `DEMAND_LETTER_MISMATCH` | HOLD | วันที่/ยอดในหนังสือบอกกล่าวไม่ตรงหน้าจอหรือไม่สอดคล้องกันเอง | CANDIDATE |

### PGS10-DMD-002 · Demand Principal as of Demand Date
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#12, M§19-20 · **Decisions:** DEC-08, DEC-16 · **Legacy aliases:** `PGS10-DMD-002@v1.1.0`
**Inputs:** `demand_principal`, `principal_as_of_demand_date`, `demand_principal_derivation_basis`, `statement_period_start`, `statement_period_end`, `statement_has_gap`, `principal_affecting_txn_after_demand`, `principal_as_of_demand_reconstructable`, `demand_date_letter`, `current_principal`
**Logic:**
- Canonical: `demand_principal == principal_as_of_demand_date` (แยกจาก `current_principal == latest_statement_principal`); เทียบเฉพาะเงินต้น ห้ามใช้ดอกเบี้ย
- มี Snapshot ตรงวัน (`DIRECT_SNAPSHOT`) → ตรง = PASS
- ไม่มี Snapshot → **derive ได้ (`DERIVED_AS_OF_DEMAND`) เมื่อพิสูจน์ครบ:** (1) Statement/Ledger ครอบคลุม Demand Date (2) ไม่มี gap ในช่วงรายการ (3) หลัง Demand Date ไม่มีรายการกระทบเงินต้น หรือมีแต่ reconstruct ย้อนกลับได้แน่นอน → PASS_WITH_SUPPORT `DERIVED_AS_OF_DEMAND`
- ไม่มี Snapshot → **derive ได้ (`support_code=DERIVED_AS_OF_DEMAND`) เมื่อพิสูจน์ครบ:** (1) Statement/Ledger ครอบคลุม Demand Date (2) ไม่มี gap ในช่วงรายการ (3) หลัง Demand Date ไม่มีรายการกระทบเงินต้น หรือมีแต่ reconstruct ย้อนกลับได้แน่นอน → PASS_WITH_SUPPORT
**Evidence:** หนังสือบอกกล่าว + Statement/Ledger ที่ครอบคลุม Demand Date

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `DEMAND_PRINCIPAL_AS_OF_DATE_UNVERIFIED` | HOLD | พิสูจน์เงินต้น ณ วันบอกกล่าวไม่ได้ (ไม่มี Snapshot และ derive ไม่ได้: Statement ไม่ครอบคลุม/มี gap/มีรายการกระทบเงินต้นหลัง demand ที่ reconstruct ไม่ได้) | APPROVED_BY_OWNER |
| `DEMAND_PRINCIPAL_MISMATCH` | HOLD | เงินต้นบอกกล่าว ≠ Statement ณ วันบอกกล่าว (พิสูจน์ได้ว่าต่าง) | CANDIDATE |
| `DERIVED_AS_OF_DEMAND` (support_code) | PASS_WITH_SUPPORT | derive เงินต้น ณ วันบอกกล่าวจาก Statement/Ledger ได้ครบเงื่อนไข (ครอบคลุม ไม่มี gap ไม่มีรายการกระทบเงินต้นหลัง demand หรือ reconstruct ได้) | APPROVED |

### PGS10-DMD-003 · Demand Waiting Period
**Requirement:** CONDITIONAL · **ใช้เมื่อ:** ไม่ใช่เส้นทางล้มละลาย · **ที่มา:** M§24 · **Decisions:** — · **Legacy aliases:** `PGS10-DMD-POL-002@v1.1.0`
**Inputs:** `demand_date_letter`, `postal_received_date`, `claim_eligibility_date`
**Logic:**
- `claim_eligibility_date ≥ demand_date + 1 เดือน` (ยกเว้นเส้นทางล้มละลาย)
- Safe-Hold (PRM-021/028): ผ่านต่อเมื่อครบตามทุก candidate reference (วันที่ในหนังสือ, วันที่ผู้รับลงนามรับ) และทุก convention ของการนับเดือน; ต่างกัน → HOLD `DEMAND_WAITING_PERIOD_NOT_MET` / `POLICY_PARAMETER_UNRESOLVED`
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-021` (OPEN): ผ่านต่อเมื่อระยะรอครบตามทุก candidate reference (วันที่ในหนังสือ, วันที่ผู้รับลงนามรับ); ต่างกัน → HOLD → `DEMAND_WAITING_PERIOD_NOT_MET`
- `PRM-028` (OPEN): ใช้ CALENDAR_MONTH_CLAMP_END_OF_MONTH (ไม่นับวันตั้งต้น); ถ้าผลต่างกันเมื่อเปลี่ยนเป็นวิธีอื่น (นับรวมวัน/ rollover) → HOLD → `POLICY_PARAMETER_UNRESOLVED`
**Evidence:** หนังสือบอกกล่าว + ใบตอบรับ

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `DEMAND_WAITING_PERIOD_NOT_MET` | HOLD | ยังไม่พ้นระยะรอหลังหนังสือบอกกล่าว | CANDIDATE |

### PGS10-HIS-001 · Historical Debt Snapshot
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ (Reference Event = Demand) · **ที่มา:** R#13, M§27 · **Decisions:** DEC-07 · **Legacy aliases:** `PGS10-HIS-001@v1.1.0`
**Inputs:** `screen_historical_principal`, `screen_historical_interest`, `screen_historical_total`, `demand_principal`, `demand_interest`, `demand_total`, `historical_reference_event`
**Logic:**
- หน้าจอ 'สภาพหนี้ ณ วันฟ้อง / วันออกหนังสือบอกกล่าว / วันพิทักษ์ทรัพย์เด็ดขาด': `historical_principal / interest / total` ต้อง**ตรงหนังสือบอกกล่าว ณ Reference Date เดียวกันทั้งสามค่า** (Exact; ห้ามใช้ tolerance)
- ต่างแม้ค่าเดียว → **HOLD `HISTORICAL_BALANCE_MISMATCH`** ไม่ว่ากระทบ Claim Base หรือไม่ ห้ามจัดเป็น Observation (DEC-07)
- Reference Event ที่ไม่ใช่ Demand Letter → NOT_TESTABLE (A-20)
**Evidence:** หน้าจอ 'สภาพหนี้ ณ วันบอกกล่าว' + หนังสือบอกกล่าว

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `HISTORICAL_BALANCE_MISMATCH` | HOLD | สภาพหนี้ ณ วันอ้างอิงบนหน้าจอ (ต้น/ดอก/รวม) ไม่ตรงหนังสือบอกกล่าว — Blocking แม้ไม่กระทบ Claim Base (DEC-07) | CANDIDATE |

### PGS10-PST-001 · Postal Delivery Evidence
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#14, M§21 · **Decisions:** DEC-14 · **Legacy aliases:** `PGS10-PST-001@v1.1.0`, `PGS10-PST-002@v1.1.0`, `PGS10-PST-001@draft1.0`
**Inputs:** `postal_outcome`, `postal_received_date`, `postal_signature_type`, `returned_envelope_evidence`, `address_match`
**Logic:**
- ส่งสำเร็จ: มีวันที่รับ + ลายมือชื่อผู้รับ/ผู้รับแทน (ชื่อตัวบรรจง หรือลายเซ็นเจ้าหน้าที่ไปรษณีย์อย่างเดียวไม่พอ) + ที่อยู่ Traceable (PST-002 ผ่าน) → PASS
- ส่งไม่สำเร็จ: มีซองตีกลับ / RETURNED / คืนผู้ฝาก ชัดเจน + ที่อยู่ Traceable → PASS (ไม่ต้องมีลายเซ็นผู้รับ)
- HOLD: `POSTAL_EVIDENCE_MISSING`, `POSTAL_ACK_INCOMPLETE`, `POSTAL_RETURN_INCOMPLETE`, `POSTAL_ADDRESS_UNVERIFIED`
**Evidence:** ใบตอบรับ / ซองตีกลับ

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `POSTAL_ACK_INCOMPLETE` | HOLD | หลักฐานส่งสำเร็จไม่ครบ (วันที่รับ/ลายมือชื่อผู้รับ/ผู้รับแทน) | CANDIDATE |
| `POSTAL_ADDRESS_UNVERIFIED` | HOLD | ที่อยู่จัดส่งอ้างอิงกลับเอกสารใน PDF ไม่ได้ | CANDIDATE |
| `POSTAL_EVIDENCE_MISSING` | HOLD | ใบตอบรับว่าง/ไม่มีหลักฐานส่ง/ซองตีกลับ | CANDIDATE |
| `POSTAL_RETURN_INCOMPLETE` | HOLD | หลักฐานส่งไม่สำเร็จไม่ครบ (ซองตีกลับ/คืนผู้ฝาก) | CANDIDATE |

### PGS10-PST-002 · Address Match
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#15, M§22 · **Decisions:** DEC-12, DEC-14 · **Legacy aliases:** `PGS10-PST-003@v1.1.0`
**Inputs:** `postal_address`, `documented_address_set`
**Logic:**
- เทียบ บ้านเลขที่ / หมู่ / ตำบล-แขวง / อำเภอ-เขต / จังหวัด / รหัสไปรษณีย์ กับ `documented_address_set[]` (อนุมัติ, สัญญา, เอกสารผู้กู้, เอกสารเปลี่ยนที่อยู่, เอกสารอื่นใน PDF)
- Normalize คำย่อ (ต.=ตำบล อ.=อำเภอ จ.=จังหวัด ม.=หมู่) และช่องว่าง/เครื่องหมาย/รหัสไปรษณีย์; **บ้านเลขที่ห้าม fuzzy match**
- มีเอกสารแจ้งเปลี่ยนที่อยู่ → เทียบที่อยู่ล่าสุดเท่านั้น (HOLD `ADDRESS_DIFFERS_FROM_LATEST`); ไม่มี → ต้องตรงอย่างน้อยหนึ่งเอกสาร (HOLD `ADDRESS_NOT_IN_DOCUMENTS`); หา Source ไม่พบ → HOLD `POSTAL_ADDRESS_UNVERIFIED`
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-040` (LOCKED): มีเอกสารแจ้งเปลี่ยนที่อยู่ แต่พิสูจน์วันที่มีผลเทียบวันส่งไม่ได้ → เทียบที่อยู่ล่าสุดเท่านั้น → `ADDRESS_DIFFERS_FROM_LATEST`
**Evidence:** เอกสารใน PDF ทุกฉบับที่ระบุที่อยู่

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `ADDRESS_DIFFERS_FROM_LATEST` | HOLD | มีหลักฐานแจ้งเปลี่ยนที่อยู่ แต่จัดส่งไม่ตรงที่อยู่ล่าสุด | CANDIDATE |
| `ADDRESS_NOT_IN_DOCUMENTS` | HOLD | ที่อยู่จัดส่งไม่ตรงเอกสารใดและไม่มีหลักฐานแจ้งเปลี่ยน | CANDIDATE |
| `POSTAL_ADDRESS_UNVERIFIED` | HOLD | ที่อยู่จัดส่งอ้างอิงกลับเอกสารใน PDF ไม่ได้ | CANDIDATE |

### PGS10-PST-003 · Postal Linkage
**Requirement:** CONDITIONAL · **ใช้เมื่อ:** มี tracking number/barcode · **ที่มา:** M§23 · **Decisions:** DEC-14 · **Legacy aliases:** `PGS10-PST-004@v1.1.0`, `PGS10-PST-001@draft1.0`
**Inputs:** `postal_tracking_number_ack`, `postal_tracking_number_envelope`, `postal_tracking_number_dispatch`
**Logic:**
- เมื่อมีเลขไปรษณีย์/บาร์โค้ด: ใบตอบรับ / ซองตีกลับ ต้องเป็นชิ้นเดียวกับที่ส่ง; ไม่ตรง/พิสูจน์ไม่ได้ → HOLD `POSTAL_LINKAGE_UNRESOLVED`
**Evidence:** ใบตอบรับ/ซอง/Track & Trace

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `POSTAL_LINKAGE_UNRESOLVED` | HOLD | ใบตอบรับ/ซองไม่ใช่ชิ้นเดียวกับที่ส่ง หรือพิสูจน์ไม่ได้ | CANDIDATE |

### PGS10-CUR-001 · Current Principal
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#16, M§26 · **Decisions:** DEC-09 · **Legacy aliases:** `PGS10-CUR-001@v1.1.0`, `PGS10-CUR-001@draft1.0`
**Inputs:** `screen_current_principal`, `current_principal`
**Logic:**
- `screen_current_principal == current_principal` (Statement ล่าสุด) Exact — tolerance = 0 เสมอ (PRM-035)
- ไม่ตรง → HOLD `CURRENT_PRINCIPAL_MISMATCH`
**Evidence:** Statement ล่าสุด + หน้าจอ

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CURRENT_PRINCIPAL_MISMATCH` | HOLD | เงินต้นปัจจุบันไม่ตรง Statement ล่าสุด (tolerance = 0) | CANDIDATE |

### PGS10-CUR-002 · Current Interest / Total
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#16, M§26 · **Decisions:** DEC-09, DEC-18 · **Legacy aliases:** `PGS10-CUR-002@v1.1.0`, `PGS10-CUR-001@draft1.0`
**Inputs:** `screen_current_interest`, `screen_current_total`, `current_interest`, `current_other_amounts`, `current_total`, `tolerance_enabled`
**Logic:**
- Total ต้องคำนวณ = principal + interest + other applicable amounts (ระบุองค์ประกอบ — A-24)
- ตรง → PASS
- ต่างเล็กน้อย และ `tolerance_enabled=false` (ค่าเริ่มต้น) → **HOLD `NUMERIC_VARIANCE` + review_flag `OBSERVATION_CANDIDATE`** (ห้าม auto-pass; ห้ามแก้ค่าให้ตรง แสดงทั้งสองค่า)
- ถ้าอนุมัติ tolerance ภายหลัง (proposed 0.01 บาท): ใช้ได้เฉพาะ `current_interest` และ `current_total` ที่ต่างจาก interest rounding เดียวกันเท่านั้น (ไม่มี component อื่นต่าง) และเงินต้นตรง → OBSERVATION `VARIANCE_WITHIN_APPROVED_TOLERANCE`; ห้ามกับ principal / claim_base / coverage / claim_amount / claim_max / historical_*
- ต่างเกินเกณฑ์ → HOLD `CURRENT_BALANCE_MISMATCH`
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-033` (PROPOSED_CONFIG_DISABLED): tolerance.enabled=false → ส่วนต่างทุกจำนวน = HOLD → `NUMERIC_VARIANCE`
- `PRM-033b` (PROPOSED_CONFIG_DISABLED): tolerance.enabled=false → ไม่มี field ใดใช้ tolerance → `NUMERIC_VARIANCE`
**Evidence:** Statement ล่าสุด + หน้าจอ

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CURRENT_BALANCE_MISMATCH` | HOLD | ดอกเบี้ย/รวมต่างเกินเกณฑ์ที่ใช้ได้ | CANDIDATE |
| `NUMERIC_VARIANCE` | HOLD + flag `OBSERVATION_CANDIDATE` | ส่วนต่างจำนวนเงินเล็กน้อยที่ tolerance ยังปิดอยู่ (DEC-09) | APPROVED_BY_OWNER |
| `VARIANCE_WITHIN_APPROVED_TOLERANCE` | OBSERVATION | ส่วนต่างอยู่ใน tolerance ที่อนุมัติ (เปิด Config แล้ว/มี reviewer override) และเงินต้นตรง | CANDIDATE |

### PGS10-CLM-001 · Claim Filing Window
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** M§25 · **Decisions:** DEC-31 · **Legacy aliases:** `PGS10-CLM-POL-001@v1.1.0`
**Inputs:** `lg_issue_date`, `final_lg_expiry_date`, `claim_submission_date`, `claim_filing_dates_verified`
**Logic:**
- ช่วงยื่นที่อนุญาต: `claim_submission_date ≥ lg_issue_date + 1 ปี` (ตั้งแต่ปีที่ 2) และ `≤ final_lg_expiry_date + 1 ปี`; นับเดือน/ปีตาม PRM-028 (Safe-Hold)
- **ยังไม่ถึงเวลายื่น** → HOLD/Pending `CLAIM_FILING_NOT_YET_OPEN` (แก้ได้ด้วยเวลา)
- **หมดสิทธิแล้ว** และวันที่ถูก verify ครบ (`claim_filing_dates_verified`) → **FAIL `CLAIM_FILING_WINDOW_EXPIRED`**; วันที่ไม่ verify → HOLD
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-028` (OPEN): ใช้ CALENDAR_MONTH_CLAMP_END_OF_MONTH (ไม่นับวันตั้งต้น); ถ้าผลต่างกันเมื่อเปลี่ยนเป็นวิธีอื่น (นับรวมวัน/ rollover) → HOLD → `POLICY_PARAMETER_UNRESOLVED`
**Evidence:** LG + แบบคำขอ

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CLAIM_FILING_NOT_YET_OPEN` | HOLD | ยังไม่ถึงเวลายื่น Claim (ก่อนปีที่ 2 ของอายุ LG) — แก้ได้ด้วยเวลา จึงเป็น HOLD/Pending | APPROVED_BY_OWNER |
| `CLAIM_FILING_WINDOW_EXPIRED` | FAIL | หมดสิทธิยื่น Claim แล้ว (เกิน 1 ปีหลัง LG ฉบับสุดท้ายสิ้นอายุ) และวันที่ถูก verify ครบ — Proven Policy Ineligibility | APPROVED_BY_OWNER |

### PGS10-CLM-002 · Coverage Ratio
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#19, M§7 · **Decisions:** DEC-11, DEC-21, DEC-30 · **Legacy aliases:** `PGS10-COV-001@v1.1.0`, `PGS10-CLM-002@v1.1.0`
**Inputs:** `product`, `guarantee_term_years`, `lg_issue_date`, `lg_expiry_date`, `lg_renewed_or_extended`, `contractual_lg_tenor_years`, `screen_coverage_ratio`, `coverage_ratio`
**Logic:**
- Coverage ใช้ **อายุ/ระยะเวลาตามสัญญาของ LG (contractual LG tenor)** — ไม่ใช่อายุ ณ Claim/NPL/Default/Demand (DEC-30)
- ลำดับ source ของ tenor: (1) `guarantee_term_years` ที่ระบุใน LG โดยตรง (2) `lg_expiry_date − lg_issue_date` (calendar; PRM-028) (3) พิสูจน์ไม่ได้ → HOLD `LG_TENOR_UNDETERMINABLE`; LG ที่ถูกต่ออายุและไม่มี term ระบุ → HOLD `LG_TENOR_UNDETERMINABLE` (Q-10)
- Smart Biz · Smart One · Smart Green · Smart Plus & Top up · Small Biz: tenor ≤ 5 ปี → 70%, > 5 ปี → 100%; **Start up → 100% ทั้งสองช่วง** (OFFICIAL — DEC-21). tenor เท่ากับ 5 ปีพอดี = 70% (DEC-11)
- อัตราหน้าจอ ≠ อัตราตามกฎ → HOLD `COVERAGE_RATIO_MISMATCH`; Product ไม่อยู่ใน matrix → HOLD `NO_RULE_FOR_PRODUCT`
**Safe-Hold (พารามิเตอร์ที่ยัง OPEN):**
- `PRM-028` (OPEN): ใช้ CALENDAR_MONTH_CLAMP_END_OF_MONTH (ไม่นับวันตั้งต้น); ถ้าผลต่างกันเมื่อเปลี่ยนเป็นวิธีอื่น (นับรวมวัน/ rollover) → HOLD → `POLICY_PARAMETER_UNRESOLVED`
**Evidence:** LG + แบบคำขอ + ตาราง Coverage

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `COVERAGE_RATIO_MISMATCH` | HOLD | อัตราหน้าจอ ≠ อัตราตามกฎ | CANDIDATE |
| `LG_TENOR_UNDETERMINABLE` | HOLD | พิสูจน์ contractual LG tenor ไม่ได้ (ไม่มี guarantee_term ใน LG, ไม่มี lg_issue_date/lg_expiry_date ครบ, หรือ LG ถูกต่ออายุโดยไม่ระบุ term) | APPROVED_BY_OWNER |
| `NO_RULE_FOR_PRODUCT` | HOLD | ไม่มีกฎ Coverage ที่ยืนยันสำหรับ Product นี้ | CANDIDATE |

### PGS10-CLM-003 · Claim Base
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#18, M§28 · **Decisions:** DEC-09, DEC-14 · **Legacy aliases:** `PGS10-CLM-POL-002@v1.1.0`, `PGS10-CLM-001@v1.1.0`
**Inputs:** `current_principal`, `current_guarantee_obligation`, `claim_base`, `claim_base_mode`, `screen_claim_base`, `screen_claim_base_mode`
**Logic:**
- `claim_base = MIN(current_principal, current_guarantee_obligation)`; mode: `BY_PRINCIPAL` เมื่อ principal < guarantee, `BY_GUARANTEE` เมื่อ ≥
- ตรวจทั้งค่าและ mode (ห้าม tolerance): HOLD `CLAIM_BASE_MISMATCH` / `CLAIM_BASE_MODE_MISMATCH`
- แหล่งของ `current_guarantee_obligation` ต้องระบุ (A-24)
**Evidence:** Statement ล่าสุด + LG/ข้อมูลภาระค้ำ

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CLAIM_BASE_MISMATCH` | HOLD | ฐานคำนวณหน้าจอ ≠ MIN(principal, guarantee) | CANDIDATE |
| `CLAIM_BASE_MODE_MISMATCH` | HOLD | โหมดฐานคำนวณไม่ตรงกฎ | CANDIDATE |

### PGS10-CLM-004 · Claim Calculation
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#20, M§29 · **Decisions:** DEC-09, DEC-14 · **Legacy aliases:** `PGS10-CLM-POL-003@v1.1.0`, `PGS10-CLM-003@v1.1.0`
**Inputs:** `claim_base`, `coverage_ratio`, `screen_claim_amount`, `screen_approved_payment`, `claim_amount`
**Logic:**
- `claim_amount = round_half_up(claim_base × coverage_ratio, 2)` Decimal (จำนวนเต็มสตางค์; basis points) — คำนวณใหม่เองไม่เชื่อหน้าจอ; เทียบ จำนวนค่าประกันชดเชย / ยอดอนุมัติจ่าย (ห้าม tolerance)
- ไม่ตรง → HOLD `CLAIM_CALCULATION_MISMATCH`
**Evidence:** แบบคำขอ/หน้าจอ

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CLAIM_CALCULATION_MISMATCH` | HOLD | จำนวนเงินค่าประกันชดเชย/ยอดอนุมัติจ่ายหน้าจอ ≠ ที่คำนวณ | CANDIDATE |
| `UPSTREAM_NOT_COMPUTABLE` | NOT_TESTABLE | Control ต้นทางยังคำนวณไม่ได้ | CANDIDATE |

### PGS10-CAP-001 · CLAIM MAX / Package Capacity
**Requirement:** REQUIRED_HARD (FINAL_APPROVAL) · OPTIONAL (PRE_REVIEW) · **ใช้เมื่อ:** FINAL_APPROVAL (PRE_REVIEW: NOT_TESTABLE ได้และไม่กระทบเคส) · **ที่มา:** R#21, M§30-32 · **Decisions:** DEC-06, DEC-09, DEC-17 · **Legacy aliases:** `PGS10-CAP-001@v1.1.0`, `PGS10-CAP-OP-001@v1.1.0`
**Inputs:** `review_stage`, `claim_max`, `paid_claims`, `pending_claims`, `claim_amount`, `available_claim_capacity`, `carry_forward_balance`, `screen_available_capacity`, `screen_carry_forward_balance`
**Logic:**
- `available_claim_capacity = claim_max − paid_claims − pending_claims`; `carry_forward_balance = available − claim_amount` ตรงหน้าจอทุกสตางค์ (ห้าม tolerance)
- **Stage (DEC-17):** `PRE_REVIEW` → NOT_TESTABLE ได้และไม่กระทบเคส; `FINAL_APPROVAL` → REQUIRED_HARD — ข้อมูล Package ไม่ครบ → `control_status=NOT_TESTABLE`, case HOLD, `PACKAGE_DEFINITION_REQUIRED` (ไม่ใช่ FAIL)
- เกิน Cap → HOLD `CLAIM_EXCEEDS_CAP`; ตัวเลขไม่ตรง → HOLD `CLAIM_MAX_ARITHMETIC_MISMATCH`
**Evidence:** ข้อมูล Package (CLAIM MAX, จ่ายจริง, รอจ่าย)

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `CLAIM_EXCEEDS_CAP` | HOLD | Claim เกินวงเงินคงเหลือ | CANDIDATE |
| `CLAIM_MAX_ARITHMETIC_MISMATCH` | HOLD | คงเหลือจ่ายได้อีก/หลังอนุมัติไม่ตรงทุกสตางค์ | CANDIDATE |
| `PACKAGE_DEFINITION_REQUIRED` | NOT_TESTABLE | ข้อมูล/นิยาม Package (Claim Max, paid, pending, รอบ, carry-forward) ไม่ครบ. FINAL_APPROVAL → case HOLD; PRE_REVIEW → ไม่กระทบเคส | APPROVED_BY_OWNER |
| `UPSTREAM_NOT_COMPUTABLE` | NOT_TESTABLE | Control ต้นทางยังคำนวณไม่ได้ | CANDIDATE |

### PGS10-TIME-001 · Timeline Integrity
**Requirement:** REQUIRED_HARD · **ใช้เมื่อ:** เสมอ · **ที่มา:** R#22, M§36 · **Decisions:** — · **Legacy aliases:** `PGS10-TIME-001@v1.1.0`
**Inputs:** `def_002_control_status`, `approval_date`, `lg_issue_date`, `first_payment_date`, `default_date`, `tracking_date_screen`, `demand_date_screen`, `postal_sent_date`, `postal_received_date`, `claim_submission_date`, `bank_submission_date`, `complete_documents_date`, `payment_approval_date`
**Logic:**
- Master Timeline: Contract/Approval → LG Issue → Payments → Default → Follow-up → Demand → Postal → Claim Application → Bank Submission → Complete Documents → Payment Approval; ต้องไม่ขัดกัน (วันเดียวกันได้)
- Exception: Default → Later Payment ได้เมื่อ DEF-002 = PASS_WITH_SUPPORT; ขัดกัน → HOLD `TIMELINE_CONFLICT`
**Evidence:** วันที่ทั้งหมดของเคส

| reason_code | control_status | ความหมาย | สถานะรหัส |
|---|---|---|---|
| `TIMELINE_CONFLICT` | HOLD | ลำดับเหตุการณ์ขัดกัน | CANDIDATE |

## 5. Reason codes ทั่วไป
| reason_code | control_status | ความหมาย |
|---|---|---|
| `RULE_VERSION_CONFLICT` | HOLD | กฎ/Effective Date ขัดกันและตัดสินไม่ได้ ต้องรายงาน Conflict |
| `MISSING_INPUT` | NOT_TESTABLE | ขาดข้อมูลที่จำเป็น |
| `INVALID_INPUT` | HOLD | รูปแบบข้อมูลไม่ถูกต้อง |
| `POLICY_PARAMETER_UNRESOLVED` | HOLD | ผลขึ้นกับพารามิเตอร์นโยบายที่ยัง OPEN และ candidate ให้ผลต่างกัน (ระบุ PRM-xxx ใน detail_code) |

## 6. สิ่งที่ Master Audit ต้องแก้ (Editorial — ไม่ขวาง Freeze)
M§27 (Historical = HOLD) · M§19/R§15 (as-of Demand Date) · M§26/§43.3/R§19 (tolerance ปิด) · M§29 (Rule ID และรูปแบบวันที่ตัวอย่าง JSON) · M§38/R§26 (5 State + reason_code + FAIL scope) · M§15/R Control 5 (11 elements) · R§6/M§9 (Contract date = Thai Credit revolving-loan)
