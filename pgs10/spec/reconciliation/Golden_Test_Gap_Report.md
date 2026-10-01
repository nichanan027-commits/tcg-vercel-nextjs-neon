# Golden Test Gap Report

**เวอร์ชัน:** 1.2.0-RECONCILIATION-r3 · ไม่แก้ `engine.test.js` หรือ `04_PGS10_GOLDEN_TESTS.json` ทั้งของ D และ P — เป็นรายงานช่องว่างและข้อเสนอเท่านั้น

## 1. Schema ใหม่ (DEC-13)

```json
{
  "test_id": "GT-001",
  "test_scope": "RULE_ONLY",
  "match_mode": "RULE_ONLY",
  "lg_no": "67-026936",
  "evidence_ref": {"document": "…", "pages": [], "status": "USER_ATTESTED | VERIFIED"},
  "rule_id": "PGS10-VIS-001",
  "expected_rule_results": [{"rule_id": "PGS10-VIS-001", "control_status": "HOLD", "reason_codes": ["CONFIRMATION_LETTER_VISUALLY_INCOMPLETE"]}],
  "expected_case_status": null,
  "expected_reason_codes": []
}
```

| test_scope | ความหมาย | expected_case_status | match_mode ที่ใช้ได้ |
|---|---|---|---|
| `RULE_ONLY` | ทดสอบ Control เดียว **ห้าม Assert สถานะเคส** | ต้องเป็น null | `RULE_ONLY` |
| `FULL_CASE` | ต้องมี Evidence Package ครบทั้งเคส | ระบุได้ | `EXACT` (reason ตรงทั้งชุด) หรือ `CONTAINS` (มีอย่างน้อย — ใช้เมื่อหลักฐานไม่ครบ) |

ข้อกำหนดเพิ่ม: (1) `lg_no` ห้ามแก้อัตโนมัติ (DEC-03) (2) ทุก Test ที่อ้างเคสจริงต้องมี `evidence_ref` (3) reason_code ต้องอยู่ใน Canonical_Reason_Code_Catalogue (4) ใช้ Rule ID Canonical เท่านั้น (legacy ต้องมี `@version`)

## 2. P v1.1.0 (13 tests) → schema ใหม่

| P test | LG | scope ใหม่ | Assertion ใหม่ | ประเด็น |
|---|---|---|---|---|
| GT-001 | 67-026936 | RULE_ONLY | VIS-001 = HOLD / CONFIRMATION_LETTER_VISUALLY_INCOMPLETE | ตัด expected_case_status; ไม่ล็อก HISTORICAL_BALANCE_MISMATCH (DEC-13) |
| GT-002 | 66-040977 | RULE_ONLY | VIS-001 = HOLD / CONFIRMATION_LETTER_VISUALLY_INCOMPLETE | LG ไม่มีในเอกสารอื่น — ขอ evidence ref |
| GT-003 | 66-042400 | RULE_ONLY | VIS-001 = HOLD / CONFIRMATION_LETTER_VISUALLY_INCOMPLETE | LG ไม่มีในเอกสารอื่น — ขอ evidence ref |
| GT-004 | 67-036222 | RULE_ONLY ×2 | VIS-001 = HOLD / …VISUALLY_INCOMPLETE; PST-001 = HOLD / POSTAL_ACK_INCOMPLETE | ตัวอย่างสาธิตใน M ไม่มีปัญหา Postal — ขอ evidence ของ POSTAL_ACK_INCOMPLETE |
| GT-005 | 67-035527 | RULE_ONLY | VIS-001 = PASS | R§30 จัดเคสนี้เป็น PASS/Observation (ชำระหลังผิดนัด + 0.01) → ต้องมี FULL_CASE แยก |
| GT-006 | 66-047199 | RULE_ONLY | VIS-001 = PASS | LG ไม่มีในเอกสารอื่น |
| GT-007 | 66-068610 | RULE_ONLY | VIS-001 = PASS | LG ไม่มีในเอกสารอื่น |
| GT-008 | 66-100753 | RULE_ONLY ×2 | VIS-001 = PASS; DEF-002 (หรือ ID-001) = HOLD / IDENTIFIER_LINKAGE_UNRESOLVED | P ไม่ระบุ Rule ที่ให้ reason นี้ — เสนอ DEF-002; ตัด expected_case_status |
| GT-009 | 66-037410 | RULE_ONLY | HIS-001 = HOLD / HISTORICAL_BALANCE_MISMATCH | LG ยืนยันแล้ว (DEC-03) แต่ยังไม่มีตัวเลข demand/historical ให้ Assert |
| GT-010 | 66-067410 | RULE_ONLY | VIS-001 = PASS | R§30 ยังระบุเคสนี้: DOC-001 HOLD และ HIS-001 HOLD → เพิ่ม RULE_ONLY สองรายการ (รอ evidence) |
| GT-011 | 66-044366 | RULE_ONLY | VIS-001 = PASS | R§30: STM-002 HOLD / PAYMENT_AFTER_STATEMENT_CUTOFF — ยังไม่มีใน P → เพิ่ม |
| GT-012 | 66-098079 | RULE_ONLY | VIS-001 = PASS | R§30: HIS-001 HOLD → เพิ่ม (รอ evidence) |
| GT-013 | 66-011787 | RULE_ONLY | VIS-001 = NOT_TESTABLE / VISUAL_RECHECK_REQUIRED | แก้จาก 'case HOLD' เป็น control NOT_TESTABLE (DEC-06) |

## 3. Coverage ตาม Canonical Rule

`P` = Pack v1.1.0 · `D` = unit cases ใน Spec ร่าง (78; ไม่แก้) · `R§30` = fixture LG-only ของ D · `T` = tests ที่เสนอในข้อ 5

| Rule | P | D | R§30 | T (เสนอ) | มี coverage? |
|---|---|---|---|---|---|
| `PGS10-ELIG-001` | 0 | 4 | 0 | 2 | ✅ |
| `PGS10-ID-001` | 0 | 5 | 1 | 4 | ✅ |
| `PGS10-DOC-001` | 0 | 4 | 2 | 0 | ✅ |
| `PGS10-VIS-001` | 12 | 2 | 5 | 2 | ✅ |
| `PGS10-VIS-002` | 0 | 0 | 0 | 0 | ❌ |
| `PGS10-CONTRACT-001` | 0 | 2 | 0 | 1 | ✅ |
| `PGS10-LG-001` | 0 | 1 | 0 | 0 | ✅ |
| `PGS10-NPL-001` | 0 | 1 | 0 | 4 | ✅ |
| `PGS10-TXN-001` | 0 | 0 | 0 | 5 | ✅ |
| `PGS10-STM-001` | 0 | 2 | 0 | 4 | ✅ |
| `PGS10-STM-002` | 0 | 1 | 1 | 2 | ✅ |
| `PGS10-DEF-001` | 0 | 4 | 2 | 1 | ✅ |
| `PGS10-DEF-002` | 1 | 5 | 1 | 0 | ✅ |
| `PGS10-FUP-001` | 0 | 1 | 0 | 0 | ✅ |
| `PGS10-RST-001` | 0 | 1 | 0 | 1 | ✅ |
| `PGS10-RST-002` | 0 | 3 | 0 | 1 | ✅ |
| `PGS10-RST-003` | 0 | 2 | 0 | 1 | ✅ |
| `PGS10-DMD-001` | 0 | 2 | 0 | 0 | ✅ |
| `PGS10-DMD-002` | 0 | 4 | 0 | 3 | ✅ |
| `PGS10-DMD-003` | 0 | 2 | 0 | 0 | ✅ |
| `PGS10-HIS-001` | 1 | 3 | 11 | 1 | ✅ |
| `PGS10-PST-001` | 1 | 6 | 3 | 0 | ✅ |
| `PGS10-PST-002` | 0 | 4 | 0 | 3 | ✅ |
| `PGS10-PST-003` | 0 | 0 | 0 | 0 | ❌ |
| `PGS10-CUR-001` | 0 | 1 | 1 | 1 | ✅ |
| `PGS10-CUR-002` | 0 | 3 | 0 | 2 | ✅ |
| `PGS10-CLM-001` | 0 | 3 | 0 | 2 | ✅ |
| `PGS10-CLM-002` | 0 | 4 | 0 | 3 | ✅ |
| `PGS10-CLM-003` | 0 | 2 | 0 | 0 | ✅ |
| `PGS10-CLM-004` | 0 | 3 | 1 | 1 | ✅ |
| `PGS10-CAP-001` | 0 | 2 | 0 | 1 | ✅ |
| `PGS10-TIME-001` | 0 | 2 | 1 | 0 | ✅ |

- Rule ที่ไม่มี coverage เลยจาก P และ D: **VIS-002, TXN-001, PST-003**
- หลังเพิ่ม T ที่เสนอ: **VIS-002, PST-003** (ยังไม่มีข้อเสนอ Test สำหรับ Rule เหล่านี้ — ต้องเพิ่มใน v1.2.0: VIS-002 ต้องมีเคสเอกสาร Critical อื่นที่ถูก Crop, PST-003 ต้องมีเคส tracking number ไม่ตรงกัน)
- P ทดสอบ **4 จาก 32** Rule เท่านั้น (VIS-001 เป็นหลัก) และไม่มี Test ตัวเลขใด ๆ (Claim, Base, Ratio, Cap, Historical, Demand, Tolerance)

## 4. Unit cases เดิมของ D (78) เมื่อใช้ Canonical

- ทั้ง 78 เป็น RULE_ONLY โดยธรรมชาติ → ย้ายเข้า schema ใหม่ได้เกือบทั้งหมด
- **18 เคสต้องเปลี่ยนชื่อ reason_code** (เช่น `EXCEPTION_LETTER_MISSING` → `POST_DEFAULT_SUPPORT_MISSING`, `CLAIM_AMOUNT_MISMATCH` → `CLAIM_CALCULATION_MISMATCH`)
- **1 เคสใช้ `OBSERVATION_CANDIDATE` เป็น control status** → เปลี่ยนเป็น HOLD + NUMERIC_VARIANCE (tolerance ปิด) หรือ OBSERVATION (tolerance เปิด)
- ต้องแตก Rule: UT-STM-* (TXN-001/STM-001), UT-CUR-* (CUR-001/CUR-002), UT-VIS-* (VIS-001/VIS-002), UT-PST-006 (PST-001/PST-002)
- UT-COV-004 (ครบ 5 ปีพอดี) ที่ D ไม่ Assert → ตอนนี้ Assert ได้: 70% (DEC-11) = T-20
- `case_status_if_all_other_controls_pass` ของ D ต้องลบ (ขัดกับ RULE_ONLY)

## 5. Tests ที่เสนอเพิ่ม/เปลี่ยน (47 รายการ) — ทั้งหมดอิงคำตัดสิน ไม่มี Assertion ที่คาดเดา

ตัวเลข/เอกสารจริงต้องจัดหาเอง; ที่นี่เป็นเงื่อนไขและผลที่ต้องได้เท่านั้น

| ID | เงื่อนไข | scope | Rule | ผล | reason_code | ที่มา |
|---|---|---|---|---|---|---|
| T-01 | Start up: npl_date ห่างจาก lg_issue_date ครบ 6 เดือนปฏิทินพอดี | RULE_ONLY | `PGS10-NPL-001` | PASS | — | DEC-01, DEC-29 |
| T-02 | Start up: npl_date verified ห่างจาก lg_issue_date 5 เดือน 29 วัน → FAIL | RULE_ONLY | `PGS10-NPL-001` | FAIL | NPL_SEASONING_NOT_MET | DEC-31 |
| T-03 | มีเฉพาะ default_date ไม่มี npl_date | RULE_ONLY | `PGS10-NPL-001` | HOLD | NPL_DATE_MISSING | DEC-01 |
| T-04 | Thai Credit code 6619 และ 6656 นับเป็น PAYMENT | RULE_ONLY | `PGS10-TXN-001` | PASS | — | DEC-02 |
| T-05 | Thai Credit code 6931 (principal เพิ่ม) ไม่นับเป็น PAYMENT แม้เป็นรายการล่าสุด | RULE_ONLY | `PGS10-STM-001` | PASS | — | DEC-02 |
| T-06 | code 6921 ปรากฏในช่วงที่กระทบ Last Payment → ไม่มี Mapping | RULE_ONLY | `PGS10-TXN-001` | HOLD | TRANSACTION_CODE_UNMAPPED | DEC-02 |
| T-07 | code 6680 เช่นเดียวกัน | RULE_ONLY | `PGS10-TXN-001` | HOLD | TRANSACTION_CODE_UNMAPPED | DEC-02 |
| T-08 | LG 66-037410 ต้องไม่ถูกแก้/รวมกับ 66-067410 | RULE_ONLY | `PGS10-ID-001` | PASS | — | DEC-03 |
| T-09 | มี Support + Observation ในเคสเดียว | AGGREGATION_ONLY | CASE | PASS_WITH_OBSERVATION | support_used=true | DEC-04 |
| T-10 | มี Support อย่างเดียว | AGGREGATION_ONLY | CASE | PASS_WITH_SUPPORT | — | DEC-04 |
| T-11 | CAP-001 ที่ FINAL_APPROVAL ไม่มี paid/pending | RULE_ONLY | `PGS10-CAP-001` | NOT_TESTABLE | PACKAGE_DEFINITION_REQUIRED | DEC-17 |
| T-12 | Conditional control NOT_APPLICABLE (ไม่มีการปรับโครงสร้าง) ไม่กระทบเคส | AGGREGATION_ONLY | `PGS10-RST-003` | NOT_APPLICABLE | — | DEC-06 |
| T-13 | Historical interest/total ผิด แต่ principal ตรง | RULE_ONLY | `PGS10-HIS-001` | HOLD | HISTORICAL_BALANCE_MISMATCH | DEC-07 |
| T-14 | Demand principal เท่ากับ as-of; Latest Statement ต่างเพราะชำระหลัง demand | RULE_ONLY | `PGS10-DMD-002` | PASS | — | DEC-08 |
| T-15 | ไม่มี as-of, derive ไม่ได้ (มี principal-affecting txn หลัง demand ที่ reconstruct ไม่ได้) | RULE_ONLY | `PGS10-DMD-002` | HOLD | DEMAND_PRINCIPAL_AS_OF_DATE_UNVERIFIED | DEC-08, DEC-16 |
| T-16 | ดอกเบี้ยต่าง 0.01 (tolerance ปิด) | RULE_ONLY | `PGS10-CUR-002` | HOLD | NUMERIC_VARIANCE (review_flag=OBSERVATION_CANDIDATE) | DEC-09 |
| T-17 | เงินต้นต่าง 0.01 ต่อให้เปิด tolerance | RULE_ONLY | `PGS10-CUR-001` | HOLD | CURRENT_PRINCIPAL_MISMATCH | DEC-09 |
| T-18 | claim_amount ต่าง 0.01 ต่อให้เปิด tolerance | RULE_ONLY | `PGS10-CLM-004` | HOLD | CLAIM_CALCULATION_MISMATCH | DEC-09 |
| T-19 | Contract date: fi_id ≠ THAI_CREDIT | RULE_ONLY | `PGS10-CONTRACT-001` | HOLD | CONTRACT_DATE_BASIS_UNDEFINED | DEC-10 |
| T-20 | Coverage: guarantee_term = 5 ปีพอดี → 70% | RULE_ONLY | `PGS10-CLM-002` | PASS | expected_ratio=7000bp | DEC-11, DEC-30 |
| T-21 | Coverage: guarantee_term = 6 ปี → 100% | RULE_ONLY | `PGS10-CLM-002` | PASS | expected_ratio=10000bp | DEC-30 |
| T-22 | Payment หลัง Statement cut-off (66-044366 pattern) | RULE_ONLY | `PGS10-STM-002` | HOLD | PAYMENT_AFTER_STATEMENT_CUTOFF | DEC-12 |
| T-23 | มี Statement ใหม่ครอบคลุม payment หลัง cut-off | RULE_ONLY | `PGS10-STM-002` | PASS | — | DEC-12 |
| T-24 | Leading zero เลขบัญชี (loan_account_no ประกาศไม่มีนัยสำคัญ) | RULE_ONLY | `PGS10-ID-001` | PASS | FORMAT_VARIANCE (review_flag=FORMAT_NORMALIZED) | DEC-15 |
| T-25 | ที่อยู่ ต./อ./จ. ย่อ = เต็ม | RULE_ONLY | `PGS10-PST-002` | PASS | — | DEC-12 |
| T-26 | บ้านเลขที่ 12/3 vs 12/4 | RULE_ONLY | `PGS10-PST-002` | HOLD | ADDRESS_NOT_IN_DOCUMENTS | DEC-12 |
| T-27 | มีเอกสารแจ้งเปลี่ยนที่อยู่ แต่จัดส่งที่อยู่เดิม | RULE_ONLY | `PGS10-PST-002` | HOLD | ADDRESS_DIFFERS_FROM_LATEST | DEC-12 |
| T-28 | สินเชื่อเช่าซื้อ/ลิสซิ่ง | RULE_ONLY | `PGS10-ELIG-001` | FAIL | ELIGIBILITY_PROHIBITED_CREDIT_TYPE | DEC-12, DEC-27 |
| T-29 | สินเชื่อไม่ใช่เพื่อธุรกิจ | RULE_ONLY | `PGS10-ELIG-001` | FAIL | ELIGIBILITY_NOT_BUSINESS_PURPOSE | DEC-12 |
| T-30 | REVERSAL หลัง PAYMENT ล่าสุด ไม่กระทบ last_actual_payment_date | RULE_ONLY | `PGS10-STM-001` | PASS | — | DEC-12 |
| T-31 | PRINCIPAL_ADJUSTMENT ไม่นับเป็น PAYMENT | RULE_ONLY | `PGS10-TXN-001` | PASS | — | DEC-12 |
| T-32 | วันที่ พ.ศ. 15/04/2568 ต้องเก็บเป็น 2025-04-15 พร้อม calendar=BE | RULE_ONLY | `PGS10-TXN-001` | PASS | — | DEC-12 |
| T-33 | 67-026936 visual regression (GT-001 ใหม่) | RULE_ONLY | `PGS10-VIS-001` | HOLD | CONFIRMATION_LETTER_VISUALLY_INCOMPLETE | DEC-13 |
| T-34 | GT-013 66-011787 ไม่มีภาพต้นฉบับ | RULE_ONLY | `PGS10-VIS-001` | NOT_TESTABLE | VISUAL_RECHECK_REQUIRED | DEC-06, DEC-13 |
| T-14b | Demand principal derive ได้ (support_code=DERIVED_AS_OF_DEMAND) | RULE_ONLY | `PGS10-DMD-002` | PASS_WITH_SUPPORT | — | DEC-16, DEC-36 |
| T-35 | Coverage: tenor พิสูจน์ไม่ได้ (ไม่มี guarantee_term และไม่มี expiry) | RULE_ONLY | `PGS10-CLM-002` | HOLD | LG_TENOR_UNDETERMINABLE | DEC-30 |
| T-36 | NPL: ไม่มี lg_issue_date (anchor) → defensive HOLD | RULE_ONLY | `PGS10-NPL-001` | HOLD | NPL_ANCHOR_DATE_UNDEFINED | DEC-29 |
| T-37 | Start up: RST-001 ไม่ใช้ ((ข)+(จ)+(ฉ) ไม่มี (ค)) | RULE_ONLY | `PGS10-RST-001` | NOT_APPLICABLE | — | DEC-24 |
| T-38 | 7-month exception ครบเงื่อนไข (support_code=UNCONTACTABLE_7_MONTH_EXCEPTION) | RULE_ONLY | `PGS10-RST-002` | PASS_WITH_SUPPORT | — | DEC-20, DEC-36 |
| T-39 | Tolerance เปิด: current_interest ต่าง 0.01 แต่ current_total ต่างจาก component อื่นด้วย | RULE_ONLY | `PGS10-CUR-002` | HOLD | CURRENT_BALANCE_MISMATCH | DEC-18 |
| T-40 | บ้านเลขที่ต่าง / เลขภายในของ Account ต่าง ไม่ Auto-pass | RULE_ONLY | `PGS10-ID-001` | HOLD | VERIFY_REFERENCE_MAPPING | DEC-15 |
| T-41 | Statement ครบ ไม่เคยมี PAYMENT → NO_PAYMENT_VERIFIED (PASS) | RULE_ONLY | `PGS10-STM-001` | PASS | — | DEC-34 |
| T-42 | Statement ไม่ครบ (มี gap) ไม่พบ PAYMENT | RULE_ONLY | `PGS10-STM-001` | HOLD | PAYMENT_HISTORY_INCOMPLETE | DEC-34 |
| T-43 | NO_PAYMENT_VERIFIED → DEF-001 รอ alternative evidence | RULE_ONLY | `PGS10-DEF-001` | HOLD | POLICY_PARAMETER_UNRESOLVED | DEC-34 |
| T-44 | ยื่นหลังหมดสิทธิ (verified) | RULE_ONLY | `PGS10-CLM-001` | FAIL | CLAIM_FILING_WINDOW_EXPIRED | DEC-31 |
| T-45 | ยังไม่ถึงเวลายื่น | RULE_ONLY | `PGS10-CLM-001` | HOLD | CLAIM_FILING_NOT_YET_OPEN | DEC-31 |
| T-46 | loan_account_no Leading Zero — FI ไม่มี profile | RULE_ONLY | `PGS10-ID-001` | HOLD | VERIFY_REFERENCE_MAPPING | DEC-33 |

## 6. Fixtures เคสจริงที่ยังไม่มีข้อมูล

- R§30 มี 15 LG (FULL_CASE ไม่ได้จนกว่าจะมี Evidence Package): 66-021663, 66-029105, 66-044366, 66-045431, 66-047662, 66-067410, 66-073840, 66-076705, 66-098079, 66-100217, 67-005985, 67-023862, 67-026936, 67-035527, 67-037131
- LG ใน P ที่ไม่อยู่ใน R§30: 66-011787, 66-037410, 66-040977, 66-042400, 66-047199, 66-068610, 66-100753 (66-037410 ยืนยันแล้ว; ที่เหลือรอ evidence ref)
- LG ใน R§30 ที่ P ไม่ทดสอบเลย: 66-021663, 66-029105, 66-045431, 66-047662, 66-073840, 66-076705, 66-100217, 67-005985, 67-023862, 67-037131
- Test ที่ต้องห้ามเขียนก่อนมีข้อมูล: FULL_CASE ของ 67-035527 (payment หลัง default + support + 0.01) — ผลขึ้นกับ Q-01/Q-04

## 7. ความเสี่ยง

| ความเสี่ยง | ผล | ทางแก้ |
|---|---|---|
| ใช้ Test ที่ผสม Rule กับ Case (แบบ GT-001/GT-008 ของ P) | Regression พังเมื่อเพิ่ม Control ใหม่ | RULE_ONLY (DEC-13) |
| อ้าง Rule ID เดิมโดยไม่มี @version | ตีความผิด Rule | ตรวจด้วย `same_id_different_meaning_hazards` |
| Test เคสจริงไม่มี evidence_ref | ตรวจย้อนไม่ได้ | บังคับ field ใน schema |
| ไม่มี Test ตัวเลขใน P | Rule Engine คำนวณผิดโดยไม่มีใครรู้ | นำ UT-CALC/UT-BASE/UT-CAP ของ D กลับ |
