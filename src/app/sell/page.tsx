import { Suspense } from 'react';
import { requireMarketplaceUser } from '@/lib/auth';
import SellForm from './SellForm';

export default function SellPage() {
  return (
    <Suspense fallback={<div role='status' className='p-6'>Loading sell form...</div>}>
      <AuthenticatedSellPage />
    </Suspense>
  );
}

async function AuthenticatedSellPage() {
  const { profile } = await requireMarketplaceUser('/sell');
  return (
    <SellForm
      sellerName={profile?.name ?? 'Your profile'}
      location={profile?.default_location ?? ''}
    />
  );
}
