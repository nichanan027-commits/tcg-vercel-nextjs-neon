# PGS 10 Spec Candidate v1.2.0-candidate — NOT FROZEN

**สถานะ:** Spec Candidate เพื่อ Freeze Gate Review · **ห้ามแก้ Rule Engine (`pgs10/engine.js`) และห้ามประกาศ Freeze** จนกว่าจะผ่าน Freeze Gate
**ที่มา:** Reconciliation r2 (DEC-01…DEC-28, ตอบ Q-01…Q-04 แล้ว) + Deployment Pack v1.1.0 + Spec ร่าง v1.0

## ไฟล์
| ไฟล์ | เนื้อหา |
|---|---|
| `01_PGS10_POLICY_RULEBOOK.md` | นโยบาย (ตัวเลขอ้าง PRM-xxx ไม่ฝังในตัวกฎ) |
| `02_PGS10_OPERATIONAL_AUDIT_RULES.md` | 32 Controls: inputs / logic / safe-hold / reason codes |
| `03_PGS10_DATA_DICTIONARY.json` | 132 ฟิลด์, enums, conventions (วันที่ ISO+calendar, สตางค์) |
| `04_PGS10_GOLDEN_TESTS.json` | 152 tests: ACTIVE 117, BLOCKED_PENDING_EVIDENCE 35 |
| `05_PGS10_RULE_REGISTRY.json` | Canonical Rule IDs + legacy aliases + reason codes (83) + aggregation + safe-holds |
| `06_PGS10_POLICY_PARAMETERS.json` | 57 พารามิเตอร์ + ตาราง transaction code ต่อ bank_id |
| `check_freeze_gate.js` | สคริปต์ Freeze Gate 5 ข้อ (Node ≥ 18, ไม่ต้องติดตั้งแพ็กเกจ): `node check_freeze_gate.js` |

## เปลี่ยนจาก Pack v1.1.0
1. Rule ID = Master Audit §41 (+`PGS10-TXN-001`); ID เก่า = `id@version` (มี 10 รายการที่ ID เดิมความหมายใหม่)
2. reason_code 83 ตัว (catalogue เดียว); **ไม่มี `HOLD_*`**; 32 controls มี requirement / stage / safe-hold
3. เติมกลับ: Statement cut-off, Leading-zero (field-specific), Address normalization + latest address, ELIG exclusions, REVERSAL/PRINCIPAL_ADJUSTMENT, NOT_TESTABLE, calendar metadata, Decimal
4. คำตัดสินใหม่: Start up seasoning 6 เดือน (OFFICIAL) / claim path (ข)+(จ)+(ฉ); Coverage OFFICIAL ทุก Product; 7-month exception OFFICIAL (กรณี 1 และ 3); DMD-002 derive as-of; CAP-001 REQUIRED_HARD ที่ FINAL_APPROVAL; tolerance ปิด (proposed 0.01 เฉพาะ interest/total); FAIL scope = Proven Policy Ineligibility
5. Golden Tests: schema `RULE_ONLY` / `FULL_CASE` + `match_mode`; เคสจริงทั้งหมดเป็น `BLOCKED_PENDING_EVIDENCE` (ไม่มี input, ไม่มีข้อมูลที่คิดเอง)

## Freeze Blocker ที่เหลือ
- **A-30** NPL anchor date — แยก guarantee_effective_date / lg_issue_date; ห้ามอนุมาน; ต้องให้ Business Owner ยืนยัน Mapping → APPROVED_OPERATIONAL. ระหว่างนี้ NPL-001 = Safe-Hold HOLD NPL_ANCHOR_DATE_UNDEFINED. **Freeze Blocker เดียวที่เหลือ**

## OPEN ที่มี Safe-Hold (ไม่ขวาง Freeze — ตามที่ตัดสิน)
- `PRM-008` Business-purpose loan required — ASSUMPTION → ELIGIBILITY_UNCONFIRMED
- `PRM-013` NPL seasoning anchor date — OPEN → NPL_ANCHOR_DATE_UNDEFINED
- `PRM-021` Demand waiting — reference date — OPEN → DEMAND_WAITING_PERIOD_NOT_MET
- `PRM-027` coverage_age_basis — OPEN → COVERAGE_AGE_BASIS_UNDEFINED
- `PRM-028` Calendar arithmetic convention — OPEN → POLICY_PARAMETER_UNRESOLVED
- `PRM-038` Critical documents requiring visual review — OPEN → DOCUMENT_VISUALLY_INCOMPLETE
- `PRM-042` UNKNOWN transaction proximity — OPEN → UNKNOWN_TRANSACTION_NEAR_DEFAULT

## สิ่งที่ผมตีความเอง (ขอยืนยัน — ไม่ขวาง Freeze)
- **A-12** `coverage_age_basis`: Safe-Hold แบบ 'ผลต้องเท่ากันทุก candidate event' (claim_submission_date, npl_date, default_date, demand_date) — การออกแบบของผม (A-43)
- **A-42** 'กรณี 1 และ 3' ของหน้า 7 = path ที่มี (ค) (SMEs ≤5 ปี, Small Biz ≤5 ปี); 'กรณี 5' = Start up (Q-06)
- `NO_PAYMENT_FOUND` เดิมเป็น Observation → เปลี่ยนเป็น HOLD เพราะไม่ใช่ format-only (A-40)
- ประกาศ `loan_account_no` เป็น field ที่ Leading Zero ไม่มีนัยสำคัญตาม R§5 (Q-07)
- FAIL promotion นอก ELIGIBILITY_* ยังไม่ทำ (Q-05); scope `AGGREGATION_LOGIC` ใน Golden ยังไม่อยู่ใน DEC-13 (เสนอ)
- รหัสใหม่ที่ผมเสนอ (ยังไม่ผ่านการอนุมัติ): `NPL_ANCHOR_DATE_UNDEFINED`, `COVERAGE_AGE_BASIS_UNDEFINED`, `UNCONTACTABLE_EXCEPTION_MATURED`, `POLICY_PARAMETER_UNRESOLVED`

## หลักฐานที่ผมตรวจเองไม่ได้ (user-attested)
หลักเกณฑ์ PGS 10 ฉบับทางการ (หน้า 7 และตาราง Coverage), Statement Thai Credit (remark + พฤติกรรม ledger ของ 6619/6656/6920/6922/6931), รายงานติดตามของเคส 66-037410 — ไฟล์ไม่ได้ส่งเข้า session; บันทึกเป็น `user-attested` และเติม doc/page ก่อน Production

## Freeze Gate (สถานะล่าสุด — รัน `node check_freeze_gate.js` เพื่อยืนยันซ้ำ)
```
PGS10 1.2.0-candidate — Freeze Gate  (frozen=false)

[PASS] 1. Canonical IDs resolve 100%
      32 canonical rules, 44 versioned aliases, 417 ID tokens scanned

[PASS] 2. Reason codes resolve 100%
      83 canonical reason codes, 33 aliases, 200 backticked tokens scanned

[PASS] 3. No status/reason mixing
      case statuses: PASS, PASS_WITH_SUPPORT, PASS_WITH_OBSERVATION, HOLD, FAIL; retired status-like names (aliases only): 10

[PASS] 4. Policy OPEN rules have Safe-Hold
      OPEN/ASSUMPTION/UNVERIFIED/PROPOSED params with safe-hold: PRM-008, PRM-013, PRM-021, PRM-027, PRM-028, PRM-033, PRM-038, PRM-042, PRM-033b
      transaction codes: 5 evidence-supported, 4 unverified

[PASS] 5. Golden tests have evidence and no invented expected result
      152 tests: ACTIVE 117, BLOCKED_PENDING_EVIDENCE 35; FULL_CASE 0; AGGREGATION_LOGIC (proposed scope) 8
      numeric blocks re-verified: 7; rule/aggregation expectations re-evaluated from spec: 20

Freeze blockers (business decisions still open): A-30

RESULT: 5/5 checks pass — NOT READY TO FREEZE (blockers remain)
```

**ข้อจำกัดของ Gate ที่ควรรู้**
- ข้อ 5 ประเมิน expected result ซ้ำจากสเปกโดยอัตโนมัติเฉพาะบางส่วน (Aggregation, NPL seasoning, 7-month maturity, Coverage tier, และตัวเลขเงิน 7 บล็อก); Test ที่เหลือ 'สอดคล้องกับ rule_basis ที่อ้าง' เท่านั้น ยังไม่ได้พิสูจน์เชิงเครื่อง — Rule Engine จะเป็นผู้ยืนยันหลัง Freeze
- Gate ตรวจ**ความสอดคล้องภายในและวินัยของหลักฐาน** ไม่ได้ตรวจว่าเนื้อหานโยบายตรงหลักเกณฑ์ทางการ (ต้นฉบับไม่ได้ส่งเข้า session)
- ผมทดสอบตัว Gate ด้วยการใส่ข้อผิดพลาดจงใจ 14 แบบลงในสำเนา (ชื่อ `HOLD_*`, rule ID ไม่รู้จัก, ID เก่าไม่มีเวอร์ชัน, พารามิเตอร์ OPEN ไม่มี safe-hold, เปิด tolerance, expected ผิด, เคสจริงที่มี input ฯลฯ) — จับได้ครบทุกกรณี
- สถานะ Freeze ต้องเป็นการตัดสินของ Business Owner ไม่ใช่ผลของสคริปต์: exit code 2 = ผ่านทุกข้อแต่ยังมี Blocker
