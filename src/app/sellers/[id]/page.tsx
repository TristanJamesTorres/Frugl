/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CARD_SELECT_WITH_SAVED } from '@/lib/queries';
import TimeAgo from '@/components/TimeAgo';
import { BadgeCheck, MapPin } from '@/components/icons';
import SellerListings from './SellerListings';

function isMissingProfileDetailColumn(error: { code?: string; message: string }) {
  return (
    (error.code === '42703' || error.code === 'PGRST204') &&
    /\b(region|city|bio)\b/i.test(error.message)
  );
}

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: seller, error: sellerError },
    { data: { user }, error: authError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,name,avatar_url,seller_verified,public_contact_email,default_location,created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (authError) console.error('Could not verify the current viewer:', authError.message);
  if (sellerError) {
    console.error('Could not load the seller profile:', sellerError.message);
    throw new Error(`Could not load this seller profile: ${sellerError.message}`);
  }
  if (!seller) notFound();

  const { data: profileDetails, error: profileDetailsError } = await supabase
    .from('profiles')
    .select('region,city,bio')
    .eq('id', id)
    .maybeSingle();
  let publicDetails = profileDetails;
  if (profileDetailsError && isMissingProfileDetailColumn(profileDetailsError)) {
    console.warn('Public profile detail columns are unavailable; run supabase/12_public_profile_details.sql.');
    publicDetails = null;
  } else if (profileDetailsError) {
    console.error('Could not load public profile details:', profileDetailsError.message);
    throw new Error(`Could not load public profile details: ${profileDetailsError.message}`);
  }

  const isOwnProfile = user?.id === seller.id;
  const [reviews, listings] = await Promise.all([
    supabase.from('reviews').select('rating,comment,created_at').eq('reviewee_id', id).order('created_at', { ascending: false }),
    supabase
      .from('listings')
      .select(CARD_SELECT_WITH_SAVED)
      .eq('seller_id', id)
      .in('status', isOwnProfile ? ['available', 'draft', 'reserved', 'sold'] : ['available', 'reserved'])
      .order('created_at', { ascending: false }),
  ]);
  const list = reviews.data ?? [];
  const avg = list.length ? list.reduce((s: number, r: any) => s + r.rating, 0) / list.length : null;
  const sellerName = seller.name?.trim() || 'Seller';
  const sellerLocation = [publicDetails?.city, publicDetails?.region].filter(Boolean).join(', ')
    || seller.default_location?.trim()
    || '';
  const email = isOwnProfile
    ? user.email || seller.public_contact_email
    : seller.public_contact_email;
  const initials = sellerName
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className='seller-profile-page'>
      <header className='page-banner seller-profile-card'>
        <div className='page-banner-main seller-profile-identity'>
          <div className='seller-profile-avatar'>
            {seller.avatar_url ? (
              <img src={seller.avatar_url} alt='' />
            ) : (
              <span aria-hidden='true'>{initials}</span>
            )}
          </div>
          <div className='seller-profile-name-block'>
            <h1 className='seller-profile-name page-banner-title'>
              {sellerName}
            </h1>
            {email ? (
              <a className='seller-profile-email' href={`mailto:${email}`}>{email}</a>
            ) : (
              <span className='seller-profile-email is-private'>Email not shared</span>
            )}
            {(sellerLocation || publicDetails?.bio) && (
              <div className='seller-profile-public-info'>
                {sellerLocation && (
                  <span className='seller-profile-location'>
                    <MapPin size={14} aria-hidden='true' />
                    {sellerLocation}
                  </span>
                )}
                {publicDetails.bio && <p>{publicDetails.bio}</p>}
              </div>
            )}
          </div>
          {seller.seller_verified && (
            <span className='seller-profile-verified' title='Verified seller'>
              <BadgeCheck size={18} variant='solid' />
              <span>Verified</span>
            </span>
          )}
        </div>

        <div className='seller-profile-actions'>
          <div className='seller-profile-stat'>
            <strong>{avg !== null ? `${avg.toFixed(1)} / 5` : '—'}</strong>
            <span>
              {list.length > 0
                ? `${list.length} ${list.length === 1 ? 'review' : 'reviews'}`
                : 'No reviews yet'}
            </span>
          </div>
          <span className='seller-profile-divider' aria-hidden='true' />
          <div className='seller-profile-stat'>
            <strong><TimeAgo timestamp={seller.created_at} /></strong>
            <span>Joined</span>
          </div>
          {isOwnProfile && (
            <Link href='/account' className='button-primary seller-profile-edit'>
              Edit profile
            </Link>
          )}
        </div>
      </header>

      <SellerListings listings={listings.data ?? []} isOwnProfile={isOwnProfile} />

      {list.length > 0 && (
        <section>
          <h2 className='mb-3 font-semibold'>Reviews</h2>
          <ul className='space-y-2'>
            {list.map((r: any, i: number) => (
              <li key={i} className='rounded-lg border bg-white p-3 text-sm'>
                <span className='font-medium'>{r.rating} / 5</span> <span className='text-gray-500'><TimeAgo timestamp={r.created_at} /></span>
                {r.comment && <p>{r.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
