'use client';
export default function LogoutButton() {
  return (
    <button
      className="btn ghost small"
      onClick={async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.assign('/login');
      }}
    >ออกจากระบบ</button>
  );
}
