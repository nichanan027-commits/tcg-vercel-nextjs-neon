import { notFound } from 'next/navigation';
import { getMeeting, listCases } from '@/lib/queries';
import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const meeting = await getMeeting(id);
  if (!meeting) notFound();
  return <Dashboard meeting={meeting} initial={await listCases(id)} />;
}
