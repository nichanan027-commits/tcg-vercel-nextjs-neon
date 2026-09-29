# Proposed Changes for v1.2.0 (r2 — Candidate สร้างแล้วที่ `pgs10/spec/v1.2.0-candidate/` ส่วน Engine ยังไม่แก้)

**เวอร์ชัน:** 1.2.0-RECONCILIATION-r2 · **ไม่ใช่ Spec Candidate** · ไม่มีการแก้ไฟล์ Spec/Engine/Tests · รอ Review ของ Reconciliation ก่อน

## 0. ฐานของ v1.2.0

- โครงไฟล์ = Pack v1.1.0 (5 ไฟล์) เพราะเป็นที่ ChatGPT/Claude/Backend ใช้อยู่
- เนื้อหา = P + ส่วนที่ D เติมกลับ + ผล DEC-01…14
- ทุกไฟล์ใส่ `ruleset_version: 1.2.0-candidate`, `frozen: false` จนผ่าน Freeze Gate
- ใช้ Rule ID Canonical (32 รายการ) และ reason code Canonical (83 ตัว) ตามไฟล์ Reconciliation

## 1. `01_PGS10_POLICY_RULEBOOK.md`

1. คง POL structure ของ P แต่ใช้ Rule ID Canonical (ELIG-001, LG-001, NPL-001, RST-001/002, DMD-003, CLM-001…004, CAP-001)
2. **ไม่ฝังตัวเลข** ในตัวกฎ — อ้าง `Policy_Parameter_Table` (PRM-xxx) พร้อม `source_status`
3. NPL: Small Biz และ Start up 6 เดือนปฏิทิน OFFICIAL; SMEs 9 เดือน; ใช้ `npl_date` เท่านั้น; เพิ่ม `allow_default_date_as_npl_date=false`; ไม่มี → `NPL_DATE_MISSING`
4. ELIG-001 เติมกลับ: สินเชื่อใหม่ + วัตถุประสงค์ธุรกิจ + ไม่ใช่เช่าซื้อ/ลิสซิ่ง + เพดาน SSMEs + ค้ำขั้นต่ำ/รวมต่อราย
5. Coverage: ตาราง Small Biz พร้อมนิยาม 'fifth anniversary' (ครบ 5 ปีพอดี = 70%); Smart* = OPEN → `NO_RULE_FOR_PRODUCT`
6. GOV-001…003 → แปลงเป็น config ที่มี owner/approver (ไม่ปล่อยเป็นข้อความอิสระ)
7. เพิ่ม Section Decision Precedence ตาม §7 ของ Report (5 case states + control_status + support_used)
8. ห้ามมี UI/architecture/reviewer workflow (คงหลักของ P)

## 2. `02_PGS10_OPERATIONAL_AUDIT_RULES.md`

1. เรียง Control ตาม Canonical ID (32 รายการ) พร้อมช่อง `requirement` และ `applicable_when`
2. **เติมกลับ:** STM-002 Statement Cut-off; Leading-zero (`FORMAT_VARIANCE`); Address normalization + house number no-fuzzy + latest supported address; ELIG exclusions; transaction types `REVERSAL`/`PRINCIPAL_ADJUSTMENT`; `NOT_TESTABLE`; statement-updated-after-later-payment (`later_statement_covers`)
3. แยก TXN-001 (classification + bank code map) ออกจาก STM-001 (Last Payment)
4. CONTRACT-001 จำกัด Thai Credit revolving-loan; `fi_id` เป็น input; FI อื่น → `CONTRACT_DATE_BASIS_UNDEFINED` (ขอยืนยันรหัส)
5. DMD-002: as-of เป็นหลัก; fallback เฉพาะพิสูจน์ได้ (Q-02)
6. CUR-001 (tolerance=0) / CUR-002 (NUMERIC_VARIANCE); tolerance ห้ามใช้กับ principal/claim_base/coverage/claim_amount/claim_max
7. HIS-001: reason `HISTORICAL_BALANCE_MISMATCH`; เอา 'proven' ออกจากถ้อยคำถ้าหมายถึงยังพิสูจน์ไม่ได้ = HOLD ด้วย
8. VIS-001 (หนังสือยืนยัน, 12 รายการ) แยกจาก VIS-002 (Critical อื่น); เพิ่ม `VISUAL_RECHECK_REQUIRED`
9. เปลี่ยน §13 aggregation ตาม Report §7; **ลบชื่อ `HOLD_*` ทั้งหมด** (10 ชื่อ) แทนด้วย `reason_code`
10. ใส่ตาราง Rule → Reason (จาก `Rule_to_Reason_Mapping.json`) เป็นภาคผนวก

## 3. `03_PGS10_DATA_DICTIONARY.json`

1. แทน `reason_codes` (18) ด้วย Canonical catalogue (83) + `alias_index`
2. **เพิ่มฟิลด์:** `fi_id`, `bank_id`, `npl_date`(คง) + `npl_anchor_date`, `later_payment_date/amount`, `statement_cutoff_date`, `later_statement_covers`, `loan_purpose_business`, `loan_is_new_business`, `loan_is_hp_leasing`, `postal_sent_date`, `confirmation_visual_elements{12}`, `support_used`, `review_flag`, `control_status`, `requirement`
3. **Transaction map** เป็นตาราง (`bank_id, code, semantic_type, effective_from, effective_to, evidence_source, approval_status, approved_by`) — ไม่ใช่ object ตาม code; 6921/6680 = `UNVERIFIED_UNTIL_SOURCE` (ถอด 6921 ออกจาก mapping ของ P)
4. **Conventions:** วันที่ ISO CE + `calendar` (BE|CE) + `original_text`; เงิน = integer satang; ROUND_HALF_UP; percent = basis points
5. `production_lock` ของ P → แทนด้วย `source_status` ตาม Policy_Parameter_Table
6. เพิ่ม `not_equal_to` ให้ `current_principal` ↔ `principal_as_of_demand_date`, `tracking_date` ↔ `restructure_date`

## 4. `04_PGS10_GOLDEN_TESTS.json`

ตาม `Golden_Test_Gap_Report.md`: schema ใหม่, แปลง GT-001…013, เพิ่ม T-01…T-42, นำ unit cases ตัวเลขของ D กลับ (reason ที่เปลี่ยนชื่อแล้ว), `evidence_ref` บังคับ, ไม่ Assert ที่ไม่มีหลักฐาน

## 5. ผลกระทบต่อ Rule Engine (เมื่อได้รับอนุมัติเท่านั้น — ตอนนี้ **ไม่แก้**)

| ส่วนของ `pgs10/engine.js` | การเปลี่ยนแปลงที่ต้องทำ |
|---|---|
| status | จาก 10 ค่า → control_status 7 ค่า + review_flag + reason_code; case 5 State (+`support_used`) |
| `runAudit` aggregation | ตาม §7 ของ Report; อ่าน `requirement` ต่อ Control |
| `META` / Rule IDs | เป็น Canonical (32); `RST-001` (วันที่) → `RST-003`; แยก TXN/STM/CUR/VIS/PST |
| `c16` | แตกเป็น CUR-001/CUR-002; tolerance ปิดเป็นค่าเริ่มต้น → NUMERIC_VARIANCE; ห้าม tolerance กับ 5 ฟิลด์ |
| `c12` | as-of + fallback ที่พิสูจน์ได้ (Q-02) |
| `c03` | รับ `fi_id`; Thai Credit only |
| `c01` | เพิ่ม business-purpose; ปรับ reason |
| `c06` | code map ต่อ `bank_id`; UNKNOWN/UNMAPPED → HOLD |
| เพิ่ม Control | LG-001, NPL-001, RST-001, RST-002, DMD-003, CLM-001, VIS-002, PST-003 |
| UI (`app.js`) | ช่อง `fi_id`, `npl_date`, calendar metadata, Config tolerance/route |
| `engine.test.js` | ทั้ง 25 เทสต์ยืนยันชื่อสถานะเดิม (`HOLD_*`, `PASS_WITH_DOCUMENTARY_SUPPORT`) → ต้องเขียนใหม่ทั้งชุด |
| Patch ที่เก็บไว้ (นอกรีโป) | ครอบคลุมส่วนหนึ่ง (5-state, OBSERVATION_CANDIDATE, DMD-002) — **ล้าสมัยแล้ว** ห้ามใช้ต่อ เพราะ DEC-09 เปลี่ยน OBSERVATION_CANDIDATE เป็น review_flag |

## 6. Freeze Gate Checklist

ต้องปิดก่อนเรียก Spec Candidate ว่า Freeze (1 รายการ; นอกจากนี้ต้องผ่าน Freeze Gate 5 ข้อ — สคริปต์ `check_freeze_gate.js` ในโฟลเดอร์ Candidate):

| ID | ประเด็น | สถานะ | ผลที่ใช้ตอนนี้ |
|---|---|---|---|
| A-30 | NPL anchor date | OPEN | แยก guarantee_effective_date / lg_issue_date; ห้ามอนุมาน; ต้องให้ Business Owner ยืนยัน Mapping → APPROVED_OPERATIONAL. ระหว่างนี้ NPL-001 = Safe-Hold HOLD NPL_ANCHOR_DATE_UNDEFINED. **Freeze Blocker เดียวที่เหลือ** |

นอกจากนี้ต้องมี: (1) evidence ref ของ DEC-01/02/03 (2) แก้ Master Audit ตามรายการใน Conflict_Register (3) เจ้าของ Business Rule ยืนยัน A-30 และตอบ Q-05…Q-07 (4) ตรวจ Golden Tests ใหม่ผ่านสคริปต์ consistency

## 7. ลำดับขั้นที่เสนอ

1. Review ชุด Reconciliation นี้ → ตอบ Q-01…04 และตัดสิน blocker
2. สร้าง v1.2.0 Spec Candidate (4 ไฟล์ + README) พร้อมสคริปต์ตรวจ consistency
3. Freeze Gate Review
4. หลัง Freeze เท่านั้น: ปรับ Rule Engine + เทสต์ + UI
