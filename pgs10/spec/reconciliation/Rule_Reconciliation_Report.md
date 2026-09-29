# Rule Reconciliation Report

**เวอร์ชัน:** 1.2.0-RECONCILIATION · **สถานะ:** RECONCILIATION_DRAFT — **ไม่ใช่ Spec Candidate ไม่ใช่การ Freeze** · **Rule Engine / tests เดิม / Spec ร่าง v1.0 / Pack v1.1.0: ไม่ถูกแก้**

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

## 3. ข้อจำกัดของหลักฐาน (สำคัญ)

- DEC-01, DEC-02, DEC-03 อ้างหลักฐานจากไฟล์เคส (หลักเกณฑ์ PGS 10 ฉบับทางการ, Statement ของ Thai Credit, รายงานติดตามของเคส 66-037410) — **ไฟล์เหล่านั้นไม่ได้ถูกส่งเข้า session นี้** ผมจึงยืนยันเองไม่ได้ ทุกข้อที่พึ่งหลักฐานนี้ถูกบันทึกเป็น `user-attested` (Policy_Parameter_Table → `evidence_source`) และต้องเติม เอกสาร/หน้า ก่อน Freeze
- ตัวเลขนโยบายที่ติดป้าย `OFFICIAL` มาจากการอ้างของ Master Audit เท่านั้น ยังไม่ได้เทียบกับหลักเกณฑ์ทางการฉบับจริง
- LG 6 เลขใน P ที่ไม่ปรากฏในเอกสารใดของ session นี้ (66-040977, 66-042400, 66-047199, 66-068610, 66-100753, 66-011787) ยังไม่มีคำยืนยัน

## 4. วิธีตรวจ

1. จับคู่ทุก Rule ID และ reason code ของ D และ P เข้ากับชุด Canonical (Master Audit §41 เป็นหลัก — DEC-14) ด้วยตารางที่ตรวจโดยสคริปต์: ทุก ID/ชื่อต้อง resolve ได้ ไม่มี reason code ขึ้นต้น `HOLD_`/`FAIL_` (30 alias, 44 rule alias, 0 unresolved)
2. เทียบเนื้อหาทีละ Rule (ตารางข้อ 6) แล้วตัดสินตาม DEC; ที่ DEC ไม่ครอบคลุมบันทึกเป็นข้อเสนอ/คำถาม
3. ตรวจตัวเลขซ้ำ (เช่น เงินสมทบ Small Biz รวม 12.50%, 66,477.40 × 70% = 46,534.18)

## 5. ผลโดยรวม

- Canonical rules **32** รายการ: ตรงกัน `ALIGNED` 14, ตรงหลังคำตัดสิน `ALIGNED_AFTER_DECISION` 8, ต่างกัน `DIFFERS` 7, เติมกลับ `RESTORED` 1, ID ใหม่ `NEW_CANONICAL` 2
- Reason codes Canonical **79** ตัว (รวม 3 ตัวที่ **เสนอใหม่**: `ELIGIBILITY_NOT_BUSINESS_PURPOSE`, `CONTRACT_DATE_BASIS_UNDEFINED`, `PACKAGE_DEFINITION_REQUIRED`)
- ทะเบียน Conflict 39 รายการ: RESOLVED 17, ยังไม่ปิด 22, **ขวาง Freeze 13** (ดู `Conflict_Register.md`)
- **ID ที่ต้องระวังที่สุด:** 10 รายการเป็น 'ID เดิมความหมายใหม่' เช่น `PGS10-STM-001` (P = Transaction mapping, Canonical = Last Actual Payment), `PGS10-CLM-001` (P = Claim Base, Canonical = Filing Window). ห้าม resolve alias โดยไม่ระบุ `@version`

## 6. Rule-by-Rule

`requirement`: REQUIRED_HARD = ตรวจไม่ได้แล้วเคส HOLD (DEC-06) · CONDITIONAL = ใช้เมื่อเงื่อนไข `applicable_when` เป็นจริง ไม่เช่นนั้น NOT_APPLICABLE
`agreement`: ALIGNED · ALIGNED_AFTER_DECISION · DIFFERS · RESTORED (P ตัดออก) · NEW_CANONICAL

| Canonical ID | ชื่อ | requirement | D | P | agreement | DEC | สรุป / ผลที่ใช้ | ค้างอยู่ |
|---|---|---|---|---|---|---|---|---|
| `PGS10-ELIG-001` | Project / Product Eligibility | REQUIRED_HARD | ELIG-001 | POL-001, POL-003 (01) | DIFFERS | DEC-12 | รวมของ D และ P: PGS10 rev.5 + Product; สินเชื่อใหม่; วัตถุประสงค์ธุรกิจ; ไม่ใช่เช่าซื้อ/ลิสซิ่ง; ค้ำต่อครั้ง ≥ 10,000; รวมต่อราย ≤ 40 ล้าน; SSMEs Small Biz ≤ 200,000 / Start up ≤ 100,000. P ตัดเงื่อนไข HP-Leasing/new-business/ตัวเลขทั้งหมดออก → เติมกลับ. | A-07, A-23 |
| `PGS10-ID-001` | Identity Integrity | REQUIRED_HARD | ID-001 | ID-001 (02) | DIFFERS | DEC-03, DEC-12 | P อนุญาต Normalize แค่ตัดขีด/ช่องว่าง และให้ FAIL เมื่อเป็นคนละบุคคล; D มี Leading-zero → FORMAT_VARIANCE และเลขภายในต่าง → VERIFY_REFERENCE_MAPPING. ใช้ D (สอดคล้อง R§5) + กฎห้ามแก้ LG อัตโนมัติ (DEC-03). | A-07 (FAIL vs HOLD เมื่อคนละบุคคล) |
| `PGS10-DOC-001` | Approval / Contract Page Completeness | REQUIRED_HARD | DOC-001 | DOC-001 (02) | ALIGNED | — | ตรงกัน: นับ 'หน้าเอกสาร' ไม่ใช่หน้า PDF. reason_code แม่ = `APPROVAL_DOCUMENT_INCOMPLETE` (P) + `detail_code` = PAGE_SEQUENCE_GAP \| DOCUMENT_TRUNCATED \| PAGE_UNREADABLE (D). | A-28 |
| `PGS10-VIS-001` | Confirmation Letter Visual Completeness | CONDITIONAL | VIS-001 (ครอบทุกเอกสาร) | VIS-001 (02) | ALIGNED_AFTER_DECISION | DEC-13 | แคบลงให้ตรง M§41: เฉพาะหนังสือยืนยัน (แยกเอกสารอื่นไป VIS-002). รายการที่ต้องเห็น: เสนอ 12 (R) — P/M มี 10. เพิ่ม `VISUAL_RECHECK_REQUIRED` (GT-013). | A-16 |
| `PGS10-VIS-002` | Critical Evidence Visual Authority | CONDITIONAL | VIS-001 (ส่วนเอกสารอื่น) | VIS-002 (02) | NEW_CANONICAL | DEC-14 | แยกออกจาก VIS-001 ตาม P: Visual check ของ Approval sequence / Demand / Tracking / Postal / Returned Envelope / Restructure Agreement. Text Layer ค้นได้แต่ทดแทนไม่ได้. | A-05 |
| `PGS10-CONTRACT-001` | Contract / Approval Date | REQUIRED_HARD | CONTRACT-001 | CON-001 (02) | DIFFERS | DEC-10 | P จำกัดกฎเป็น Thai Credit; R§6/M§9 เขียนเป็นกฎทั่วไป → ตัดสิน: Thai Credit only. FI อื่น → HOLD `CONTRACT_DATE_BASIS_UNDEFINED` (รหัสใหม่ที่เสนอ). | A-29 (ใหม่) |
| `PGS10-LG-001` | Guarantee Validity | REQUIRED_HARD | LG-001 | POL-002 (01) | ALIGNED | — | ทั้ง D และ P ไม่มี Logic ที่เป็นทางการ (M ให้ชื่อเท่านั้น): อายุ LG ≤ 10 ปี, ข้อมูล LG ครบ, ค่าธรรมเนียมต่อเนื่อง. | A-27 |
| `PGS10-NPL-001` | NPL Date & Seasoning | REQUIRED_HARD | NPL-001 | NPL-001, NPL-002 (01) | ALIGNED_AFTER_DECISION | DEC-01 | 6 เดือนปฏิทิน สำหรับ Small Biz และ Start up (OFFICIAL); SMEs 9 เดือน. ใช้ `npl_date` จากข้อมูล FI เท่านั้น. ไม่มี → HOLD `NPL_DATE_MISSING`. P ที่เขียน Small Biz/Start up รวมกันถูกต้อง (D เคยเห็นว่าไม่มีที่มา). | A-30 (anchor date) |
| `PGS10-TXN-001` | Transaction Classification | REQUIRED_HARD | STM-001 (ส่วนจำแนก) | STM-001 (02) | DIFFERS | DEC-02, DEC-12, DEC-14 | ID ใหม่ตาม DEC-14. Types = PAYMENT, DRAWDOWN, INTEREST_ACCRUAL, FEE, ADJUSTMENT, REVERSAL, PRINCIPAL_ADJUSTMENT, UNKNOWN. Code map ต่อ bank_id พร้อม approval_status. 6921/6680 UNVERIFIED (P เคยใส่ 6921 เป็น release โดยไม่มีหลักฐาน). | A-14 |
| `PGS10-STM-001` | Last Actual Payment | REQUIRED_HARD | STM-001 (ส่วน Last Payment) | STM-002 (02) | ALIGNED | DEC-14 | `max(transaction_date where type=PAYMENT)`. ID ตาม M§41 (P ใช้ STM-002 → alias). | A-15 |
| `PGS10-STM-002` | Statement Cut-off vs Later Payments | REQUIRED_HARD | STM-002 | — (P ไม่มี) | RESTORED | DEC-12 | P ตัดออก (เคส Regression 66-044366). เติมกลับ: มี Payment หลัง cut-off และไม่มี Statement ใหม่ → HOLD `PAYMENT_AFTER_STATEMENT_CUTOFF`. ID นี้ M§41 ไม่ได้กำหนด (ใช้ของ D). | — |
| `PGS10-DEF-001` | Default Date ≥ Last Actual Payment | REQUIRED_HARD | DEF-001 | DEF-001 (02) | ALIGNED | — | ตรงกัน. `<` → เรียก DEF-002. | — |
| `PGS10-DEF-002` | Post-Default Payment Exception | CONDITIONAL | DEF-002 | DEF-002 (02) | ALIGNED_AFTER_DECISION | DEC-04, DEC-13 | ตรงกันในสาระ 5 ข้อ. reason: `EXCEPTION_LETTER_MISSING` (D) → `POST_DEFAULT_SUPPORT_MISSING` (P). Identifier ไม่ลิงก์ → `IDENTIFIER_LINKAGE_UNRESOLVED`. ผ่าน = PASS_WITH_SUPPORT (`support_used=true`). | A-16 |
| `PGS10-FUP-001` | Follow-up / Tracking Evidence | REQUIRED_HARD | FUP-001 | FUP-001 (02) | ALIGNED | — | ตรงกัน. วันที่ติดตาม ≠ วันปรับโครงสร้าง (L-14). | — |
| `PGS10-RST-001` | Restructure Requirement / Route | CONDITIONAL | RST-001 | RST-001 (01) | ALIGNED | — | Route enum: `NORMAL_RESTRUCTURE_PATH` \| `UNCONTACTABLE_EXCEPTION_PATH` (P; alias `UNCONTACTABLE_7_MONTH_EXCEPTION` ของ D/M) \| `NOT_REQUIRED_AFTER_5Y`. restructure_date=null ไม่ผ่านอัตโนมัติ. | A-10 |
| `PGS10-RST-002` | Uncontactable / Unable-to-agree Exception | CONDITIONAL | RST-002 | RST-002 (01), RST-OP-002 (02) | ALIGNED | — | จำนวนเดือน (7) เป็น parameter สถานะ OPEN; ปิดไว้ (`enable_uncontactable_exception=false`) จนกว่าจะยืนยัน. รวม P RST-OP-002 เข้าที่นี่. | A-10 |
| `PGS10-RST-003` | Restructure Date Evidence | CONDITIONAL | RST-003 | RST-OP-001 (02) | ALIGNED | DEC-14 | L1 เอกสารปรับโครงสร้าง → L2 หัว Statement → L3 หน้าจอ. `CHECK_STATEMENT_HEADER` (D) → `RESTRUCTURE_DATE_SEMANTICS_UNRESOLVED` (P). | — |
| `PGS10-DMD-001` | Demand Letter Identity & Existence | REQUIRED_HARD | DMD-001 | DMD-001 (02), DMD-POL-001 (01) | ALIGNED | — | ตรงกัน: ผู้กู้/Account/วันที่/วงเงิน/ยอดรวมสอดคล้อง + มีหนังสือ ≥ 1 ฉบับ. | — |
| `PGS10-DMD-002` | Demand Principal as of Demand Date | REQUIRED_HARD | DMD-002 | DMD-002 (02) | ALIGNED_AFTER_DECISION | DEC-08 | ตรงกันแล้วหลัง DEC-08. ส่วนที่ต้องยืนยัน: fallback ไป Latest Statement ได้เมื่อพิสูจน์ได้ว่าไม่มี principal-changing transaction หลัง demand_date เท่านั้น. `ASOF_DEMAND_PRINCIPAL_REQUIRED` → `DEMAND_PRINCIPAL_UNRECONCILED`. | Q-02 |
| `PGS10-DMD-003` | Demand Waiting Period | CONDITIONAL | DMD-003 | DMD-POL-002 (01) | ALIGNED | — | ตัวเลข 1 เดือน = OFFICIAL (M); วันตั้งต้นและวิธีนับเป็น OPEN. | A-21 |
| `PGS10-HIS-001` | Historical Debt Snapshot | REQUIRED_HARD | HIS-001 | HIS-001 (02) | ALIGNED_AFTER_DECISION | DEC-07 | ตรงกัน: HOLD `HISTORICAL_BALANCE_MISMATCH`. ต้องแก้ Master Audit §27 (ยังเขียนเป็น Observation). | A-04, A-20 |
| `PGS10-PST-001` | Postal Delivery Evidence | REQUIRED_HARD | PST-001 | PST-001, PST-002 (02) | DIFFERS | DEC-14 | รวมสอง branch ไว้ใน ID เดียวตาม M§41: DELIVERED (วันที่รับ + ลายมือชื่อผู้รับ/ผู้รับแทน + ที่อยู่) \| RETURNED (ซองตีกลับ + ที่อยู่). ชื่อตัวบรรจง/ลายเซ็นเจ้าหน้าที่ไปรษณีย์ไม่พอ (ตรงกันใน M, D, P). | — |
| `PGS10-PST-002` | Address Match | REQUIRED_HARD | PST-002 | PST-003 (02) | DIFFERS | DEC-12, DEC-14 | P เหลือแค่ 'documented_address_set'; เติมกลับ: normalize ต./อ./จ./ม., บ้านเลขที่ห้าม fuzzy, ใช้ที่อยู่ล่าสุดเมื่อมีเอกสารแจ้งเปลี่ยน. | A-18 (วันที่มีผล) |
| `PGS10-PST-003` | Postal Linkage | CONDITIONAL | — (D รวมใน PST-001) | PST-004 (02) | NEW_CANONICAL | DEC-14 | ID ใหม่: ใบตอบรับ/ซองต้องเป็นชิ้นเดียวกับที่ส่ง. ไม่ตรง/พิสูจน์ไม่ได้ → HOLD `POSTAL_LINKAGE_UNRESOLVED`. | — |
| `PGS10-CUR-001` | Current Principal | REQUIRED_HARD | CUR-001 (ส่วน principal) | CUR-001 (02) | ALIGNED_AFTER_DECISION | DEC-09 | Exact, tolerance = 0 เสมอ (ห้ามเปิด tolerance กับ principal). | — |
| `PGS10-CUR-002` | Current Interest / Total | REQUIRED_HARD | CUR-001 (ส่วน interest/total) | CUR-002 (02) | DIFFERS | DEC-09 | แยกจาก CUR-001 ตาม P. ต่างเล็กน้อยและ tolerance ปิด → HOLD `NUMERIC_VARIANCE` + review_flag OBSERVATION_CANDIDATE (แก้จาก D ที่เป็น control_status). | Q-04 |
| `PGS10-CLM-001` | Claim Filing Window | REQUIRED_HARD | CLM-001 | CLM-POL-001 (01) | ALIGNED | DEC-14 | ID ตาม M§41. ⚠ P 02 ใช้ `CLM-001` แทน Claim Base — ห้าม resolve alias โดยไม่ระบุเวอร์ชัน. | A-21 |
| `PGS10-CLM-002` | Coverage Ratio | REQUIRED_HARD | CLM-002 | COV-001 (01), CLM-002 (02) | ALIGNED_AFTER_DECISION | DEC-11 | Small Biz ≤ fifth anniversary = 70%, > = 100%; Start up 100% (M§7); Smart* = OPEN. Lookup ตาม Product + อายุ LG + เวอร์ชันกฎ. | A-11, A-12 |
| `PGS10-CLM-003` | Claim Base | REQUIRED_HARD | CLM-003 | CLM-POL-002 (01), CLM-001 (02) | ALIGNED | DEC-09, DEC-14 | `min(current_principal, current_guarantee_obligation)` + ตรวจ mode. ห้าม tolerance. ⚠ P 02 เรียก `CLM-001`. | A-24 |
| `PGS10-CLM-004` | Claim Calculation | REQUIRED_HARD | CLM-004 | CLM-POL-003, CLM-003 (02) | ALIGNED | DEC-09, DEC-14 | `round_half_up(base × ratio, 2)` Decimal; เทียบหน้าจอ/คำขอ/ยอดอนุมัติ. ห้าม tolerance. ⚠ P 02 เรียก `CLM-003`. | — |
| `PGS10-CAP-001` | CLAIM MAX / Package Capacity | REQUIRED_HARD | CAP-001 | CAP-001 (01), CAP-OP-001 (02) | ALIGNED_AFTER_DECISION | DEC-06, DEC-09 | Arithmetic ตรงทุกสตางค์; ไม่มี paid/pending → NOT_TESTABLE `PAID_PENDING_MISSING`; นิยาม Package ไม่ชัด → `PACKAGE_DEFINITION_REQUIRED`. เสนอให้เป็น REQUIRED_HARD (จึง HOLD ทั้งเคส). | Q-03 |
| `PGS10-TIME-001` | Timeline Integrity | REQUIRED_HARD | TIME-001 | TIME-001 (02) | ALIGNED | — | ตรงกัน. Default → Later Payment ได้เมื่อ DEF-002 ผ่านด้วย Support. | — |

## 7. Status model และการรวมผลระดับเคส (ตาม DEC-04/05/06/09)

- `case_status` ∈ PASS · PASS_WITH_SUPPORT · PASS_WITH_OBSERVATION · HOLD · FAIL (ห้ามค่าอื่น)
- `control_status` ∈ PASS · PASS_WITH_SUPPORT · OBSERVATION · HOLD · FAIL · NOT_APPLICABLE · NOT_TESTABLE
- `review_flag` = OBSERVATION_CANDIDATE (**ย้ายจาก control_status ใน D**), `support_used` = boolean ระดับเคส
- ลำดับรวมผล:
  1. มี Control `FAIL` → **FAIL**
  2. มี `HOLD` หรือ `NOT_TESTABLE` ของ Control ที่เป็น REQUIRED_HARD → **HOLD** (NUMERIC_VARIANCE ก็เป็น HOLD จนเปิด Config/มี override)
  3. มี `OBSERVATION` → **PASS_WITH_OBSERVATION** (ถ้ามี Support ด้วย: `support_used=true`)
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
| reason codes | 77 ชื่อ | 79 ชื่อ (รวมชื่อให้ตรง P เมื่อความหมายเท่ากัน) | DEC-05 |
| UT-CUR-001 ใน Golden | expected OBSERVATION_CANDIDATE | expected HOLD/NUMERIC_VARIANCE | DEC-09 |
| ผมไม่ได้ยกประเด็น | 'Thai Credit-only' ของ Contract date | เพิ่มเป็น A-29 (FI อื่น → HOLD) | DEC-10 |

## 9. สิ่งที่ P ทำถูกและ D ควรรับ

- เอา 'ตัวเลขนโยบายที่ยังไม่ยืนยัน' ออกจากตัวกฎ (ตอนนี้เก็บใน Policy_Parameter_Table พร้อมสถานะ แทนการตัดทิ้ง)
- แยก CUR-002, VIS-002, PST-004 (→ PST-003), Transaction mapping เป็นหน่วยของตัวเอง
- ชื่อ route `UNCONTACTABLE_EXCEPTION_PATH` ไม่ผูกกับ '7 เดือน' (ตัวเลขยัง OPEN)
- Governance gates GOV-001…003 → ย้ายเป็น config (`npl.allow_default_date_as_npl_date`, `tolerance.enabled`, `demand.*`)

## 10. คำถามที่ต้องการคำตอบ (ก่อน Freeze Gate Review)

| ID | คำถาม | ข้อเสนอของผม |
|---|---|---|
| Q-01 | Observation ชนิดใดผ่านอัตโนมัติ ชนิดใดต้อง reviewer approve? | เสนอ: FORMAT_VARIANCE และ NO_PAYMENT_FOUND = OBSERVATION อัตโนมัติ (กฎแน่นอน); NUMERIC_VARIANCE = ต้อง config/override (DEC-09). |
| Q-02 | DMD-002: ยอมให้ fallback ไปใช้ Latest Statement เมื่อไม่มี as-of หรือไม่? | เสนอ: ยอมเฉพาะเมื่อ Statement พิสูจน์ได้ว่าไม่มี principal-changing transaction หลัง demand_date; นอกนั้น HOLD DEMAND_PRINCIPAL_UNRECONCILED. |
| Q-03 | CAP-001 เป็น REQUIRED_HARD ไหม (NOT_TESTABLE → ทั้งเคส HOLD)? | เสนอ: REQUIRED_HARD เพราะตรวจ Package capacity ไม่ได้ = อนุมัติไม่ได้. |
| Q-04 | tolerance เมื่อเปิด Config: กี่สตางค์ และใช้กับ interest/total เท่านั้นหรือไม่? | เสนอ: interest/total เท่านั้น จำนวนตามที่ Business owner อนุมัติ; principal/claim_base/coverage/claim_amount/claim_max ห้ามเสมอ. |

รายการขวาง Freeze ทั้งหมด: A-04, A-07, A-10, A-11, A-12, A-14, A-16, A-21, A-23, A-26, A-30, A-33, A-38.
