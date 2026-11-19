import { apiUser, json } from '@/lib/api';
import { sellerListingStatusPatch } from '@/lib/listings/status';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);
  if (profile.role === 'admin') return json({ error: 'Admin accounts cannot manage marketplace listings.' }, 403);

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, seller_id, status, reserved_by')
    .eq('id', id)
    .maybeSingle();

  if (listingError) {
    console.error('Could not verify listing status access:', listingError.message);
    return json({ error: 'Could not load listing buyers.' }, 500);
  }
  if (!listing) return json({ error: 'Listing not found.' }, 404);
  if (listing.seller_id !== user.id) return json({ error: 'Forbidden.' }, 403);
  if (!['available', 'reserved'].includes(listing.status)) {
    return json({ error: 'This listing is not available for a buyer selection.' }, 409);
  }

  const { data: buyers, error: buyersError } = await supabase.rpc(
    'listing_message_buyers',
    { p_listing_id: id },
  );
  if (buyersError) {
    console.error('Could not load listing message buyers:', buyersError.message);
    return json({ error: 'Could not load listing buyers. Apply supabase/16_listing_sales_and_reviews.sql and try again.' }, 503);
  }

  const { data: acceptedOffer, error: acceptedOfferError } = await supabase
    .from('offers')
    .select('buyer_id')
    .eq('listing_id', id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (acceptedOfferError) {
    console.error('Could not load the accepted offer buyer:', acceptedOfferError.message);
    return json({ error: 'Could not verify the accepted offer for this listing.' }, 500);
  }

  return json({
    buyers: buyers ?? [],
    reservedBy: listing.reserved_by,
    acceptedOfferBuyerId: acceptedOffer?.buyer_id ?? null,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await apiUser();
  if (!user) return json({ error: 'Please sign in.' }, 401);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);
  if (profile.role === 'admin') return json({ error: 'Admin accounts cannot manage marketplace listings.' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return json({ error: 'A listing status is required.' }, 400);
  }

  const payload = body as Record<string, unknown>;
  const requestedStatus = payload.status;
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', id)
    .maybeSingle();

  if (listingError) {
    console.error('Could not verify listing status access:', listingError.message);
    return json({ error: 'Could not verify listing access.' }, 500);
  }
  if (!listing) return json({ error: 'Listing not found.' }, 404);
  if (listing.seller_id !== user.id) return json({ error: 'Forbidden.' }, 403);

  if (requestedStatus === 'sold') {
    const rawBuyerId = payload.buyerId ?? null;
    const rawRating = payload.rating ?? null;
    if (rawBuyerId !== null && typeof rawBuyerId !== 'string') {
      return json({ error: 'Choose a valid buyer.' }, 400);
    }
    if (rawRating !== null && typeof rawRating !== 'number') {
      return json({ error: 'Rate the selected buyer from 1 to 5 stars before completing the sale.' }, 400);
    }
    const { data: acceptedOffer, error: acceptedOfferError } = await supabase
      .from('offers')
      .select('buyer_id')
      .eq('listing_id', id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (acceptedOfferError) {
      console.error('Could not verify the accepted offer buyer:', acceptedOfferError.message);
      return json({ error: 'Could not verify the accepted offer buyer.' }, 500);
    }

    const acceptedBuyerId = acceptedOffer?.buyer_id ?? null;
    const requestedBuyerId = typeof rawBuyerId === 'string' ? rawBuyerId : null;
    if (acceptedBuyerId && requestedBuyerId && requestedBuyerId !== acceptedBuyerId) {
      return json({ error: 'This sale must be linked to the buyer whose offer you accepted.' }, 409);
    }
    const buyerId: string | null = acceptedBuyerId ?? requestedBuyerId;
    const rating: number | null = typeof rawRating === 'number' ? rawRating : null;
    if (buyerId !== null && !UUID_PATTERN.test(buyerId)) {
      return json({ error: 'Choose a valid buyer.' }, 400);
    }
    if (
      (buyerId === null && rating !== null) ||
      (buyerId !== null && (rating === null || !Number.isInteger(rating) || rating < 1 || rating > 5))
    ) {
      return json({ error: 'Rate the selected buyer from 1 to 5 stars before completing the sale.' }, 400);
    }

    const { data: transactionId, error: saleError } = await supabase.rpc(
      'complete_listing_sale',
      {
        p_listing_id: id,
        p_buyer_id: buyerId,
        p_rating: rating,
      },
    );
    if (saleError) {
      console.error('Could not complete listing sale:', saleError.message);
      if (saleError.code === '23514') return json({ error: saleError.message }, 400);
      if (saleError.code === '23505') return json({ error: 'A review already exists for this sale.' }, 409);
      if (saleError.message.includes('complete_listing_sale')) {
        return json({ error: 'Sales are temporarily unavailable. Apply supabase/16_listing_sales_and_reviews.sql and try again.' }, 503);
      }
      return json({ error: 'Could not complete this sale.' }, 500);
    }
    if (typeof transactionId !== 'string') {
      console.error('Listing sale returned an invalid transaction id.');
      return json({ error: 'Could not confirm the completed sale.' }, 500);
    }
    return json({ ok: true, status: 'sold', transactionId });
  }

  let patch = sellerListingStatusPatch(listing.status, requestedStatus);
  if (!patch) {
    return json({ error: 'This listing status change is not allowed.' }, 409);
  }

  if (requestedStatus === 'reserved') {
    const rawReservedBy = payload.reservedBy ?? null;
    if (rawReservedBy !== null && typeof rawReservedBy !== 'string') {
      return json({ error: 'Choose a valid buyer.' }, 400);
    }
    const reservedBy: string | null = typeof rawReservedBy === 'string' ? rawReservedBy : null;
    if (reservedBy !== null && !UUID_PATTERN.test(reservedBy)) {
      return json({ error: 'Choose a valid buyer.' }, 400);
    }
    if (typeof reservedBy === 'string') {
      const { data: buyers, error: buyersError } = await supabase.rpc(
        'listing_message_buyers',
        { p_listing_id: id },
      );
      if (buyersError) {
        console.error('Could not verify reservation buyer:', buyersError.message);
        return json({ error: 'Could not verify the selected buyer.' }, 503);
      }
      if (!buyers?.some((buyer) => buyer.id === reservedBy)) {
        return json({ error: 'Choose a buyer who has messaged about this listing.' }, 400);
      }
    }
    patch = { ...patch, reserved_by: reservedBy };
  }

  // Listing ownership and the allowed status transition were verified above.
  const { data: updated, error: updateError } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', id)
    .eq('seller_id', user.id)
    .eq('status', listing.status)
    .select('id, status')
    .maybeSingle();

  if (updateError) {
    console.error('Could not update listing status:', updateError.message);
    if (
      updateError.code === 'PGRST204' ||
      updateError.code === '42703' ||
      updateError.message.includes('sold_transaction_id')
    ) {
      return json({
        error: 'Listing sales database setup is missing or stale. Apply supabase/16_listing_sales_and_reviews.sql in Supabase, then try again.',
      }, 503);
    }
    return json({ error: 'Could not update this listing status.' }, 500);
  }
  if (!updated) return json({ error: 'This listing changed. Refresh and try again.' }, 409);

  return json({ ok: true, status: updated.status });
}
