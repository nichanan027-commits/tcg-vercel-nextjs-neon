# PGS 10 Spec Candidate v1.2.0-candidate.3 — NOT FROZEN

**สถานะ: READY FOR FINAL FREEZE GATE REVIEW — ยังไม่ FROZEN** (Freeze Gate 6/6 ผ่าน, ไม่มี freeze blocker; ข้อตีความ Q-08…Q-10 และรหัสใหม่ที่ Claude เสนอ เจ้าของยืนยันแล้ว; ต้องมีคำสั่งประกาศ FROZEN อย่างชัดเจนก่อนแตะ `engine.js`)

**สถานะ:** Spec Candidate เพื่อ Freeze Gate Review · **ห้ามแก้ Rule Engine (`pgs10/engine.js`) และห้ามประกาศ Freeze** จนกว่าจะผ่าน Freeze Gate
**ที่มา:** Reconciliation r4 (DEC-01…DEC-43, ตอบ Q-01…Q-10 แล้ว) + Deployment Pack v1.1.0 + Spec ร่าง v1.0

## ไฟล์
| ไฟล์ | เนื้อหา |
|---|---|
| `01_PGS10_POLICY_RULEBOOK.md` | นโยบาย (ตัวเลขอ้าง PRM-xxx ไม่ฝังในตัวกฎ) |
| `02_PGS10_OPERATIONAL_AUDIT_RULES.md` | 32 Controls: inputs / logic / safe-hold / reason codes |
| `03_PGS10_DATA_DICTIONARY.json` | 143 ฟิลด์, enums, conventions (วันที่ ISO+calendar, สตางค์) |
| `04_PGS10_GOLDEN_TESTS.json` | 160 tests: ACTIVE 125, BLOCKED_PENDING_EVIDENCE 35 |
| `05_PGS10_RULE_REGISTRY.json` | Canonical Rule IDs + legacy aliases + reason codes (80) + aggregation + safe-holds |
| `06_PGS10_POLICY_PARAMETERS.json` | 63 พารามิเตอร์ + ตาราง transaction code ต่อ bank_id |
| `check_freeze_gate.js` | สคริปต์ Freeze Gate 5 ข้อ (Node ≥ 18, ไม่ต้องติดตั้งแพ็กเกจ): `node check_freeze_gate.js` |

## เปลี่ยนจาก Pack v1.1.0
1. Rule ID = Master Audit §41 (+`PGS10-TXN-001`); ID เก่า = `id@version` (มี 10 รายการที่ ID เดิมความหมายใหม่)
2. reason_code 80 ตัว (catalogue เดียว); **ไม่มี `HOLD_*`**; 32 controls มี requirement / stage / safe-hold
3. เติมกลับ: Statement cut-off, Leading-zero (field-specific), Address normalization + latest address, ELIG exclusions, REVERSAL/PRINCIPAL_ADJUSTMENT, NOT_TESTABLE, calendar metadata, Decimal
4. คำตัดสินใหม่: Start up seasoning 6 เดือน (OFFICIAL) / claim path (ข)+(จ)+(ฉ); Coverage OFFICIAL ทุก Product; 7-month exception OFFICIAL (กรณี 1 และ 3); DMD-002 derive as-of; CAP-001 REQUIRED_HARD ที่ FINAL_APPROVAL; tolerance ปิด (proposed 0.01 เฉพาะ interest/total); FAIL scope = Proven Policy Ineligibility
5. Golden Tests: schema `RULE_ONLY` / `FULL_CASE` + `match_mode`; เคสจริงทั้งหมดเป็น `BLOCKED_PENDING_EVIDENCE` (ไม่มี input, ไม่มีข้อมูลที่คิดเอง)

## Freeze Blocker ที่เหลือ (ตาม Conflict Register)
- ไม่มี

## OPEN ที่มี Safe-Hold (ไม่ขวาง Freeze — ตามที่ตัดสิน)
- `PRM-008` Business-purpose loan required — ASSUMPTION → ELIGIBILITY_UNCONFIRMED
- `PRM-021` Demand waiting — reference date — OPEN → DEMAND_WAITING_PERIOD_NOT_MET
- `PRM-028` Calendar arithmetic convention — OPEN → POLICY_PARAMETER_UNRESOLVED
- `PRM-038` Critical documents requiring visual review — OPEN → DOCUMENT_VISUALLY_INCOMPLETE
- `PRM-042` UNKNOWN transaction proximity — OPEN → UNKNOWN_TRANSACTION_NEAR_DEFAULT
- `PRM-055` Default-date alternative evidence when NO_PAYMENT_VERIFIED — OPEN → POLICY_PARAMETER_UNRESOLVED

## ข้อตีความที่เจ้าของยืนยันแล้ว (DEC-39…DEC-43)
- **Q-08 / A-44** band ≤5/>5 ปีของ Case 1–4 นับจากวันที่ยื่นเทียบวันออก LG — PRM-054 = `APPROVED_OPERATIONAL`; ข้อมูลไม่ครบ → HOLD `LG_DATA_MISSING` (A-44 RESOLVED)
- **Q-09 / A-45** NO_PAYMENT_VERIFIED → DEF-001 = HOLD `POLICY_PARAMETER_UNRESOLVED` เป็น Safe-Hold ที่ยืนยันแล้ว **จนกว่าจะมี alternative evidence rule** (PRM-055 ยัง OPEN — เจ้าของยังไม่ได้กำหนด rule)
- **Q-10 / A-46** LG ต่ออายุ/ขยายและไม่มี guarantee_term ระบุ → HOLD `LG_TENOR_UNDETERMINABLE` เป็น Safe-Hold ที่ยืนยันแล้ว จนกว่าจะมี rule
- **A-43** invariance Safe-Hold คงไว้เฉพาะ demand-waiting reference และ date arithmetic (PRM-021/028)
- Claim window: `CLAIM_FILING_NOT_YET_OPEN` (HOLD) และ `CLAIM_FILING_WINDOW_EXPIRED` (FAIL) **อนุมัติแล้ว**; 'หมดสิทธิแต่วันที่ยังไม่ verify' ไม่มีรหัสเฉพาะและไม่มี Test (ใช้ HOLD ทั่วไปของ CLM-001)
- รหัสที่ยัง PROPOSED_BY_CLAUDE: ไม่มี

หมายเหตุ: Q-09 และ Q-10 ที่ยืนยันคือ *พฤติกรรม Safe-Hold ปัจจุบัน* ไม่ใช่การกำหนด rule ใหม่ จึงยังเป็น OPEN ที่มี Safe-Hold (ไม่ขวาง Freeze)

## หลักฐานที่ผมตรวจเองไม่ได้ (owner-verified)
หลักเกณฑ์ PGS 10 ฉบับทางการ (หน้า 7 และตาราง Coverage), Statement Thai Credit (remark + พฤติกรรม ledger ของ 6619/6656/6920/6922/6931), รายงานติดตามของเคส 66-037410 — ผู้ใช้ยืนยันว่า verify จากไฟล์โครงการแล้ว (หน้า 5, 7; Statement remark/ledger; รายงานติดตาม + Statement ของ 66037410) — ผมไม่ได้ตรวจไฟล์ต้นฉบับเอง จึงบันทึกเป็น `owner-verified` (ไม่ใช่ independently verified); เติม doc/page ก่อน Production

## Freeze Gate (สถานะล่าสุด — รัน `node check_freeze_gate.js` เพื่อยืนยันซ้ำ)
```
PGS10 1.2.0-candidate.3 — Freeze Gate  (frozen=false)

[PASS] 1. Canonical IDs resolve 100%
      32 canonical rules, 44 versioned aliases, 433 ID tokens scanned

[PASS] 2. Reason codes resolve 100%
      80 canonical reason codes, 36 aliases, 210 backticked tokens scanned

[PASS] 3. No status/reason mixing
      case statuses: PASS, PASS_WITH_SUPPORT, PASS_WITH_OBSERVATION, HOLD, FAIL; retired status-like names (aliases only): 10

[PASS] 4. Policy OPEN rules have Safe-Hold
      OPEN/ASSUMPTION/UNVERIFIED/PROPOSED params with safe-hold: PRM-008, PRM-021, PRM-028, PRM-033, PRM-038, PRM-042, PRM-033b, PRM-055
      transaction codes: 5 evidence-supported, 4 unverified

[PASS] 5. Golden tests have evidence and no invented expected result
      160 tests: ACTIVE 125, BLOCKED_PENDING_EVIDENCE 35; FULL_CASE 0; AGGREGATION_ONLY 8; blocked fixtures asserting: 0
      numeric blocks re-verified: 7; rule/aggregation expectations re-evaluated from spec: 35

[PASS] 6. Conflict Register: every unresolved item has a Safe-Hold
      46 register items: resolved 31, unresolved with Safe-Hold 15

Freeze blockers (unresolved items flagged blocks_freeze): none

RESULT: all 6 checks pass, no blockers — READY FOR FINAL FREEZE GATE REVIEW (not frozen)
```

**ข้อจำกัดที่ต้องรู้:** Gate ตรวจ *ความสอดคล้องภายในของ Spec* (ID/Reason Code/สถานะ/Safe-Hold/Golden Test) ไม่ได้ตรวจว่านโยบายถูกต้อง; แหล่งอ้างอิงที่เจ้าของระบุ (เช่น PGS10 p.5, p.7, LG 66-037410) ยังไม่ได้ตรวจกับเอกสารต้นฉบับโดย Claude; Evaluator ใน Gate ครอบคลุมเฉพาะบางส่วนของ test (35 expectation ที่คำนวณซ้ำจาก Spec).
ทดสอบ Gate ด้วย mutation 18 แบบ (ใส่ความผิดเจตนา) — Gate จับได้ครบ 18/18
