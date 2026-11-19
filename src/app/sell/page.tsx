import { Suspense } from 'react';
import { requireMarketplaceUser } from '@/lib/auth';
import BrandLoader from '@/components/motion/BrandLoader';
import SellForm from './SellForm';

export default function SellPage() {
  return (
    <Suspense fallback={<BrandLoader />}>
      <AuthenticatedSellPage />
    </Suspense>
  );
}

async function AuthenticatedSellPage() {
  const { profile } = await requireMarketplaceUser('/sell');
  return (
    <SellForm
      sellerName={profile?.name ?? 'Your profile'}
      sellerAvatarUrl={profile?.avatar_url ?? null}
      location={profile?.default_location ?? ''}
    />
  );
}
