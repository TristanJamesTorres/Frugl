'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Gear,
  Laptop,
  Shield,
  SignOut,
  Tag,
  User,
} from '@/components/icons';
import Chevron from '@/components/motion/Chevron';
import Popover from '@/components/motion/Popover';

const linkClasses =
  'group flex min-h-[2.75rem] w-full items-center gap-3 px-[1.1rem] py-[0.65rem] text-left text-[0.9rem] text-foreground transition-[background-color,color] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-lavender-100';
const contentClasses =
  'inline-flex items-center gap-3 transition-[translate] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:translate-x-0!';
const iconClasses =
  'shrink-0 text-plum-700 transition-colors duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-primary-container';

export default function ProfileMenu({
  userId,
  name,
  avatarUrl,
  email,
  isAdmin,
  canAccessAdmin,
  unreadPublishedListings,
}: {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  email: string | undefined;
  isAdmin: boolean;
  canAccessAdmin: boolean;
  unreadPublishedListings: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initial = name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className='relative' ref={anchorRef}>
      <button
        type='button'
        aria-label={unreadPublishedListings
          ? `Open profile menu, ${unreadPublishedListings} new Manage Listings notification${unreadPublishedListings === 1 ? '' : 's'}`
          : 'Open profile menu'}
        aria-expanded={isOpen}
        aria-controls={menuId}
        className='group/summary flex min-h-[3.2rem] max-w-[15rem] items-center gap-2 rounded-full border border-lavender-300 bg-surface py-1 pl-[0.35rem] pr-[0.8rem] text-plum-900 transition-[border-color,box-shadow] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-plum-700 hover:shadow-[0_0_0_3px_rgb(67_54_79_/_0.12)] focus-visible:border-plum-700 focus-visible:shadow-[0_0_0_3px_rgb(67_54_79_/_0.12)]'
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className='relative inline-flex size-[2.3rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed font-semibold text-primary-container'>
          {avatarUrl && failedAvatarUrl !== avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=''
              className='size-full object-cover'
              onError={() => setFailedAvatarUrl(avatarUrl)}
            />
          ) : (
            initial
          )}
          {unreadPublishedListings > 0 && (
            <span className='absolute -right-[0.55rem] -top-[0.45rem] z-[1] inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-[0.2rem] text-center text-[0.68rem] font-semibold leading-none text-destructive-foreground' aria-hidden='true'>
              {unreadPublishedListings > 99 ? '99+' : unreadPublishedListings}
            </span>
          )}
        </span>
        <span className='max-w-[8.5rem] truncate max-md:hidden md:max-[1000px]:hidden'>
          {name?.trim().split(/\s+/)[0] || 'Profile'}
        </span>
        <Chevron open={isOpen} className='text-plum-700 transition-colors duration-[260ms] group-hover/summary:text-primary-container'>
          <ChevronDown size={14} />
        </Chevron>
      </button>

      <Popover
        open={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={anchorRef}
        id={menuId}
        ariaLabel='Profile menu'
        className='absolute right-0 top-[calc(100%+0.55rem)] z-30 w-72 overflow-hidden rounded-2xl border border-lavender-300 bg-surface text-foreground shadow-[0_16px_38px_rgb(24_13_38_/_0.12)]'
      >
        <div className='grid gap-1 border-b border-lavender-300 px-[1.1rem] pb-[0.9rem] pt-4'>
          <strong className='text-[0.98rem] font-semibold text-plum-900'>{name ?? 'Your account'}</strong>
          {email && <span className='truncate text-[0.8rem] text-plum-700'>{email}</span>}
        </div>
        {!isAdmin && (
          <div className='grid py-[0.35rem]'>
            <Link href={`/sellers/${userId}`} onClick={() => setIsOpen(false)} className={linkClasses}>
              <span className={contentClasses}><User size={17} variant='solid' className={iconClasses} />My Profile</span>
            </Link>
            <Link
              href='/dashboard'
              onClick={() => setIsOpen(false)}
              className={linkClasses}
              aria-label={unreadPublishedListings
                ? `Manage Listings, ${unreadPublishedListings} new published listing notification${unreadPublishedListings === 1 ? '' : 's'}`
                : 'Manage Listings'}
            >
              <span className={contentClasses}>
                <span className='relative inline-flex shrink-0'>
                  <Laptop size={17} className={iconClasses} />
                  {unreadPublishedListings > 0 && (
                    <span className='absolute -right-[0.55rem] -top-[0.45rem] z-[1] inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-[0.2rem] text-center text-[0.68rem] font-semibold leading-none text-destructive-foreground' aria-hidden='true'>
                      {unreadPublishedListings > 99 ? '99+' : unreadPublishedListings}
                    </span>
                  )}
                </span>
                Manage Listings
              </span>
            </Link>
            <Link href='/account' onClick={() => setIsOpen(false)} className={linkClasses}>
              <span className={contentClasses}><Gear size={17} className={iconClasses} />Settings</span>
            </Link>
            <Link href='/offers' onClick={() => setIsOpen(false)} className={linkClasses}>
              <span className={contentClasses}><Tag size={17} className={iconClasses} />Offers</span>
            </Link>
            {canAccessAdmin && (
              <Link href='/admin' onClick={() => setIsOpen(false)} className={linkClasses}>
                <span className={contentClasses}><Shield size={17} className={iconClasses} />Admin</span>
              </Link>
            )}
          </div>
        )}
        <form action='/auth/signout' method='post' className='border-t border-lavender-300 py-[0.35rem]'>
          <button type='submit' className={`${linkClasses} profile-menu-signout text-destructive hover:text-destructive`}>
            <span className={contentClasses}><SignOut size={17} className='shrink-0 text-destructive' />Sign out</span>
          </button>
        </form>
      </Popover>
    </div>
  );
}
