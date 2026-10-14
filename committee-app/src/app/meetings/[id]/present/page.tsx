import { notFound } from 'next/navigation';
import { getMeeting, listCases } from '@/lib/queries';
import Deck from '@/components/Deck';

export const dynamic = 'force-dynamic';

export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const meeting = await getMeeting(id);
  if (!meeting) notFound();
  return <Deck meeting={meeting} initial={await listCases(id)} />;
}
