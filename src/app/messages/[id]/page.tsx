import { notFound } from 'next/navigation';
import { requireMarketplaceUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import ChatRoom from './ChatRoom';

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireMarketplaceUser(`/messages/${id}`);

  // Scope the privileged read to the signed-in participant. This prevents a
  // stale conversations SELECT policy from hiding a newly created chat.
  const admin = createAdminClient();
  const { data: conv, error: conversationError } = await admin
    .from('conversations')
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      listings (id, title, price, status, location, listing_photos(image_url, sort_order)),
      buyer:profiles!conversations_buyer_id_fkey(id, name, avatar_url, seller_verified),
      seller:profiles!conversations_seller_id_fkey(id, name, avatar_url, seller_verified),
      messages (*)
    `)
    .eq('id', id)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .maybeSingle();

  if (conversationError) {
    console.error('Could not load participant conversation:', conversationError.message);
    throw new Error('Could not load this conversation. Please refresh and try again.');
  }
  if (!conv) notFound();

  // Mark other's unread messages as read
  await admin
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .is('read_at', null);

  // Fetch offers tied to this listing by this buyer
  const { data: offers } = await admin
    .from('offers')
    .select('*')
    .eq('listing_id', conv.listing_id)
    .eq('buyer_id', conv.buyer_id)
    .order('created_at', { ascending: false });

  return (
    <ChatRoom
      conversation={conv}
      currentUserId={user.id}
      initialOffers={offers || []}
    />
  );
}
