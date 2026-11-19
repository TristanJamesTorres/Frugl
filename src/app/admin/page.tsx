import { Suspense } from 'react';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { AlertTriangle, ExternalLink, FileLines, Flag, Laptop, Users } from '@/components/icons';
import { formatPrice } from '@/lib/constants';
import { getAdminMemberLocations } from '@/lib/admin/member-locations';
import TimeAgo from '@/components/TimeAgo';
import LocationHeatmapPanelLoader from './LocationHeatmapPanelLoader';

type DashboardStat = {
  label: string;
  value: number;
  detail: string;
  href: string;
  Icon: typeof Flag;
  tone: 'report' | 'alert' | 'listing' | 'member';
};

async function AdminDashboardContent() {
  const { supabase } = await requireStaff();

  const [
    openReportsCount,
    chatAlertsCount,
    activeListingsCount,
    pendingListingsCount,
    recentPendingListingsResult,
    membersCount,
    alertsResult,
    memberLocations,
  ] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('chat_alerts').select('id', { count: 'exact', head: true }),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['available', 'reserved'])
      .eq('is_visible', true),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase
      .from('listings')
      .select('id, title, price, created_at, seller:profiles!listings_seller_id_fkey(name)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('chat_alerts')
      .select('id, matched_phrases, created_at, messages(body, sender:profiles!messages_sender_id_fkey(name))')
      .order('created_at', { ascending: false })
      .limit(3),
    getAdminMemberLocations(supabase),
  ]);

  const results = [
    openReportsCount,
    chatAlertsCount,
    activeListingsCount,
    pendingListingsCount,
    recentPendingListingsResult,
    membersCount,
    alertsResult,
  ];
  const failedQuery = results.find((result) => result.error);
  if (failedQuery?.error) {
    throw new Error(`Unable to load admin dashboard: ${failedQuery.error.message}`);
  }

  const stats: DashboardStat[] = [
    {
      label: 'Open reports',
      value: openReportsCount.count ?? 0,
      detail: 'Waiting for review',
      href: '/admin/reports',
      Icon: Flag,
      tone: 'report',
    },
    {
      label: 'Chat alerts',
      value: chatAlertsCount.count ?? 0,
      detail: 'Flagged messages',
      href: '/admin/alerts',
      Icon: AlertTriangle,
      tone: 'alert',
    },
    {
      label: 'Live listings',
      value: activeListingsCount.count ?? 0,
      detail: 'Visible to buyers',
      href: '/admin/listings',
      Icon: Laptop,
      tone: 'listing',
    },
    {
      label: 'Awaiting review',
      value: pendingListingsCount.count ?? 0,
      detail: 'Seller submissions',
      href: '/admin/listings',
      Icon: FileLines,
      tone: 'listing',
    },
    {
      label: 'Marketplace members',
      value: membersCount.count ?? 0,
      detail: 'Registered accounts',
      href: '/admin/users',
      Icon: Users,
      tone: 'member',
    },
  ];

  const alerts = alertsResult.data ?? [];
  const recentPendingListings = recentPendingListingsResult.data ?? [];
  return (
    <>
      <div className='admin-stats-grid' role='list' aria-label='Marketplace summary'>
        {stats.map(({ label, value, detail, href, Icon, tone }) => (
          <Link key={label} href={href} className={`admin-stat-card tone-${tone}`} role='listitem'>
            <span className='admin-stat-summary'>
              <span className='admin-stat-icon'><Icon size={18} /></span>
              <strong>{value.toLocaleString()}</strong>
            </span>
            <span className='admin-stat-label'>{label}</span>
            <span className='admin-stat-detail'>
              <span>{detail}</span>
            </span>
          </Link>
        ))}
      </div>

        <div className='admin-overview-layout'>
          <section className='admin-panel admin-location-panel'>
            <div className='admin-panel-heading'>
              <div>
                <p className='admin-eyebrow'>Marketplace locations</p>
                <h2>Member location map</h2>
                <p className='admin-location-description'>
                  View active buyer accounts and sellers with visible listings grouped by city or region.
                </p>
              </div>
            </div>

            <LocationHeatmapPanelLoader data={memberLocations} />
          </section>

          <div className='admin-overview-side-stack'>
            <section className='admin-panel'>
              <div className='admin-panel-heading'>
                <div>
                  <p className='admin-eyebrow'>Automated checks</p>
                  <h2>Chat alerts</h2>
                </div>
                <Link href='/admin/alerts'>View all <ExternalLink size={14} /></Link>
              </div>

              {alerts.length ? (
                <div className='admin-alert-list'>
                  {alerts.map((alert) => (
                    <article className='admin-alert-row' key={alert.id}>
                      <span className='admin-alert-indicator' />
                      <div className='admin-alert-copy'>
                        <strong>{alert.messages?.[0]?.sender?.[0]?.name || 'Marketplace member'}</strong>
                        <p>{alert.messages?.[0]?.body || 'A message was flagged for review.'}</p>
                        <div className='admin-alert-phrases'>
                          {(alert.matched_phrases ?? []).slice(0, 3).map((phrase: string) => (
                            <span key={phrase}>{phrase}</span>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className='admin-empty-state admin-overview-empty'>
                  <strong>No new alerts</strong>
                  <p>Flagged messages will appear here for staff review.</p>
                </div>
              )}
            </section>

            <section className='admin-panel admin-recent-pending' aria-labelledby='admin-recent-pending-title'>
              <div className='admin-panel-heading'>
                <div>
                  <p className='admin-eyebrow'>Marketplace operations</p>
                  <h2 id='admin-recent-pending-title'>Recent listings awaiting review</h2>
                </div>
                <Link href='/admin/listings'>View all <ExternalLink size={14} /></Link>
              </div>
              {recentPendingListings.length ? (
                <div className='admin-recent-review-list'>
                  {recentPendingListings.map((listing) => (
                    <Link href='/admin/listings' key={listing.id} className='admin-recent-review-link'>
                      <span className='admin-recent-review-icon'><Laptop size={16} /></span>
                      <span className='admin-recent-review-copy'>
                        <strong>{listing.title || 'Untitled listing'}</strong>
                        <span>
                          {listing.seller?.[0]?.name || 'Marketplace member'} · <TimeAgo timestamp={listing.created_at} />
                        </span>
                      </span>
                      <span className='admin-recent-review-price'>{formatPrice(listing.price)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className='admin-empty-state admin-overview-empty'>
                  <strong>No listings awaiting review</strong>
                  <p>New submissions will appear here.</p>
                </div>
              )}
            </section>
          </div>
        </div>
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className='admin-dashboard-content-loading' role='status' aria-label='Loading marketplace overview'>
          <div className='admin-loading-stats' aria-hidden='true'>
            {Array.from({ length: 5 }, (_, index) => (
              <div className='admin-loading-surface' key={index} />
            ))}
          </div>
          <div className='admin-loading-overview-layout' aria-hidden='true'>
            <div className='admin-loading-surface admin-loading-map' />
            <div className='admin-loading-side-stack'>
              <div className='admin-loading-surface' />
              <div className='admin-loading-surface' />
            </div>
          </div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
