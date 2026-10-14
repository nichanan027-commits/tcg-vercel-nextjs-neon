'use client';
export default function PrintButton() {
  return <button className="btn orange no-print" onClick={() => window.print()}>พิมพ์ / บันทึก PDF</button>;
}
