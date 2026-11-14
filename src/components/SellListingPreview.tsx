'use client';

import { conditionLabel, formatPrice } from '@/lib/constants';
import { ChevronLeft, ChevronRight, Laptop } from '@/components/icons';
import { useState } from 'react';

type PreviewSpec = {
  label: string;
  value?: string | number | null;
};

type Props = {
  title?: string;
  price?: string | number | null;
  condition?: string;
  location?: string;
  description?: string;
  photos: string[];
  specs?: PreviewSpec[];
  sellerName?: string;
};

export default function SellListingPreview({
  title,
  price,
  condition,
  location,
  description,
  photos,
  specs = [],
  sellerName = 'Your profile',
}: Props) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const activePhotoIndex = Math.min(selectedPhotoIndex, Math.max(photos.length - 1, 0));
  const visibleSpecs = specs
    .filter((spec) => spec.value !== undefined && spec.value !== null && String(spec.value).trim())
    .slice(0, 4);
  const formattedPrice = formatPrice(price);

  function showPhoto(index: number) {
    setSelectedPhotoIndex(index);
  }

  function showAdjacentPhoto(direction: -1 | 1) {
    if (photos.length < 2) return;
    setSelectedPhotoIndex((activePhotoIndex + direction + photos.length) % photos.length);
  }

  return (
    <div className='listing-preview-card'>
      <div className='listing-preview-gallery'>
        <div
          className='listing-preview-media'
          role={photos.length > 1 ? 'region' : undefined}
          aria-label={photos.length > 1 ? 'Laptop photo preview' : undefined}
          aria-roledescription={photos.length > 1 ? 'carousel' : undefined}
        >
          {photos[activePhotoIndex] ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photos[activePhotoIndex]}
              alt={`${title?.trim() || 'Laptop'} photo ${activePhotoIndex + 1}`}
            />
          ) : (
            <div className='listing-preview-placeholder'>
              <Laptop size={36} />
              <span>Add photos to preview your laptop</span>
            </div>
          )}
          {photos.length > 1 && (
            <>
              <button
                type='button'
                className='listing-preview-arrow listing-preview-arrow-previous'
                aria-label='Show previous photo'
                onClick={() => showAdjacentPhoto(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type='button'
                className='listing-preview-arrow listing-preview-arrow-next'
                aria-label='Show next photo'
                onClick={() => showAdjacentPhoto(1)}
              >
                <ChevronRight size={18} />
              </button>
              <span className='listing-preview-photo-count' aria-live='polite' aria-atomic='true'>
                {activePhotoIndex + 1} / {photos.length}
              </span>
            </>
          )}
        </div>
        {photos.length > 1 && (
          <div className='listing-preview-thumbnails' role='group' aria-label='Choose a preview photo'>
            {photos.map((photo, index) => (
              <button
                key={`${photo}-${index}`}
                type='button'
                className={`listing-preview-thumbnail${index === activePhotoIndex ? ' is-active' : ''}`}
                aria-label={`Show photo ${index + 1}`}
                aria-pressed={index === activePhotoIndex}
                onClick={() => showPhoto(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt='' />
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className='listing-preview-info'
        role='region'
        aria-label='Listing preview details'
        tabIndex={0}
      >
        <div>
          <h2 className='listing-preview-title'>{title?.trim() || 'Your laptop title'}</h2>
          <p className='listing-preview-price'>{formattedPrice || 'Price'}</p>
          <p className='listing-preview-location'>
            {location ? `Draft listing in ${location}` : 'Draft listing'}
          </p>
        </div>

        {(condition || visibleSpecs.length > 0) && (
          <section className='listing-preview-section'>
            <h3>Details</h3>
            {condition && <p>{conditionLabel(condition)}</p>}
            {visibleSpecs.length > 0 && (
              <dl>
                {visibleSpecs.map((spec) => (
                  <div key={spec.label}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        <section className='listing-preview-section listing-preview-description'>
          <h3>Description</h3>
          <p>{description?.trim() || 'Description will appear here.'}</p>
        </section>

        <div className='listing-preview-seller'>
          <h3>Seller information</h3>
          <div>
            <span aria-hidden='true'>{sellerName.trim().charAt(0).toUpperCase() || 'Y'}</span>
            <strong>{sellerName}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
