/** ลิงก์ชีตต้องเป็น docs.google.com/spreadsheets เท่านั้น (กัน SSRF) แล้วสร้างลิงก์ export CSV เอง */
export function sheetExportUrl(input: string): string | null {
  const m = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(input.trim());
  if (!m) return null;
  const gid = /[?#&]gid=(\d+)/.exec(input)?.[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
}
