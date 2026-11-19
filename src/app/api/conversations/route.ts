import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let account: Awaited<ReturnType<typeof apiUser>>;
  try {
    account = await apiUser();
  } catch (error) {
    console.error('Could not verify account for conversation creation:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Could not verify your account. Refresh and sign in again.' }, 401);
  }

  const { user, profile } = account;
  if (!user) return json({ error: 'Please sign in to message the seller.' }, 401);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);
  if (profile?.role === 'admin') return json({ error: 'Admin accounts cannot start marketplace conversations.' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  const listingId =
    typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>).listingId
      : null;
  if (typeof listingId !== 'string' || !UUID_PATTERN.test(listingId)) {
    return json({ error: 'A valid listing is required.' }, 400);
  }

  try {
    const admin = createAdminClient();
    const { data: listing, error: listingError } = await admin
      .from('listings')
      .select('id, seller_id, status, is_visible')
      .eq('id', listingId)
      .maybeSingle();
    if (listingError) {
      console.error('Could not load listing for conversation:', listingError.message);
      return json({ error: 'Could not verify this listing.' }, 500);
    }
    if (!listing || !listing.is_visible || !['available', 'reserved'].includes(listing.status)) {
      return json({ error: 'This listing is no longer available for messages.' }, 404);
    }
    if (listing.seller_id === user.id) {
      return json({ error: 'You cannot start a conversation with yourself.' }, 403);
    }

    const findExisting = () => admin
      .from('conversations')
      .select('id')
      .eq('listing_id', listingId)
      .eq('buyer_id', user.id)
      .maybeSingle();

    const { data: existing, error: existingError } = await findExisting();
    if (existingError) {
      console.error('Could not check for an existing conversation:', existingError.message);
      return json({ error: 'Could not open a conversation for this listing.' }, 500);
    }
    if (existing) return json({ id: existing.id });

    const { data: created, error: createError } = await admin
      .from('conversations')
      .insert({ listing_id: listingId, buyer_id: user.id, seller_id: listing.seller_id })
      .select('id')
      .single();
    if (createError) {
      // A second click or another tab may win the unique (listing, buyer) race.
      if (createError.code === '23505') {
        const { data: raced, error: raceError } = await findExisting();
        if (!raceError && raced) return json({ id: raced.id });
      }
      console.error('Could not create conversation:', createError.message);
      return json({ error: 'Could not start a conversation. Please try again.' }, 500);
    }

    return json({ id: created.id }, 201);
  } catch (error) {
    console.error('Conversation creation is unavailable:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Conversation service is temporarily unavailable.' }, 503);
  }
}
