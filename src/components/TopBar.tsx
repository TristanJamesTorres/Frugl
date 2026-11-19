import Link from 'next/link';
import { connection } from 'next/server';
import { getSessionProfile, isStaff } from '@/lib/auth';
import HeaderSearch from '@/components/HeaderSearch';
import HeaderNavIcons from '@/components/HeaderNavIcons';
import AuthModalLink from '@/components/AuthModalLink';
import ProfileMenu from '@/components/ProfileMenu';
import type { NotificationItem } from '@/components/NotificationBell';

const navLinkClasses =
  'inline-flex min-h-12 items-center rounded-full px-[0.65rem] text-plum-900 transition-[background-color,box-shadow,color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-lavender-100 hover:text-plum-900 hover:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)] focus-visible:bg-lavender-100 focus-visible:text-plum-900 focus-visible:shadow-[0_5px_14px_rgb(24_13_38_/_0.18)]';
export default async function TopBar() {
  await connection();
  const { supabase, user, profile } = await getSessionProfile();
  const isAdmin = profile?.role === 'admin';
  const canBrowse = Boolean(user && !isAdmin);
  let unread = 0;
  let unreadMessages = 0;
  let recentNotifications: NotificationItem[] = [];
  let notificationsLoadError = false;
  let unreadPublishedListings = 0;
  let savedIds: string[] = [];
  if (user && profile?.role !== 'admin') {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('type', 'listing_published')
      .is('read_at', null);
    unread = count ?? 0;

    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, type, payload, created_at, read_at')
      .eq('user_id', user.id)
      .neq('type', 'listing_published')
      .order('created_at', { ascending: false })
      .limit(8);
    if (notificationsError) {
      console.error('Could not load recent notifications:', notificationsError.message);
      notificationsLoadError = true;
    } else {
      recentNotifications = notifications ?? [];
    }

    const { count: unreadMessageCount, error: unreadMessageError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', user.id)
      .is('read_at', null);
    if (unreadMessageError) {
      console.error('Could not load unread message count:', unreadMessageError.message);
    }
    unreadMessages = unreadMessageCount ?? 0;

    const { count: publishedCount, error: publishedCountError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'listing_published')
      .is('read_at', null);
    if (publishedCountError) {
      console.error('Could not load published listing notification count:', publishedCountError.message);
    }
    unreadPublishedListings = publishedCount ?? 0;

    const { data: savedListings, error: savedListingsError } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', user.id);
    if (savedListingsError) console.error('Could not load saved listings:', savedListingsError.message);
    savedIds = (savedListings ?? []).map(({ listing_id }) => listing_id);
  }

  return (
    <>
      <header className='sticky top-0 z-20 bg-transparent px-4 pt-3 text-foreground [--header-gap:0.75rem] max-md:px-2.5 max-md:pt-2 max-md:[--header-gap:0.55rem]'>
        <div className='mx-auto flex min-h-[4.5rem] w-full max-w-[80rem] items-center gap-[var(--header-gap)] rounded-[1.25rem] border border-lavender-300 bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-5 shadow-[0_10px_28px_rgb(24_13_38_/_0.07)] backdrop-blur-[14px] transition-shadow duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] max-md:min-h-0 max-md:flex-wrap max-md:rounded-2xl max-md:px-3 max-md:py-[0.55rem]'>
          <Link href={isAdmin ? '/admin' : '/'} className='shrink-0 font-heading text-[1.35rem] tracking-[-0.04em] text-primary! max-md:text-[1.05rem]'>Frugl</Link>
          {canBrowse && <HeaderSearch />}
          <nav className='ml-auto flex items-center gap-[0.35rem] text-sm max-md:w-auto max-md:justify-end max-md:text-[0.8rem]' aria-label='Main navigation'>
            {canBrowse && (
              <Link href='/laptops' className={`${navLinkClasses} max-md:hidden md:max-[1000px]:hidden`}>Browse</Link>
            )}
            {profile?.role !== 'admin' && <Link href='/sell' className='button-primary inline-flex min-h-12 items-center justify-center whitespace-nowrap px-[0.85rem] py-[0.7rem] font-semibold max-md:px-3'>Sell a laptop</Link>}
            {user ? (
              <>
                {profile?.role !== 'admin' && (
                  <HeaderNavIcons
                    key={user.id}
                    userId={user.id}
                    initialUnread={unread}
                    initialNotifications={recentNotifications}
                    initialLoadError={notificationsLoadError}
                    initialUnreadMessages={unreadMessages}
                    initialSavedIds={savedIds}
                  />
                )}
                <ProfileMenu
                  userId={user.id}
                  name={profile?.name ?? null}
                  avatarUrl={profile?.avatar_url ?? null}
                  email={user.email}
                  isAdmin={profile?.role === 'admin'}
                  canAccessAdmin={isStaff(profile)}
                  unreadPublishedListings={unreadPublishedListings}
                />
              </>
            ) : (
              <>
                <AuthModalLink mode='login' className={navLinkClasses}>Sign in</AuthModalLink>
                <AuthModalLink mode='register' className={`${navLinkClasses} font-semibold`}>Sign up</AuthModalLink>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
