/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite (ใช้ตอนพัฒนา/ทดสอบเมื่อไม่มี DATABASE_URL) โหลด WASM เอง ไม่ต้องให้ bundler แตะ
  serverExternalPackages: ['@electric-sql/pglite'],
  poweredByHeader: false,
};
export default nextConfig;
