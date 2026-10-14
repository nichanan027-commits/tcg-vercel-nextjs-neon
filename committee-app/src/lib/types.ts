export type Decision = 'pending' | 'approved' | 'deferred' | 'rejected';
export const DECISIONS: Decision[] = ['pending', 'approved', 'deferred', 'rejected'];
export const DECISION_LABEL: Record<Decision, string> = {
  pending: 'รอพิจารณา',
  approved: 'อนุมัติ',
  deferred: 'เลื่อนพิจารณา',
  rejected: 'ไม่อนุมัติ',
};

export interface Meeting {
  id: number;
  label: string;
  heldOn: string | null; // YYYY-MM-DD
  agendaNo: number;
  resolutionPrefix: string;
}

export interface MeetingSummary extends Meeting {
  total: number;
  amount: number;
  approved: number;
  deferred: number;
  rejected: number;
  pending: number;
  issues: number;
  missingFromSheet: number;
}

export interface CaseRow {
  id: number;
  meetingId: number;
  seq: number;
  bankCode: string;
  bankName: string;
  guaranteeType: string;
  borrower: string;
  lcNo: string;
  limitAmount: number;
  ratio: number;
  payRound: string;
  condition: string;
  amount: number;
  remaining: number;
  businessStatus: string;
  contactStatus: string;
  note: string; // หมายเหตุที่ใช้แสดง (แก้ในระบบ ถ้าไม่มีใช้จากชีต)
  noteEdited: boolean;
  issue: string;
  unlock: string;
  evidenceUrl: string;
  decision: Decision;
  decisionNote: string;
}
