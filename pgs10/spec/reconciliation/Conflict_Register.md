# Conflict Register

**เวอร์ชัน:** 1.2.0-RECONCILIATION · ต่อยอดจากภาคผนวก A ของ `02_PGS10_OPERATIONAL_AUDIT_RULES.md` (A-01…A-28) + รายการใหม่จาก Pack v1.1.0 และคำตัดสิน (A-29…A-39)

สถานะ: `RESOLVED` ปิดแล้วด้วย DEC · `RESOLVED_PENDING_SOURCE_EDIT` ตัดสินแล้วแต่เอกสารต้นทางต้องแก้ · `PARTIAL` ปิดบางส่วน · `OPEN` ยังไม่ตัดสิน

สรุป: RESOLVED 17, RESOLVED_PENDING_SOURCE_EDIT 1, PARTIAL 7, OPEN 14 · **ขวาง Freeze 13** รายการ

| ID | ประเด็น | ประเภท | แหล่ง | สถานะ | DEC | ผลที่ใช้ตอนนี้ | ขวาง Freeze? |
|---|---|---|---|---|---|---|---|
| A-01 | default_date ≠ npl_date | AMBIGUOUS | M§4.1, M§43.1, P GOV-001 | RESOLVED | DEC-01 | ไม่มี Mapping จาก default_date: ต้องได้ npl_date จากข้อมูล FI; ไม่มี → HOLD NPL_DATE_MISSING. (ปิด 'Business Mapping' เดิมด้วยการห้าม derive) | — |
| A-02 | Demand Principal as-of Demand Date | CONFLICT | R§15, M§19 vs M§20, P DMD-002 | RESOLVED | DEC-08 | as-of เป็น Canonical; รายละเอียด fallback รอยืนยัน (Q-02) | — |
| A-03 | Tolerance 0.01 configurable | CONFLICT | R§19, M§26, V, P CUR-002 | RESOLVED | DEC-09 | tolerance ปิด; NUMERIC_VARIANCE + review_flag OBSERVATION_CANDIDATE; ห้ามกับ principal/claim_base/coverage/claim_amount/claim_max. จำนวนที่จะอนุมัติ = Q-04 | — |
| A-04 | Historical mismatch = HOLD | SOURCE-ERROR | R§16 vs M§27 | RESOLVED_PENDING_SOURCE_EDIT | DEC-07 | HOLD HISTORICAL_BALANCE_MISMATCH. ต้องแก้ถ้อยคำ Master Audit §27 ให้ตรง (ยังเป็นงานค้าง) | ใช่ |
| A-05 | OCR ห้ามชดเชย Critical Document | AMBIGUOUS | R§8, M§37, P VIS-002 | PARTIAL | — | หลักการปิดแล้ว; รายการ Critical Document ต่างกัน (M 7 ประเภท / P 6 — รวม postal ack กับ returned envelope) → เสนอใช้ 7 (PRM-038) | — |
| A-06 | คำศัพท์สถานะ 3 ชุด | CONFLICT | R§26, M§38, V, P | RESOLVED | DEC-05 | Case 5 State + control_status 7 ค่า + reason_code; ห้าม HOLD_* (P ใช้ 10 ชื่อ — ดู A-31) | — |
| A-07 | ขอบเขตของ FAIL | CONFLICT | R§26, M§39, P ID-001 | OPEN | — | R: เฉพาะ Eligibility/แก้ไม่ได้; M§39 และ P: FAIL เมื่อคนละบุคคล/NPL/Coverage/Claim ผิด — ยังไม่มีคำตัดสิน (PRM-045) | ใช่ |
| A-08 | ลำดับ Support vs Observation; NOT_TESTABLE | AMBIGUOUS | D, P §13 | RESOLVED | DEC-04, DEC-06 | PASS_WITH_OBSERVATION + support_used=true; REQUIRED_HARD NOT_TESTABLE → HOLD | — |
| A-09 | NPL Seasoning 6 เดือนเป็นกฎทั่วไปหรือไม่ | CONFLICT | M§4.1 vs R§32 | RESOLVED | DEC-01 | Small Biz และ Start up = 6 เดือน OFFICIAL | — |
| A-10 | 7-month exception ขอบเขต + วันเริ่มนับ | CONFLICT/AMBIGUOUS | M§5, R§32, P RST-002 | OPEN | — | route ชื่อ UNCONTACTABLE_EXCEPTION_PATH (ไม่ผูก 7); เดือนเป็นพารามิเตอร์ OPEN; ปิดไว้ (PRM-018/019) | ใช่ |
| A-11 | Coverage Ratio นอก Small Biz | CONFLICT | R§22/§32 vs M§7 | OPEN | — | Small Biz/Start up มี; Smart* → HOLD NO_RULE_FOR_PRODUCT (PRM-026b) | ใช่ |
| A-12 | วิธีนับอายุ LG / วิธีนับเดือน-ปี | AMBIGUOUS | R§32, M§25 | PARTIAL | DEC-11 | ขอบเขต '5 ปีพอดี = 70%' ปิดแล้ว; วันอ้างอิงอายุ (สมมติ claim_date) และ calendar arithmetic ยัง OPEN (PRM-027/028) | ใช่ |
| A-13 | Rule ID ชนกัน/พิมพ์ผิด | SOURCE-ERROR | M§41, M§29, P | RESOLVED | DEC-14 | ใช้ Master IDs + legacy_aliases (Canonical_Rule_ID_Map) | — |
| A-14 | Transaction taxonomy + นิยาม Payment | CONFLICT/AMBIGUOUS | R§9, M§11, P | PARTIAL | DEC-02, DEC-12 | types = union (รวม REVERSAL, PRINCIPAL_ADJUSTMENT); code map ต่อ bank_id. ยังไม่ชัด: เงินรับที่ตัดดอกเบี้ยอย่างเดียวนับเป็น PAYMENT หรือไม่ | ใช่ |
| A-15 | 'UNKNOWN ใกล้วันผิดนัด' | AMBIGUOUS | R§9 | OPEN | — | เสนอ: UNKNOWN ใด ๆ หลัง PAYMENT ล่าสุด → HOLD (PRM-042) | — |
| A-16 | รายการภาพหนังสือยืนยัน 12 vs 10 | CONFLICT | R§8, M§15, P VIS-001 | OPEN | — | เสนอ 12 (ชุดใหญ่ รวม 'ข้อความว่าชำระไม่เป็นไปตามเงื่อนไข') — PRM-037 | ใช่ |
| A-17 | Postal: ประเภทลายมือชื่อ + linkage | CONFLICT | R§17, M§21/§23, P PST-* | RESOLVED | — | D, M, P ตรงกันแล้ว (ชื่อตัวบรรจง/เจ้าหน้าที่ไปรษณีย์ไม่พอ; ตรวจ linkage) | — |
| A-18 | Address: ที่อยู่ล่าสุด vs ที่อยู่ใดก็ได้ | CONFLICT | R§18, M§22 | PARTIAL | DEC-12 | ใช้ที่อยู่ล่าสุดเมื่อมีเอกสารแจ้งเปลี่ยน; วันที่มีผลเทียบวันส่งยัง OPEN | — |
| A-19 | Pipeline 3 ฉบับ | CONFLICT | R§31, M§42, V | RESOLVED | — | ไม่ Short-circuit → ผลไม่ขึ้นกับลำดับ; ลำดับรายงานตาม V | — |
| A-20 | Historical Debt เมื่อ Trigger ไม่ใช่ Demand | AMBIGUOUS | R, M | OPEN | — | ตรวจเฉพาะ Reference=Demand; อื่น ๆ → NOT_TESTABLE | — |
| A-21 | Demand waiting / Filing window นับจากวันใด | AMBIGUOUS | M§24-25 | OPEN | — | PRM-021/022/023; วิธีนับ PRM-028 | ใช่ |
| A-22 | รูปแบบวันที่ พ.ศ./ค.ศ. | SOURCE-ERROR | M§29 | RESOLVED | DEC-12 | ISO CE + calendar metadata (PRM-031) | — |
| A-23 | Start up = รูปแบบ 2; เงื่อนไข Claim ของ Start up | AMBIGUOUS | R§4, M§2-6 | PARTIAL | DEC-01 | Start up = รูปแบบ 2 และใช้ (ข) ยืนยันแล้ว; ชุดเงื่อนไข Claim ที่เหลือของ Start up (สมมติเหมือน Small Biz: (ข)+(ค)+(จ)+(ฉ) / หลัง 5 ปี (ง)+(จ)+(ฉ)) ยังไม่ระบุ | ใช่ |
| A-24 | current_guarantee_obligation / 'other applicable amounts' | AMBIGUOUS | R§18-19 | OPEN | — | ต้องระบุแหล่งที่มา/องค์ประกอบ | — |
| A-25 | เคสอยู่หลายกลุ่มใน R§30 | AMBIGUOUS | R§30 | RESOLVED | DEC-13 | แก้ด้วย RULE_ONLY schema (1 เคสมีได้หลาย Rule test) | — |
| A-26 | ตัวเลขเคสจริงสำหรับ FULL_CASE ไม่มี | AMBIGUOUS | R§30 | OPEN | DEC-13 | FULL_CASE ต้องมี Evidence Package ครบ — ยังไม่มี | ใช่ |
| A-27 | PGS10-LG-001 ไม่มี Logic | AMBIGUOUS | M§41 | OPEN | — | ถอดจาก POL-LG; ขอยืนยัน | — |
| A-28 | ขอบเขต Page Completeness | AMBIGUOUS | R§7, M§10 | OPEN | — | ใช้เฉพาะอนุมัติ/สัญญา | — |
| A-29 | Contract date rule เป็น Thai Credit-only | CONFLICT | R§6/M§9 (ทั่วไป) vs P CON-001 (Thai Credit) | RESOLVED | DEC-10 | Thai Credit revolving-loan เท่านั้น; FI อื่น → HOLD CONTRACT_DATE_BASIS_UNDEFINED (รหัสที่เสนอใหม่ — ขอยืนยัน); fi_id ต้องเป็น input | — |
| A-30 | NPL anchor date | AMBIGUOUS | M§4.1 (วันที่ออก LG) vs DEC-01/M§3.1 (วันที่ บสย. ค้ำประกัน) | OPEN | DEC-01 | สมมติ = lg_issue_date; ต้องยืนยันว่าเป็นวันเดียวกับ 'วันที่ บสย. ค้ำประกัน' (PRM-013) | ใช่ |
| A-31 | Pack ใช้ชื่อ HOLD_* 10 ชื่อและชื่อ reason ไม่ตรง catalogue | CONFLICT | P 01/02 vs P 03 | RESOLVED | DEC-05 | alias map ครบ; catalogue ใหม่ไม่มี HOLD_* | — |
| A-32 | Rule ID ความหมายต่างกันแต่ ID เหมือนกัน (STM-001/002, CLM-001/003, PST-002/003) | CONFLICT | P vs M§41 vs D | RESOLVED | DEC-14 | alias ต้องมี @version เสมอ; ดู hazards ใน Canonical_Rule_ID_Map | — |
| A-33 | Transaction code evidence | AMBIGUOUS | P 03, DEC-02, R§32 | PARTIAL | DEC-02 | 5 codes EVIDENCE_SUPPORTED_BANK_SPECIFIC; 6921/6680 UNVERIFIED; ยังขาด effective_from/to และ evidence doc/page และ approval | ใช่ |
| A-34 | LG ใน Golden Tests ที่ไม่มีในเอกสารอื่น | AMBIGUOUS | P 04 | PARTIAL | DEC-03 | 66-037410 ยืนยัน (ผู้ใช้); 66-040977, 66-042400, 66-047199, 66-068610, 66-100753, 66-011787 ยังไม่มีคำยืนยัน; ทุกเคสต้องแนบ evidence ref | — |
| A-35 | GT-001 (67-026936) ขอบเขต Assertion | CONFLICT | P GT-001 vs V vs R§30 | RESOLVED | DEC-13 | RULE_ONLY VIS-001; ไม่ล็อก HISTORICAL_BALANCE_MISMATCH | — |
| A-36 | Controls/เงื่อนไขที่ P ตัดออก | CONFLICT | P vs R | RESOLVED | DEC-12 | เติมกลับตามรายการ DEC-12 (Proposed_Changes) | — |
| A-37 | ตัวเลขนโยบายที่ P ตัดออก | CONFLICT | P 01 vs M | RESOLVED | — | เก็บใน Policy_Parameter_Table พร้อม source_status (ไม่ฝังใน 01) | — |
| A-38 | P: PASS_WITH_OBSERVATION 'เฉพาะหลัง reviewer อนุมัติ' vs FORMAT_VARIANCE อัตโนมัติ | AMBIGUOUS | P 01 §14, R§5 | OPEN | — | Observation ชนิดใดอัตโนมัติ (FORMAT_VARIANCE, NO_PAYMENT_FOUND) และชนิดใดต้อง reviewer (NUMERIC_VARIANCE) — Q-01 | ใช่ |
| A-39 | หลักฐานที่ผู้ใช้อ้างถึงแต่ session นี้เข้าถึงไม่ได้ | LIMITATION | DEC-02, DEC-03 | OPEN | — | ผมตรวจไม่ได้ว่า Statement remark/ LG 66-037410 ตรงตามที่ระบุ — บันทึกเป็น user-attested และต้องเติม doc/page ก่อน Freeze | — |

## คำถามค้าง

| ID | คำถาม | ข้อเสนอ |
|---|---|---|
| Q-01 | Observation ชนิดใดผ่านอัตโนมัติ ชนิดใดต้อง reviewer approve? | เสนอ: FORMAT_VARIANCE และ NO_PAYMENT_FOUND = OBSERVATION อัตโนมัติ (กฎแน่นอน); NUMERIC_VARIANCE = ต้อง config/override (DEC-09). |
| Q-02 | DMD-002: ยอมให้ fallback ไปใช้ Latest Statement เมื่อไม่มี as-of หรือไม่? | เสนอ: ยอมเฉพาะเมื่อ Statement พิสูจน์ได้ว่าไม่มี principal-changing transaction หลัง demand_date; นอกนั้น HOLD DEMAND_PRINCIPAL_UNRECONCILED. |
| Q-03 | CAP-001 เป็น REQUIRED_HARD ไหม (NOT_TESTABLE → ทั้งเคส HOLD)? | เสนอ: REQUIRED_HARD เพราะตรวจ Package capacity ไม่ได้ = อนุมัติไม่ได้. |
| Q-04 | tolerance เมื่อเปิด Config: กี่สตางค์ และใช้กับ interest/total เท่านั้นหรือไม่? | เสนอ: interest/total เท่านั้น จำนวนตามที่ Business owner อนุมัติ; principal/claim_base/coverage/claim_amount/claim_max ห้ามเสมอ. |

## ต้องแก้ในเอกสารต้นทาง (Master Audit / Rulebook)

1. **M§27** — ตัด 'Data Mapping Error / Observation หากไม่กระทบ Claim Base' → HOLD `HISTORICAL_BALANCE_MISMATCH` (A-04)
2. **M§19 / R§15** — ระบุ 'Statement Principal as of Demand Date' (A-02)
3. **M§26 / M§43.3 / R§19** — tolerance ปิดโดยค่าเริ่มต้น; ส่วนต่าง → NUMERIC_VARIANCE (A-03)
4. **M§29** — Rule ID ตัวอย่าง JSON (`DEF-002` → `DEF-001`) และรูปแบบวันที่ (A-13, A-22)
5. **M§38 / R§26** — ตารางสถานะ 5 State + reason_code และขอบเขต FAIL (A-06, A-07)
6. **M§15 ↔ R Control 5 ↔ P VIS-001** — รายการภาพหนังสือยืนยันให้เหลือชุดเดียว (A-16)
7. **R§6 / M§9** — ระบุว่า Approval = Contract date เป็น Thai Credit revolving-loan (A-29)
8. **P 01 §NPL-002** — ใส่ตัวเลข 6/9 เดือนกลับ (หรือชี้ไป Policy_Parameter_Table) (A-37)
