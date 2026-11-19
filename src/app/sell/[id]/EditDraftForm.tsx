'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Eye, CheckCircle2, AlertCircle, Loader2, UploadCloud, Camera, DoorOpen, MapPin, ChevronDown } from '@/components/icons';
import { CONDITIONS, DEAL_METHODS, BRANDS, formatPrice } from '@/lib/constants';
import { CHECKLIST_ITEMS, suggestCondition } from '@/lib/condition';
import { resizeImage } from '@/lib/client-image';
import SellListingPreview from '@/components/SellListingPreview';
import LocationAutocomplete, { type LocationSelection } from '@/components/LocationAutocomplete';
import Chevron from '@/components/motion/Chevron';
import Collapse from '@/components/motion/Collapse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Banner from '@/components/motion/Banner';

interface Props {
  initialListing: any;
  userLocation: string;
  sellerName: string;
  sellerAvatarUrl: string | null;
}

interface ListingPhoto {
  id: string;
  image_path?: string;
  image_url: string;
  sort_order: number;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('The request timed out. Check My Listings before trying again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function EditDraftForm({ initialListing, userLocation, sellerName, sellerAvatarUrl }: Props) {
  const router = useRouter();

  // Core listing state
  const [title, setTitle] = useState(initialListing.title || '');
  const [price, setPrice] = useState(initialListing.price ? String(initialListing.price) : '');
  const [condition, setCondition] = useState(initialListing.condition || '');
  const [brand, setBrand] = useState(initialListing.brand || '');
  const [model, setModel] = useState(initialListing.model || '');
  const [description, setDescription] = useState(initialListing.description || '');
  const [dealMethods, setDealMethods] = useState<string[]>(initialListing.deal_methods || ['public_meetup']);
  const [location, setLocation] = useState(initialListing.location || userLocation || '');
  const [locationSelection, setLocationSelection] = useState<LocationSelection | null>(() => {
    const lat = typeof initialListing.location_lat === 'number' ? initialListing.location_lat : null;
    const lng = typeof initialListing.location_lng === 'number' ? initialListing.location_lng : null;
    const label = initialListing.location_label || (lat !== null && lng !== null ? initialListing.location : '');
    return label || lat !== null || lng !== null ? { label, lat, lng } : null;
  });
  const addressDetail = initialListing.address_detail || '';

  // Specs
  const [cpu, setCpu] = useState(initialListing.cpu || '');
  const [gpu, setGpu] = useState(initialListing.gpu || '');
  const [ram, setRam] = useState(initialListing.ram || '');
  const [storage, setStorage] = useState(initialListing.storage || '');
  const [screenSize, setScreenSize] = useState(initialListing.screen_size ? String(initialListing.screen_size) : '');

  // Photos
  const [photos, setPhotos] = useState<ListingPhoto[]>(() =>
    [...(Array.isArray(initialListing.listing_photos) ? initialListing.listing_photos : [])]
      .sort((a, b) => a.sort_order - b.sort_order)
  );

  // Price suggestion from server
  const [priceSuggestion, setPriceSuggestion] = useState<any>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Condition checklist modal/panel
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistValues, setChecklistValues] = useState<Record<string, string>>({
    battery_health: initialListing.condition_reports?.[0]?.battery_health || '',
    screen_grade: initialListing.condition_reports?.[0]?.screen_grade || '',
    keyboard_grade: initialListing.condition_reports?.[0]?.keyboard_grade || '',
    hinge_grade: initialListing.condition_reports?.[0]?.hinge_grade || '',
    ports: initialListing.condition_reports?.[0]?.ports || '',
    charger: initialListing.condition_reports?.[0]?.charger || '',
  });

  // UI state
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Identification results tier
  const ident = initialListing.identification_results?.[0];
  const aiTier = ident?.tier;
  const aiCandidates = Array.isArray(ident?.candidates) ? ident.candidates : [];
  const detectedSeries = typeof ident?.series === 'string' ? ident.series.trim() : '';
  const detectedModelNumber = typeof ident?.model_number === 'string' ? ident.model_number.trim() : '';
  const recognizedModel = [detectedSeries, detectedModelNumber].filter(Boolean).join(' ');
  const recognizedIdentity = [ident?.brand, recognizedModel].filter(Boolean).join(' ');
  const candidateLabels = aiCandidates
    .slice(0, 3)
    .map((candidate: any) => [candidate.brand, candidate.series].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(', ');

  // Auto-fetch price suggestion when modelId or condition changes
  useEffect(() => {
    async function fetchPrice() {
      if (!initialListing.model_id) return;
      setLoadingPrice(true);
      try {
        const res = await fetch(`/api/price-suggestion?modelId=${initialListing.model_id}&condition=${condition || 'like_new'}`);
        if (res.ok) {
          const d = await res.json();
          setPriceSuggestion(d.suggestion);
        }
      } catch {
        // Ignore price fetch errors
      } finally {
        setLoadingPrice(false);
      }
    }
    fetchPrice();
  }, [initialListing.model_id, condition]);

  // Handle deal method toggle
  function toggleDealMethod(m: string) {
    setDealMethods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  // Handle condition checklist update
  function updateChecklist(key: string, val: string) {
    const updated = { ...checklistValues, [key]: val };
    setChecklistValues(updated);
    const suggested = suggestCondition(updated);
    if (suggested) {
      setCondition(suggested);
    }
  }

  // Add photos directly to this listing
  async function handleAddPhoto(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 10) {
      setError('A listing can have at most 10 photos.');
      return;
    }
    setUploadingPhoto(true);
    setError('');
    try {
      const formData = new FormData();
      for (const f of files) {
        const resized = await resizeImage(f, 1280, 0.85);
        formData.append('photos', resized);
      }
      const res = await fetch(`/api/listings/${initialListing.id}/photos`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload photo.');
      if (!Array.isArray(data.photos)) throw new Error('Uploaded photos could not be loaded.');
      setPhotos(data.photos);
    } catch (err: any) {
      setError(err.message || 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  // Save current progress as draft
  async function saveDraft() {
    setSavingDraft(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        title,
        price: price ? Number(price) : null,
        condition: condition || null,
        brand,
        model,
        description,
        deal_methods: dealMethods,
        location,
        location_lat: locationSelection?.lat ?? null,
        location_lng: locationSelection?.lng ?? null,
        location_label: locationSelection?.label || null,
        address_detail: addressDetail,
        cpu,
        gpu,
        ram,
        storage,
        screen_size: screenSize ? Number(screenSize) : null,
      };

      const res = await fetch(`/api/listings/${initialListing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save draft.');
      }
      setSuccessMsg(initialListing.status === 'rejected' ? 'Changes saved.' : 'Draft saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Save failed.');
    } finally {
      setSavingDraft(false);
    }
  }

  // Publish listing
  async function publishListing() {
    setPublishing(true);
    setError('');
    setSuccessMsg('');

    // First save all latest field edits
    try {
      const payload = {
        title,
        price: price ? Number(price) : null,
        condition: condition || null,
        brand,
        model,
        description,
        deal_methods: dealMethods,
        location,
        location_lat: locationSelection?.lat ?? null,
        location_lng: locationSelection?.lng ?? null,
        location_label: locationSelection?.label || null,
        address_detail: addressDetail,
        cpu,
        gpu,
        ram,
        storage,
        screen_size: screenSize ? Number(screenSize) : null,
      };

      const saveRes = await fetchWithTimeout(`/api/listings/${initialListing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Failed to save listing changes.');
      }

      // Submit the listing for administrator review after validating required fields.
      const pubRes = await fetchWithTimeout(`/api/listings/${initialListing.id}/publish`, {
        method: 'POST',
      });
      const pubData = await pubRes.json();
      if (!pubRes.ok) {
        throw new Error(pubData.error || 'Please fill in all required fields.');
      }

      router.push('/dashboard?tab=pending');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish listing.');
    } finally {
      setPublishing(false);
    }
  }

  const photoUrls = photos.map((p) => p.image_url);

  return (
    <div className='listing-editor-shell listing-edit-editor sell-listing-editor'>
      <aside className='listing-editor-sidebar'>
        <header className='listing-editor-sidebar-header'>
          <div>
            <p className='listing-editor-kicker'>Marketplace</p>
            <h1>{initialListing.status === 'rejected' ? 'Update rejected listing' : 'Edit listing draft'}</h1>
          </div>
          <div className='listing-editor-header-actions'>
            <button
              type='button'
              onClick={() => setMobileTab(mobileTab === 'form' ? 'preview' : 'form')}
              className='listing-editor-mobile-toggle'
            >
              <Eye size={14} />
              {mobileTab === 'form' ? 'View preview' : 'Back to form'}
            </button>
            <button
              type='button'
              onClick={saveDraft}
              disabled={savingDraft || publishing}
              className='sell-skip-button'
            >
              {savingDraft
                ? 'Saving...'
                : initialListing.status === 'draft'
                  ? 'Save draft'
                  : 'Save changes'}
            </button>
          </div>
        </header>
        {initialListing.status === 'rejected' && (
          <div className='listing-editor-review-feedback' role='status'>
            <strong>Changes requested by an administrator</strong>
            <p>{initialListing.review_reason || 'Update the listing details before resubmitting.'}</p>
          </div>
        )}
        <div className={`listing-editor-fields ${mobileTab === 'preview' ? 'listing-editor-mobile-hidden' : ''}`}>
          <p className='sell-editor-intro'>
            Review and adjust the details. The preview updates as you edit.
          </p>
          <Banner open={Boolean(error)} className='mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700' role='alert'>
              <AlertCircle size={16} className='shrink-0' />
              <span>{error}</span>
          </Banner>
          <Banner open={Boolean(successMsg)} className='mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'>
              <CheckCircle2 size={16} className='shrink-0' />
              <span>{successMsg}</span>
          </Banner>
          <div className='listing-editor-field-content'>
          {/* AI Banner if auto-filled */}
          {aiTier && (
            <div className='flex items-center gap-2 rounded-xl border border-lavender-300 bg-lavender-100 p-3 text-xs text-primary'>
                <Sparkles size={16} className='shrink-0 text-plum-700' />
              <span>
                {ident?.provider === 'gemini:error'
                  ? 'Gemini could not analyze the photos. Check the API key/model, or enter the details manually.'
                  : aiTier === 'auto'
                    ? 'AI identified a likely brand and model. Confirm them, then enter the remaining specs and price.'
                    : initialListing.model_id
                      ? 'Possible catalog model match selected. Confirm it, then enter the remaining specs and price.'
                      : candidateLabels
                        ? `Possible matches: ${candidateLabels}. No single match was clear enough to fill specs automatically.`
                        : recognizedModel
                          ? `Gemini read ${recognizedIdentity}, but no single catalog match was confident. Verify the model field or enter its code manually.`
                          : ident?.brand
                            ? `Gemini recognized ${ident.brand}, but could not identify its model family. Try a close photo of the model sticker or System Information screen.`
                            : 'Gemini could not read the brand or model. Try a closer photo of the model sticker or System Information screen.'}
              </span>
            </div>
          )}

          {/* Photos manager */}
          <section className='sell-form-section sell-edit-photos-section'>
            <div className='sell-section-heading'>
              <h2>
                <Camera size={20} aria-hidden='true' />
                <span>Photos <span className='sell-section-count'>{photos.length} / 10</span></span>
              </h2>
              <p>Your photos are saved with this draft and appear in the listing preview.</p>
            </div>
            <div className='sell-photo-grid'>
              {photos.map((p, idx) => (
                <div key={p.id || p.image_path || idx} className='sell-photo-item'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt={`Laptop photo ${idx + 1}`} />
                  {idx === 0 && <span>Cover</span>}
                </div>
              ))}
              {photos.length < 10 && (
                <label className={`sell-photo-add${photos.length === 0 ? ' sell-photo-add-empty' : ''}`}>
                  {photos.length === 0 ? (
                    <>
                      <span className='sell-photo-add-icon'>
                        <UploadCloud size={22} aria-hidden='true' />
                      </span>
                      <strong>{uploadingPhoto ? 'Uploading photos...' : 'Add photos'}</strong>
                      <span>Choose one or more photos</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={24} aria-hidden='true' />
                      <span>{uploadingPhoto ? 'Uploading...' : 'Add photo'}</span>
                    </>
                  )}
                  <input
                    type='file'
                    accept='image/jpeg,image/png,image/webp'
                    multiple
                    onChange={handleAddPhoto}
                    className='sr-only'
                    disabled={uploadingPhoto || photos.length >= 10}
                  />
                </label>
              )}
            </div>
          </section>

          {/* Title & Price */}
          <section className='sell-form-section'>
            <div className='sell-section-heading'>
              <h2>Listing details</h2>
            </div>
            <div className='sell-hint-fields'>
            <div className='sell-hint-field'>
              <Label htmlFor='title'>Listing Title <span className='text-red-500'>*</span></Label>
              <Input
                id='title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. Lenovo ThinkPad T14 Gen 2 i5 16GB/512GB'
              />
            </div>

            <div className='sell-hint-field'>
              <Label htmlFor='price'>Price in PHP (₱) <span className='text-red-500'>*</span></Label>
              <Input
                id='price'
                type='number'
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder='e.g. 25000'
              />
              {/* Suggested Price Card */}
              {loadingPrice && (
                <p className='text-xs text-gray-400'>Calculating fair price suggestion...</p>
              )}
              {priceSuggestion && (
                <div className='rounded-xl border border-lavender-300 bg-lavender-100/60 p-2.5 text-xs text-primary'>
                  <span className='font-semibold'>Suggested Fair Price Range: </span>
                  {formatPrice(priceSuggestion.low)} – {formatPrice(priceSuggestion.high)}
                  <span className='text-gray-500 ml-1'>
                    (Median: {formatPrice(priceSuggestion.median)})
                  </span>
                  <button
                    type='button'
                    onClick={() => setPrice(String(priceSuggestion.median))}
                    className='ml-2 font-medium text-plum-700 underline'
                  >
                    Use median
                  </button>
                </div>
              )}
            </div>
            </div>
          </section>

          {/* Condition Selector & Checklist */}
          <section className='sell-form-section sell-condition-section'>
            <div className='condition-section-header'>
              <div className='sell-section-heading'>
                <h2 id='condition-heading'>Condition <span className='text-red-500'>*</span></h2>
              </div>
              <button
                type='button'
                onClick={() => setShowChecklist(!showChecklist)}
                aria-expanded={showChecklist}
                aria-controls='condition-checklist'
                className='condition-checklist-toggle'
              >
                {showChecklist ? 'Hide condition checklist' : 'Use guided checklist'}
                <Chevron open={showChecklist}><ChevronDown size={14} /></Chevron>
              </button>
            </div>

            <select
              id='condition'
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              aria-labelledby='condition-heading'
              required
              className='condition-select'
            >
              <option value='' disabled>Select condition</option>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <Collapse
              id='condition-checklist'
              open={showChecklist}
              className='condition-checklist'
            >
              <p className='condition-checklist-title'>Guided condition assessment</p>
              <div className='condition-checklist-grid'>
                {CHECKLIST_ITEMS.map((item) => (
                  <div key={item.key} className='condition-checklist-field'>
                    <Label htmlFor={`condition-checklist-${item.key}`}>{item.label}</Label>
                    <select
                      id={`condition-checklist-${item.key}`}
                      value={checklistValues[item.key] || ''}
                      onChange={(e) => updateChecklist(item.key, e.target.value)}
                      className='condition-checklist-select'
                    >
                      <option value=''>Unchecked</option>
                      <option value='good'>Good / Like New</option>
                      <option value='fair'>Fair / Normal Wear</option>
                      <option value='poor'>Poor / Issues</option>
                    </select>
                  </div>
                ))}
              </div>
            </Collapse>
          </section>

          {/* Model & Specs (Autofilled / Editable) */}
          <section className='sell-form-section'>
            <div className='sell-section-heading'>
              <h2>Specs & Hardware Details</h2>
            </div>

            <div className='sell-hint-fields'>
              <div className='sell-hint-field'>
                <Label htmlFor='brand'>Brand <span className='text-red-500'>*</span></Label>
                <Input
                  id='brand'
                  list='brand-options'
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder='Type or select a brand'
                />
                <datalist id='brand-options'>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </datalist>
              </div>

              <div className='sell-hint-field'>
                <Label htmlFor='model'>Model / Series <span className='text-red-500'>*</span></Label>
                <Input
                  id='model'
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder='e.g. Latitude 5420'
                />
              </div>

              <div className='sell-hint-field'>
                <Label htmlFor='cpu'>CPU</Label>
                <Input
                  id='cpu'
                  value={cpu}
                  onChange={(e) => setCpu(e.target.value)}
                  placeholder='e.g. Core i5-1135G7'
                />
              </div>

              <div className='sell-hint-field'>
                <Label htmlFor='gpu'>GPU</Label>
                <Input
                  id='gpu'
                  value={gpu}
                  onChange={(e) => setGpu(e.target.value)}
                  placeholder='e.g. Intel Iris Xe / RTX 3050'
                />
              </div>

              <div className='sell-hint-pair'>
                <div className='sell-hint-field'>
                  <Label htmlFor='ram'>RAM</Label>
                  <Input
                    id='ram'
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    placeholder='8GB, 16GB'
                  />
                </div>
                <div className='sell-hint-field'>
                  <Label htmlFor='storage'>Storage</Label>
                  <Input
                    id='storage'
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    placeholder='256GB, 512GB'
                  />
                </div>
              </div>

              <div className='sell-hint-field'>
                <Label htmlFor='screenSize'>Screen (in)</Label>
                <Input
                  id='screenSize'
                  value={screenSize}
                  onChange={(e) => setScreenSize(e.target.value)}
                  placeholder='14.0'
                />
              </div>
            </div>
          </section>

          {/* Description & Deal Methods */}
          <section className='sell-form-section'>
            <div className='sell-section-heading'>
              <h2>Description & deal methods</h2>
            </div>
            <div className='sell-hint-fields'>
            <div className='sell-hint-field'>
              <Label htmlFor='description'>Description <span className='text-red-500'>*</span></Label>
              <Textarea
                id='description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder='Detailed condition, battery performance, included accessories...'
              />
            </div>

            <div className='deal-methods-field' role='group' aria-labelledby='deal-methods-heading'>
              <div className='deal-methods-heading'>
                <div>
                  <h3 id='deal-methods-heading'>Meetup preferences <span>*</span></h3>
                  <p>
                    Buyers will be able to see your preferences on your listing.{' '}
                    <Link href='/safety'>Learn more</Link>
                  </p>
                </div>
              </div>
              <div className='deal-methods-list'>
                {DEAL_METHODS.map((d) => (
                  <div key={d.value} className='deal-method-option'>
                    <span className='deal-method-icon'>
                      {d.value === 'public_meetup' ? <MapPin size={20} /> : <DoorOpen size={20} />}
                    </span>
                    <div className='deal-method-copy'>
                      <label htmlFor={`deal-method-${d.value}`}>{d.label}</label>
                      <p id={`deal-method-description-${d.value}`}>
                        {d.description}{' '}
                        {d.value === 'public_meetup' && <Link href='/safety'>See safety tips</Link>}
                      </p>
                    </div>
                    <input
                      id={`deal-method-${d.value}`}
                      type='checkbox'
                      checked={dealMethods.includes(d.value)}
                      onChange={() => toggleDealMethod(d.value)}
                      aria-describedby={`deal-method-description-${d.value}`}
                      className='deal-method-checkbox'
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className='sell-hint-field'>
              <LocationAutocomplete
                id='location'
                value={location}
                onChange={(value, selection) => {
                  setLocation(value);
                  setLocationSelection(selection);
                }}
              />
            </div>
            </div>
          </section>
          </div>
        </div>
        <div className='listing-editor-actions listing-edit-actions'>
          <Button asChild size='sm' variant='outline'>
            <Link href='/sell' replace>Previous</Link>
          </Button>
          <Button
            size='sm'
            onClick={initialListing.status === 'draft' || initialListing.status === 'rejected'
              ? publishListing
              : saveDraft}
            disabled={savingDraft || publishing}
          >
            {publishing || savingDraft ? (
              <>
                <Loader2 size={14} className='animate-spin mr-1.5' />
                {publishing ? 'Submitting...' : 'Saving...'}
              </>
            ) : (
              initialListing.status === 'rejected'
                ? 'Resubmit for review'
                : initialListing.status === 'draft'
                  ? 'Submit for review'
                  : 'Save changes'
            )}
          </Button>
        </div>
      </aside>
      <section className={`listing-editor-preview-pane ${mobileTab === 'form' ? 'listing-editor-mobile-hidden' : ''}`}>
        <header className='listing-editor-preview-heading'>
          <div>
            <h2>Preview</h2>
            <p>Updates in real time as you edit.</p>
          </div>
        </header>
        <SellListingPreview
          title={title}
          price={price}
          condition={condition}
          location={location}
          description={description}
          photos={photoUrls}
          sellerName={sellerName}
          sellerAvatarUrl={sellerAvatarUrl}
          specs={[
            { label: 'CPU', value: cpu },
            { label: 'GPU', value: gpu },
            { label: 'RAM', value: ram },
            { label: 'Storage', value: storage },
            { label: 'Screen', value: screenSize ? `${screenSize} in` : '' },
          ]}
        />
        {priceSuggestion && (
          <div className='listing-editor-price-note'>
            <strong>Estimated market price</strong>
            <span>
              {formatPrice(priceSuggestion.low)} – {formatPrice(priceSuggestion.high)}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
