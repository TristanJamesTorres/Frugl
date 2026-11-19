import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { CARD_SELECT } from '@/lib/queries';
import { BRANDS, CONDITIONS, RAM_OPTIONS, STORAGE_OPTIONS } from '@/lib/constants';
import { btn, btnOutline, field } from '@/lib/ui';
import ListingCard from '@/components/ListingCard';
import EmptyState from '@/components/EmptyState';
import BrowseIntroShowcase from './BrowseIntroShowcase';
import Stagger from '@/components/motion/Stagger';
import StaggerItem from '@/components/motion/StaggerItem';

const PAGE_SIZE = 12;
const SCREENS: Record<string, [number, number]> = { small: [0, 13.99], '14': [14, 14.99], '15': [15, 15.99], big: [16, 99] };
const SCREEN_OPTIONS = [
  { value: 'small', label: 'Under 14 in' },
  { value: '14', label: '14 in' },
  { value: '15', label: '15 in (15.6)' },
  { value: 'big', label: '16 in and up' },
];
const SORTS = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'nearest', label: 'Nearest (coming soon)', disabled: true },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price: lowest to highest' },
  { value: 'price_desc', label: 'Price: highest to lowest' },
];
const DATE_LISTED_OPTIONS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];
const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
];

type SP = Record<string, string | undefined>;
const opts = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

function Sel({ name, label, value, options, any = true }: { name: string; label: string; value?: string; options: { value: string; label: string; disabled?: boolean }[]; any?: boolean }) {
  return (
    <label className='browse-filter-select-label block text-sm'>
      <span className='browse-filter-caption'>{label}</span>
      <select name={name} defaultValue={value ?? ''} className={field}>
        {any && <option value=''>Any</option>}
        {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const search = new URLSearchParams();
  Object.entries(sp).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const queryString = search.toString();
  const next = '/laptops' + (queryString ? '?' + queryString : '');
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect('/register?next=' + encodeURIComponent(next));
  if (profile?.role === 'admin') redirect('/admin');

  const clean = (v?: string) => (v ?? '').replace(/[%,()]/g, '').trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const requestedSort = sp.sort ?? 'suggested';
  const sort = SORTS.some((option) => !option.disabled && option.value === requestedSort)
    ? requestedSort
    : 'suggested';
  const availability = sp.availability === 'sold' ? 'sold' : 'available';
  const now = new Date().getTime();

  let query = supabase
    .from('listings')
    .select(CARD_SELECT, { count: 'exact' })
    .eq('status', availability)
    .eq('is_visible', true);

  const q = clean(sp.q);
  if (q) query = query.or('title.ilike.%' + q + '%,brand.ilike.%' + q + '%,model.ilike.%' + q + '%');
  if (sp.brand) query = query.eq('brand', sp.brand);
  if (clean(sp.cpu)) query = query.ilike('cpu', '%' + clean(sp.cpu) + '%');
  if (clean(sp.gpu)) query = query.ilike('gpu', '%' + clean(sp.gpu) + '%');
  if (sp.ram) query = query.eq('ram', sp.ram);
  if (sp.storage) query = query.eq('storage', sp.storage);
  if (sp.screen && SCREENS[sp.screen]) query = query.gte('screen_size', SCREENS[sp.screen][0]).lte('screen_size', SCREENS[sp.screen][1]);
  if (sp.condition) query = query.eq('condition', sp.condition);
  if (sp.dateListed === '24h') query = query.gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString());
  else if (sp.dateListed === '7d') query = query.gte('created_at', new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString());
  else if (sp.dateListed === '30d') query = query.gte('created_at', new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (sp.min && Number.isFinite(Number(sp.min))) query = query.gte('price', Number(sp.min));
  if (sp.max && Number.isFinite(Number(sp.max))) query = query.lte('price', Number(sp.max));

  if (sort === 'price_asc') query = query.order('price', { ascending: true });
  else if (sort === 'price_desc') query = query.order('price', { ascending: false });
  else if (sort === 'oldest') query = query.order('created_at', { ascending: true });
  else if (sort === 'suggested') query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const savedIds = new Set<string>();
  if (data?.length) {
    const { data: savedRows, error: savedError } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', user.id)
      .in('listing_id', data.map((listing) => listing.id));
    if (savedError) throw new Error('Could not load saved status for listings: ' + savedError.message);
    for (const row of savedRows ?? []) savedIds.add(row.listing_id);
  }
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const heroListings = data ?? [];

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => v && params.set(k, v));
    params.set('page', String(p));
    return '/laptops?' + params.toString();
  };

  return (
    <div className='browse-page'>
      <header className='browse-intro'>
        <div className='browse-intro-copy'>
          <p className='browse-eyebrow'><span /> Browse the marketplace</p>
          <h1>Find your next <span>laptop.</span></h1>
          <p className='browse-intro-description'>
            Compare real listings by specs, condition, and price to find a laptop that fits your day.
          </p>
          <div className='browse-intro-highlights' aria-label='Marketplace details'>
            <span>Processor &amp; memory</span>
            <span>Seller-set prices</span>
            <span>Local listings</span>
          </div>
        </div>
        <BrowseIntroShowcase listings={heroListings} />
      </header>

      <div className='browse-layout'>
        <aside className='browse-filter-sidebar'>
          <form method='get' className='browse-filters'>
            <h2 className='browse-filters-heading'>Filters</h2>
            {sp.q && <input type='hidden' name='q' value={sp.q} />}
            <Sel name='sort' label='Sort by' value={sort} options={SORTS} any={false} />
            <fieldset className='browse-filter-group'>
              <legend>Price range</legend>
              <div className='grid grid-cols-2 gap-2'>
                <label className='block text-sm'>
                  <span className='browse-filter-caption'>Min</span>
                  <input name='min' type='number' min='0' defaultValue={sp.min ?? ''} className={field} />
                </label>
                <label className='block text-sm'>
                  <span className='browse-filter-caption'>Max</span>
                  <input name='max' type='number' min='0' defaultValue={sp.max ?? ''} className={field} />
                </label>
              </div>
            </fieldset>
            <Sel name='condition' label='Condition' value={sp.condition} options={CONDITIONS} />
            <Sel name='dateListed' label='Date listed' value={sp.dateListed} options={DATE_LISTED_OPTIONS} />
            <Sel name='availability' label='Availability' value={availability} options={AVAILABILITY_OPTIONS} any={false} />
            <div className='browse-filter-group'>
              <h3>Specs</h3>
              <div className='mt-3 space-y-3'>
                <Sel name='brand' label='Brand' value={sp.brand} options={opts(BRANDS)} />
                <label className='block text-sm'>
                  <span className='browse-filter-caption'>CPU</span>
                  <input name='cpu' defaultValue={sp.cpu ?? ''} placeholder='e.g. Core i5, Ryzen 7' className={field} />
                </label>
                <label className='block text-sm'>
                  <span className='browse-filter-caption'>GPU</span>
                  <input name='gpu' defaultValue={sp.gpu ?? ''} placeholder='e.g. RTX 4060, Radeon' className={field} />
                </label>
                <Sel name='ram' label='RAM' value={sp.ram} options={opts(RAM_OPTIONS)} />
                <Sel name='storage' label='Storage' value={sp.storage} options={opts(STORAGE_OPTIONS)} />
                <Sel name='screen' label='Screen size' value={sp.screen} options={SCREEN_OPTIONS} />
              </div>
            </div>
            <div className='flex gap-2'>
              <button className={btn}>Apply filters</button>
              <Link href='/laptops' className={btnOutline}>Clear</Link>
            </div>
          </form>
        </aside>

        <section className='browse-results'>
          <div className='browse-results-heading'>
            <div>
              <h2>{availability === 'sold' ? 'Sold laptops' : 'Available laptops'}</h2>
              <p>{count ?? 0} laptop{count === 1 ? '' : 's'} found</p>
            </div>
          </div>
          {data && data.length > 0 ? (
            <Stagger className='grid grid-cols-2 gap-4 lg:grid-cols-3'>
              {data.map((l: any, index) => (
                index < 4 ? (
                  <ListingCard key={l.id} listing={l} initialSaved={savedIds.has(l.id)} />
                ) : (
                  <StaggerItem key={l.id} index={index - 4}>
                    <ListingCard listing={l} initialSaved={savedIds.has(l.id)} />
                  </StaggerItem>
                )
              ))}
            </Stagger>
          ) : (
            <EmptyState title='No laptops match your filters' hint='Try removing a filter.' href='/laptops' action='Clear filters' />
          )}
          {pages > 1 && (
            <div className='mt-6 flex items-center justify-center gap-4 text-sm'>
              {page > 1 && <Link href={pageHref(page - 1)} className='underline'>Previous</Link>}
              <span>Page {page} of {pages}</span>
              {page < pages && <Link href={pageHref(page + 1)} className='underline'>Next</Link>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
