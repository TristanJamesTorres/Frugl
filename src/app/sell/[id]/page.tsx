import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { requireMarketplaceUser } from '@/lib/auth';
import EditDraftForm from './EditDraftForm';

type Props = { params: Promise<{ id: string }> };

export default function SellDraftPage({ params }: Props) {
  return (
    <Suspense fallback={<div role='status' className='p-6'>Loading your draft...</div>}>
      <SellDraftContent params={params} />
    </Suspense>
  );
}

async function SellDraftContent({ params }: Props) {
  const { id } = await params;
  const { supabase, user, profile } = await requireMarketplaceUser(`/sell/${id}`);

  // Fetch listing, photos, and any condition reports
  const { data: listing } = await supabase
    .from('listings')
    .select('*, listing_photos(*), condition_reports(*), identification_results(*)')
    .eq('id', id)
    .maybeSingle();

  if (!listing) notFound();

  // If user is not the seller and not staff, deny access
  if (listing.seller_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    redirect('/');
  }

  return (
    <EditDraftForm
      initialListing={listing}
      userLocation={profile?.default_location || ''}
      sellerName={profile?.name?.trim() || 'Your profile'}
    />
  );
}
