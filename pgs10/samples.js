/*
 * Fictional sample cases for the PGS 10 prototype. Numbers, names and IDs are invented;
 * only the *patterns* (Leading Zero, 0.01 variance, cropped confirmation letter, historical
 * balance copied from current debt, payment after Statement cut-off) come from the Rulebook.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PGS10_SAMPLES = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const clone = (o) => JSON.parse(JSON.stringify(o));

  const clean = {
    pgs_phase: '10', pgs_revision: '5', product: 'SMALL_BIZ', loan_new_business: 'Y', loan_hp_leasing: 'N', total_exposure_per_person: '80,000.00',
    id_lg_screen: '99-000001', id_lg_lg: '99000001', id_lg_statement: '99-000001', id_lg_demand: '99-000001',
    id_name_screen: 'ตัวอย่าง ทดสอบ', id_name_approval: 'ตัวอย่าง ทดสอบ', id_name_statement: 'ตัวอย่าง ทดสอบ', id_name_demand: 'ตัวอย่าง ทดสอบ',
    id_acct_screen: '123456789012', id_acct_approval: '123456789012', id_acct_statement: '123456789012', id_acct_demand: '123456789012',
    id_limit_screen: '80,000.00', id_limit_approval: '80,000.00', id_limit_demand: '80,000.00',
    id_lgdate_screen: '07/03/2567', id_lgdate_lg: '07/03/2567',
    approval_date: '06/03/2567', demand_contract_date: '06/03/2567',
    approval_total_pages: '9', approval_pages_found: '1-9', approval_pages_unreadable: '',
    vis_approval: 'Y', vis_demand: 'Y', vis_tracking: 'Y', vis_postal: 'Y', vis_restructure: 'NA',
    transactions: [
      { date: '05/11/2567', type: 'INTEREST_ACCRUAL', amount: '412.30', desc: 'ตั้งดอกเบี้ย' },
      { date: '20/12/2567', type: 'PAYMENT', amount: '2,500.00', desc: 'รับชำระ' },
      { date: '20/01/2568', type: 'PAYMENT', amount: '2,500.00', desc: 'รับชำระ' },
      { date: '31/01/2568', type: 'INTEREST_ACCRUAL', amount: '398.12', desc: 'ตั้งดอกเบี้ย' },
    ],
    default_date_screen: '10/02/2568',
    exc_letter_present: 'N',
    fup_screen_date: '15/02/2568', fup_report_date: '15/02/2568', fup_method: 'โทรศัพท์ + จดหมาย', fup_result: 'ติดต่อไม่ได้', fup_report_identity_ok: 'Y',
    rst_has: 'N',
    dmd_date_screen: '14/07/2568', dmd_date_letter: '14/07/2568', dmd_principal: '49,164.00', dmd_interest: '5,000.00', dmd_total: '54,164.00', dmd_identity_ok: 'Y',
    hist_principal: '49,164.00', hist_interest: '5,000.00', hist_total: '54,164.00',
    pst_outcome: 'DELIVERED', pst_send_date: '15/07/2568', pst_received_date: '16/07/2568', pst_signature: 'RECIPIENT', pst_returned_evidence: '', pst_tracking_linked: 'Y',
    addr_postal_house: '12/3', addr_postal_moo: '4', addr_postal_tambon: 'ต.บางตัวอย่าง', addr_postal_amphoe: 'อ.เมือง', addr_postal_province: 'จ.นนทบุรี', addr_postal_zip: '11000',
    addr_docs: [{ source: 'หนังสือแจ้งผลอนุมัติ', house: '12/3', moo: 'หมู่ 4', tambon: 'ตำบลบางตัวอย่าง', amphoe: 'อำเภอเมือง', province: 'นนทบุรี', zip: '11000', changed: false }],
    cur_screen_principal: '49,164.00', cur_screen_interest: '6,100.50', cur_screen_total: '55,264.50',
    cur_stmt_principal: '49,164.00', cur_stmt_interest: '6,100.50', cur_stmt_other: '',
    stm_cutoff_date: '31/08/2568', later_payment_date: '', later_payment_amount: '', later_stmt_covers: '',
    guarantee_exposure: '80,000.00', cb_screen_base: '49,164.00', cb_screen_mode: 'BY_PRINCIPAL',
    claim_app_date: '15/09/2568', cr_screen_ratio: '70', claim_amount_screen: '34,414.80', claim_paid_screen: '34,414.80',
    cap_max: '10,000,000.00', cap_paid: '3,000,000.00', cap_pending: '500,000.00', cap_screen_available: '6,500,000.00', cap_screen_after: '6,465,585.20',
    tl_bank_submission_date: '', tl_complete_docs_date: '', tl_payment_approval_date: '',
    ev_id: 'PDF หน้า 1, 5, 12', ev_stm: 'Statement PDF หน้า 27',
  };

  // Payment after Default + confirmation letter whose top part is cropped in the rendered image
  // (text layer may still read the header — but the visible page starts mid-table).
  const cropped = clone(clean);
  cropped.transactions.push({ date: '22/04/2568', type: 'PAYMENT', amount: '1,500.00', desc: 'รับชำระหลังผิดนัด' });
  cropped.default_date_screen = '10/02/2568';
  Object.assign(cropped, {
    exc_letter_present: 'Y', exc_confirmed_default_date: '10/02/2568', exc_states_payment: 'Y', exc_states_no_change: 'Y', exc_identity_ok: 'Y',
    vis_conf_payments: 'Y', vis_conf_not_per_terms: 'Y', vis_conf_confirm_default: 'Y', vis_conf_signature: 'Y', vis_conf_authority: 'Y',
    ev_def: 'PDF หน้า 22 (หนังสือยืนยัน) / หน้า 27 (Statement)',
  });

  const supported = clone(cropped);
  CONFIRM_KEYS().forEach((k) => { supported[`vis_conf_${k}`] = 'Y'; });

  function CONFIRM_KEYS() {
    return ['header', 'date', 'subject', 'recipient', 'debtor', 'account', 'default_date', 'payments', 'not_per_terms', 'confirm_default', 'signature', 'authority'];
  }

  // Current debt copied into the "historical" box (Rulebook Control 13 example)
  const historical = clone(clean);
  Object.assign(historical, {
    dmd_principal: '90,038.73', dmd_interest: '59,508.71', dmd_total: '149,547.44',
    hist_principal: '90,038.73', hist_interest: '74,975.64', hist_total: '165,014.37',
    cur_stmt_principal: '90,038.73', cur_stmt_interest: '74,975.64', cur_screen_principal: '90,038.73', cur_screen_interest: '74,975.64', cur_screen_total: '165,014.37',
    guarantee_exposure: '100,000.00', id_limit_screen: '100,000.00', id_limit_approval: '100,000.00', id_limit_demand: '100,000.00',
    cb_screen_base: '90,038.73', claim_amount_screen: '63,027.11', claim_paid_screen: '63,027.11',
    cap_screen_after: '6,436,972.89',
  });

  // Leading zero in account number + 0.01 baht interest variance -> PASS_WITH_OBSERVATION
  const observation = clone(clean);
  Object.assign(observation, {
    id_acct_statement: '0123456789012',
    cur_screen_interest: '6,100.51', cur_screen_total: '55,264.51',
  });

  // Payment posted after Statement cut-off, no newer Statement
  const laterPayment = clone(clean);
  Object.assign(laterPayment, { later_payment_date: '19/09/2568', later_payment_amount: '2,000.00', later_stmt_covers: 'N', stm_cutoff_date: '18/09/2568' });

  return {
    list: [
      { id: 'clean', label: 'A · ผ่านครบ (ตัวอย่างสมมติ)', data: clean },
      { id: 'cropped', label: 'B · ชำระหลังผิดนัด + หนังสือยืนยันถูก Crop → พัก', data: cropped },
      { id: 'supported', label: 'C · ชำระหลังผิดนัด + หนังสือยืนยันครบ → ผ่านโดยมีเอกสารรองรับ', data: supported },
      { id: 'historical', label: 'D · Historical Balance ซ้ำยอดปัจจุบัน → พัก', data: historical },
      { id: 'observation', label: 'E · Leading Zero + ต่าง 0.01 → ผ่านโดยมีข้อสังเกต', data: observation },
      { id: 'later', label: 'F · ชำระหลัง Statement cut-off → พัก', data: laterPayment },
    ],
  };
});
