'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/motion/Modal';
import { Star, X } from '@/components/icons';

type Buyer = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type Props = {
  listingId: string;
  listingTitle: string;
  mode: 'reserved' | 'sold';
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
};

function isBuyer(value: unknown): value is Buyer {
  if (typeof value !== 'object' || value === null || !('id' in value) || !('name' in value)) return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && (!('avatar_url' in value) || value.avatar_url === null || typeof value.avatar_url === 'string');
}

export default function ListingTransactionDialog({
  listingId,
  listingTitle,
  mode,
  open,
  onClose,
  onComplete,
}: Props) {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [acceptedOfferBuyerId, setAcceptedOfferBuyerId] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;

    fetch(`/api/listings/${encodeURIComponent(listingId)}/status`, { cache: 'no-store' })
      .then(async (response) => {
        const result: unknown = await response.json();
        const message = typeof result === 'object'
          && result !== null
          && 'error' in result
          && typeof result.error === 'string'
          ? result.error
          : 'Could not load people who messaged about this listing.';
        if (!response.ok) throw new Error(message);
        if (
          typeof result !== 'object'
          || result === null
          || !('buyers' in result)
          || !Array.isArray(result.buyers)
          || !result.buyers.every(isBuyer)
        ) {
          throw new Error('The buyer list returned an invalid response.');
        }
        const reservedBy = 'reservedBy' in result && typeof result.reservedBy === 'string'
          ? result.reservedBy
          : '';
        const acceptedOfferBuyerId =
          'acceptedOfferBuyerId' in result && typeof result.acceptedOfferBuyerId === 'string'
            ? result.acceptedOfferBuyerId
            : '';
        if (
          acceptedOfferBuyerId &&
          !result.buyers.some((buyer) => isBuyer(buyer) && buyer.id === acceptedOfferBuyerId)
        ) {
          throw new Error('The accepted offer buyer could not be matched to this listing conversation.');
        }
        return { buyers: result.buyers, reservedBy, acceptedOfferBuyerId };
      })
      .then(({ buyers: loadedBuyers, reservedBy, acceptedOfferBuyerId }) => {
        if (!active) return;
        setBuyers(loadedBuyers);
        const acceptedBuyer = mode === 'sold' &&
          loadedBuyers.some((buyer) => buyer.id === acceptedOfferBuyerId)
          ? acceptedOfferBuyerId
          : '';
        setAcceptedOfferBuyerId(acceptedBuyer);
        const preferredBuyerId = acceptedBuyer || reservedBy;
        setSelectedBuyerId(
          loadedBuyers.some((buyer) => buyer.id === preferredBuyerId) ? preferredBuyerId : '',
        );
      })
      .catch((loadError: unknown) => {
        if (active) {
          setAcceptedOfferBuyerId('');
          setError(loadError instanceof Error
            ? loadError.message
            : 'Could not load people who messaged about this listing.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [listingId, mode, open]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'sold'
          ? {
              status: 'sold',
              buyerId: selectedBuyerId || null,
              rating: selectedBuyerId ? rating : null,
            }
          : {
              status: 'reserved',
              reservedBy: selectedBuyerId || null,
            }),
      });
      const result: unknown = await response.json();
      const message = typeof result === 'object'
        && result !== null
        && 'error' in result
        && typeof result.error === 'string'
        ? result.error
        : `Could not mark this listing as ${mode}.`;
      if (!response.ok) throw new Error(message);
      onComplete();
    } catch (submitError) {
      setError(submitError instanceof Error
        ? submitError.message
        : `Could not mark this listing as ${mode}.`);
    } finally {
      setBusy(false);
    }
  }

  const selectedBuyer = buyers.find((buyer) => buyer.id === selectedBuyerId);
  const titleId = `listing-transaction-title-${listingId}`;
  const actionLabel = mode === 'sold' ? 'Mark as sold' : 'Mark as reserved';

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className='seller-transaction-modal'
    >
      <header className='seller-transaction-modal-header'>
        <div>
          <h2 id={titleId}>{mode === 'sold' ? 'Complete this sale' : 'Reserve this item'}</h2>
          <p>{listingTitle}</p>
        </div>
        <button type='button' className='seller-transaction-close' onClick={onClose} aria-label='Close dialog'>
          <X size={18} />
        </button>
      </header>

      <p className='seller-transaction-help'>
        {mode === 'sold'
          ? 'The buyer whose offer you accepted is selected automatically. Choose a rating to complete the sale.'
          : 'Choose who reserved this item from people who messaged you. You can also reserve it without linking a buyer.'}
      </p>

      {loading ? (
        <p className='seller-transaction-state' role='status'>Loading buyers…</p>
      ) : (
        <fieldset className='seller-transaction-buyers'>
          <legend>{mode === 'sold' ? 'Who bought this item?' : 'Who reserved this item?'}</legend>
          {buyers.map((buyer) => (
            <label className='seller-transaction-buyer' key={buyer.id}>
              <input
                type='radio'
                name={`buyer-${listingId}`}
                value={buyer.id}
                checked={selectedBuyerId === buyer.id}
                disabled={Boolean(acceptedOfferBuyerId && acceptedOfferBuyerId !== buyer.id)}
                onChange={() => setSelectedBuyerId(buyer.id)}
              />
              {buyer.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={buyer.avatar_url} alt='' />
              ) : (
                <span className='seller-transaction-avatar' aria-hidden='true'>
                  {buyer.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <span>{buyer.name.trim() || 'Frugl member'}</span>
            </label>
          ))}
          <label className='seller-transaction-buyer seller-transaction-unlinked'>
            <input
              type='radio'
              name={`buyer-${listingId}`}
              value=''
              checked={!selectedBuyerId}
              disabled={Boolean(acceptedOfferBuyerId)}
              onChange={() => setSelectedBuyerId('')}
            />
            <span>
              {buyers.length
                ? (mode === 'sold' ? 'Sold to someone not listed' : 'Reserved by someone not listed')
                : (mode === 'sold' ? 'No buyer from messages' : 'No person from messages')}
            </span>
          </label>
        </fieldset>
      )}

      {mode === 'sold' && selectedBuyer && (
        <fieldset className='seller-transaction-rating'>
          <legend>Rate {selectedBuyer.name.trim() || 'the buyer'} to complete the sale</legend>
          <div className='seller-transaction-stars' role='group' aria-label='Rate the buyer from 1 to 5 stars'>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type='button'
                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                aria-pressed={rating === value}
                onClick={() => setRating(value)}
              >
                <Star size={26} variant={value <= rating ? 'solid' : 'regular'} />
              </button>
            ))}
            <span>{rating ? `${rating} / 5` : 'Choose a rating'}</span>
          </div>
        </fieldset>
      )}

      {error && <p className='seller-transaction-error' role='alert'>{error}</p>}

      <footer className='seller-transaction-footer'>
        <button type='button' className='seller-transaction-cancel' onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type='button'
          className='seller-transaction-submit'
          onClick={() => void submit()}
          disabled={loading || busy || Boolean(error) || (mode === 'sold' && Boolean(selectedBuyerId) && rating === 0)}
        >
          {busy ? 'Saving…' : actionLabel}
        </button>
      </footer>
    </Modal>
  );
}
