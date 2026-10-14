import { updateMeeting } from '@/lib/queries';
import { fail, intParam, json, readJson } from '@/lib/http';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = intParam((await ctx.params).id);
  const body = await readJson(req);
  if (id === null || !body) return fail('คำขอไม่ถูกต้อง');

  const patch: Parameters<typeof updateMeeting>[1] = {};
  if ('heldOn' in body) {
    const v = body.heldOn;
    if (v !== null && v !== '' && !(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)))) {
      return fail('วันที่ประชุมต้องเป็นรูปแบบ YYYY-MM-DD');
    }
    patch.heldOn = (v as string | null) || null;
  }
  if ('resolutionPrefix' in body) {
    if (typeof body.resolutionPrefix !== 'string' || body.resolutionPrefix.length > 40) return fail('เลขครั้งที่ประชุมไม่ถูกต้อง');
    patch.resolutionPrefix = body.resolutionPrefix.trim();
  }
  if ('agendaNo' in body) {
    const n = body.agendaNo;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 99) return fail('ระเบียบวาระต้องเป็นเลข 1-99');
    patch.agendaNo = n;
  }
  const updated = await updateMeeting(id, patch);
  return updated ? json(updated) : fail('ไม่พบรอบประชุม', 404);
}
