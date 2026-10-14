import { query, type Row } from './db';
import type { SheetCase } from './sheet';
import type { CaseRow, Decision, Meeting, MeetingSummary } from './types';
import { DECISIONS } from './types';

const MEETING_COLS = "id, label, to_char(held_on, 'YYYY-MM-DD') AS held_on, agenda_no, resolution_prefix";

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

function dateOnly(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function toMeeting(r: Row): Meeting {
  return {
    id: num(r.id),
    label: str(r.label),
    heldOn: dateOnly(r.held_on),
    agendaNo: num(r.agenda_no),
    resolutionPrefix: str(r.resolution_prefix),
  };
}

function toCase(r: Row): CaseRow {
  const edited = r.note !== null && r.note !== undefined;
  return {
    id: num(r.id),
    meetingId: num(r.meeting_id),
    seq: num(r.seq),
    bankCode: str(r.bank_code),
    bankName: str(r.bank_name),
    guaranteeType: str(r.guarantee_type),
    borrower: str(r.borrower),
    lcNo: str(r.lc_no),
    limitAmount: num(r.limit_amount),
    ratio: num(r.ratio),
    payRound: str(r.pay_round),
    condition: str(r.cond),
    amount: num(r.amount),
    remaining: num(r.remaining),
    businessStatus: str(r.business_status),
    contactStatus: str(r.contact_status),
    note: edited ? str(r.note) : str(r.sheet_note),
    noteEdited: edited,
    issue: str(r.issue),
    unlock: str(r.unlock),
    evidenceUrl: str(r.evidence_url),
    decision: (DECISIONS.includes(r.decision as Decision) ? r.decision : 'pending') as Decision,
    decisionNote: str(r.decision_note),
  };
}

export async function listMeetings(): Promise<MeetingSummary[]> {
  const rows = await query(
    `SELECT m.id, m.label, to_char(m.held_on, 'YYYY-MM-DD') AS held_on, m.agenda_no, m.resolution_prefix,
       COUNT(c.id) FILTER (WHERE c.in_sheet) AS total,
       COALESCE(SUM(c.amount) FILTER (WHERE c.in_sheet), 0) AS amount,
       COUNT(c.id) FILTER (WHERE c.in_sheet AND c.decision = 'approved') AS approved,
       COUNT(c.id) FILTER (WHERE c.in_sheet AND c.decision = 'deferred') AS deferred,
       COUNT(c.id) FILTER (WHERE c.in_sheet AND c.decision = 'rejected') AS rejected,
       COUNT(c.id) FILTER (WHERE c.in_sheet AND c.decision = 'pending') AS pending,
       COUNT(c.id) FILTER (WHERE c.in_sheet AND c.issue <> '') AS issues,
       COUNT(c.id) FILTER (WHERE NOT c.in_sheet) AS missing
     FROM meetings m LEFT JOIN cases c ON c.meeting_id = m.id
     GROUP BY m.id
     ORDER BY m.id DESC`,
  );
  return rows.map((r) => ({
    ...toMeeting(r),
    total: num(r.total),
    amount: num(r.amount),
    approved: num(r.approved),
    deferred: num(r.deferred),
    rejected: num(r.rejected),
    pending: num(r.pending),
    issues: num(r.issues),
    missingFromSheet: num(r.missing),
  }));
}

export async function getMeeting(id: number): Promise<Meeting | null> {
  const rows = await query(`SELECT ${MEETING_COLS} FROM meetings WHERE id = $1`, [id]);
  return rows[0] ? toMeeting(rows[0]) : null;
}

export async function listCases(meetingId: number): Promise<CaseRow[]> {
  const rows = await query('SELECT * FROM cases WHERE meeting_id = $1 AND in_sheet ORDER BY seq, id', [meetingId]);
  return rows.map(toCase);
}

export async function updateMeeting(
  id: number,
  patch: { heldOn?: string | null; resolutionPrefix?: string; agendaNo?: number },
): Promise<Meeting | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, value: unknown) => { params.push(value); sets.push(`${col} = $${params.length}`); };
  if (patch.heldOn !== undefined) add('held_on', patch.heldOn || null);
  if (patch.resolutionPrefix !== undefined) add('resolution_prefix', patch.resolutionPrefix);
  if (patch.agendaNo !== undefined) add('agenda_no', patch.agendaNo);
  if (!sets.length) return getMeeting(id);
  params.push(id);
  const rows = await query(`UPDATE meetings SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${MEETING_COLS}`, params);
  return rows[0] ? toMeeting(rows[0]) : null;
}

export interface UpdateCasePatch {
  note?: string | null; // null = กลับไปใช้หมายเหตุจากชีต
  decision?: Decision;
  decisionNote?: string;
}

export async function updateCase(id: number, patch: UpdateCasePatch): Promise<CaseRow | null> {
  const sets: string[] = ['updated_at = now()'];
  const params: unknown[] = [];
  const add = (col: string, value: unknown) => { params.push(value); sets.push(`${col} = $${params.length}`); };
  if (patch.note !== undefined) add('note', patch.note);
  if (patch.decisionNote !== undefined) add('decision_note', patch.decisionNote);
  if (patch.decision !== undefined) {
    add('decision', patch.decision);
    sets.push(patch.decision === 'pending' ? 'decided_at = NULL' : 'decided_at = now()');
  }
  params.push(id);
  const rows = await query(`UPDATE cases SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
  return rows[0] ? toCase(rows[0]) : null;
}

export async function setDecisions(meetingId: number, ids: number[], decision: Decision): Promise<number> {
  if (!ids.length) return 0;
  const params: unknown[] = [decision, meetingId];
  const marks = ids.map((id) => { params.push(id); return `$${params.length}`; });
  const rows = await query(
    `UPDATE cases SET decision = $1::text,
       decided_at = CASE WHEN $1::text = 'pending' THEN NULL ELSE now() END,
       updated_at = now()
     WHERE meeting_id = $2 AND in_sheet AND id IN (${marks.join(', ')})
     RETURNING id`,
    params,
  );
  return rows.length;
}

export interface ImportSummary {
  meetings: { id: number; label: string; total: number; added: number; updated: number; missingFromSheet: number }[];
  skippedBlank: number;
}

const CHUNK = 40;

/** นำเข้ารายการ: อัปเดตข้อมูลจากชีตแต่คงมติ/หมายเหตุที่แก้ในระบบไว้ แถวที่หายจากชีตจะถูกซ่อน (in_sheet = false) */
export async function importCases(cases: SheetCase[], skippedBlank = 0): Promise<ImportSummary> {
  const byRound = new Map<string, SheetCase[]>();
  for (const c of cases) {
    const list = byRound.get(c.round) ?? [];
    list.push(c);
    byRound.set(c.round, list);
  }

  const summary: ImportSummary = { meetings: [], skippedBlank };

  for (const [label, list] of byRound) {
    const m = await query(
      `INSERT INTO meetings (label) VALUES ($1)
       ON CONFLICT (label) DO UPDATE SET label = EXCLUDED.label RETURNING id`,
      [label],
    );
    const meetingId = num(m[0].id);
    const existing = new Set(
      (await query('SELECT case_key FROM cases WHERE meeting_id = $1', [meetingId])).map((r) => str(r.case_key)),
    );
    let added = 0;
    let updated = 0;

    for (let i = 0; i < list.length; i += CHUNK) {
      const slice = list.slice(i, i + CHUNK);
      const params: unknown[] = [];
      const tuples = slice.map((c, j) => {
        const seq = i + j + 1;
        const values = [
          meetingId, c.key, seq, c.bankCode, c.bankName, c.guaranteeType, c.borrower, c.lcNo, c.limitAmount, c.ratio,
          c.payRound, c.condition, c.amount, c.remaining, c.businessStatus, c.contactStatus, c.sheetNote, c.issue,
          c.unlock, c.evidenceUrl,
        ];
        const marks = values.map((v) => { params.push(v); return `$${params.length}`; });
        return `(${marks.join(', ')})`;
      });
      await query(
        `INSERT INTO cases (meeting_id, case_key, seq, bank_code, bank_name, guarantee_type, borrower, lc_no, limit_amount,
           ratio, pay_round, cond, amount, remaining, business_status, contact_status, sheet_note, issue, unlock, evidence_url)
         VALUES ${tuples.join(', ')}
         ON CONFLICT (meeting_id, case_key) DO UPDATE SET
           seq = EXCLUDED.seq, bank_code = EXCLUDED.bank_code, bank_name = EXCLUDED.bank_name,
           guarantee_type = EXCLUDED.guarantee_type, borrower = EXCLUDED.borrower, lc_no = EXCLUDED.lc_no,
           limit_amount = EXCLUDED.limit_amount, ratio = EXCLUDED.ratio, pay_round = EXCLUDED.pay_round,
           cond = EXCLUDED.cond, amount = EXCLUDED.amount, remaining = EXCLUDED.remaining,
           business_status = EXCLUDED.business_status, contact_status = EXCLUDED.contact_status,
           sheet_note = EXCLUDED.sheet_note, issue = EXCLUDED.issue, unlock = EXCLUDED.unlock,
           evidence_url = EXCLUDED.evidence_url, in_sheet = TRUE, updated_at = now()`,
        params,
      );
    }
    for (const c of list) { if (existing.has(c.key)) updated++; else added++; }

    const keyParams: unknown[] = [meetingId];
    const keyMarks = list.map((c) => { keyParams.push(c.key); return `$${keyParams.length}`; });
    const gone = await query(
      `UPDATE cases SET in_sheet = FALSE, updated_at = now()
       WHERE meeting_id = $1 AND in_sheet AND case_key NOT IN (${keyMarks.join(', ')}) RETURNING id`,
      keyParams,
    );

    summary.meetings.push({ id: meetingId, label, total: list.length, added, updated, missingFromSheet: gone.length });
  }
  return summary;
}
