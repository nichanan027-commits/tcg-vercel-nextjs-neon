import { updateCase } from '@/lib/queries';
import { DECISIONS, type Decision } from '@/lib/types';
import { fail, intParam, json, readJson } from '@/lib/http';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = intParam((await ctx.params).id);
  const body = await readJson(req);
  if (id === null || !body) return fail('คำขอไม่ถูกต้อง');

  const patch: Parameters<typeof updateCase>[1] = {};
  if ('note' in body) {
    if (body.note !== null && typeof body.note !== 'string') return fail('note ต้องเป็นข้อความหรือ null');
    patch.note = body.note === null ? null : (body.note as string).slice(0, 2000);
  }
  if ('decisionNote' in body) {
    if (typeof body.decisionNote !== 'string') return fail('decisionNote ต้องเป็นข้อความ');
    patch.decisionNote = body.decisionNote.slice(0, 2000);
  }
  if ('decision' in body) {
    if (!DECISIONS.includes(body.decision as Decision)) return fail('decision ไม่ถูกต้อง');
    patch.decision = body.decision as Decision;
  }

  const updated = await updateCase(id, patch);
  return updated ? json(updated) : fail('ไม่พบรายการ', 404);
}
