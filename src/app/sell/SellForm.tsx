'use client';

import { useEffect, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, UploadCloud, X, AlertCircle, CheckCircle2 } from '@/components/icons';
import { resizeImage } from '@/lib/client-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BRANDS } from '@/lib/constants';
import SellListingPreview from '@/components/SellListingPreview';

interface PhotoItem {
  file: File;
  previewUrl: string;
}

interface Props {
  sellerName: string;
  location: string;
}

const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function SellForm({ sellerName, location }: Props) {
  const router = useRouter();

  // Photo states
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [sticker, setSticker] = useState<PhotoItem | null>(null);

  // Optional seller hints
  const [brand, setBrand] = useState('');
  const [series, setSeries] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseYear, setPurchaseYear] = useState('');
  const [cpu, setCpu] = useState('');
  const [gpu, setGpu] = useState('');
  const [ram, setRam] = useState('');
  const [storage, setStorage] = useState('');
  const [notes, setNotes] = useState('');

  // Optional image hints
  const [systemInfoImage, setSystemInfoImage] = useState<File | null>(null);
  const [receiptOrBoxImage, setReceiptOrBoxImage] = useState<File | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [isPhotoDragOver, setIsPhotoDragOver] = useState(false);

  useEffect(() => {
    if (!loading) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((elapsed) => elapsed + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  async function addPhotos(incoming: File[]) {
    if (incoming.length === 0) return;
    if (incoming.some((file) => !PHOTO_TYPES.has(file.type))) {
      setError('Use JPG, PNG, or WebP images for laptop photos.');
      return;
    }

    const availableSlots = 10 - photos.length;
    if (availableSlots <= 0) {
      setError('You can upload a maximum of 10 photos.');
      return;
    }

    setError('');
    const toProcess = incoming.slice(0, availableSlots);
    const newItems: PhotoItem[] = [];

    for (const f of toProcess) {
      try {
        const resized = await resizeImage(f, 1280, 0.85);
        newItems.push({
          file: resized,
          previewUrl: URL.createObjectURL(resized),
        });
      } catch {
        newItems.push({
          file: f,
          previewUrl: URL.createObjectURL(f),
        });
      }
    }

    setPhotos((prev) => [...prev, ...newItems]);
  }

  function handlePhotosAdd(e: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.currentTarget.files ?? []);
    e.target.value = '';
    void addPhotos(incoming);
  }

  function handlePhotoDragOver(e: DragEvent<HTMLDivElement>) {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsPhotoDragOver(true);
  }

  function handlePhotoDragLeave(e: DragEvent<HTMLDivElement>) {
    const nextTarget = e.relatedTarget;
    if (nextTarget instanceof Node && e.currentTarget.contains(nextTarget)) return;
    setIsPhotoDragOver(false);
  }

  function handlePhotoDrop(e: DragEvent<HTMLDivElement>) {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    setIsPhotoDragOver(false);
    void addPhotos(Array.from(e.dataTransfer.files));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  }

  // Handle sticker photo
  async function handleStickerChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];
    try {
      const resized = await resizeImage(f, 1280, 0.9);
      if (sticker) URL.revokeObjectURL(sticker.previewUrl);
      setSticker({ file: resized, previewUrl: URL.createObjectURL(resized) });
    } catch {
      setSticker({ file: f, previewUrl: URL.createObjectURL(f) });
    }
  }

  // Form submit -> /api/identify -> /sell/[id]
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (photos.length === 0 && !sticker) {
      setError('Please add at least one photo of the laptop to identify it.');
      return;
    }

    setLoading(true);
    setAnalysisComplete(false);
    setElapsedSeconds(0);
    setError('');
    setStatusMessage('Uploading and analyzing photos with AI assistant...');

    try {
      const formData = new FormData();
      photos.forEach((p) => formData.append('photos', p.file));
      if (sticker) formData.append('sticker', sticker.file);

      // Add hints if provided
      if (brand) formData.append('brand', brand);
      if (series) formData.append('series', series);
      if (modelNumber) formData.append('modelNumber', modelNumber);
      if (serialNumber) formData.append('serialNumber', serialNumber);
      if (purchaseYear) formData.append('purchaseYear', purchaseYear);
      if (cpu) formData.append('cpu', cpu);
      if (gpu) formData.append('gpu', gpu);
      if (ram) formData.append('ram', ram);
      if (storage) formData.append('storage', storage);
      if (notes) formData.append('notes', notes);

      if (systemInfoImage) formData.append('systemInfoImage', systemInfoImage);
      if (receiptOrBoxImage) formData.append('receiptOrBoxImage', receiptOrBoxImage);

      const res = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to identify laptop and create draft.');
      }

      setAnalysisComplete(true);
      setStatusMessage('Analysis complete. Opening your draft...');
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      router.push(`/sell/${data.draftListingId}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during identification.');
      setLoading(false);
      setStatusMessage('');
      setAnalysisComplete(false);
    }
  }

  // Skip AI manual entry option
  async function handleSkipAI() {
    setLoading(true);
    setAnalysisComplete(false);
    setElapsedSeconds(0);
    setError('');
    setStatusMessage('Creating your draft...');
    try {
      const res = await fetch('/api/listings', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create blank draft.');
      setAnalysisComplete(true);
      setStatusMessage('Draft ready. Opening it now...');
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      router.push(`/sell/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not create listing.');
      setLoading(false);
      setStatusMessage('');
      setAnalysisComplete(false);
    }
  }

  const previewTitle = [brand, series, modelNumber].filter(Boolean).join(' ');

  return (
    <div className='listing-editor-shell sell-listing-editor'>
      <aside className='listing-editor-sidebar'>
        <header className='listing-editor-sidebar-header'>
          <div>
            <p className='listing-editor-kicker'>Marketplace</p>
            <h1 className='text-2xl font-bold tracking-tight text-gray-900'>Sell a laptop</h1>
          </div>
          <div className='listing-editor-header-actions'>
            <button
              type='button'
              onClick={() => setMobileTab(mobileTab === 'form' ? 'preview' : 'form')}
              className='listing-editor-mobile-toggle'
            >
              {mobileTab === 'form' ? 'View preview' : 'Back to form'}
            </button>
            <button
              type='button'
              onClick={handleSkipAI}
              disabled={loading}
              className='sell-skip-button'
            >
              Skip AI
            </button>
          </div>
        </header>
        <form onSubmit={handleSubmit} className='listing-editor-form'>
          <div className={`listing-editor-fields ${mobileTab === 'preview' ? 'listing-editor-mobile-hidden' : ''}`}>
            <p className='sell-editor-intro'>
              Add photos and optional details. We’ll use them to identify your laptop and prepare a draft.
            </p>

            {error && (
              <div className='mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                <AlertCircle size={18} className='shrink-0' />
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div
                role='status'
                aria-live='polite'
                aria-busy={!analysisComplete}
                className='mb-4 flex items-start gap-3 rounded-xl border border-lavender-300 bg-lavender-100 p-4 text-sm text-primary'
              >
                {analysisComplete
                  ? <CheckCircle2 size={18} className='mt-0.5 shrink-0 text-green-700' />
                  : <span className='sell-loading-spinner mt-0.5' aria-hidden='true' />}
                <div className='min-w-0 flex-1'>
                  <p>{statusMessage || 'Processing...'}</p>
                  {!analysisComplete && (
                    <p className='mt-1 text-xs text-primary/70'>
                      Still working · {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')} elapsed. Keep this page open.
                    </p>
                  )}
                </div>
              </div>
            )}

            <section className='sell-form-section sell-photo-section'>
              <div className='sell-section-heading'>
                <h2>
                  <Camera size={20} aria-hidden='true' />
                  <span>1. Laptop photos <span className='sell-section-count'>{photos.length} / 10</span></span>
                </h2>
                <p>
                  Add up to 10 clear photos of the lid, keyboard, screen and ports. The first photo is your cover.
                </p>
              </div>

              <div
                className={`sell-photo-grid${isPhotoDragOver ? ' is-drag-over' : ''}`}
                onDragOver={handlePhotoDragOver}
                onDragLeave={handlePhotoDragLeave}
                onDrop={handlePhotoDrop}
              >
                {photos.length === 0 ? (
                  <label className='sell-photo-add sell-photo-add-empty'>
                    <span className='sell-photo-add-icon'>
                      <UploadCloud size={22} aria-hidden='true' />
                    </span>
                    <strong>Add photos</strong>
                    <span>or drag and drop</span>
                    <input
                      type='file'
                      accept='image/jpeg,image/png,image/webp'
                      multiple
                      onChange={handlePhotosAdd}
                      className='sr-only'
                      disabled={loading}
                    />
                  </label>
                ) : (
                  <>
                    {photos.map((item, idx) => (
                      <div key={idx} className='sell-photo-item'>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.previewUrl} alt={`Laptop photo ${idx + 1}`} />
                        {idx === 0 && <span>Cover</span>}
                        <button
                          type='button'
                          onClick={() => removePhoto(idx)}
                          aria-label={`Remove photo ${idx + 1}`}
                          className='sell-photo-remove'
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {photos.length < 10 && (
                      <label className='sell-photo-add'>
                        <UploadCloud size={24} aria-hidden='true' />
                        <span>Add photo</span>
                        <input
                          type='file'
                          accept='image/jpeg,image/png,image/webp'
                          multiple
                          onChange={handlePhotosAdd}
                          className='sr-only'
                          disabled={loading}
                        />
                      </label>
                    )}
                  </>
                )}
              </div>

              <div className='sell-photo-tip'>
                <Camera size={18} aria-hidden='true' />
                <p>More clear photos help buyers assess the laptop and its condition.</p>
              </div>

              <div className='sell-sticker-upload'>
                <div>
                  <h3>Underside / model sticker photo <span>Recommended</span></h3>
                  <p>A clear shot of the model sticker or barcode helps identify the exact model.</p>
                </div>
                {sticker ? (
                  <div className='sell-sticker-preview'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sticker.previewUrl} alt='Laptop model sticker' />
                    <button
                      type='button'
                      aria-label='Remove sticker photo'
                      onClick={() => {
                        URL.revokeObjectURL(sticker.previewUrl);
                        setSticker(null);
                      }}
                      className='sell-photo-remove'
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className='sell-sticker-add'>
                    <Camera size={16} aria-hidden='true' />
                    <span>Add sticker photo</span>
                    <input
                      type='file'
                      accept='image/jpeg,image/png,image/webp'
                      onChange={handleStickerChange}
                      className='sr-only'
                      disabled={loading}
                    />
                  </label>
                )}
              </div>
            </section>

            <section className='sell-form-section sell-hints-section'>
              <div className='sell-section-heading'>
                <h2>2. Optional descriptive details</h2>
                <p>All fields are optional. Adding details helps verify the model and narrow down exact variants.</p>
              </div>

              <div className='sell-hint-fields'>
                <div className='sell-hint-field'>
                  <Label htmlFor='brand'>Brand</Label>
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
                  <Label htmlFor='modelNumber'>Model / part number</Label>
                  <Input
                    id='modelNumber'
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    placeholder='e.g. 15ITL6, A2337'
                  />
                </div>

                <div className='sell-hint-field'>
                  <Label htmlFor='series'>Series</Label>
                  <Input
                    id='series'
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    placeholder='e.g. ThinkPad T14, XPS 13'
                  />
                </div>

                <div className='sell-hint-field'>
                  <Label htmlFor='serialNumber'>Serial number</Label>
                  <Input
                    id='serialNumber'
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder='Underside barcode serial'
                  />
                </div>

                <div className='sell-hint-field'>
                  <Label htmlFor='cpu'>Processor / CPU</Label>
                  <Input
                    id='cpu'
                    value={cpu}
                    onChange={(e) => setCpu(e.target.value)}
                    placeholder='e.g. Intel Core i5-1135G7, M1'
                  />
                </div>

                <div className='sell-hint-field'>
                  <Label htmlFor='gpu'>GPU</Label>
                  <Input
                    id='gpu'
                    value={gpu}
                    onChange={(e) => setGpu(e.target.value)}
                    placeholder='e.g. Intel Iris Xe, RTX 3050'
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
                  <Label htmlFor='purchaseYear'>Year of purchase</Label>
                  <Input
                    id='purchaseYear'
                    type='number'
                    value={purchaseYear}
                    onChange={(e) => setPurchaseYear(e.target.value)}
                    placeholder='e.g. 2022'
                  />
                </div>

                <div className='sell-hint-field'>
                  <Label htmlFor='notes'>Notes / accessories / condition comments</Label>
                  <Textarea
                    id='notes'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder='e.g. Includes charger, upgraded RAM or cosmetic wear'
                    rows={3}
                  />
                </div>

                <div className='sell-hint-uploads'>
                  <label className='sell-hint-file'>
                    <span>System info screenshot <span>(Optional)</span></span>
                    <span className='sell-hint-file-control'>
                      <UploadCloud size={16} aria-hidden='true' />
                      <span className='sell-hint-file-name'>{systemInfoImage?.name || 'Choose image'}</span>
                    </span>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={(e) => setSystemInfoImage(e.target.files?.[0] || null)}
                      className='sr-only'
                    />
                  </label>
                  <label className='sell-hint-file'>
                    <span>Receipt / box photo <span>(Optional)</span></span>
                    <span className='sell-hint-file-control'>
                      <UploadCloud size={16} aria-hidden='true' />
                      <span className='sell-hint-file-name'>{receiptOrBoxImage?.name || 'Choose image'}</span>
                    </span>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={(e) => setReceiptOrBoxImage(e.target.files?.[0] || null)}
                      className='sr-only'
                    />
                  </label>
                </div>
              </div>
            </section>

          </div>
          <div className='listing-editor-actions sell-submit-row'>
            <p className='text-xs text-gray-500'>
              Next step: Review the suggested details before publishing.
            </p>
            <Button
              type='submit'
              size='lg'
              disabled={loading}
              className='min-w-[160px]'
            >
              {loading ? (
                <>
                  {analysisComplete
                    ? <CheckCircle2 size={16} className='mr-2' />
                    : <span className='sell-loading-spinner sell-loading-spinner-small mr-2 text-primary' aria-hidden='true' />}
                  {analysisComplete ? 'Opening draft...' : 'Analyzing...'}
                </>
              ) : (
                'Continue to draft'
              )}
            </Button>
          </div>
        </form>
      </aside>
      <section className={`listing-editor-preview-pane ${mobileTab === 'form' ? 'listing-editor-mobile-hidden' : ''}`}>
        <header className='listing-editor-preview-heading'>
          <div>
            <h2>Preview</h2>
            <p>As you add photos and details, your preview updates.</p>
          </div>
        </header>
        <SellListingPreview
          title={previewTitle}
          description={notes}
          location={location}
          photos={photos.map((photo) => photo.previewUrl)}
          sellerName={sellerName}
          specs={[
            { label: 'CPU', value: cpu },
            { label: 'GPU', value: gpu },
            { label: 'RAM', value: ram },
            { label: 'Storage', value: storage },
          ]}
        />
      </section>
    </div>
  );
}
