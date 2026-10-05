# Rule Reconciliation Report

**เวอร์ชัน:** 1.2.0-RECONCILIATION-r4 · **สถานะ:** RECONCILIATION_DRAFT r2 (รวมคำตอบ Q-01…Q-04 และคำตัดสิน DEC-15…28) — **ไม่ใช่การ Freeze**; Spec Candidate อยู่ที่ `pgs10/spec/v1.2.0-candidate/` · **Rule Engine / tests เดิม / Spec ร่าง v1.0 / Pack v1.1.0: ไม่ถูกแก้**

ชุดนี้ประกอบด้วย 8 รายการ ในโฟลเดอร์ `pgs10/spec/reconciliation/`:
`Rule_Reconciliation_Report.md` (ไฟล์นี้) · `Canonical_Rule_ID_Map.json` · `Canonical_Reason_Code_Catalogue.json` · `Rule_to_Reason_Mapping.json` · `Policy_Parameter_Table.json` · `Conflict_Register.md` · `Golden_Test_Gap_Report.md` · `Proposed_Changes_for_v1.2.0.md`

## 1. สิ่งที่เทียบกัน

| ย่อ | แหล่ง |
|---|---|
| D | Spec ร่าง v1.0.0-DRAFT ของผม (`pgs10/spec/`, 28 Controls, 77 reason codes) |
| P | PGS10 Deployment Pack v1.1.0 (40 Rule ID, 18 reason codes, 13 golden tests) |
| R / M / V | Rulebook 22 Controls / Master Audit / บทสนทนาประเมิน Master Audit |
| DEC | คำตัดสินล่าสุดของผู้ใช้ (ด้านล่าง) — ชนะทุกแหล่งเมื่อขัดกัน |

## 2. Decision Baseline (DEC-01…DEC-14)

| ID | คำตัดสิน |
|---|---|
| DEC-01 | Start up NPL seasoning = 6 calendar months, source_status=OFFICIAL (SSMEs รูปแบบ 2 ใช้เงื่อนไข (ข)). `npl_date` ต้องไม่ derive จาก `default_date`; `allow_default_date_as_npl_date=false`; ไม่มี npl_date → HOLD / `NPL_DATE_MISSING`. Data Model ต้องแยก `npl_date` จาก `default_date` (ห้ามเขียนรวมเป็น 'Default/NPL Date'). |
| DEC-02 | Transaction codes: ไม่ใช่ Global Canonical. Thai Credit 6619/6656/6920/6922/6931 = `EVIDENCE_SUPPORTED_BANK_SPECIFIC`; 6921 และ 6680 = `UNVERIFIED_UNTIL_SOURCE`. Dictionary ต้องมี bank_id, code, semantic_type, effective_from, effective_to, evidence_source, approval_status, approved_by. Code ที่กระทบ Last Payment แต่ไม่มี Mapping → HOLD / `TRANSACTION_CODE_UNMAPPED`. |
| DEC-03 | LG `66-037410` เป็นเคสจริง ห้ามแก้เป็น `66-067410` ห้าม Merge ห้าม Auto-correct เลข LG. |
| DEC-04 | Support + Observation → `case_status=PASS_WITH_OBSERVATION` พร้อม `support_used=true`. Support อย่างเดียว → `PASS_WITH_SUPPORT`. |
| DEC-05 | ห้ามใช้ `HOLD_*` เป็น reason_code/สถานะ. ใช้ `case_status=HOLD` + `reason_code=...` ทุก Control. |
| DEC-06 | `NOT_TESTABLE` เป็น `control_status` ไม่ใช่ case status. Required hard control ที่ NOT_TESTABLE → case HOLD; Optional/Not-applicable → ไม่กระทบสถานะเคส. |
| DEC-07 | Historical principal/interest/total ต้องตรงที่ `reference_date` เดียวกัน; ค่าใดค่าหนึ่งไม่ตรง → HOLD / `HISTORICAL_BALANCE_MISMATCH`. |
| DEC-08 | Demand Principal เทียบ `principal_as_of_demand_date`; แยกจาก `current_principal == latest_statement_principal`; ห้ามใช้ Latest Statement ตัดสิน Demand ถ้ามี Payment หลัง Demand. |
| DEC-09 | `rounding_tolerance_enabled=false`. ส่วนต่าง 0.01 → case HOLD, `reason_code=NUMERIC_VARIANCE`, `review_flag=OBSERVATION_CANDIDATE` จนกว่าจะเปิด Config/มี reviewer override. ห้าม tolerance กับ principal / claim_base / coverage / claim_amount / claim_max. |
| DEC-10 | Approval Date = Contract Date เป็น Thai Credit revolving-loan operational rule เท่านั้น ห้ามประกาศเป็น Universal PGS 10 rule ทุก FI. |
| DEC-11 | Coverage: `age <= fifth_anniversary` → 70%; `age > fifth_anniversary` → 100%; ครบ 5 ปีพอดี = 70%. |
| DEC-12 | ต้องเติมกลับ: Statement Cut-off vs Later Payment; Leading-zero normalization; Address abbreviation normalization; House number no fuzzy; Latest supported address + address-change evidence; New business / business-purpose / HP-Leasing exclusions; `REVERSAL`; `PRINCIPAL_ADJUSTMENT`; `NOT_TESTABLE`; Date calendar metadata; Decimal Money; Statement updated after later payment. |
| DEC-13 | Golden Tests schema: `test_scope` = FULL_CASE \| RULE_ONLY; `match_mode` = EXACT \| CONTAINS \| RULE_ONLY; ฟิลด์ expected_rule_results / expected_case_status / expected_reason_codes. RULE_ONLY ห้าม Assert case status. 67-026936 (GT-001) = RULE_ONLY VIS-001 HOLD / CONFIRMATION_LETTER_VISUALLY_INCOMPLETE; ไม่ล็อก HISTORICAL_BALANCE_MISMATCH จนมี Evidence. |
| DEC-14 | Rule ID: ใช้ Master Audit §41 เป็น Canonical; เพิ่ม `PGS10-TXN-001` = Transaction Classification; ID เก่าเก็บเป็น `legacy_aliases` (เช่น `PGS10-CLM-001@v1.1.0`); ไม่ Renumber Master Rule. |
| DEC-15 | Q-01 Observation ที่ Auto-pass ได้: เฉพาะ **non-semantic format normalization** ที่พิสูจน์ได้แน่นอนและเป็น field-specific (LG ตัดขีด/ช่องว่าง, ตัวเลขไทย/อารบิก, Leading Zero เฉพาะ field ที่ประกาศว่า leading zero ไม่มีนัยสำคัญ). ผล: `control_status=PASS`, `review_flag=FORMAT_NORMALIZED`, `case_status=PASS_WITH_OBSERVATION`; ต้องเก็บ raw_value และ normalized_value. ไม่ Auto-pass: เงินต่างแม้ 0.01 (Config ปิด), บ้านเลขที่ต่าง, ตัวเลขภายในของ Account/LG ต่าง, วันที่ความหมายไม่ชัด, OCR confidence ต่ำ, Contract Date basis ไม่ชัด, Restructure Date semantics ไม่ชัด, Transaction Code ไม่รู้ความหมาย, Historical balance ต่าง, Visual document ไม่ครบ. |
| DEC-16 | Q-02 DMD-002: Canonical ยังเป็น `demand_principal == principal_as_of_demand_date`. ถ้าไม่มี Snapshot ตรงวัน ให้ derive ได้ (`DERIVED_AS_OF_DEMAND`) เมื่อพิสูจน์ครบ: (1) Statement/Ledger ครอบคลุม Demand Date (2) ไม่มี gap ในช่วงรายการ (3) หลัง Demand Date ไม่มีรายการที่กระทบ Principal หรือ (4) มีแต่ reconstruct ย้อนกลับได้แน่นอน → `PASS_WITH_SUPPORT`. พิสูจน์ไม่ได้ → HOLD `DEMAND_PRINCIPAL_AS_OF_DATE_UNVERIFIED`. ห้ามใช้เหตุผลว่า 'ยอดล่าสุดเท่ากันพอดี'. |
| DEC-17 | Q-03 CAP-001 = REQUIRED_HARD สำหรับ Final Claim Approval/Payment Gate. Stage: PRE_REVIEW → CAP-001 NOT_TESTABLE ได้ (ไม่กระทบเคส); FINAL_APPROVAL → ต้อง PASS; ข้อมูล Package ไม่ครบ → `control_status=NOT_TESTABLE`, `case_status=HOLD`, `reason_code=PACKAGE_DEFINITION_REQUIRED` (ไม่ใช่ FAIL). |
| DEC-18 | Q-04 Tolerance: `rounding_tolerance_enabled=false` (ค่าเริ่มต้น). ถ้าอนุมัติภายหลัง: proposed `tolerance_amount="0.01"` เฉพาะ whitelist `current_interest`, `current_total`; principal / claim_base / coverage / claim_amount / claim_max ต้อง exact; Current Total ที่ผ่าน tolerance ต้องมาจาก Interest rounding เดียวกัน (ไม่มี component อื่นต่าง); Historical Principal/Interest/Total ห้ามใช้ tolerance. |
| DEC-19 | A-07 FAIL = Proven Policy Ineligibility ที่แก้ด้วยการส่งเอกสารเพิ่มไม่ได้ (เช่น พิสูจน์ได้ว่าไม่ใช่เพื่อธุรกิจ / เป็นประเภทที่ Policy ไม่อนุญาต). ปัญหา Document/Data/Evidence ทั้งหมด = HOLD. |
| DEC-20 | A-10 7-month exception = OFFICIAL (หลักเกณฑ์ PGS 10 หน้า 7, กรณี 1 และ 3): `exception_start_date = first_uncontactable_date OR first_contacted_but_restructure_failed_date`; `exception_maturity_date = add_calendar_months(exception_start_date, 7)`; ใช้เฉพาะกรณี 1 และ 3 ไม่ขยายไป Start up กรณี 5. |
| DEC-21 | A-11 Coverage OFFICIAL: Smart Biz / Smart One / Smart Green / Smart Plus & Top up / Small Biz = 70% (≤ 5 ปี) และ 100% (> 5 ปี); Start up = 100% ทั้งสองช่วง. |
| DEC-22 | A-12: Threshold 5 ปี = OFFICIAL (`coverage_age_threshold`). `coverage_age_basis` = OPEN (ห้ามให้ `claim_date − lg_issue_date` เป็น OFFICIAL อัตโนมัติ). Anniversary Rule ใช้ได้เมื่อ Business Owner อนุมัติ → `APPROVED_OPERATIONAL`. |
| DEC-23 | A-16 หนังสือยืนยันต้องเห็นจริง 11 Atomic elements + Multi-page continuity: (1) Header/ชื่อหรือเครื่องหมาย FI (2) วันที่หนังสือ (3) เรื่อง (4) ผู้รับ (5) ผู้กู้ + Account/LG/Case Reference (6) Original Default Date (7) Post-default Payment วันที่ + จำนวน (8) ข้อความว่าชำระบางส่วน/ไม่เป็นไปตามเงื่อนไข (9) ข้อความยืนยัน Original Default Date ยังคงเดิม (10) ลายเซ็น (11) ชื่อ + ตำแหน่ง/อำนาจผู้ลงนาม; `multi_page_document_continuity=REQUIRED`. OCR มีแต่ภาพไม่มี → HOLD `CONFIRMATION_LETTER_VISUALLY_INCOMPLETE`. |
| DEC-24 | A-23 Start up (SSMEs รูปแบบ 2, กรณี 5) ใช้ `(ข)+(ง)+(จ)+(ฉ)` — ไม่รับ (ค) Restructure จาก Small Biz; `(ข)` = NPL พ้น 6 เดือน. [แก้โดย DEC-44: Case 5 = (ข)+(ง)+(จ)+(ฉ) ตามหลักเกณฑ์ฉบับจริงหน้า 7] |
| DEC-25 | A-30 ยัง **OPEN และเป็น Freeze Blocker**: แยก `guarantee_effective_date` กับ `lg_issue_date`; ห้ามอนุมานว่าเป็นวันเดียวกัน. Mapping `guarantee_effective_date_source=LG_ISSUE_DATE` ใช้ได้เมื่อ Business Owner ยืนยัน (`APPROVED_OPERATIONAL`). ระหว่างนี้ NPL seasoning ที่ต้องใช้ anchor นี้ → Safe-Hold. |
| DEC-26 | A-04: ปิดเชิง Decision แล้ว เหลือ Editorial Update ของ Master Audit §27 (ไม่นับเป็น Business Ambiguity). |
| DEC-27 | Reason code ใหม่: อนุมัติ `CONTRACT_DATE_BASIS_UNDEFINED`, `ELIGIBILITY_NOT_BUSINESS_PURPOSE`, `PACKAGE_DEFINITION_REQUIRED`; เพิ่ม `ELIGIBILITY_PROHIBITED_CREDIT_TYPE` (Hire Purchase / Leasing) แยกจาก NOT_BUSINESS_PURPOSE. |
| DEC-28 | กระบวนการ: สร้าง `v1.2.0 Spec Candidate — NOT FROZEN`; ห้ามแก้ Rule Engine และห้าม Freeze จนกว่าผ่าน Freeze Gate 5 ข้อ: Canonical IDs resolve 100% → Reason Codes resolve 100% → No status/reason mixing → Policy OPEN rules Safe-Hold → Golden tests มี evidence และไม่มี invented expected result. |
| DEC-29 | A-30 ปิดระดับ `APPROVED_OPERATIONAL`: ใช้ `lg_issue_date` เป็น anchor ของ NPL seasoning โดย**ไม่อ้างว่าเป็น OFFICIAL** (ข้อ 2.5 นับอายุการค้ำจากวันออก LG; หน้า 7 ใช้ 'วันที่ บสย. ค้ำประกัน' ซึ่งไม่ได้ระบุสมการว่าเป็น field เดียวกัน). `guarantee_effective_date` เก็บเป็น field แยกได้เมื่อมี source จริง; ถ้ามีเอกสารนโยบายนิยามต่างออกไป เปลี่ยน Mapping ได้โดยไม่แก้ Rule ID. A-30 ไม่เป็น Freeze Blocker. |
| DEC-30 | A-12 ปิด: Coverage ใช้ **อายุ/ระยะเวลาตามสัญญาของ LG (contractual LG tenor)** ไม่ใช่ลองคำนวณจาก Claim/NPL/Default/Demand. ลำดับ source: (1) `guarantee_term` ที่ระบุใน LG โดยตรง (2) derive จาก `lg_issue_date` + `lg_expiry_date` (3) พิสูจน์ tenor ไม่ได้ → HOLD `LG_TENOR_UNDETERMINABLE`. `tenor <= 5 ปี` → 70%; `> 5 ปี` → 100%; Start up 100% ทั้งสองช่วง. |
| DEC-31 | Q-05 FAIL ตัดสินจากคุณสมบัติของ Rule ไม่ใช่ชื่อ reason_code: `policy_disqualifying=true` ∧ `remediable_by_document=false` ∧ `evidence_verified=true` → FAIL. `NPL_SEASONING_NOT_MET` เป็น FAIL ได้เมื่อ npl_date + anchor + Policy ถูก verify ครบ; ไม่มี npl_date (`NPL_DATE_MISSING`) หรือ anchor พิสูจน์ไม่ได้ (`NPL_ANCHOR_DATE_UNDEFINED`) → HOLD. Claim Window: หมดสิทธิแล้ว (verified) → FAIL; ยังไม่ถึงเวลายื่น → HOLD/Pending (แก้ได้ด้วยเวลา). |
| DEC-32 | Q-06 ยืนยัน: Case 1 = SMEs ≤5 ปี (ก)+(ค)+(จ)+(ฉ); Case 2 = SMEs >5 ปี (ก)+(ง)+(จ)+(ฉ); Case 3 = Small Biz ≤5 ปี (ข)+(ค)+(จ)+(ฉ); Case 4 = Small Biz >5 ปี (ข)+(ง)+(จ)+(ฉ); Case 5 = Start up (ข)+(ง)+(จ)+(ฉ). ทางออก 7 เดือนใช้เฉพาะ Case 1 และ 3. [แก้โดย DEC-44: Case 5 = (ข)+(ง)+(จ)+(ฉ) ตามหลักเกณฑ์ฉบับจริงหน้า 7] |
| DEC-33 | Q-07 Leading Zero: รองรับเฉพาะ `loan_account_no` แบบ **FI-specific normalization profile** (`FI_CONFIGURABLE`) ไม่ใช่ Universal rule; ไม่ขยายไป LG / customer / contract ID (ห้ามตัด 0 นำหน้าอัตโนมัติจนมี evidence ว่าเป็น padding). ต้องเก็บ `raw_value`, `normalized_value`, `normalization_rule`, `fi_profile`. |
| DEC-34 | A-40 `NO_PAYMENT_FOUND` แยกสองความหมาย: Statement ครบ Origination→Cut-off พิสูจน์ได้ว่าไม่เคยชำระ → `payment_history_status=NO_PAYMENT_VERIFIED`, `last_actual_payment_date=null` (ไม่ HOLD เพราะเหตุไม่มี payment เพียงอย่างเดียว); Statement ไม่ครบ → `INCOMPLETE` → HOLD `PAYMENT_HISTORY_INCOMPLETE`. Default chronology กรณีไม่มี payment ใช้เส้นทาง alternative evidence (due-date / FI evidence) ตาม Rule ที่อนุมัติ. |
| DEC-35 | อนุมัติ `test_scope=AGGREGATION_ONLY` (แทน AGGREGATION_LOGIC): `fixture_type=SYNTHETIC_LOGIC`, `evidence_required=false`; ทดสอบ Case aggregation โดยไม่ปลอมเป็นเคสจริง. |
| DEC-36 | Reason/Support code: `NPL_ANCHOR_DATE_UNDEFINED` อนุมัติ (defensive HOLD); `COVERAGE_AGE_BASIS_UNDEFINED` ยกเลิก → `LG_TENOR_UNDETERMINABLE`; `UNCONTACTABLE_EXCEPTION_MATURED` ไม่ใช่ reason_code → `support_code=UNCONTACTABLE_7_MONTH_EXCEPTION`; `POLICY_PARAMETER_UNRESOLVED` อนุมัติเป็น generic Safe-Hold fallback. |
| DEC-37 | อัปเกรดแหล่งที่มา (ผู้ใช้ยืนยันจากไฟล์โครงการ): Start up 6 เดือน + Case 5 (ข)+(ง)+(จ)+(ฉ) = OFFICIAL (PGS 10 หน้า 7); Coverage ทุก Product = OFFICIAL (หน้า 5); Thai Credit 6619/6656/6920/6922/6931 = EVIDENCE_SUPPORTED_BANK_SPECIFIC (Statement remark + ledger); LG 66-037410 = SOURCE_VERIFIED_CASE (รายงานติดตาม + Statement). [แก้โดย DEC-44: Case 5 = (ข)+(ง)+(จ)+(ฉ) ตามหลักเกณฑ์ฉบับจริงหน้า 7] |
| DEC-38 | Gate hardening: เคส `BLOCKED_PENDING_EVIDENCE` ที่ไม่มี `evidence_ref` **ห้ามมี asserted expected result** (`expected_case_status=null`, `expected_reason_codes=[]`, ไม่มี `expected_rule_results`) — เก็บผลเดิมเป็น `manual_baseline_note` ซึ่งไม่นับเป็น Regression Assertion. เงื่อนไข Freeze: 5/5 checks ผ่าน + ไม่มี asserted result ใน Blocked fixtures + Conflict Register ไม่มีรายการค้างที่ไม่มี Safe-Hold. |
| DEC-39 | Q-08 ยืนยัน: band ≤5/>5 ปีของ Case 1–4 (claim path) นับจากวันที่ยื่นเทียบวันออก LG (`lg_issue_date + 5 ปี`); ต่างจาก Coverage ที่ใช้ contractual tenor. PRM-054 → `APPROVED_OPERATIONAL`; ข้อมูลวันที่ไม่ครบยัง HOLD `LG_DATA_MISSING`. |
| DEC-40 | Q-09 ยืนยัน: NO_PAYMENT_VERIFIED → DEF-001 = HOLD `POLICY_PARAMETER_UNRESOLVED` เป็นพฤติกรรมที่อนุมัติ **จนกว่าจะมี alternative evidence rule** (PRM-055 ยัง OPEN; ไม่มี rule ให้สร้างเอง). |
| DEC-41 | Q-10 ยืนยัน: LG ที่ต่ออายุ/ขยายและไม่มี guarantee_term ระบุ → HOLD `LG_TENOR_UNDETERMINABLE` เป็นพฤติกรรมที่อนุมัติ จนกว่าจะมี rule เรื่อง tenor ของ LG ที่ต่ออายุ. |
| DEC-42 | อนุมัติ reason code `CLAIM_FILING_NOT_YET_OPEN` (HOLD) และ `CLAIM_FILING_WINDOW_EXPIRED` (FAIL; ต้อง verified) ที่ Claude เสนอ. |
| DEC-43 | A-43 ยืนยัน: Safe-Hold 'ผลต้องเหมือนกันทุก candidate' คงไว้เฉพาะ demand-waiting reference และ date arithmetic (PRM-021/PRM-028); 'หมดสิทธิแต่วันที่ยังไม่ verify' ไม่มี code เฉพาะและไม่มี golden test (ใช้ HOLD ทั่วไปของ CLM-001). |
| DEC-44 | แก้ Case 5 (Start up, SSMEs รูปแบบ 2) = **(ข)+(ง)+(จ)+(ฉ)** ตามหลักเกณฑ์ PGS 10 หน้า 7 ที่ตรวจกับต้นฉบับ PDF ใน session นี้ (ต้นฉบับ: 'กรณีที่ 5 … ข้อ (ข) (ง) (จ) (ฉ)'); แทนที่ (ข)+(จ)+(ฉ) ใน DEC-24/32/37. ไม่รับ (ค); ไม่มี 7-month exception. เจ้าของยืนยันให้ถือตามเอกสาร. |
| DEC-45 | เพิ่ม control `PGS10-NPY-001` (เงื่อนไข (ง) ไม่ชำระหนี้ติดต่อกัน 3 เดือนนับแต่ผิดนัด) ใช้กับ Case 2, 4, 5 — ก่อนหน้านี้ Candidate ไม่มี control ที่ตรวจ (ง) กับ Case ใดเลย. นิยามการตรวจเป็นข้อเสนอของ Claude (Q-11); ผลที่ไม่ผ่านเป็น HOLD ไม่ใช่ FAIL จนกว่าเจ้าของกำหนด. |

## 3. ข้อจำกัดของหลักฐาน (สำคัญ)

- DEC-01, DEC-02, DEC-03 อ้างหลักฐานจากไฟล์เคส (หลักเกณฑ์ PGS 10 ฉบับทางการ, Statement ของ Thai Credit, รายงานติดตามของเคส 66-037410) — **ไฟล์เหล่านั้นไม่ได้ถูกส่งเข้า session นี้** ผมจึงยืนยันเองไม่ได้ ทุกข้อที่พึ่งหลักฐานนี้ถูกบันทึกเป็น `user-attested` (Policy_Parameter_Table → `evidence_source`) และต้องเติม เอกสาร/หน้า ก่อน Freeze
- ตัวเลขนโยบายที่ติดป้าย `OFFICIAL` มาจากการอ้างของ Master Audit เท่านั้น ยังไม่ได้เทียบกับหลักเกณฑ์ทางการฉบับจริง
- LG 6 เลขใน P ที่ไม่ปรากฏในเอกสารใดของ session นี้ (66-040977, 66-042400, 66-047199, 66-068610, 66-100753, 66-011787) ยังไม่มีคำยืนยัน

## 4. วิธีตรวจ

1. จับคู่ทุก Rule ID และ reason code ของ D และ P เข้ากับชุด Canonical (Master Audit §41 เป็นหลัก — DEC-14) ด้วยตารางที่ตรวจโดยสคริปต์: ทุก ID/ชื่อต้อง resolve ได้ ไม่มี reason code ขึ้นต้น `HOLD_`/`FAIL_` (36 alias, 44 rule alias, 0 unresolved)
2. เทียบเนื้อหาทีละ Rule (ตารางข้อ 6) แล้วตัดสินตาม DEC; ที่ DEC ไม่ครอบคลุมบันทึกเป็นข้อเสนอ/คำถาม
3. ตรวจตัวเลขซ้ำ (เช่น เงินสมทบ Small Biz รวม 12.50%, 66,477.40 × 70% = 46,534.18)

## 5. ผลโดยรวม

- Canonical rules **33** รายการ: ตรงกัน `ALIGNED` 13, ตรงหลังคำตัดสิน `ALIGNED_AFTER_DECISION` 9, ต่างกัน `DIFFERS` 7, เติมกลับ `RESTORED` 1, ID ใหม่ `NEW_CANONICAL` 3
- Reason codes Canonical **82** ตัว (รวม 2 ตัวที่ **เสนอใหม่**: `CONSECUTIVE_NON_PAYMENT_NOT_MET`, `NON_PAYMENT_PERIOD_NOT_ELAPSED`)
- ทะเบียน Conflict 47 รายการ: RESOLVED 30, ยังไม่ปิด 17, **ขวาง Freeze 0** (ดู `Conflict_Register.md`)
- **ID ที่ต้องระวังที่สุด:** 10 รายการเป็น 'ID เดิมความหมายใหม่' เช่น `PGS10-STM-001` (P = Transaction mapping, Canonical = Last Actual Payment), `PGS10-CLM-001` (P = Claim Base, Canonical = Filing Window). ห้าม resolve alias โดยไม่ระบุ `@version`

## 6. Rule-by-Rule

`requirement`: REQUIRED_HARD = ตรวจไม่ได้แล้วเคส HOLD (DEC-06) · CONDITIONAL = ใช้เมื่อเงื่อนไข `applicable_when` เป็นจริง ไม่เช่นนั้น NOT_APPLICABLE
`agreement`: ALIGNED · ALIGNED_AFTER_DECISION · DIFFERS · RESTORED (P ตัดออก) · NEW_CANONICAL

| Canonical ID | ชื่อ | requirement | D | P | agreement | DEC | สรุป / ผลที่ใช้ | ค้างอยู่ |
|---|---|---|---|---|---|---|---|---|
| `PGS10-ELIG-001` | Project / Product Eligibility | REQUIRED_HARD | ELIG-001 | POL-001, POL-003 (01) | DIFFERS | DEC-12, DEC-19, DEC-27, DEC-31 | รวมของ D และ P: PGS10 rev.5 + Product; สินเชื่อใหม่; วัตถุประสงค์ธุรกิจ (`ELIGIBILITY_NOT_BUSINESS_PURPOSE`); ประเภทต้องห้าม HP/Leasing (`ELIGIBILITY_PROHIBITED_CREDIT_TYPE`); ค้ำต่อครั้ง ≥ 10,000; รวมต่อราย ≤ 40 ล้าน; SSMEs Small Biz ≤ 200,000 / Start up ≤ 100,000. FAIL เฉพาะพิสูจน์ได้ว่าขาดคุณสมบัติที่แก้ไม่ได้ (DEC-19). | — |
| `PGS10-ID-001` | Identity Integrity | REQUIRED_HARD | ID-001 | ID-001 (02) | DIFFERS | DEC-03, DEC-12, DEC-15, DEC-33 | Auto-pass เฉพาะ non-semantic format normalization (FORMAT_NORMALIZED): LG ตัดขีด/ช่องว่าง, ตัวเลขไทย↔อารบิก, `loan_account_no` Leading Zero **เฉพาะ FI ที่มี normalization profile (FI_CONFIGURABLE)**; LG/customer/contract ID ห้ามตัด 0 นำหน้า; เลขภายในต่าง/ชื่อ/วงเงิน/วันที่ต่าง → HOLD (ไม่ใช่ FAIL). | — |
| `PGS10-DOC-001` | Approval / Contract Page Completeness | REQUIRED_HARD | DOC-001 | DOC-001 (02) | ALIGNED | — | ตรงกัน: นับ 'หน้าเอกสาร' ไม่ใช่หน้า PDF. reason_code แม่ = `APPROVAL_DOCUMENT_INCOMPLETE` (P) + `detail_code` = PAGE_SEQUENCE_GAP \| DOCUMENT_TRUNCATED \| PAGE_UNREADABLE (D). | A-28 |
| `PGS10-VIS-001` | Confirmation Letter Visual Completeness | CONDITIONAL | VIS-001 (ครอบทุกเอกสาร) | VIS-001 (02) | ALIGNED_AFTER_DECISION | DEC-13, DEC-23 | เฉพาะหนังสือยืนยัน: 11 Atomic elements + multi-page continuity (DEC-23). OCR มีแต่ภาพไม่มี → HOLD `CONFIRMATION_LETTER_VISUALLY_INCOMPLETE`; ไม่มีภาพต้นฉบับ → NOT_TESTABLE `VISUAL_RECHECK_REQUIRED`. | — |
| `PGS10-VIS-002` | Critical Evidence Visual Authority | CONDITIONAL | VIS-001 (ส่วนเอกสารอื่น) | VIS-002 (02) | NEW_CANONICAL | DEC-14 | แยกออกจาก VIS-001 ตาม P: Visual check ของ Approval sequence / Demand / Tracking / Postal / Returned Envelope / Restructure Agreement. Text Layer ค้นได้แต่ทดแทนไม่ได้. | A-05 (รายการ Critical: ใช้ 7 ประเภทของ M§37 เป็น Safe-Hold) |
| `PGS10-CONTRACT-001` | Contract / Approval Date | REQUIRED_HARD | CONTRACT-001 | CON-001 (02) | DIFFERS | DEC-10 | P จำกัดกฎเป็น Thai Credit; R§6/M§9 เขียนเป็นกฎทั่วไป → ตัดสิน: Thai Credit only. FI อื่น → HOLD `CONTRACT_DATE_BASIS_UNDEFINED` (รหัสใหม่ที่เสนอ). | A-29 (ใหม่) |
| `PGS10-LG-001` | Guarantee Validity | REQUIRED_HARD | LG-001 | POL-002 (01) | ALIGNED | — | ทั้ง D และ P ไม่มี Logic ที่เป็นทางการ (M ให้ชื่อเท่านั้น): อายุ LG ≤ 10 ปี, ข้อมูล LG ครบ, ค่าธรรมเนียมต่อเนื่อง. | A-27 |
| `PGS10-NPL-001` | NPL Date & Seasoning | REQUIRED_HARD | NPL-001 | NPL-001, NPL-002 (01) | ALIGNED_AFTER_DECISION | DEC-01, DEC-29, DEC-31 | 6 เดือนปฏิทิน (Small Biz, Start up) / 9 เดือน (SMEs). ใช้ `npl_date` จากข้อมูล FI ที่ verify แล้ว (ห้าม derive จาก default_date). **Anchor = `lg_issue_date` (APPROVED_OPERATIONAL, ไม่ใช่ OFFICIAL)**. ไม่มี npl_date → HOLD `NPL_DATE_MISSING`; anchor พิสูจน์ไม่ได้ → HOLD `NPL_ANCHOR_DATE_UNDEFINED`; verify ครบแล้วไม่พ้น seasoning → **FAIL** `NPL_SEASONING_NOT_MET`. | — |
| `PGS10-TXN-001` | Transaction Classification | REQUIRED_HARD | STM-001 (ส่วนจำแนก) | STM-001 (02) | DIFFERS | DEC-02, DEC-12, DEC-14 | ID ใหม่ตาม DEC-14. Types = PAYMENT, DRAWDOWN, INTEREST_ACCRUAL, FEE, ADJUSTMENT, REVERSAL, PRINCIPAL_ADJUSTMENT, UNKNOWN. Code map ต่อ bank_id พร้อม approval_status. 6921/6680 UNVERIFIED (P เคยใส่ 6921 เป็น release โดยไม่มีหลักฐาน). | A-14 |
| `PGS10-STM-001` | Last Actual Payment | REQUIRED_HARD | STM-001 (ส่วน Last Payment) | STM-002 (02) | ALIGNED | DEC-14, DEC-34 | `last_actual_payment_date = max(PAYMENT)` + `payment_history_status`: NO_PAYMENT_VERIFIED (Statement ครบ Origination→Cut-off ไม่มี gap ไม่มี PAYMENT) = PASS ไม่ใช่ Error; INCOMPLETE → HOLD `PAYMENT_HISTORY_INCOMPLETE`. | Q-09 (default evidence เมื่อไม่เคยชำระ) |
| `PGS10-STM-002` | Statement Cut-off vs Later Payments | REQUIRED_HARD | STM-002 | — (P ไม่มี) | RESTORED | DEC-12 | P ตัดออก (เคส Regression 66-044366). เติมกลับ: มี Payment หลัง cut-off และไม่มี Statement ใหม่ → HOLD `PAYMENT_AFTER_STATEMENT_CUTOFF`. ID นี้ M§41 ไม่ได้กำหนด (ใช้ของ D). | — |
| `PGS10-DEF-001` | Default Date ≥ Last Actual Payment | REQUIRED_HARD | DEF-001 | DEF-001 (02) | ALIGNED | DEC-34 | `default_date >= last_actual_payment_date`. ถ้า NO_PAYMENT_VERIFIED → ต้องใช้ alternative evidence (due-date/FI evidence) ตาม Rule ที่ยังไม่อนุมัติ (PRM-055) → Safe-Hold HOLD `POLICY_PARAMETER_UNRESOLVED`. | Q-09 |
| `PGS10-DEF-002` | Post-Default Payment Exception | CONDITIONAL | DEF-002 | DEF-002 (02) | ALIGNED_AFTER_DECISION | DEC-04, DEC-13 | ตรงกันในสาระ 5 ข้อ. reason: `EXCEPTION_LETTER_MISSING` (D) → `POST_DEFAULT_SUPPORT_MISSING` (P). Identifier ไม่ลิงก์ → `IDENTIFIER_LINKAGE_UNRESOLVED`. ผ่าน = PASS_WITH_SUPPORT (`support_used=true`). | A-16 |
| `PGS10-FUP-001` | Follow-up / Tracking Evidence | REQUIRED_HARD | FUP-001 | FUP-001 (02) | ALIGNED | — | ตรงกัน. วันที่ติดตาม ≠ วันปรับโครงสร้าง (L-14). | — |
| `PGS10-RST-001` | Restructure Requirement / Route | CONDITIONAL | RST-001 | RST-001 (01) | ALIGNED | DEC-20, DEC-24, DEC-32 | Route: `NORMAL_RESTRUCTURE_PATH` \| `UNCONTACTABLE_EXCEPTION_PATH` \| `NOT_REQUIRED` (path ไม่มี (ค): Start up, หลังพ้น 5 ปี). restructure_date=null ไม่ผ่านอัตโนมัติ. | — |
| `PGS10-RST-002` | Uncontactable / Unable-to-agree Exception | CONDITIONAL | RST-002 | RST-002 (01), RST-OP-002 (02) | ALIGNED_AFTER_DECISION | DEC-20, DEC-32, DEC-36 | OFFICIAL (หน้า 7 กรณี 1 และ 3): start = first_uncontactable_date หรือ first_contacted_but_restructure_failed_date; maturity = +7 เดือนปฏิทิน; + Certified Tracking Report + หนังสือบอกกล่าว/บอกเลิก ≥ 1 → PASS_WITH_SUPPORT `support_code=UNCONTACTABLE_7_MONTH_EXCEPTION`. ไม่ขยายไป Start up. | — |
| `PGS10-RST-003` | Restructure Date Evidence | CONDITIONAL | RST-003 | RST-OP-001 (02) | ALIGNED | DEC-14 | L1 เอกสารปรับโครงสร้าง → L2 หัว Statement → L3 หน้าจอ. `CHECK_STATEMENT_HEADER` (D) → `RESTRUCTURE_DATE_SEMANTICS_UNRESOLVED` (P). | — |
| `PGS10-DMD-001` | Demand Letter Identity & Existence | REQUIRED_HARD | DMD-001 | DMD-001 (02), DMD-POL-001 (01) | ALIGNED | — | ตรงกัน: ผู้กู้/Account/วันที่/วงเงิน/ยอดรวมสอดคล้อง + มีหนังสือ ≥ 1 ฉบับ. | — |
| `PGS10-DMD-002` | Demand Principal as of Demand Date | REQUIRED_HARD | DMD-002 | DMD-002 (02) | ALIGNED_AFTER_DECISION | DEC-08, DEC-16 | `demand_principal == principal_as_of_demand_date`. ไม่มี Snapshot → `DERIVED_AS_OF_DEMAND` เมื่อพิสูจน์ต่อเนื่อง/ไม่มี gap/ไม่มีรายการกระทบเงินต้นหลัง demand (หรือ reconstruct ได้) → PASS_WITH_SUPPORT; พิสูจน์ไม่ได้ → HOLD `DEMAND_PRINCIPAL_AS_OF_DATE_UNVERIFIED` (ห้ามใช้เหตุผล 'เท่ากันพอดี'). | — |
| `PGS10-DMD-003` | Demand Waiting Period | CONDITIONAL | DMD-003 | DMD-POL-002 (01) | ALIGNED | — | ตัวเลข 1 เดือน = OFFICIAL (M); วันตั้งต้นและวิธีนับเป็น OPEN. | A-21 (Safe-Hold) |
| `PGS10-HIS-001` | Historical Debt Snapshot | REQUIRED_HARD | HIS-001 | HIS-001 (02) | ALIGNED_AFTER_DECISION | DEC-07 | ตรงกัน: HOLD `HISTORICAL_BALANCE_MISMATCH`. ต้องแก้ Master Audit §27 (ยังเขียนเป็น Observation). | A-04, A-20 |
| `PGS10-PST-001` | Postal Delivery Evidence | REQUIRED_HARD | PST-001 | PST-001, PST-002 (02) | DIFFERS | DEC-14 | รวมสอง branch ไว้ใน ID เดียวตาม M§41: DELIVERED (วันที่รับ + ลายมือชื่อผู้รับ/ผู้รับแทน + ที่อยู่) \| RETURNED (ซองตีกลับ + ที่อยู่). ชื่อตัวบรรจง/ลายเซ็นเจ้าหน้าที่ไปรษณีย์ไม่พอ (ตรงกันใน M, D, P). | — |
| `PGS10-PST-002` | Address Match | REQUIRED_HARD | PST-002 | PST-003 (02) | DIFFERS | DEC-12, DEC-14 | P เหลือแค่ 'documented_address_set'; เติมกลับ: normalize ต./อ./จ./ม., บ้านเลขที่ห้าม fuzzy, ใช้ที่อยู่ล่าสุดเมื่อมีเอกสารแจ้งเปลี่ยน. | A-18 (วันที่มีผล) |
| `PGS10-PST-003` | Postal Linkage | CONDITIONAL | — (D รวมใน PST-001) | PST-004 (02) | NEW_CANONICAL | DEC-14 | ID ใหม่: ใบตอบรับ/ซองต้องเป็นชิ้นเดียวกับที่ส่ง. ไม่ตรง/พิสูจน์ไม่ได้ → HOLD `POSTAL_LINKAGE_UNRESOLVED`. | — |
| `PGS10-CUR-001` | Current Principal | REQUIRED_HARD | CUR-001 (ส่วน principal) | CUR-001 (02) | ALIGNED_AFTER_DECISION | DEC-09 | Exact, tolerance = 0 เสมอ (ห้ามเปิด tolerance กับ principal). | — |
| `PGS10-CUR-002` | Current Interest / Total | REQUIRED_HARD | CUR-001 (ส่วน interest/total) | CUR-002 (02) | DIFFERS | DEC-09, DEC-18 | Tolerance ปิด → HOLD `NUMERIC_VARIANCE` + review_flag OBSERVATION_CANDIDATE. ถ้าอนุมัติภายหลัง: ≤ 0.01 บาท เฉพาะ current_interest/current_total ที่มาจาก rounding ของ interest ตัวเดียว; Historical ห้ามใช้. | — |
| `PGS10-CLM-001` | Claim Filing Window | REQUIRED_HARD | CLM-001 | CLM-POL-001 (01) | ALIGNED | DEC-31 | ตั้งแต่ปีที่ 2 ของอายุ LG ถึง 1 ปีหลัง LG ฉบับสุดท้ายสิ้นอายุ. ยังไม่ถึงเวลา → HOLD `CLAIM_FILING_NOT_YET_OPEN` (Pending); หมดสิทธิและวันที่ verify ครบ → FAIL `CLAIM_FILING_WINDOW_EXPIRED`. | A-21 (Safe-Hold) |
| `PGS10-CLM-002` | Coverage Ratio | REQUIRED_HARD | CLM-002 | COV-001 (01), CLM-002 (02) | ALIGNED_AFTER_DECISION | DEC-11, DEC-21, DEC-30 | Coverage ตาม **contractual LG tenor** (guarantee_term → lg_issue_date+lg_expiry_date → HOLD `LG_TENOR_UNDETERMINABLE`); ≤5 ปี = 70%, >5 ปี = 100%; Start up 100/100. ไม่ใช้ Claim/NPL/Default/Demand เลือก tier (DEC-30). | Q-10 (LG ที่ถูกต่ออายุ) |
| `PGS10-CLM-003` | Claim Base | REQUIRED_HARD | CLM-003 | CLM-POL-002 (01), CLM-001 (02) | ALIGNED | DEC-09, DEC-14 | `min(current_principal, current_guarantee_obligation)` + ตรวจ mode. ห้าม tolerance. ⚠ P 02 เรียก `CLM-001`. | A-24 |
| `PGS10-CLM-004` | Claim Calculation | REQUIRED_HARD | CLM-004 | CLM-POL-003, CLM-003 (02) | ALIGNED | DEC-09, DEC-14 | `round_half_up(base × ratio, 2)` Decimal; เทียบหน้าจอ/คำขอ/ยอดอนุมัติ. ห้าม tolerance. ⚠ P 02 เรียก `CLM-003`. | — |
| `PGS10-CAP-001` | CLAIM MAX / Package Capacity | REQUIRED_HARD | CAP-001 | CAP-001 (01), CAP-OP-001 (02) | ALIGNED_AFTER_DECISION | DEC-06, DEC-09, DEC-17 | Arithmetic ตรงทุกสตางค์. Stage-aware: PRE_REVIEW NOT_TESTABLE ไม่กระทบ; FINAL_APPROVAL ข้อมูล Package ไม่ครบ → NOT_TESTABLE + case HOLD + `PACKAGE_DEFINITION_REQUIRED` (ไม่ใช่ FAIL). | — |
| `PGS10-TIME-001` | Timeline Integrity | REQUIRED_HARD | TIME-001 | TIME-001 (02) | ALIGNED | — | ตรงกัน. Default → Later Payment ได้เมื่อ DEF-002 ผ่านด้วย Support. | — |
| `PGS10-NPY-001` | Consecutive Non-payment (ง) | REQUIRED_HARD | — | — | NEW_CANONICAL | DEC-44, DEC-45 | เงื่อนไข (ง) ของหลักเกณฑ์: SMEs ไม่ชำระหนี้ติดต่อกัน 3 เดือนนับแต่ผิดนัด. Candidate เดิมไม่มี control นี้กับ Case ใด; เพิ่มเป็นกฎใหม่ (นิยามการตรวจเป็นข้อเสนอ — Q-11). | A-47, Q-11 |

## 7. Status model และการรวมผลระดับเคส (ตาม DEC-04/05/06/09)

- `case_status` ∈ PASS · PASS_WITH_SUPPORT · PASS_WITH_OBSERVATION · HOLD · FAIL (ห้ามค่าอื่น)
- `control_status` ∈ PASS · PASS_WITH_SUPPORT · OBSERVATION · HOLD · FAIL · NOT_APPLICABLE · NOT_TESTABLE
- `review_flag` ∈ OBSERVATION_CANDIDATE (**ย้ายจาก control_status ใน D**, DEC-09) · FORMAT_NORMALIZED (DEC-15: control_status=PASS แต่เคสเป็น PASS_WITH_OBSERVATION) · `support_used` = boolean ระดับเคส
- Stage: `review_stage` ∈ PRE_REVIEW | FINAL_APPROVAL — CAP-001 เป็น REQUIRED_HARD เฉพาะ FINAL_APPROVAL (DEC-17)
- ลำดับรวมผล:
  1. มี Control `FAIL` → **FAIL**
  2. มี `HOLD` หรือ `NOT_TESTABLE` ของ Control ที่เป็น REQUIRED_HARD → **HOLD** (NUMERIC_VARIANCE ก็เป็น HOLD จนเปิด Config/มี override)
  3. มี `OBSERVATION` หรือ review_flag `FORMAT_NORMALIZED` → **PASS_WITH_OBSERVATION** (ถ้ามี Support ด้วย: `support_used=true`)
  4. มี `PASS_WITH_SUPPORT` → **PASS_WITH_SUPPORT**
  5. มิฉะนั้น → **PASS**
- `HOLD ≠ FAIL`; ห้ามสร้างสถานะ/รหัสแบบ `HOLD_*`

## 8. จุดที่ผมเปลี่ยนจากร่าง D หรือแก้ข้อสังเกตเดิมของผม

| เรื่อง | ก่อน | ตอนนี้ | เหตุ |
|---|---|---|---|
| Start up seasoning | ผมรายงานว่า P 'ไม่มีที่มา' | P ถูก: 6 เดือน OFFICIAL | DEC-01 |
| 0.01 บาท | control_status `OBSERVATION_CANDIDATE` | HOLD + `NUMERIC_VARIANCE` + review_flag | DEC-09 |
| Demand fallback | ใช้ Latest Statement เมื่อเท่ากัน | ใช้ได้เฉพาะพิสูจน์ได้ว่าไม่มี principal-changing txn หลัง demand (ขอยืนยัน — Q-02) | DEC-08 |
| VIS-001 | ครอบเอกสาร Critical ทุกชนิด | เฉพาะหนังสือยืนยัน; อื่นย้ายไป VIS-002 | M§41, P |
| STM-001 | รวมจำแนก + Last Payment | แยก `TXN-001` + `STM-001` | DEC-14 |
| CUR-001 | รวมเงินต้นกับดอกเบี้ย/รวม | แยก `CUR-001` (tolerance=0) / `CUR-002` | DEC-09, P |
| reason codes | 77 ชื่อ | 82 ชื่อ (รวมชื่อให้ตรง P เมื่อความหมายเท่ากัน) | DEC-05 |
| UT-CUR-001 ใน Golden | expected OBSERVATION_CANDIDATE | expected HOLD/NUMERIC_VARIANCE | DEC-09 |
| ผมไม่ได้ยกประเด็น | 'Thai Credit-only' ของ Contract date | เพิ่มเป็น A-29 (FI อื่น → HOLD) | DEC-10 |
| FORMAT_VARIANCE (r2) | control_status OBSERVATION | control_status PASS + review_flag FORMAT_NORMALIZED (เฉพาะ field ที่ประกาศ) | DEC-15 |
| NO_PAYMENT_FOUND (r2) | Observation อัตโนมัติ | HOLD (ไม่ใช่ format-only) | DEC-15 (การตีความของผม) |
| PAID_PENDING_MISSING (r2) | reason ของ CAP-001 | รวมเป็น detail ของ PACKAGE_DEFINITION_REQUIRED (NOT_TESTABLE) | DEC-17 |
| DMD-002 reason (r2) | DEMAND_PRINCIPAL_UNRECONCILED | DEMAND_PRINCIPAL_AS_OF_DATE_UNVERIFIED + DERIVED_AS_OF_DEMAND | DEC-16 |
| HP/Leasing (r2) | ELIGIBILITY_HIRE_PURCHASE_LEASING | ELIGIBILITY_PROHIBITED_CREDIT_TYPE | DEC-27 |

## 9. สิ่งที่ P ทำถูกและ D ควรรับ

- เอา 'ตัวเลขนโยบายที่ยังไม่ยืนยัน' ออกจากตัวกฎ (ตอนนี้เก็บใน Policy_Parameter_Table พร้อมสถานะ แทนการตัดทิ้ง)
- แยก CUR-002, VIS-002, PST-004 (→ PST-003), Transaction mapping เป็นหน่วยของตัวเอง
- ชื่อ route `UNCONTACTABLE_EXCEPTION_PATH` ไม่ผูกกับ '7 เดือน' (ตัวเลขยัง OPEN)
- Governance gates GOV-001…003 → ย้ายเป็น config (`npl.allow_default_date_as_npl_date`, `tolerance.enabled`, `demand.*`)

## 10. คำถาม

ตอบแล้ว: Q-01 → DEC-15, Q-02 → DEC-16, Q-03 → DEC-17, Q-04 → DEC-18, Q-05 → DEC-31, Q-06 → DEC-32, Q-07 → DEC-33, Q-08 → DEC-39, Q-09 → DEC-40, Q-10 → DEC-41

คำถามใหม่ (ไม่ขวาง Freeze — Safe-Hold รองรับ):

| ID | คำถาม | ข้อเสนอของผม |
|---|---|---|

รายการขวาง Freeze ทั้งหมด: .
