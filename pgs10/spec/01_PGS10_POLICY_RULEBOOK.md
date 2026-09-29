# 01 · PGS 10 Policy Rulebook

**Spec version:** 1.0.0-DRAFT (ยังไม่ Freeze — รอ Rule-by-Rule reconciliation กับ Master Audit)
**Scope:** โครงการค้ำประกันสินเชื่อ บสย. SMEs เข้มแข็ง — **PGS ระยะที่ 10 ปรับปรุงครั้งที่ 5** เท่านั้น (ห้ามนำเกณฑ์ PGS 11 มาปน)
**ไฟล์นี้บรรจุ:** เฉพาะ *นโยบาย/เงื่อนไขของโครงการ* (Eligibility, Product, NPL, Restructure, Demand, Filing Window, Coverage, Claim Max, Fee, Package)
**ไม่บรรจุ:** กฎตรวจเอกสารเชิงปฏิบัติการ → `02_PGS10_OPERATIONAL_AUDIT_RULES.md` · ความหมายของฟิลด์ → `03_PGS10_DATA_DICTIONARY.json` · เคสทดสอบ → `04_PGS10_GOLDEN_TESTS.json` · ข้อเสนอออกแบบระบบ (UI/Role/Phase) ไม่ถือเป็นกฎตัดสิน

> **ข้อจำกัดของการตรวจสอบไฟล์นี้:** เนื้อหาถอดจาก *PGS 10 Master Audit* (และ Rulebook 22 Controls) ซึ่งอ้างอิงหลักเกณฑ์ทางการปรับปรุงครั้งที่ 5 — **ยังไม่ได้เทียบกับเอกสารหลักเกณฑ์ทางการฉบับจริง** เพราะไม่ได้แนบมา ทุกข้อจึงติดป้ายสถานะ (ด้านล่าง) และต้องให้ผู้ตรวจเทียบกับต้นฉบับก่อน Freeze

## ป้ายสถานะของแต่ละข้อ

| ป้าย | ความหมาย |
|---|---|
| `OFFICIAL` | Master Audit ระบุว่ามาจากหลักเกณฑ์ทางการ (ต้องเทียบต้นฉบับก่อน Freeze) |
| `LOCKED` | กฎที่ผู้ใช้ล็อกไว้ในโครงการนี้ (ชนะเมื่อขัดกับเอกสารเก่า) |
| `OPEN` | ยังไม่มีหลักฐานยืนยัน — **ห้าม Hardcode** ทำเป็น Configuration / Rule Table และถ้าจำเป็นต้องใช้ตัดสินให้ `HOLD` |
| `REFERENCE` | ข้อมูลประกอบ ไม่ใช่ Control ตรวจคำขอ |

รหัสในวงเล็บท้ายข้อ = ที่มา: `M§n` = Master Audit หัวข้อ n · `R§n` = Rulebook หัวข้อ n · `V` = บทสนทนาประเมิน Master Audit ฉบับล่าสุด · `U` = คำสั่งล็อกของผู้ใช้

---

## 1. ขอบเขตและ Eligibility

| ID | ข้อกำหนด | สถานะ | ที่มา |
|---|---|---|---|
| PGS10-POL-SCOPE-001 | ใช้เฉพาะ PGS ระยะที่ 10 ปรับปรุงครั้งที่ 5; ไม่ใช้ PGS 11 | OFFICIAL/LOCKED | M§intro, R§4 |
| PGS10-POL-PROD-001 | Product ในโครงการ: Smart Biz, Smart One, Smart Green, Smart Plus & Top up (กลุ่ม SMEs) และ Small Biz, Start up (กลุ่ม SSMEs) | OFFICIAL | M§intro |
| PGS10-POL-ELIG-001 | สินเชื่อต้องเป็น **สินเชื่อใหม่เพื่อธุรกิจ**; ยกเว้น: สินเชื่อเช่าซื้อ และลิสซิ่ง | OFFICIAL | M§2, R§4 |
| PGS10-POL-ELIG-002 | วงเงินค้ำประกันทั่วไป **ต่อครั้ง ≥ 10,000 บาท** และวงเงินรวมภายใต้โครงการ **ต่อราย ≤ 40 ล้านบาท** | OFFICIAL | M§2 |
| PGS10-POL-ELIG-003 | SSMEs: **Small Biz (รูปแบบ 1)** รวมทุกผู้ให้สินเชื่อ ≤ **200,000 บาท/ราย**; **Start up (รูปแบบ 2)** ≤ **100,000 บาท/ราย** | OFFICIAL | M§2, R§4 |
| PGS10-POL-LG-001 | อายุ LG สูงสุด **10 ปี** นับจากวันออก LG, ภายใต้เงื่อนไขชำระค่าธรรมเนียมค้ำประกันต่อเนื่องครบถ้วน | OFFICIAL | M§2, R§1 |

## 2. NPL

| ID | ข้อกำหนด | สถานะ | ที่มา |
|---|---|---|---|
| PGS10-POL-NPL-001 | ตัวแปรทางกฎหมายคือ **`npl_date`** (วันที่บัญชีเป็น NPL ตามนิยาม PGS) — **ไม่ใช่ `default_date`** ห้ามตีความ Default = NPL อัตโนมัติ | LOCKED | M§4.1, M§43.1, U |
| PGS10-POL-NPL-002 | **Small Biz** (5 ปีแรกของ LG): ต้องเป็น NPL เมื่อ **พ้น 6 เดือนนับจากวันที่ออก LG** — เงื่อนไข (ข) | OFFICIAL (ตัวเลข 6 เดือน) / OPEN (การใช้เป็นกฎทั่วไปทุก Small Biz — R§32) | M§4.1 |
| PGS10-POL-NPL-003 | **SMEs** (Smart Biz/One/Green/Plus & Top up): เป็น NPL เมื่อพ้น **9 เดือน** นับจากวันที่ บสย. ค้ำประกัน — เงื่อนไข (ก) | OFFICIAL | M§3.1 |
| PGS10-POL-NPL-004 | ถ้าระบบต้นทางมีเพียง `default_date` ต้องมี **Business Mapping ที่อนุมัติ** ว่าใช้แทน `npl_date` ได้หรือไม่ ก่อนจึงจะตรวจ NPL-002/003 ได้; ถ้ายังไม่มี → ตรวจไม่ได้ / `HOLD` (ห้ามเดา) | OPEN | M§4.1, M§43.1 |

## 3. เงื่อนไขการขอรับเงินค่าประกันชดเชย

นิยามเงื่อนไข (ตามตัวอักษรใน Master Audit):

| ตัว | เงื่อนไข |
|---|---|
| (ก) | NPL เมื่อพ้น 9 เดือนนับจากวันที่ บสย. ค้ำประกัน (SMEs) |
| (ข) | NPL เมื่อพ้น 6 เดือนนับจากวันที่ออก LG (Small Biz) |
| (ค) | มีการปรับโครงสร้างหนี้ ≥ 1 ครั้ง + พ้น 3 เดือนนับจากวันทำสัญญาปรับโครงสร้างหนี้ + ไม่ชำระหนี้ติดต่อกันอีก 3 เดือน |
| (ง) | ไม่ชำระหนี้ติดต่อกัน 3 เดือนนับแต่ผิดนัด |
| (จ) | มีหนังสือบอกเลิกสัญญา และ/หรือหนังสือบอกกล่าวให้ชำระหนี้ทั้งหมด ≥ 1 ครั้ง และยังไม่ชำระ ≥ 1 เดือน (หรืออยู่ในกรณีล้มละลายตามเงื่อนไข) |
| (ฉ) | ยื่น Claim ได้ตั้งแต่ **ปีที่ 2** ของอายุ LG และไม่เกิน **1 ปีหลังสิ้นอายุการค้ำประกันฉบับสุดท้าย** |

| ID | กลุ่ม | ภายใน 5 ปีแรก | หลังพ้น 5 ปีแรก | สถานะ | ที่มา |
|---|---|---|---|---|---|
| PGS10-POL-CLM-001 | SMEs (Smart Biz/One/Green/Plus & Top up) | (ก)+(ค)+(จ)+(ฉ) | (ก)+(ง)+(จ)+(ฉ) | OFFICIAL | M§3.1 |
| PGS10-POL-CLM-002 | Small Biz | (ข)+(ค)+(จ)+(ฉ) | (ง)+(จ)+(ฉ) (ไม่ใช้ (ค)) | OFFICIAL | M§4, M§6 |
| PGS10-POL-CLM-003 | Start up | **ไม่ระบุใน Master Audit** | — | OPEN | — |

### 3.1 Restructure

| ID | ข้อกำหนด | สถานะ | ที่มา |
|---|---|---|---|
| PGS10-POL-RST-001 | เส้นทางปกติ `NORMAL_RESTRUCTURE_PATH`: ปรับโครงสร้าง ≥ 1 ครั้ง, พ้น 3 เดือนจากวันทำสัญญาปรับโครงสร้าง, และไม่ชำระติดต่อกันอีก 3 เดือน | OFFICIAL | M§4.2 |
| PGS10-POL-RST-002 | เส้นทางยกเว้น `UNCONTACTABLE_7_MONTH_EXCEPTION`: ติดต่อผู้ขอสินเชื่อไม่ได้ **หรือ** ติดต่อได้แต่ตกลงปรับเงื่อนไข/โครงสร้างไม่ได้ → ใช้ได้เมื่อ **พ้น 7 เดือน** นับจากวันที่ติดต่อไม่ได้ / วันแรกที่ติดต่อได้แต่ตกลงไม่ได้ และต้องมี Certified Tracking Report + หนังสือบอกกล่าว/บอกเลิก ≥ 1 ครั้ง | OFFICIAL (M§5) / **OPEN** ว่าเป็นข้อยกเว้นทุกกรณีหรือเฉพาะบาง workflow (R§32) | M§5, R§32 |
| PGS10-POL-RST-003 | `restructure_date = null` ต้อง **ไม่ผ่านอัตโนมัติ** — ต้องระบุเส้นทางที่ใช้ (RST-001 หรือ RST-002) หรือเป็นกรณีพ้น 5 ปี | LOCKED | M§5 |

### 3.2 Demand / Termination

| ID | ข้อกำหนด | สถานะ | ที่มา |
|---|---|---|---|
| PGS10-POL-DMD-001 | ต้องมีหนังสือบอกเลิกสัญญาและ/หรือบอกกล่าวให้ชำระหนี้ทั้งหมด ≥ 1 ครั้ง | OFFICIAL | M§3.1(จ) |
| PGS10-POL-DMD-002 | ก่อนใช้ Demand เป็นเงื่อนไข Claim ลูกหนี้ต้องยังไม่ชำระ **≥ 1 เดือน** นับจากวันที่ผู้ให้สินเชื่อมีหนังสือบอกกล่าว (ยกเว้นเส้นทางล้มละลาย): `claim_eligibility_date ≥ demand_date + 1 เดือน` | OFFICIAL / OPEN ว่านับจาก *วันที่ในหนังสือ* หรือ *วันที่ผู้รับได้รับ* และวิธีนับเดือน | M§24 |

### 3.3 Claim Filing Window

| ID | ข้อกำหนด | สถานะ | ที่มา |
|---|---|---|---|
| PGS10-POL-CLM-004 | `claim_date ≥ lg_issue_date + 1 ปี` (ตั้งแต่ปีที่ 2) และ `claim_date ≤ final_lg_expiry_date + 1 ปี` | OFFICIAL / **OPEN** วิธีนับวัน (นิยามธุรกิจที่ บสย. ล็อก) | M§25 |

## 4. Coverage Ratio (อัตราค่าประกันชดเชย)

| ID | Product | อายุ LG | Ratio | สถานะ | ที่มา |
|---|---|---|---|---|---|
| PGS10-POL-COV-001 | Small Biz | ≤ 5 ปี | **70%** | LOCKED | R§22, M§7 |
| PGS10-POL-COV-001 | Small Biz | > 5 ปี | **100%** | LOCKED | R§22, M§7 |
| PGS10-POL-COV-002 | Start up | ทุกอายุ | 100% | OFFICIAL (M§7) — ไม่ได้ล็อกใน Rulebook | M§7 |
| PGS10-POL-COV-003 | Smart Biz / One / Green / Plus & Top up | — | **ไม่มีข้อมูลยืนยัน** (M§7 เขียนว่า “Small Biz และกลุ่ม SMEs หลัก” ใช้ 70/100 แต่ R§22/§32 ห้าม Hardcode ratio เดียวให้ทุก Product) | **OPEN** | M§7 vs R§22, R§32 |

- ต้องเก็บเป็น `product_rule_matrix` (Rule Table) ไม่ฝังในโค้ด · Product ที่ไม่มีแถวในตาราง → `HOLD` เหตุผล `NO_RULE_FOR_PRODUCT`
- **OPEN:** วิธีนับ “อายุ LG 5 ปี” (Claim Date / Claim Year / Anniversary Rule) — R§32
- `claim_amount = round_half_up(claim_base × coverage_ratio, 2)` (Decimal, ห้าม Floating Point) — R§23

## 5. Claim Base

`claim_base = MIN(current_principal, current_guarantee_obligation)`

- Principal < Guarantee → ใช้ภาระหนี้ต้นเงินคงเหลือ (mode `BY_PRINCIPAL`)
- Principal ≥ Guarantee → ใช้วงเงินค้ำประกัน (mode `BY_GUARANTEE`)
- ตัวอย่างที่ยืนยัน: 49,988.18 vs 50,000 → 49,988.18 · 80,000 vs 80,000 → 80,000 (R§21) · สถานะ `LOCKED`
- **OPEN:** แหล่งที่มาของ `current_guarantee_obligation` (LG / หน้าจอ) — ไม่ได้ระบุ

## 6. CLAIM MAX / Package Cap

PGS 10 เป็น Package Guarantee Scheme — ต้องตรวจ Cap ระดับ Package ไม่ใช่เฉพาะรายลูกหนี้ (M§30)

```
available_claim_capacity = claim_max − paid_claims − pending_claims
carry_forward_balance    = available_claim_capacity − current_case_claim      (ต้องตรงทุกสตางค์)
```

| ID | ข้อกำหนด | สถานะ | ที่มา |
|---|---|---|---|
| PGS10-POL-CAP-001 | สูตรข้างต้น; ถ้ามี CLAIM MAX แต่ไม่มี paid/pending → `NOT_TESTABLE` (ห้ามเดา) | LOCKED | R§24, M§30 |
| PGS10-POL-CAP-002 | วงเงินจ่ายที่เหลือในรอบปีนำไปรวมรอบถัดไป; คำขอที่เกิน Cap เข้ากลไกรอบถัดไปตามหลักเกณฑ์ → ต้องเก็บเป็น **Ledger** (`package_id, round_no, opening_cap, fee_income, government_contribution, paid_claims, pending_claims, carry_forward, closing_cap`) ไม่ใช่ Snapshot เดียว | OFFICIAL / รายละเอียดกลไกรอบถัดไป OPEN | M§32 |
| PGS10-POL-CAP-003 | เงินสมทบรัฐบาล Small Biz ต่อรอบปี 1–10: 0.50, 1.00, 2.50, 2.50, 1.50, 1.50, 1.50, 0.50, 0.50, 0.50 (%) รวม 12.50% | REFERENCE | M§31 |

## 7. ค่าธรรมเนียมและงานรายงาน (ไม่ใช่ Control ตรวจคำขอ)

| ID | ข้อกำหนด | สถานะ | ที่มา |
|---|---|---|---|
| PGS10-POL-FEE-001 | ค่าธรรมเนียมการจ่ายค่าประกันชดเชย = 2% ของจำนวนที่ บสย. จ่าย (`compensation_fee = approved_claim_amount × 2%`) แยกจาก Claim Amount | REFERENCE | M§33 |
| PGS10-POL-RPT-001 | ผู้ให้สินเชื่อรายงานสถานภาพหนี้ทุกเดือน; SSMEs: ไม่รายงานครบ 6 เดือนแรก บสย. สงวนสิทธิไม่ต่ออายุ LG; SMEs: 9 เดือนแรก — **ห้ามปนกับ NPL Seasoning** | REFERENCE | M§34 |
| PGS10-POL-RNW-001 | SSMEs ผิดนัดและเป็น NPL ภายใน 6 เดือนแรก → กระทบการต่ออายุ LG ปีที่ 2 — แยก `NPL_DATE` / `LG_RENEWAL_STATUS` / `CLAIM_ELIGIBILITY` ออกจากกัน | REFERENCE | M§35 |

## 8. รายการที่ห้าม Hardcode (Rulebook §32 + Master Audit §43)

ต้องเป็น Configuration / Rule Table จนกว่าจะมีเอกสารยืนยัน:

1. NPL seasoning 6 เดือนเป็นกฎทั่วไปของ Small Biz ทุกเคส
2. 7-month exception เป็นข้อยกเว้นทุกกรณีหรือเฉพาะบาง workflow
3. Coverage Ratio ของ Product นอก Small Biz (และ Start up ที่ยังไม่ล็อกใน Rulebook)
4. วิธีนับอายุ LG 5 ปี
5. Transaction Code ของธนาคาร (เช่น 6834/6714) → ตาราง Mapping ต่อธนาคาร
6. ค่า Tolerance ของส่วนต่างเงิน (0.01 บาท)
7. นิยาม `default_date` ↔ `npl_date`
8. วิธีนับเดือน/ปี (เช่น “พ้น 3 เดือน”, “1 เดือนหลังบอกกล่าว”) — นับรวม/ไม่รวมวันตั้งต้น, สิ้นเดือน

ทะเบียนความขัดแย้งและจุดกำกวมทั้งหมดอยู่ที่ **`02_PGS10_OPERATIONAL_AUDIT_RULES.md` ภาคผนวก A**
