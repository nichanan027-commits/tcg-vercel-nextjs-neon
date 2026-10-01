# 01 · PGS 10 Policy Rulebook — v1.2.0-candidate.3 (NOT FROZEN)

**Ruleset:** PGS10 1.2.0-candidate.3 · **สถานะ:** Spec Candidate — ยังไม่ Freeze · Rule Engine ห้ามแก้จนกว่าจะผ่าน Freeze Gate
**ขอบเขตไฟล์:** กฎระดับนโยบายเท่านั้น (ห้ามมี UI / architecture / reviewer workflow). ตัวเลขทุกตัวอยู่ใน `06_PGS10_POLICY_PARAMETERS.json` (อ้างด้วย `PRM-xxx`) — ไฟล์นี้ไม่ฝังตัวเลขที่ยังไม่ยืนยัน
**Precedence:** หลักเกณฑ์ PGS 10 ทางการ > หนังสือแก้ไข/ประกาศที่มีผล > Operational Hard Controls ที่ล็อก > เอกสารต้นฉบับของเคส > หน้าจอ > OCR/Text Layer
**Safety:** พารามิเตอร์ที่ยังไม่พิสูจน์ (OPEN / ASSUMPTION / UNVERIFIED) → **Safe-Hold** ตามที่ระบุ ไม่อนุมาน

> ป้ายที่มา `OFFICIAL` = ผู้ตรวจอ้างว่ามาจากหลักเกณฑ์ทางการ (ต้นฉบับไม่ได้ส่งเข้า session ที่สร้างไฟล์นี้ — ต้องเทียบก่อน Freeze). ที่มา `DEC-nn` = คำตัดสินของ Business Owner (Reconciliation r2)

## 1. ขอบเขตและ Product
- ใช้เฉพาะ PGS ระยะที่ 10 ปรับปรุงครั้งที่ 5; ห้ามนำ PGS 11 มาปน (`PRM-001` = PGS10 ปรับปรุงครั้งที่ 5 เท่านั้น · **OFFICIAL**)
- Product: Smart Biz, Smart One, Smart Green, Smart Plus & Top up (SMEs) · Small Biz (SSMEs รูปแบบ 1) · Start up (SSMEs รูปแบบ 2)

## 2. Eligibility — `PGS10-ELIG-001`, `PGS10-LG-001`
- สินเชื่อใหม่เพื่อธุรกิจ; ประเภทต้องห้าม: Hire Purchase / Leasing (`PRM-007` = true boolean · **OFFICIAL**; `PRM-009` = true boolean · **OFFICIAL**; `PRM-008` = true boolean · **ASSUMPTION**)
- ค้ำต่อครั้ง ≥ `PRM-002` = 10000 THB · **OFFICIAL**; รวมต่อรายภายใต้โครงการ ≤ `PRM-003` = 40000000 THB · **OFFICIAL**
- SSMEs (รวมทุกผู้ให้สินเชื่อ): Small Biz ≤ `PRM-004` = 200000 THB · **OFFICIAL**; Start up ≤ `PRM-005` = 100000 THB · **OFFICIAL**
- อายุ LG สูงสุด `PRM-006` = 10 years · **OFFICIAL** และต้องชำระค่าธรรมเนียมค้ำประกันต่อเนื่อง
- **FAIL = `policy_disqualifying` ∧ ¬`remediable_by_document` ∧ `evidence_verified` (DEC-19, DEC-31)** — ตัดสินจากคุณสมบัติของ Rule ไม่ใช่ prefix ของ reason_code; ปัญหา Document / Data / Evidence และเรื่องที่แก้ได้ด้วยเวลา = HOLD (`PRM-045` = {"policy_disqualifying": true, "remediable_by_document": false, "evidence_verified": true} · **LOCKED**)

## 3. NPL — `PGS10-NPL-001`
- `npl_date` = วันที่บัญชีเป็น NPL ตามนิยาม PGS จากข้อมูล FI; **ห้าม derive จาก `default_date`** (`PRM-014` = false boolean · **LOCKED**); ไม่มี → HOLD `NPL_DATE_MISSING`
- Seasoning: Small Biz `PRM-010` = 6 calendar months · **OFFICIAL** · Start up `PRM-011` = 6 calendar months · **OFFICIAL** · SMEs `PRM-012` = 9 calendar months · **OFFICIAL**
- **Anchor (`PRM-013` = lg_issue_date · **APPROVED_OPERATIONAL**):** ใช้ `lg_issue_date` เป็น anchor ของ seasoning — **Operational Mapping (APPROVED_OPERATIONAL) ไม่ใช่ OFFICIAL** (ข้อ 2.5 นับอายุการค้ำจากวันออก LG ส่วนหน้า 7 ใช้ 'วันที่ บสย. ค้ำประกัน' ซึ่งไม่ได้ระบุสมการว่าเป็น field เดียวกัน); `guarantee_effective_date` เก็บแยกได้เมื่อมี source จริง (`PRM-013b` = เก็บได้เมื่อมี source จริง; ไม่ใช้เป็น anchor · **APPROVED_OPERATIONAL**); เปลี่ยน Mapping ได้โดยไม่แก้ Rule ID. ไม่มี `lg_issue_date` → HOLD `NPL_ANCHOR_DATE_UNDEFINED`
- **FAIL:** `npl_date` + anchor + Policy verify ครบแล้วยังไม่พ้น seasoning → **FAIL `NPL_SEASONING_NOT_MET`** (DEC-31); ไม่มี npl_date → HOLD `NPL_DATE_MISSING`

## 4. เงื่อนไขการขอรับเงินค่าประกันชดเชย (claim path) — `PRM-052`
| ตัวอักษร | เงื่อนไข |
|---|---|
| (ก) | NPL เมื่อพ้น 9 เดือนนับจากวันที่ บสย. ค้ำประกัน (SMEs) |
| (ข) | NPL เมื่อพ้น 6 เดือน (Small Biz และ Start up) |
| (ค) | ปรับโครงสร้างหนี้ ≥ 1 ครั้ง + พ้น 3 เดือนหลังวันทำสัญญาปรับโครงสร้าง + ไม่ชำระติดต่อกันอีก 3 เดือน |
| (ง) | ไม่ชำระหนี้ติดต่อกัน 3 เดือนนับแต่ผิดนัด |
| (จ) | มีหนังสือบอกเลิก/บอกกล่าวให้ชำระหนี้ทั้งหมด ≥ 1 ครั้ง และยังไม่ชำระ ≥ 1 เดือน (หรือเข้าเงื่อนไขล้มละลาย) |
| (ฉ) | ยื่น Claim ตั้งแต่ปีที่ 2 ของอายุ LG และไม่เกิน 1 ปีหลัง LG ฉบับสุดท้ายสิ้นอายุ |

| กลุ่ม | ≤ 5 ปี | > 5 ปี |
|---|---|---|
| SMEs (Smart Biz / One / Green / Plus & Top up) | (ก)+(ค)+(จ)+(ฉ) | (ก)+(ง)+(จ)+(ฉ) |
| Small Biz | (ข)+(ค)+(จ)+(ฉ) | (ข)+(ง)+(จ)+(ฉ) |
| **Start up** | **(ข)+(จ)+(ฉ)** — ไม่รับ (ค) (DEC-24) | (ข)+(จ)+(ฉ) |

Case (DEC-32): **1** = SMEs ≤5 ปี · **2** = SMEs >5 ปี · **3** = Small Biz ≤5 ปี · **4** = Small Biz >5 ปี (รวม (ข)) · **5** = Start up. band ≤5/>5 ปีของ Case นับจากวันที่ยื่นเทียบวันออก LG (`PRM-054` = claim_submission_date เทียบ lg_issue_date + 5 ปี ('ขอ Claim ภายใน 5 ปีแรก') · **APPROVED_OPERATIONAL** — Q-08; ข้อมูลไม่ครบ → HOLD `LG_DATA_MISSING`)

## 5. Restructure และทางออก — `PGS10-RST-001/002/003`
- เส้นทาง: `NORMAL_RESTRUCTURE_PATH` | `UNCONTACTABLE_EXCEPTION_PATH` | `NOT_REQUIRED` (path ที่ไม่มี (ค))
- `restructure_date = null` **ไม่ใช่เหตุให้ PASS**
- **ทางออกกรณีติดต่อไม่ได้ / ตกลงไม่ได้ (OFFICIAL หน้า 7 เฉพาะ Case 1 และ 3 — DEC-20/32):** `exception_start_date = first_uncontactable_date OR first_contacted_but_restructure_failed_date`; `exception_maturity_date = add_calendar_months(start, 7)`; ต้องมี Certified Tracking Report + หนังสือบอกกล่าว/บอกเลิก ≥ 1 → PASS_WITH_SUPPORT `support_code=UNCONTACTABLE_7_MONTH_EXCEPTION`; **ไม่ขยายไป Start up (Case 5)**. (`PRM-018` = 7 months · **OFFICIAL**; `PRM-019` = true boolean · **OFFICIAL**)
- วันลงนาม / อนุมัติ / มีผล / เริ่มบัญชีใหม่ เป็นคนละ field

## 6. Demand และ Filing Window — `PGS10-DMD-003`, `PGS10-CLM-001`
- ระยะรอหลังหนังสือบอกกล่าว `PRM-020` = 1 months · **OFFICIAL**; วันอ้างอิง `PRM-021` = demand_letter_date · **OPEN** (Safe-Hold)
- Filing: ไม่เร็วกว่า `PRM-022` = lg_issue_date + 1 year · **OFFICIAL** และไม่เกิน `PRM-023` = final_lg_expiry_date + 1 year · **OFFICIAL**; วิธีนับ `PRM-028` = CALENDAR_MONTH_CLAMP_END_OF_MONTH · **OPEN** (Safe-Hold). **ยังไม่ถึงเวลา → HOLD/Pending `CLAIM_FILING_NOT_YET_OPEN`; หมดสิทธิและวันที่ verify แล้ว → FAIL `CLAIM_FILING_WINDOW_EXPIRED`** (DEC-31)

## 7. Coverage — `PGS10-CLM-002` (OFFICIAL, DEC-21)
| Product | contractual LG tenor ≤ 5 ปี | > 5 ปี |
|---|---:|---:|
| Smart Biz · Smart One · Smart Green · Smart Plus & Top up · Small Biz | 70% | 100% |
| Start up | 100% | 100% |
- threshold: `PRM-027b` = 5 years · **OFFICIAL**; เปรียบเทียบด้วย `<=` (tenor 5 ปีพอดี = Tier แรก — DEC-11)
- **`coverage_age_basis`: `PRM-027` = CONTRACTUAL_LG_TENOR · **OFFICIAL**** — ตารางแบ่งตาม 'อายุหนังสือค้ำประกัน' และข้อ 2.5 นับอายุการค้ำจากวันออก LG จึงใช้ **contractual LG tenor** ไม่ใช่อายุ ณ Claim/NPL/Default/Demand (DEC-30). ลำดับ source (`PRM-027c` = ["1. guarantee_term ใน LG โดยตรง", "2. lg_expiry_date − lg_issue_date", "3. พิสูจน์ไม่ได้ → HOLD LG_TENOR_UNDETERMINABLE"] list · **APPROVED_OPERATIONAL**): (1) `guarantee_term` ใน LG (2) `lg_expiry_date − lg_issue_date` (3) พิสูจน์ไม่ได้ → HOLD `LG_TENOR_UNDETERMINABLE`

## 8. Claim base และ Claim amount — `PGS10-CLM-003/004`
- `claim_base = MIN(current_principal, current_guarantee_obligation)`; `claim_amount = round_half_up(claim_base × coverage_ratio, 2)` (`PRM-029` = integer satang (Decimal) · **LOCKED**; `PRM-030` = ROUND_HALF_UP, 2 dp, ครั้งเดียวปลายสูตร · **LOCKED**)
- **ห้าม tolerance กับ:** principal, claim_base, coverage_ratio, claim_amount, claim_max (และ historical_*) — `PRM-034` = ["principal", "claim_base", "coverage_ratio", "claim_amount", "claim_max", "historical_principal", "historical_interest", "historical_total"] list · **LOCKED**

## 9. Package / CLAIM MAX — `PGS10-CAP-001`
- `available = claim_max − paid − pending`; `after = available − claim_amount` ต้องตรงทุกสตางค์
- **REQUIRED_HARD ที่ FINAL_APPROVAL** (DEC-17); PRE_REVIEW NOT_TESTABLE ได้ (`PRM-051` = ["PRE_REVIEW", "FINAL_APPROVAL"] enum · **LOCKED**)
- ข้อมูล Package ไม่ครบ → NOT_TESTABLE + case HOLD + `PACKAGE_DEFINITION_REQUIRED` (ไม่ใช่ FAIL)
- Ledger (อ้างอิง): package_id, round_no, opening_cap, fee_income, government_contribution, paid_claims, pending_claims, carry_forward, closing_cap · เงินสมทบรัฐบาล Small Biz `PRM-046` = [0.5, 1.0, 2.5, 2.5, 1.5, 1.5, 1.5, 0.5, 0.5, 0.5] percent · **REFERENCE**

## 10. ค่าธรรมเนียมและรายงาน (อ้างอิง — ไม่ใช่ Control)
- ค่าธรรมเนียมจ่ายชดเชย `PRM-047` = 2 percent of approved claim · **REFERENCE** แยกจาก Claim Amount · รายงานสถานภาพหนี้รายเดือน `PRM-048` = {"SSMEs": 6, "SMEs": 9} months · **REFERENCE** (ห้ามปนกับ NPL seasoning)

## 11. Governance
| เรื่อง | ค่า | Safe-Hold ระหว่างที่ยังไม่อนุมัติ |
|---|---|---|
| `tolerance.enabled` | **false** (`PRM-032` = false boolean · **LOCKED**) | ส่วนต่างทุกจำนวน → HOLD `NUMERIC_VARIANCE` + review_flag OBSERVATION_CANDIDATE |
| tolerance เมื่ออนุมัติ | proposed 0.01 บาท; whitelist `current_interest`, `current_total`; total ต้องมาจาก interest rounding เดียว | — (ปิดอยู่) |
| Observation ที่ Auto-pass | เฉพาะ FORMAT_NORMALIZED (non-semantic, field-specific — `PRM-049` = FORMAT_NORMALIZED เท่านั้น (non-semantic, field-specific) · **LOCKED**) | อื่นทั้งหมด → HOLD / reviewer |
| Contract date | Approval = Contract เฉพาะ Thai Credit revolving-loan (`PRM-036` = approval_notice_date · **OPERATIONAL_LOCKED_SCOPED**) | FI อื่น → HOLD `CONTRACT_DATE_BASIS_UNDEFINED` |
| Transaction code | ตามตาราง bank-specific (`06`) | ไม่มี Mapping → HOLD `TRANSACTION_CODE_UNMAPPED` |

## 12. การตัดสินระดับเคส
`PASS` · `PASS_WITH_SUPPORT` (Documentary Exception ที่สมบูรณ์) · `PASS_WITH_OBSERVATION` (FORMAT_NORMALIZED / Observation ที่ผ่านการอนุมัติ; มี Support ด้วย → `support_used=true`) · `HOLD` (หลักฐาน/นิยาม/Config ไม่พอ) · `FAIL` (Proven Policy Ineligibility). รายละเอียดอยู่ที่ `reason_code` เสมอ
