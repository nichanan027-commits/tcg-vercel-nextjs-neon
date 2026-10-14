import { setDecisions } from '@/lib/queries';
import { DECISIONS, type Decision } from '@/lib/types';
import { fail, intParam, json, readJson } from '@/lib/http';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const meetingId = intParam((await ctx.params).id);
  const body = await readJson(req);
  if (meetingId === null || !body) return fail('คำขอไม่ถูกต้อง');
  if (!DECISIONS.includes(body.decision as Decision)) return fail('decision ไม่ถูกต้อง');
  const ids = Array.isArray(body.ids) ? body.ids : null;
  if (!ids || ids.length > 500 || !ids.every((n) => Number.isInteger(n) && n > 0)) return fail('ids ไม่ถูกต้อง');

  const updated = await setDecisions(meetingId, ids as number[], body.decision as Decision);
  return json({ updated });
}
