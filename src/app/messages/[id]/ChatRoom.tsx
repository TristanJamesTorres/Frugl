'use client';

import { useState, useEffect, useMemo, useRef, type DragEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/constants';
import { coverUrl } from '@/lib/queries';
import TimeAgo from '@/components/TimeAgo';
import { detectScamPhrases } from '@/lib/scam';
import {
  Send,
  AlertTriangle,
  ShieldCheck,
  Tag,
  ChevronLeft,
  Paperclip,
  FileLines,
  X,
  Loader2,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  formatAttachmentSize,
  isAllowedMessageAttachment,
  isImageMessageAttachment,
  MESSAGE_ATTACHMENT_ACCEPT,
  MESSAGE_ATTACHMENT_BUCKET,
  MESSAGE_ATTACHMENT_MAX_COUNT,
  MESSAGE_ATTACHMENT_MAX_TOTAL_SIZE,
} from '@/lib/messages/attachments';

interface MessageAttachment {
  path: string;
  name: string;
  contentType: string;
  size: number;
}

function MessageAttachmentCard({ attachment }: { attachment: MessageAttachment }) {
  const supabase = useMemo(() => createClient(), []);
  const [url, setUrl] = useState('');
  const [loadError, setLoadError] = useState('');
  const isImage = isImageMessageAttachment(attachment.contentType);

  useEffect(() => {
    let active = true;
    void supabase.storage
      .from(MESSAGE_ATTACHMENT_BUCKET)
      .createSignedUrl(attachment.path, 3600, { download: isImage ? false : attachment.name })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setLoadError('Attachment unavailable');
          return;
        }
        setUrl(data.signedUrl);
      })
      .catch(() => {
        if (active) setLoadError('Attachment unavailable');
      });

    return () => {
      active = false;
    };
  }, [attachment.name, attachment.path, isImage, supabase]);

  if (loadError) return <span className='message-attachment-unavailable'>{loadError}</span>;
  if (!url) return <span className='message-attachment-loading'>Loading {attachment.name}...</span>;

  if (isImage) {
    return (
      <a href={url} target='_blank' rel='noreferrer' className='message-attachment-image-link'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={attachment.name} className='message-attachment-image' />
        <span>{attachment.name}</span>
      </a>
    );
  }

  return (
    <a href={url} target='_blank' rel='noreferrer' className='message-attachment-file'>
      <FileLines size={18} />
      <span className='message-attachment-file-copy'>
        <strong>{attachment.name}</strong>
        <span>{formatAttachmentSize(attachment.size)}</span>
      </span>
      <span className='message-attachment-download'>Download</span>
    </a>
  );
}

interface Props {
  conversation: any;
  currentUserId: string;
  initialOffers: any[];
}

export default function ChatRoom({ conversation, currentUserId, initialOffers }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const listing = conversation.listings;
  const isBuyer = conversation.buyer_id === currentUserId;
  const otherParty = isBuyer ? conversation.seller : conversation.buyer;
  const cover = coverUrl(listing);

  const [messages, setMessages] = useState<any[]>(
    [...(conversation.messages || [])].sort(
      (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    )
  );
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [offers, setOffers] = useState<any[]>(initialOffers);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to realtime messages on this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const incoming = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, supabase]);

  // Send message
  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || sending) return;

    setSending(true);
    setActionError('');
    const textToSend = inputText.trim();
    const filesToSend = [...selectedFiles];

    try {
      const formData = new FormData();
      formData.set('conversationId', conversation.id);
      formData.set('body', textToSend);
      filesToSend.forEach((file) => formData.append('attachments', file, file.name));

      const res = await fetch('/api/messages', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');

      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
      setInputText('');
      setSelectedFiles([]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error sending message.');
    } finally {
      setSending(false);
    }
  }

  function addFiles(files: File[]) {
    if (!files.length) return;
    const supported = files.filter(isAllowedMessageAttachment);
    let totalSize = selectedFiles.reduce((total, file) => total + file.size, 0);
    const remainingSlots = MESSAGE_ATTACHMENT_MAX_COUNT - selectedFiles.length;
    const accepted: File[] = [];
    for (const file of supported) {
      if (accepted.length >= remainingSlots || totalSize + file.size > MESSAGE_ATTACHMENT_MAX_TOTAL_SIZE) continue;
      accepted.push(file);
      totalSize += file.size;
    }
    if (accepted.length) setSelectedFiles((previous) => [...previous, ...accepted]);

    const errors = [];
    if (supported.length !== files.length) errors.push('Some files were skipped because their type or size is not supported.');
    if (accepted.length !== supported.length) errors.push('Attach up to 4 files and 4 MB total per message.');
    setActionError(errors.join(' '));
  }

  function handleDropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFiles(false);
    if (sending) return;
    addFiles(Array.from(event.dataTransfer.files));
  }

  // Create offer
  async function handleSendOffer(e: FormEvent) {
    e.preventDefault();
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) return;

    setActionError('');
    try {
      const { data, error } = await supabase
        .from('offers')
        .insert({
          listing_id: conversation.listing_id,
          buyer_id: conversation.buyer_id,
          amount,
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      setOffers((prev) => [data, ...prev]);
      setShowOfferForm(false);
      setOfferAmount('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to send offer.');
    }
  }

  // Handle offer action (accept, decline, withdraw)
  async function handleOfferStatus(offerId: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .update({ status })
        .eq('id', offerId)
        .select('id, status')
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('This offer is no longer available to update.');
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status } : o))
      );
    } catch (err: any) {
      setActionError(err.message || 'Failed to update offer.');
    }
  }

  const latestOffer = offers[0];

  return (
    <div className='message-chat'>
      <header className='message-chat-header'>
        <Link href='/messages' className='messages-mobile-back' aria-label='Back to inbox'>
          <ChevronLeft size={18} />
        </Link>
        <div className='message-chat-listing'>
          <div className='message-chat-thumb'>
            {cover ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={cover} alt='' />
            ) : (
              <span>No photo</span>
            )}
          </div>
          <div className='message-chat-listing-details'>
            <Link
              href={`/laptops/${listing.id}`}
              className='message-chat-listing-title'
            >
              {listing.title}
            </Link>
            <p className='message-chat-listing-meta'>
              {formatPrice(listing.price)} <span>· {listing.status}</span>
            </p>
            {otherParty?.id ? (
              <Link href={`/sellers/${otherParty.id}`} className='message-chat-participant'>
                {otherParty.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={otherParty.avatar_url} alt='' />
                )}
                <span>{otherParty.name || 'User'} · {isBuyer ? 'Seller' : 'Buyer'}</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className='message-chat-header-actions'>
          {isBuyer && listing.status === 'available' && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowOfferForm(!showOfferForm)}
              className='text-xs'
            >
              <Tag size={14} className='mr-1 text-plum-700' />
              {showOfferForm ? 'Cancel Offer' : 'Make Offer'}
            </Button>
          )}
          <Link
            href={`/laptops/${listing.id}`}
            className='message-chat-view-listing'
          >
            View listing
          </Link>
        </div>
      </header>

      {/* Safety Warning Banner */}
      <div className='message-chat-safety'>
        <AlertTriangle size={16} className='text-amber-700 shrink-0' />
        <span>
          <strong>Safety check:</strong> Always meet in a busy public place. Never send downpayments via GCash or share OTP codes in chat.
        </span>
      </div>

      {/* Offer Form / Status Box */}
      {showOfferForm && (
        <form onSubmit={handleSendOffer} className='message-chat-offer-form'>
          <div className='flex items-center gap-2'>
            <Input
              type='number'
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder='Enter your offer in PHP'
              className='text-sm'
            />
            <Button type='submit' size='sm'>
              Send Offer
            </Button>
          </div>
        </form>
      )}

      {latestOffer && (
        <div className='message-chat-offer-status'>
          <div>
            <span className='font-semibold text-primary'>
              Offer: {formatPrice(latestOffer.amount)}
            </span>
            <span className='ml-2 text-gray-600 capitalize'>({latestOffer.status})</span>
          </div>

          <div className='flex items-center gap-2'>
            {!isBuyer && latestOffer.status === 'pending' && (
              <>
                <Button
                  type='button'
                  onClick={() => handleOfferStatus(latestOffer.id, 'accepted')}
                  size='sm'
                >
                  Accept
                </Button>
                <Button
                  type='button'
                  onClick={() => handleOfferStatus(latestOffer.id, 'declined')}
                  size='sm'
                  variant='outline'
                >
                  Decline
                </Button>
              </>
            )}
            {isBuyer && latestOffer.status === 'pending' && (
              <button
                onClick={() => handleOfferStatus(latestOffer.id, 'withdrawn')}
                className='text-gray-500 underline'
              >
                Withdraw offer
              </button>
            )}
          </div>
        </div>
      )}

      {actionError && (
        <div className='message-chat-error' role='alert'>
          {actionError}
        </div>
      )}

      {/* Chat Messages Log */}
      <div
        className={`message-chat-log${isDraggingFiles ? ' is-dragging-files' : ''}`}
        role='log'
        aria-label='Chat messages'
        aria-live='polite'
        onDragOver={(event) => {
          if (Array.from(event.dataTransfer.types).includes('Files')) {
            event.preventDefault();
            setIsDraggingFiles(true);
          }
        }}
        onDragLeave={() => setIsDraggingFiles(false)}
        onDrop={handleDropFiles}
      >
        {isDraggingFiles && <div className='message-drop-hint'>Drop files to attach</div>}
        {messages.length === 0 ? (
          <div className='message-chat-empty'>
            <ShieldCheck size={28} className='text-gray-300' />
            <p>Direct chat for this listing.</p>
            <p>Agree on a public meet-up location and inspect before buying.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUserId;
            const flags = detectScamPhrases(m.body || '');
            const attachments: MessageAttachment[] = Array.isArray(m.attachments) ? m.attachments : [];

            return (
              <div
                key={m.id}
                className={`message-row${isMe ? ' is-mine' : ' is-theirs'}`}
              >
                <div className='message-bubble'>
                  {m.body && <p className='message-bubble-text'>{m.body}</p>}
                  {attachments.length > 0 && (
                    <div className='message-attachments'>
                      {attachments.map((attachment) => (
                        <MessageAttachmentCard key={attachment.path} attachment={attachment} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline scam phrase detection warning for recipient */}
                {!isMe && flags.length > 0 && (
                  <div className='message-scam-warning'>
                    <AlertTriangle size={12} />
                    <span>Warning: Potential scam keyword detected ({flags.join(', ')}).</span>
                  </div>
                )}

                <span className='message-timestamp'>
                  <TimeAgo timestamp={m.sent_at} />
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Message Box */}
      <form onSubmit={handleSendMessage} className='message-chat-compose'>
        {selectedFiles.length > 0 && (
          <div className='message-selected-files' aria-label='Files to attach'>
            {selectedFiles.map((file, index) => (
              <span className='message-selected-file' key={`${file.name}-${file.lastModified}-${index}`}>
                <FileLines size={14} />
                <span>{file.name} · {formatAttachmentSize(file.size)}</span>
                <button
                  type='button'
                  aria-label={`Remove ${file.name}`}
                  disabled={sending}
                  onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className='message-compose-main'>
          <label className='message-compose-icon-button' title='Attach images or files'>
            <Paperclip size={18} />
            <input
              ref={fileInputRef}
              type='file'
              multiple
              accept={MESSAGE_ATTACHMENT_ACCEPT}
              className='sr-only'
              aria-label='Attach images or files'
              disabled={sending || selectedFiles.length >= MESSAGE_ATTACHMENT_MAX_COUNT}
              onChange={(event) => {
                addFiles(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = '';
              }}
            />
          </label>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder='Write a message...'
            aria-label='Write a message'
            maxLength={2000}
            className='message-compose-input'
            disabled={sending}
          />
          <Button
            type='submit'
            disabled={sending || (!inputText.trim() && selectedFiles.length === 0)}
            aria-label='Send message'
            className='message-send-button'
          >
            {sending ? <Loader2 size={17} className='animate-spin' /> : <Send size={17} />}
          </Button>
        </div>
        <p className='message-compose-hint'>Enter to send · Up to 4 files, 4 MB total</p>
      </form>
    </div>
  );
}
