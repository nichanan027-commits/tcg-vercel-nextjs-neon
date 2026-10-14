/**
 * ตัวเชื่อมฐานข้อมูล
 * - มี DATABASE_URL  → Neon Postgres (HTTP driver)
 * - ไม่มี (dev/test) → PGlite ฐานข้อมูล Postgres ในเครื่อง ที่ .data/pglite (หรือ PGLITE_DIR=memory)
 */
export type Row = Record<string, unknown>;

interface Driver {
  query(text: string, params?: unknown[]): Promise<Row[]>;
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS meetings (
     id SERIAL PRIMARY KEY,
     label TEXT NOT NULL UNIQUE,
     held_on DATE,
     agenda_no INT NOT NULL DEFAULT 3,
     resolution_prefix TEXT NOT NULL DEFAULT '',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS cases (
     id SERIAL PRIMARY KEY,
     meeting_id INT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
     case_key TEXT NOT NULL,
     seq INT NOT NULL,
     bank_code TEXT NOT NULL,
     bank_name TEXT NOT NULL DEFAULT '',
     guarantee_type TEXT NOT NULL DEFAULT '',
     borrower TEXT NOT NULL,
     lc_no TEXT NOT NULL DEFAULT '',
     limit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
     ratio NUMERIC(6,2) NOT NULL DEFAULT 0,
     pay_round TEXT NOT NULL DEFAULT '',
     cond TEXT NOT NULL DEFAULT '',
     amount NUMERIC(18,2) NOT NULL DEFAULT 0,
     remaining NUMERIC(18,2) NOT NULL DEFAULT 0,
     business_status TEXT NOT NULL DEFAULT '',
     contact_status TEXT NOT NULL DEFAULT '',
     sheet_note TEXT NOT NULL DEFAULT '',
     note TEXT,
     issue TEXT NOT NULL DEFAULT '',
     unlock TEXT NOT NULL DEFAULT '',
     evidence_url TEXT NOT NULL DEFAULT '',
     decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','deferred','rejected')),
     decision_note TEXT NOT NULL DEFAULT '',
     decided_at TIMESTAMPTZ,
     in_sheet BOOLEAN NOT NULL DEFAULT TRUE,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (meeting_id, case_key)
   )`,
  `CREATE INDEX IF NOT EXISTS cases_meeting_seq_idx ON cases (meeting_id, seq)`,
];

type Globals = typeof globalThis & { __tcgDriver?: Promise<Driver> };

async function createDriver(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  let driver: Driver;

  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    driver = { query: async (text, params) => (await sql(text, params ?? [])) as unknown as Row[] };
  } else {
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_LOCAL_DB) {
      throw new Error('ยังไม่ได้ตั้งค่า DATABASE_URL (Neon) สำหรับ production');
    }
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR ?? '.data/pglite';
    const db = dir === 'memory' ? new PGlite() : new PGlite(dir);
    await db.waitReady;
    driver = { query: async (text, params) => (await db.query(text, params ?? [])).rows as Row[] };
  }

  for (const statement of SCHEMA) await driver.query(statement);
  return driver;
}

function getDriver(): Promise<Driver> {
  const g = globalThis as Globals;
  if (!g.__tcgDriver) {
    g.__tcgDriver = createDriver().catch((err) => { g.__tcgDriver = undefined; throw err; });
  }
  return g.__tcgDriver;
}

export async function query<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const driver = await getDriver();
  return (await driver.query(text, params)) as T[];
}
