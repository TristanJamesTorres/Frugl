/* eslint-disable @next/next/no-img-element */
'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  BadgeCheck,
  Bookmark,
  Edit3,
  Flag,
  MessageCircle,
} from '@/components/icons';
import {
  dispatchSavedListingChanged,
  SAVED_LISTING_CHANGED_EVENT,
  type SavedListingChange,
} from '@/lib/saved-listings-events';
import Collapse from '@/components/motion/Collapse';
import Toast from '@/components/motion/Toast';

type SellerInfo = {
  id: string;
  name: string;
  avatar_url?: string | null;
  seller_verified?: boolean | null;
  public_contact_email?: string | null;
} | null;

type Props = {
  listingId: string;
  sellerId: string;
  listingPrice?: number | string | null;
  status: string;
  userId: string | null;
  initialSaved: boolean;
  seller?: SellerInfo;
  sellerRating?: number | null;
  sellerReviewCount?: number;
  sellerJoinedYear?: number | null;
};

export default function ListingActions({
  listingId,
  sellerId,
  listingPrice,
  status,
  userId,
  initialSaved,
  seller = null,
  sellerRating = null,
  sellerReviewCount = 0,
  sellerJoinedYear = null,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [saved, setSaved] = useState(initialSaved);
  const [showReport, setShowReport] = useState(false);
  const [amount, setAmount] = useState(() =>
    listingPrice !== null && listingPrice !== undefined ? String(listingPrice) : ''
  );
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [noteTone, setNoteTone] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [busy, setBusy] = useState(false);
  const [offerToastId, setOfferToastId] = useState(0);
  const offerToastSequence = useRef(0);

  useEffect(() => {
    const handleSavedListingChanged = (event: Event) => {
      const change = (event as CustomEvent<SavedListingChange>).detail;
      if (change?.userId === userId && change.listingId === listingId) setSaved(change.saved);
    };

    window.addEventListener(SAVED_LISTING_CHANGED_EVENT, handleSavedListingChanged);
    return () => window.removeEventListener(SAVED_LISTING_CHANGED_EVENT, handleSavedListingChanged);
  }, [listingId, userId]);

  useEffect(() => {
    if (!offerToastId) return;
    const timeoutId = window.setTimeout(() => setOfferToastId(0), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [offerToastId]);

  const sellerName = seller?.name?.trim() || 'Seller';
  const sellerInitial = sellerName.charAt(0).toUpperCase() || 'S';

  async function toggleSave() {
    if (!userId) {
      router.push('/login?next=' + encodeURIComponent('/laptops/' + listingId));
      return;
    }
    const nextSaved = !saved;
    setNote('');
    const { error } = nextSaved
      ? await supabase.from('saved_listings').insert({ user_id: userId, listing_id: listingId })
      : await supabase.from('saved_listings').delete().eq('user_id', userId).eq('listing_id', listingId);
    if (error) {
      setNoteTone('error');
      setNote('Could not update saved listing: ' + error.message);
      return;
    }

    setSaved(nextSaved);
    dispatchSavedListingChanged({ userId, listingId, saved: nextSaved });
    router.refresh();
  }

  async function message() {
    if (!userId) {
      router.push('/login?next=' + encodeURIComponent('/laptops/' + listingId));
      return;
    }
    setBusy(true);
    setNote('');
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const result: unknown = await response.json();
      const conversationId =
        typeof result === 'object' &&
        result !== null &&
        'id' in result &&
        typeof result.id === 'string'
          ? result.id
          : null;
      if (!response.ok || !conversationId) {
        const errorMessage =
          typeof result === 'object' &&
          result !== null &&
          'error' in result &&
          typeof result.error === 'string'
            ? result.error
            : 'Could not start a conversation. Please try again.';
        setNoteTone('error');
        setNote(errorMessage);
      } else {
        router.push('/messages/' + conversationId);
      }
    } catch (error) {
      setNoteTone('error');
      setNote(error instanceof Error ? error.message : 'Could not start a conversation. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sendOffer(e?: React.FormEvent) {
    e?.preventDefault();
    if (!userId) {
      router.push('/login?next=' + encodeURIComponent('/laptops/' + listingId));
      return;
    }
    const n = Number(amount);
    if (!n || n <= 0) {
      setNoteTone('error');
      setNote('Enter a valid offer amount above zero.');
      return;
    }
    setBusy(true);
    setNote('');
    try {
      const { error } = await supabase
        .from('offers')
        .insert({ listing_id: listingId, buyer_id: userId, amount: n });
      if (error) {
        setNoteTone('error');
        setNote(error.message);
      } else {
        setOfferToastId(++offerToastSequence.current);
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendReport() {
    if (!reason.trim()) {
      setNoteTone('error');
      setNote('Please describe what is wrong with this listing.');
      return;
    }
    setBusy(true);
    setNote('');
    try {
      const { error } = await supabase
        .from('reports')
        .insert({ target_type: 'listing', target_id: listingId, reporter_id: userId, reason });
      if (error) {
        setNoteTone('error');
        setNote(error.message);
      } else {
        setNoteTone('success');
        setNote('Thank you. A moderator will review this listing.');
        setShowReport(false);
        setReason('');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='product-action-card'>
      {/* Seller Header inside Right Card */}
      <div className='product-seller-header'>
        <Link href={`/sellers/${seller?.id ?? sellerId}`} className='product-seller-avatar'>
          {seller?.avatar_url ? (
            <img src={seller.avatar_url} alt={sellerName} />
          ) : (
            <span>{sellerInitial}</span>
          )}
        </Link>

        <div className='product-seller-meta'>
          <div className='product-seller-name-row'>
            <Link href={`/sellers/${seller?.id ?? sellerId}`} className='product-seller-name'>
              {sellerName}
            </Link>
            {seller?.seller_verified && (
              <span className='product-seller-verified' title='Verified Seller'>
                <BadgeCheck size={14} variant='solid' />
              </span>
            )}
          </div>

          {seller?.public_contact_email ? (
            <a className='product-seller-email' href={`mailto:${seller.public_contact_email}`}>
              {seller.public_contact_email}
            </a>
          ) : (
            <span className='product-seller-email is-private'>Email not shared</span>
          )}

          <div className='product-seller-stats'>
            <span>
              <span className='product-seller-stat-label'>Average rating</span>
              <strong>
                {sellerRating !== null && sellerReviewCount > 0
                  ? `${sellerRating.toFixed(1)} / 5`
                  : 'No reviews'}
              </strong>
            </span>
            <span className='product-seller-stats-divider' aria-hidden='true'>|</span>
            <span>
              <span className='product-seller-stat-label'>Year joined</span>
              <strong>{sellerJoinedYear ?? '—'}</strong>
            </span>
          </div>
        </div>
      </div>

      <hr className='product-seller-divider' />

      {/* Actions Body */}
      {!userId ? (
        <div className='product-action-stack'>
          <p className='product-action-hint'>
            Sign in to chat with {sellerName}, make an offer, or save this laptop.
          </p>
          <Link
            href={'/login?next=' + encodeURIComponent('/laptops/' + listingId)}
            className='button-primary product-chat-btn'
          >
            Sign in to continue
          </Link>
        </div>
      ) : userId === sellerId ? (
        <div className='product-action-stack'>
          <p className='product-action-hint'>
            You are viewing your own listing. You can update photos, specs, or price anytime.
          </p>
          <Link href={'/sell/' + listingId} className='button-primary product-chat-btn'>
            <Edit3 size={16} />
            Edit listing
          </Link>
          <Link href='/dashboard' className='product-secondary-btn w-full justify-center'>
            Manage all listings
          </Link>
        </div>
      ) : (
        <div className='product-action-stack'>
          <button
            type='button'
            onClick={message}
            disabled={busy}
            className='button-primary product-chat-btn'
          >
            <MessageCircle size={16} variant='solid' />
            Chat with seller
          </button>

          {status === 'available' && (
            <form onSubmit={sendOffer} className='product-offer-group'>
              <label className='product-offer-input-wrap'>
                <span className='product-offer-currency'>PHP</span>
                <input
                  type='number'
                  min='1'
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder='0'
                  aria-label='Offer amount in PHP'
                />
              </label>
              <button type='submit' disabled={busy} className='button-primary product-offer-submit'>
                Make Offer
              </button>
            </form>
          )}

          <div className='product-utility-actions'>
            <button
              type='button'
              onClick={toggleSave}
              className={`product-secondary-btn${saved ? ' is-saved' : ''}`}
              aria-pressed={saved}
            >
              <Bookmark size={14} variant={saved ? 'solid' : 'regular'} />
              {saved ? 'Saved' : 'Save'}
            </button>

            <button
              type='button'
              onClick={() => setShowReport((prev) => !prev)}
              className={`product-secondary-btn${showReport ? ' is-active' : ''}`}
              aria-expanded={showReport}
            >
              <Flag size={14} variant={showReport ? 'solid' : 'regular'} />
              Report
            </button>
          </div>

          <Collapse open={showReport} className='product-report-box'>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder='Tell us what is wrong with this listing...'
              />
              <button
                type='button'
                onClick={sendReport}
                disabled={busy}
                className='button-primary product-report-submit'
              >
                Submit report
              </button>
          </Collapse>
        </div>
      )}

      {note && (
        <p className={`product-action-note is-${noteTone}`} role='status'>
          {note}
        </p>
      )}

      <Toast open={offerToastId > 0} toastKey={offerToastId} className='product-offer-toast'>
        <span>
          Offer sent! You can track it on your <Link href='/offers'>Offers page</Link>.
        </span>
      </Toast>

    </div>
  );
}
