# Conflict Register

**เวอร์ชัน:** 1.2.0-RECONCILIATION-r4 · ต่อยอดจากภาคผนวก A ของ `02_PGS10_OPERATIONAL_AUDIT_RULES.md` (A-01…A-28) + รายการใหม่จาก Pack v1.1.0 และคำตัดสิน (A-29…A-47)

สถานะ: `RESOLVED` ปิดแล้วด้วย DEC · `RESOLVED_PENDING_SOURCE_EDIT` ตัดสินแล้วแต่เอกสารต้นทางต้องแก้ · `PARTIAL` ปิดบางส่วน · `OPEN` ยังไม่ตัดสิน

สรุป: RESOLVED 30, RESOLVED_PENDING_SOURCE_EDIT 1, PARTIAL 6, OPEN 10 · **ขวาง Freeze 0** รายการ

| ID | ประเด็น | ประเภท | แหล่ง | สถานะ | DEC | ผลที่ใช้ตอนนี้ | ขวาง Freeze? |
|---|---|---|---|---|---|---|---|
| A-01 | default_date ≠ npl_date | AMBIGUOUS | M§4.1, M§43.1, P GOV-001 | RESOLVED | DEC-01 | ไม่มี Mapping จาก default_date: ต้องได้ npl_date จากข้อมูล FI; ไม่มี → HOLD NPL_DATE_MISSING. (ปิด 'Business Mapping' เดิมด้วยการห้าม derive) | — |
| A-02 | Demand Principal as-of Demand Date | CONFLICT | R§15, M§19 vs M§20, P DMD-002 | RESOLVED | DEC-08 | as-of เป็น Canonical; รายละเอียด fallback รอยืนยัน (Q-02) | — |
| A-03 | Tolerance 0.01 configurable | CONFLICT | R§19, M§26, V, P CUR-002 | RESOLVED | DEC-09 | tolerance ปิด; NUMERIC_VARIANCE + review_flag OBSERVATION_CANDIDATE; ห้ามกับ principal/claim_base/coverage/claim_amount/claim_max. จำนวนที่จะอนุมัติ = Q-04 | — |
| A-04 | Historical mismatch = HOLD | SOURCE-ERROR | R§16 vs M§27 | RESOLVED_PENDING_SOURCE_EDIT | DEC-07, DEC-26 | ปิดเชิง Decision (HOLD HISTORICAL_BALANCE_MISMATCH); เหลือ Editorial Update Master Audit §27 — ไม่ใช่ Business Ambiguity | — |
| A-05 | OCR ห้ามชดเชย Critical Document | AMBIGUOUS | R§8, M§37, P VIS-002 | PARTIAL | — | หลักการปิดแล้ว; รายการ Critical Document ใช้ 7 ประเภทของ M§37 เป็น Safe-Hold (PRM-038) | — |
| A-06 | คำศัพท์สถานะ 3 ชุด | CONFLICT | R§26, M§38, V, P | RESOLVED | DEC-05 | Case 5 State + control_status 7 ค่า + reason_code; ห้าม HOLD_* (P ใช้ 10 ชื่อ — ดู A-31) | — |
| A-07 | ขอบเขตของ FAIL | CONFLICT | R§26, M§39, P ID-001 | RESOLVED | DEC-19, DEC-31 | FAIL = policy_disqualifying ∧ ¬remediable_by_document ∧ evidence_verified (DEC-19, DEC-31); ไม่ผูกกับ prefix ของ reason_code. NPL_SEASONING_NOT_MET / CLAIM_FILING_WINDOW_EXPIRED เป็น FAIL ได้เมื่อ verify ครบ; ไม่ครบ = HOLD | — |
| A-08 | ลำดับ Support vs Observation; NOT_TESTABLE | AMBIGUOUS | D, P §13 | RESOLVED | DEC-04, DEC-06 | PASS_WITH_OBSERVATION + support_used=true; REQUIRED_HARD NOT_TESTABLE → HOLD | — |
| A-09 | NPL Seasoning 6 เดือนเป็นกฎทั่วไปหรือไม่ | CONFLICT | M§4.1 vs R§32 | RESOLVED | DEC-01 | Small Biz และ Start up = 6 เดือน OFFICIAL | — |
| A-10 | 7-month exception ขอบเขต + วันเริ่มนับ | CONFLICT/AMBIGUOUS | M§5, R§32, P RST-002 | RESOLVED | DEC-20 | OFFICIAL: 7 เดือน calendar; start = first_uncontactable_date OR first_contacted_but_restructure_failed_date; ใช้เฉพาะ path ที่มี (ค) (กรณี 1 และ 3); ไม่ขยายไป Start up. เหลือ Q-06 | — |
| A-11 | Coverage Ratio นอก Small Biz | CONFLICT | R§22/§32 vs M§7 | RESOLVED | DEC-21 | Coverage เป็น OFFICIAL ทุก Product (Smart*/Small Biz 70/100; Start up 100/100) | — |
| A-12 | วิธีนับอายุ LG / วิธีนับเดือน-ปี | AMBIGUOUS | R§32, M§25 | RESOLVED | DEC-30 | Coverage ใช้ contractual LG tenor (guarantee_term → lg_issue_date+lg_expiry_date → HOLD LG_TENOR_UNDETERMINABLE); ยกเลิก heuristic invariance ข้าม event. เหลือ Q-10 (LG ที่ถูกต่ออายุ) ซึ่งมี Safe-Hold | — |
| A-13 | Rule ID ชนกัน/พิมพ์ผิด | SOURCE-ERROR | M§41, M§29, P | RESOLVED | DEC-14 | ใช้ Master IDs + legacy_aliases (Canonical_Rule_ID_Map) | — |
| A-14 | Transaction taxonomy + นิยาม Payment | CONFLICT/AMBIGUOUS | R§9, M§11, P | PARTIAL | DEC-02, DEC-12 | types = union (รวม REVERSAL, PRINCIPAL_ADJUSTMENT); code map ต่อ bank_id + Safe-Hold TRANSACTION_CODE_UNMAPPED. ยังไม่ชัด: เงินรับที่ตัดดอกเบี้ยอย่างเดียว — ให้ semantic_type ใน bank map เป็นตัวกำหนด | — |
| A-15 | 'UNKNOWN ใกล้วันผิดนัด' | AMBIGUOUS | R§9 | OPEN | — | Safe-Hold: UNKNOWN ใด ๆ หลัง PAYMENT ล่าสุด → HOLD (PRM-042) | — |
| A-16 | รายการภาพหนังสือยืนยัน 12 vs 10 | CONFLICT | R§8, M§15, P VIS-001 | RESOLVED | DEC-23 | 11 Atomic elements + multi_page_document_continuity=REQUIRED (PRM-037/037b) | — |
| A-17 | Postal: ประเภทลายมือชื่อ + linkage | CONFLICT | R§17, M§21/§23, P PST-* | RESOLVED | — | D, M, P ตรงกันแล้ว (ชื่อตัวบรรจง/เจ้าหน้าที่ไปรษณีย์ไม่พอ; ตรวจ linkage) | — |
| A-18 | Address: ที่อยู่ล่าสุด vs ที่อยู่ใดก็ได้ | CONFLICT | R§18, M§22 | PARTIAL | DEC-12 | ใช้ที่อยู่ล่าสุดเมื่อมีเอกสารแจ้งเปลี่ยน; วันที่มีผลเทียบวันส่งยัง OPEN + Safe-Hold (PRM-040) | — |
| A-19 | Pipeline 3 ฉบับ | CONFLICT | R§31, M§42, V | RESOLVED | — | ไม่ Short-circuit → ผลไม่ขึ้นกับลำดับ; ลำดับรายงานตาม V | — |
| A-20 | Historical Debt เมื่อ Trigger ไม่ใช่ Demand | AMBIGUOUS | R, M | OPEN | — | ตรวจเฉพาะ Reference=Demand; อื่น ๆ → NOT_TESTABLE (REQUIRED_HARD → case HOLD) | — |
| A-21 | Demand waiting / Filing window นับจากวันใด | AMBIGUOUS | M§24-25 | OPEN | — | OPEN + Safe-Hold: invariance ข้าม candidate reference/convention (PRM-021/028) ไม่เช่นนั้น HOLD | — |
| A-22 | รูปแบบวันที่ พ.ศ./ค.ศ. | SOURCE-ERROR | M§29 | RESOLVED | DEC-12 | ISO CE + calendar metadata (PRM-031) | — |
| A-23 | Start up = รูปแบบ 2; เงื่อนไข Claim ของ Start up | AMBIGUOUS | R§4, M§2-6 | RESOLVED | DEC-01, DEC-24, DEC-44 | Start up (รูปแบบ 2, กรณี 5) = (ข)+(ง)+(จ)+(ฉ) ตามหน้า 7 (DEC-44); ไม่รับ (ค); (ข) = NPL 6 เดือน | — |
| A-24 | current_guarantee_obligation / 'other applicable amounts' | AMBIGUOUS | R§18-19 | OPEN | — | ต้องระบุแหล่งที่มา/องค์ประกอบ | — |
| A-25 | เคสอยู่หลายกลุ่มใน R§30 | AMBIGUOUS | R§30 | RESOLVED | DEC-13 | แก้ด้วย RULE_ONLY schema (1 เคสมีได้หลาย Rule test) | — |
| A-26 | ตัวเลขเคสจริงสำหรับ FULL_CASE ไม่มี | AMBIGUOUS | R§30 | OPEN | DEC-13 | Golden เคสจริง = BLOCKED_PENDING_EVIDENCE: ไม่มี input และไม่มี asserted result (DEC-38); ผลเดิมเก็บเป็น manual_baseline_note | — |
| A-27 | PGS10-LG-001 ไม่มี Logic | AMBIGUOUS | M§41 | OPEN | — | ถอดจาก POL-LG; ขอยืนยัน | — |
| A-28 | ขอบเขต Page Completeness | AMBIGUOUS | R§7, M§10 | OPEN | — | ใช้เฉพาะอนุมัติ/สัญญา | — |
| A-29 | Contract date rule เป็น Thai Credit-only | CONFLICT | R§6/M§9 (ทั่วไป) vs P CON-001 (Thai Credit) | RESOLVED | DEC-10 | Thai Credit revolving-loan เท่านั้น; FI อื่น → HOLD CONTRACT_DATE_BASIS_UNDEFINED (รหัสที่เสนอใหม่ — ขอยืนยัน); fi_id ต้องเป็น input | — |
| A-30 | NPL anchor date | AMBIGUOUS | M§4.1 (วันที่ออก LG) vs DEC-01/M§3.1 (วันที่ บสย. ค้ำประกัน) | RESOLVED | DEC-29 | APPROVED_OPERATIONAL: anchor = lg_issue_date (ไม่อ้าง OFFICIAL); guarantee_effective_date เก็บแยกได้; เปลี่ยน Mapping ได้โดยไม่แก้ Rule ID | — |
| A-31 | Pack ใช้ชื่อ HOLD_* 10 ชื่อและชื่อ reason ไม่ตรง catalogue | CONFLICT | P 01/02 vs P 03 | RESOLVED | DEC-05 | alias map ครบ; catalogue ใหม่ไม่มี HOLD_* | — |
| A-32 | Rule ID ความหมายต่างกันแต่ ID เหมือนกัน (STM-001/002, CLM-001/003, PST-002/003) | CONFLICT | P vs M§41 vs D | RESOLVED | DEC-14 | alias ต้องมี @version เสมอ; ดู hazards ใน Canonical_Rule_ID_Map | — |
| A-33 | Transaction code evidence | AMBIGUOUS | P 03, DEC-02, R§32 | PARTIAL | DEC-02 | 5 codes EVIDENCE_SUPPORTED_BANK_SPECIFIC (user-attested); 6921/6680 UNVERIFIED → Safe-Hold TRANSACTION_CODE_UNMAPPED; ต้องเติม effective_from/to + doc/page ก่อน Production (ไม่ขวาง Freeze) | — |
| A-34 | LG ใน Golden Tests ที่ไม่มีในเอกสารอื่น | AMBIGUOUS | P 04 | PARTIAL | DEC-03 | 66-037410 = SOURCE_VERIFIED_CASE (DEC-37; คนละรายกับ 66-067410). อีก 6 LG ที่เหลือ: BLOCKED_PENDING_EVIDENCE ไม่มี asserted result | — |
| A-35 | GT-001 (67-026936) ขอบเขต Assertion | CONFLICT | P GT-001 vs V vs R§30 | RESOLVED | DEC-13 | RULE_ONLY VIS-001; ไม่ล็อก HISTORICAL_BALANCE_MISMATCH | — |
| A-36 | Controls/เงื่อนไขที่ P ตัดออก | CONFLICT | P vs R | RESOLVED | DEC-12 | เติมกลับตามรายการ DEC-12 (Proposed_Changes) | — |
| A-37 | ตัวเลขนโยบายที่ P ตัดออก | CONFLICT | P 01 vs M | RESOLVED | — | เก็บใน Policy_Parameter_Table พร้อม source_status (ไม่ฝังใน 01) | — |
| A-38 | P: PASS_WITH_OBSERVATION 'เฉพาะหลัง reviewer อนุมัติ' vs FORMAT_VARIANCE อัตโนมัติ | AMBIGUOUS | P 01 §14, R§5 | RESOLVED | DEC-15 | Auto-pass เฉพาะ FORMAT_NORMALIZED (non-semantic, field-specific); NUMERIC_VARIANCE และอื่น ๆ = HOLD/reviewer | — |
| A-39 | หลักฐานที่ผู้ใช้อ้างถึงแต่ session นี้เข้าถึงไม่ได้ | LIMITATION | DEC-02, DEC-03 | RESOLVED | DEC-37 | ผู้ใช้ยืนยันว่า verify จากไฟล์โครงการแล้ว (หน้า 5, 7; Statement remark/ledger; LG 66037410) → ป้าย OWNER-VERIFIED; ผมไม่ได้ตรวจไฟล์ต้นฉบับเอง (บันทึกในพารามิเตอร์) | — |
| A-40 | NO_PAYMENT_FOUND ต้องแยก 'พิสูจน์ว่าไม่เคยชำระ' กับ 'Statement ไม่ครบ' | CONSEQUENCE | D STM-001 vs DEC-15 | RESOLVED | DEC-34 | payment_history_status: NO_PAYMENT_VERIFIED (PASS) / INCOMPLETE (HOLD PAYMENT_HISTORY_INCOMPLETE). ส่วน Default chronology เมื่อไม่เคยชำระ → A-45 | — |
| A-41 | CAP-001 ขึ้นกับ Stage | CONSEQUENCE | DEC-17 | RESOLVED | DEC-17 | เพิ่ม input `review_stage` (PRE_REVIEW \| FINAL_APPROVAL); requirement_by_stage | — |
| A-42 | การจับคู่ 'กรณี 1–5' ของหน้า 7 กับ claim path | AMBIGUOUS | DEC-20, DEC-24 | RESOLVED | DEC-32 | Case 1/3/5 ยืนยันแล้ว (DEC-32); Small Biz >5 ปี รวม (ข) | — |
| A-43 | Safe-Hold แบบ 'invariance' ข้าม candidate (Demand waiting reference, date arithmetic) — เลิกใช้กับ Coverage | DESIGN | DEC-22, DEC-28 | OPEN | DEC-43 | ยืนยันโดยเจ้าของ (DEC-43): คง invariance Safe-Hold เฉพาะ PRM-021/PRM-028 (demand-waiting, date arithmetic) | — |
| A-44 | Band ≤5/>5 ปี ของ Case 1–4 (claim path) นับจากอะไร — ต่างจาก Coverage (contractual tenor) | AMBIGUOUS | M§3.1 vs DEC-30 | RESOLVED | DEC-39 | ยืนยัน (DEC-39): band นับจากวันที่ยื่นเทียบวันออก LG; PRM-054 = APPROVED_OPERATIONAL. ข้อมูลไม่ครบ → HOLD LG_DATA_MISSING | — |
| A-45 | Default chronology เมื่อ NO_PAYMENT_VERIFIED ต้องใช้ alternative evidence (due-date/FI) — ยังไม่มี Rule อนุมัติ | AMBIGUOUS | DEC-34 | OPEN | DEC-34, DEC-40 | Safe-Hold ยืนยันโดยเจ้าของ (DEC-40): DEF-001 = HOLD POLICY_PARAMETER_UNRESOLVED จนกว่าจะมี alternative evidence rule (PRM-055) — Q-09 | — |
| A-46 | Coverage tenor ของ LG ที่ถูกต่ออายุ/ขยาย | AMBIGUOUS | DEC-30, LG-001 | OPEN | DEC-30, DEC-41 | Safe-Hold ยืนยันโดยเจ้าของ (DEC-41): LG ต่ออายุและไม่มี guarantee_term ที่ระบุ → HOLD LG_TENOR_UNDETERMINABLE — Q-10 | — |
| A-47 | เงื่อนไข (ง) ไม่ชำระหนี้ติดต่อกัน 3 เดือน — ไม่มี control ใน Candidate ก่อน DEC-44 (กระทบ Case 2, 4, 5) และนิยามการตรวจยังไม่ผ่านการยืนยัน | GAP | PGS10 หน้า 7 (ง); M§6; DEC-44 | PARTIAL | DEC-45 | เพิ่ม PGS10-NPY-001: ผ่านเมื่อไม่มี PAYMENT ภายใน [default_date, default_date+3 เดือนปฏิทิน] และยื่นหลังครบกำหนด. มี PAYMENT ในช่วง → HOLD CONSECUTIVE_NON_PAYMENT_NOT_MET (ไม่ FAIL); ยื่นก่อนครบ → HOLD NON_PAYMENT_PERIOD_NOT_ELAPSED — Q-11 | — |

## คำถาม

ตอบแล้ว: Q-01 → DEC-15, Q-02 → DEC-16, Q-03 → DEC-17, Q-04 → DEC-18, Q-05 → DEC-31, Q-06 → DEC-32, Q-07 → DEC-33, Q-08 → DEC-39, Q-09 → DEC-40, Q-10 → DEC-41

คำถามใหม่จากรอบ r2 (ไม่ขวาง Freeze):

| ID | คำถาม | ข้อเสนอ |
|---|---|---|

## ต้องแก้ในเอกสารต้นทาง (Master Audit / Rulebook)

1. **M§27** — ตัด 'Data Mapping Error / Observation หากไม่กระทบ Claim Base' → HOLD `HISTORICAL_BALANCE_MISMATCH` (A-04)
2. **M§19 / R§15** — ระบุ 'Statement Principal as of Demand Date' (A-02)
3. **M§26 / M§43.3 / R§19** — tolerance ปิดโดยค่าเริ่มต้น; ส่วนต่าง → NUMERIC_VARIANCE (A-03)
4. **M§29** — Rule ID ตัวอย่าง JSON (`DEF-002` → `DEF-001`) และรูปแบบวันที่ (A-13, A-22)
5. **M§38 / R§26** — ตารางสถานะ 5 State + reason_code และขอบเขต FAIL (A-06, A-07)
6. **M§15 ↔ R Control 5 ↔ P VIS-001** — รายการภาพหนังสือยืนยันให้เหลือชุดเดียว (A-16)
7. **R§6 / M§9** — ระบุว่า Approval = Contract date เป็น Thai Credit revolving-loan (A-29)
8. **P 01 §NPL-002** — ใส่ตัวเลข 6/9 เดือนกลับ (หรือชี้ไป Policy_Parameter_Table) (A-37)
