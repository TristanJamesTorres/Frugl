'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { coverUrl } from '@/lib/queries';
import TimeAgo from '@/components/TimeAgo';
import { MessageCircle } from '@/components/icons';

interface Props {
  conversations: any[];
  currentUserId: string;
  loadError: string;
  children: React.ReactNode;
}

export default function InboxShell({ conversations, currentUserId, loadError, children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listingIdFilter = searchParams.get('listingId');
  const visibleConversations = listingIdFilter
    ? conversations.filter((conversation) => conversation.listing_id === listingIdFilter)
    : conversations;
  const isMessagesRoute = pathname === '/messages' || pathname.startsWith('/messages/');
  const selectedId = pathname.match(/^\/messages\/([^/]+)/)?.[1];
  const [readConversationIds, setReadConversationIds] = useState<string[]>(
    () => selectedId ? [selectedId] : []
  );

  return (
    <div className={`${isMessagesRoute ? 'messages-inbox' : 'messages-inbox-cached'}${selectedId ? ' is-chat-open' : ''}`}>
      <aside className='messages-sidebar'>
        <header className='messages-sidebar-header'>
          <div>
            <h1>Inbox</h1>
            <p>{visibleConversations.length ? `${visibleConversations.length} conversation${visibleConversations.length === 1 ? '' : 's'}` : 'Your conversations'}</p>
          </div>
        </header>

        {loadError ? (
          <p className='messages-load-error' role='alert'>{loadError}</p>
        ) : visibleConversations.length ? (
          <nav className='messages-conversation-list' aria-label='Conversations'>
            {visibleConversations.map((conversation) => {
              const isBuyer = conversation.buyer_id === currentUserId;
              const otherParty = isBuyer ? conversation.seller : conversation.buyer;
              const listing = conversation.listings;
              const image = coverUrl(listing);
              const latestMessage = conversation.latestMessage;
              const isSelected = selectedId === conversation.id;

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className={`messages-conversation${isSelected ? ' is-selected' : ''}`}
                  aria-current={isSelected ? 'page' : undefined}
                  onClick={() => {
                    setReadConversationIds((ids) =>
                      ids.includes(conversation.id) ? ids : [...ids, conversation.id]
                    );
                  }}
                >
                  <div className='messages-listing-image'>
                    {image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={image} alt='' />
                    ) : (
                      <MessageCircle size={20} className='text-gray-400' />
                    )}
                  </div>
                  <div className='messages-conversation-content'>
                    <div className='messages-conversation-heading'>
                      <p className='messages-participant'>
                        {otherParty?.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={otherParty.avatar_url} alt='' />
                        )}
                        <span className='messages-participant-name'>{otherParty?.name || 'User'}</span>
                        <span className='messages-participant-role'>{isBuyer ? 'Seller' : 'Buyer'}</span>
                      </p>
                      <span className='messages-time'>
                        <TimeAgo timestamp={latestMessage?.sent_at || conversation.updated_at} />
                      </span>
                    </div>
                    <p className='messages-listing-title'>{listing?.title || 'Laptop listing'}</p>
                    <p className='messages-last-message'>
                      {latestMessage?.body || 'No messages yet'}
                    </p>
                  </div>
                  {conversation.hasUnread && !isSelected && !readConversationIds.includes(conversation.id) && (
                    <span className='messages-unread-dot' aria-label='Unread messages' />
                  )}
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className='messages-list-empty'>
            <MessageCircle size={26} className='text-plum-700' />
            <p>{listingIdFilter ? 'No messages for this listing yet' : 'No chats yet'}</p>
            <span>{listingIdFilter ? 'Conversations about this listing will appear here.' : 'Message a seller or reply to a buyer to start a conversation.'}</span>
            <Link href={listingIdFilter ? '/messages' : '/laptops'} className='messages-start-link'>
              {listingIdFilter ? 'View all conversations' : 'Browse laptops'}
            </Link>
          </div>
        )}
      </aside>

      <section className='messages-view' aria-label='Conversation'>
        {children}
      </section>
    </div>
  );
}
