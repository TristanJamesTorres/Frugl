'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import LocationAutocomplete, { type LocationSelection } from '@/components/LocationAutocomplete';
import {
  isValidLocationCoordinates,
  isValidLocationLabel,
  LOCATION_LABEL_MAX_LENGTH,
} from '@/lib/location-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Gear,
  ShieldCheck,
  UploadCloud,
  User as UserIcon,
} from '@/components/icons';
import Chevron from '@/components/motion/Chevron';
import Collapse from '@/components/motion/Collapse';
import Toast from '@/components/motion/Toast';
import Banner from '@/components/motion/Banner';

interface AccountProfile {
  name: string | null;
  avatar_url: string | null;
  default_location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  public_contact_email: string | null;
  region: string | null;
  city: string | null;
  bio: string | null;
}

interface Props {
  user: Pick<User, 'id' | 'email'>;
  profile: AccountProfile;
  contactNumber: string;
  requiresPasswordForDeletion: boolean;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function AccountForm({ user, profile, contactNumber, requiresPasswordForDeletion }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const publicEmailInputRef = useRef<HTMLInputElement>(null);

  const initialLocation =
    profile.default_location ||
    [profile.city, profile.region].filter(Boolean).join(', ');
  const [name, setName] = useState(profile.name || '');
  const [location, setLocation] = useState(initialLocation);
  const [locationSelection, setLocationSelection] = useState<LocationSelection | null>(() => {
    const lat = profile.location_lat;
    const lng = profile.location_lng;
    const hasCoordinates =
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      isValidLocationCoordinates(lat, lng);
    const label = profile.location_label || (hasCoordinates ? initialLocation : '');
    return label || hasCoordinates
      ? { label, lat: hasCoordinates ? lat : null, lng: hasCoordinates ? lng : null }
      : null;
  });
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [publicContactEmail, setPublicContactEmail] = useState(profile.public_contact_email || '');
  const [contact, setContact] = useState(contactNumber);
  const [email, setEmail] = useState(user.email || '');
  const [pendingEmail, setPendingEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [accountDetailsOpen, setAccountDetailsOpen] = useState(true);
  const [contactDetailsOpen, setContactDetailsOpen] = useState(true);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Display name is required.');
      return;
    }
    if (publicContactEmail.trim() && !publicEmailInputRef.current?.checkValidity()) {
      publicEmailInputRef.current?.reportValidity();
      return;
    }
    const cleanLocation = location.trim();
    const locationParts = cleanLocation.split(',').map((part) => part.trim());
    const cleanCity = locationParts[0] || '';
    const cleanRegion = locationParts.slice(1).filter(Boolean).join(', ');
    const locationLat = locationSelection?.lat ?? null;
    const locationLng = locationSelection?.lng ?? null;
    const locationLabel = locationSelection?.label || null;
    if (
      cleanLocation.length > LOCATION_LABEL_MAX_LENGTH ||
      !isValidLocationCoordinates(locationLat, locationLng) ||
      !isValidLocationLabel(locationLabel)
    ) {
      setErrorMessage(`Enter a valid location with a label no longer than ${LOCATION_LABEL_MAX_LENGTH} characters.`);
      return;
    }
    setProfileBusy(true);
    setErrorMessage('');
    setToastMessage('');

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          city: cleanCity || null,
          region: cleanRegion || null,
          bio: bio.trim() || null,
          default_location: cleanLocation || null,
          location_lat: locationLat,
          location_lng: locationLng,
          location_label: locationLabel,
          public_contact_email: publicContactEmail.trim() || null,
        })
        .eq('id', user.id);

      if (profileError) {
        const missingProfileColumn =
          ['42703', 'PGRST204'].includes(profileError.code) &&
          /profiles/i.test(profileError.message) &&
          /\b(bio|city|region|location_(lat|lng|label))\b/i.test(profileError.message);
        if (missingProfileColumn) {
          throw new Error(
            "Account settings could not be saved because the Supabase profile schema is out of date. Run supabase/12_public_profile_details.sql and supabase/14_location_coordinates.sql in the Supabase SQL Editor, then run NOTIFY pgrst, 'reload schema'; and try again.",
          );
        }
        throw new Error(profileError.message);
      }

      const privateResponse = await fetch('/api/account/private-contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactNumber: contact }),
      });
      const privateResult: unknown = await privateResponse.json();
      const privateError =
        typeof privateResult === 'object' &&
        privateResult !== null &&
        'error' in privateResult &&
        typeof privateResult.error === 'string'
          ? privateResult.error
          : 'Could not save your private contact number.';
      if (!privateResponse.ok) throw new Error(privateError);

      setToastMessage('Changes have been saved');
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleEmailUpdate() {
    if (!emailInputRef.current?.reportValidity()) return;
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || nextEmail === user.email?.toLowerCase()) return;

    setEmailBusy(true);
    setErrorMessage('');
    setToastMessage('');
    try {
      const { error } = await supabase.auth.updateUser(
        { email: nextEmail },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Faccount` }
      );
      if (error) throw new Error(error.message);

      setPendingEmail(nextEmail);
      setEmail(user.email || '');
      setToastMessage('Check your email to confirm the change.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not request an email change.');
    } finally {
      setEmailBusy(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setToastMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('Your new password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('The new passwords do not match.');
      return;
    }
    if (!user.email) {
      setErrorMessage('A verified email is required to confirm your current password.');
      return;
    }

    setPasswordBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) throw new Error('Current password could not be verified. Check it and try again.');

      let sessionEstablished = false;
      try {
        const sessionResponse = await fetch('/api/auth/session', {
          method: 'POST',
          cache: 'no-store',
        });
        sessionEstablished = sessionResponse.ok;
        if (sessionEstablished) window.dispatchEvent(new Event('frugl:app-session-ready'));
      } catch (error) {
        console.error('Could not register the password-change session:', error);
      }
      if (!sessionEstablished) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) console.error('Could not clear the unregistered password-change session:', signOutError.message);
        router.replace('/login?next=%2Faccount');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error(updateError.message);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setToastMessage('Changes have been saved');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update your password.');
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleAvatarUpload(file: File | undefined) {
    if (!file) return;
    setErrorMessage('');
    setToastMessage('');

    if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
      setErrorMessage('Choose a JPG, PNG, or WebP photo.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setErrorMessage('Your photo must be 5 MB or smaller.');
      return;
    }

    setAvatarBusy(true);
    try {
      const formData = new FormData();
      formData.set('photo', file);
      const response = await fetch('/api/account/avatar', { method: 'POST', body: formData });
      const result: { avatarUrl?: string; error?: string } = await response.json();
      if (!response.ok || !result.avatarUrl) {
        throw new Error(result.error || 'Could not upload your photo.');
      }

      setAvatarUrl(result.avatarUrl);
      setToastMessage('Changes have been saved');
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not upload your photo.');
    } finally {
      setAvatarBusy(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  async function handleAccountDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user.email || deleteConfirmation.trim().toLowerCase() !== user.email.toLowerCase()) {
      setErrorMessage('Enter your account email exactly as shown to confirm deletion.');
      return;
    }
    if (requiresPasswordForDeletion && !deletePassword) {
      setErrorMessage('Enter your current password to confirm account deletion.');
      return;
    }

    setDeleteBusy(true);
    setErrorMessage('');
    setToastMessage('');

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          ...(requiresPasswordForDeletion ? { password: deletePassword } : {}),
        }),
      });
      const result: { deleted?: boolean; error?: string } = await response.json();
      if (!response.ok || !result.deleted) {
        throw new Error(result.error || 'Could not delete your account.');
      }

      try {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) console.error('Could not clear the deleted account session from this browser:', signOutError.message);
      } catch (error) {
        console.error('Could not clear the deleted account session from this browser:', error instanceof Error ? error.message : 'Unknown error');
      }
      router.replace('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not delete your account.');
      setDeletePassword('');
      setDeleteBusy(false);
    }
  }

  const initials = name.trim().slice(0, 1).toUpperCase() || 'F';

  return (
    <div className='account-settings-page'>
      <header className='page-banner account-settings-banner'>
        <div className='page-banner-main'>
          <span className='page-banner-icon' aria-hidden='true'><Gear size={22} /></span>
          <div className='page-banner-copy'>
            <h1 className='page-banner-title'>Account &amp; Settings</h1>
            <p className='page-banner-subtitle'>Keep your profile details and account access up to date.</p>
          </div>
        </div>
      </header>

      <Banner open={Boolean(errorMessage)} className='account-settings-notice account-settings-error' role='alert'>
          <AlertCircle size={16} className='shrink-0' />
          <span>{errorMessage}</span>
      </Banner>

      <Toast open={Boolean(toastMessage)} className='account-settings-toast'>
        <CheckCircle2 size={18} className='shrink-0' />
        <span>{toastMessage}</span>
      </Toast>

      <div className='account-settings-grid'>
        <form onSubmit={handleProfileSave} className='account-settings-card account-profile-card'>
          <h2 className='account-settings-card-title'>
            <span><UserIcon size={17} /></span>
            Profile Details
          </h2>

          <section className='account-avatar-editor' aria-labelledby='account-avatar-heading'>
            <div className='account-avatar-preview' aria-hidden='true'>
              {avatarUrl ? (
                <Image src={avatarUrl} alt='' width={112} height={112} unoptimized />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className='account-avatar-copy'>
              <h3 id='account-avatar-heading'>Profile photo</h3>
              <p>Clear frontal face photos help buyers and sellers learn about each other.</p>
              <input
                ref={avatarInputRef}
                className='account-avatar-input'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                aria-label='Choose a profile photo'
                onChange={(event) => void handleAvatarUpload(event.currentTarget.files?.[0])}
              />
              <Button
                type='button'
                variant='outline'
                disabled={avatarBusy}
                onClick={() => avatarInputRef.current?.click()}
              >
                <UploadCloud size={16} />
                {avatarBusy ? 'Uploading...' : 'Upload a photo'}
              </Button>
              <span className='account-avatar-hint'>JPG, PNG, or WebP · up to 5 MB</span>
            </div>
          </section>

          <section className='account-settings-accordion'>
            <button
              type='button'
              className='account-settings-accordion-trigger'
              aria-expanded={accountDetailsOpen}
              aria-controls='account-profile-fields'
              onClick={() => setAccountDetailsOpen((open) => !open)}
            >
              <span>
                <strong>Account Details</strong>
                <small>This info appears on your public profile.</small>
              </span>
              <Chevron open={accountDetailsOpen}><ChevronDown size={18} /></Chevron>
            </button>
            <Collapse
              id='account-profile-fields'
              open={accountDetailsOpen}
              className='account-profile-fields'
            >
              <div className='account-settings-field space-y-1.5'>
                <Label htmlFor='name'>Display Name</Label>
                <Input
                  id='name'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete='name'
                  maxLength={80}
                  required
                />
              </div>
              <div className='account-settings-field account-setting-bio space-y-1.5'>
                <LocationAutocomplete
                  id='profile-location'
                  value={location}
                  required={false}
                  onChange={(value, selection) => {
                    setLocation(value);
                    setLocationSelection(selection);
                  }}
                />
              </div>
              <div className='account-settings-field account-setting-bio space-y-1.5'>
                <Label htmlFor='bio'>Bio</Label>
                <Textarea
                  id='bio'
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder='A little about you'
                  maxLength={500}
                  rows={4}
                />
                <p>{bio.length}/500 characters</p>
              </div>
            </Collapse>
          </section>

          <section className='account-settings-accordion'>
            <button
              type='button'
              className='account-settings-accordion-trigger'
              aria-expanded={contactDetailsOpen}
              aria-controls='account-contact-fields'
              onClick={() => setContactDetailsOpen((open) => !open)}
            >
              <span>
                <strong>Contact details</strong>
                <small>Manage your sign-in email and contact information.</small>
              </span>
              <Chevron open={contactDetailsOpen}><ChevronDown size={18} /></Chevron>
            </button>
            <Collapse
              id='account-contact-fields'
              open={contactDetailsOpen}
              className='account-contact-fields'
            >
              <div className='account-settings-field space-y-1.5'>
                <Label htmlFor='accountEmail'>Email</Label>
                <div className='account-settings-email-row'>
                  <Input
                    ref={emailInputRef}
                    id='accountEmail'
                    type='email'
                    autoComplete='email'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                  <Button
                    type='button'
                    variant='outline'
                    disabled={emailBusy || !email.trim() || email.trim().toLowerCase() === user.email?.toLowerCase()}
                    onClick={() => void handleEmailUpdate()}
                  >
                    {emailBusy ? 'Sending...' : 'Update email'}
                  </Button>
                </div>
                <p>
                  Changing your sign-in email requires confirmation. Supabase may send a link to both your current and new addresses.
                </p>
                {pendingEmail && <p className='account-settings-pending-email'>Confirmation requested for {pendingEmail}.</p>}
              </div>

              <div className='account-settings-field space-y-1.5'>
                <Label htmlFor='contact'>Mobile number</Label>
                <Input
                  id='contact'
                  type='tel'
                  autoComplete='tel'
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder='0917-000-0000'
                />
                <p>This number stays private.</p>
              </div>

              <div className='account-settings-field account-setting-public-email space-y-1.5'>
                <Label htmlFor='publicContactEmail'>Public contact email (optional)</Label>
                <Input
                  ref={publicEmailInputRef}
                  id='publicContactEmail'
                  type='email'
                  autoComplete='email'
                  value={publicContactEmail}
                  onChange={(event) => setPublicContactEmail(event.target.value)}
                  placeholder='you@example.com'
                />
                <p>Shown on your listings only when provided. Your sign-in email stays private.</p>
              </div>
            </Collapse>
          </section>

          <Button type='submit' formNoValidate disabled={profileBusy} className='account-settings-profile-save'>
            {profileBusy ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>

        <form onSubmit={handlePasswordChange} className='account-settings-card account-password-card'>
          <h2 className='account-settings-card-title'>
            <span><ShieldCheck size={17} /></span>
            Change Password
          </h2>
          <p className='account-settings-password-description'>
            Enter your current password before choosing a new one.
          </p>
          <div className='account-settings-field space-y-1.5'>
            <Label htmlFor='currentPassword'>Current Password</Label>
            <Input
              id='currentPassword'
              type='password'
              autoComplete='current-password'
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div className='account-settings-field space-y-1.5'>
            <Label htmlFor='newPassword'>Change Password</Label>
            <Input
              id='newPassword'
              type='password'
              autoComplete='new-password'
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder='At least 8 characters'
              minLength={8}
              required
            />
          </div>
          <div className='account-settings-field space-y-1.5'>
            <Label htmlFor='confirmPassword'>Confirm Password</Label>
            <Input
              id='confirmPassword'
              type='password'
              autoComplete='new-password'
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type='submit' variant='outline' disabled={passwordBusy} className='account-settings-password-save'>
            {passwordBusy ? 'Updating...' : 'Change Password'}
          </Button>
        </form>
      </div>

      <section className='account-delete-section' aria-labelledby='account-delete-heading'>
        <div className='account-delete-copy'>
          <h2 id='account-delete-heading'>Delete account</h2>
          <p>
            This permanently deletes your profile, listings and their photos, saved laptops, offers,
            conversations and attachments, and reviews. Some safety reports and staff audit records
            may be retained for security purposes.
          </p>
        </div>

        {!deleteAccountOpen ? (
          <Button
            type='button'
            variant='outline'
            className='account-delete-trigger'
            onClick={() => setDeleteAccountOpen(true)}
          >
            Delete my account
          </Button>
        ) : (
          <form onSubmit={handleAccountDelete} className='account-delete-form'>
            <p>
              To confirm, enter your account email <strong>{user.email}</strong>
              {requiresPasswordForDeletion ? ' and your current password' : ''}. This cannot be undone.
            </p>
            <div className='account-settings-field space-y-1.5'>
              <Label htmlFor='deleteAccountEmail'>Account email</Label>
              <Input
                id='deleteAccountEmail'
                type='email'
                autoComplete='email'
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                required
              />
            </div>
            {requiresPasswordForDeletion && (
              <div className='account-settings-field space-y-1.5'>
                <Label htmlFor='deleteAccountPassword'>Current password</Label>
                <Input
                  id='deleteAccountPassword'
                  type='password'
                  autoComplete='current-password'
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  required
                />
              </div>
            )}
            <div className='account-delete-actions'>
              <Button
                type='button'
                variant='outline'
                disabled={deleteBusy}
                onClick={() => {
                  setDeleteAccountOpen(false);
                  setDeleteConfirmation('');
                  setDeletePassword('');
                }}
              >
                Cancel
              </Button>
              <Button type='submit' className='account-delete-confirm' disabled={deleteBusy}>
                {deleteBusy ? 'Deleting account...' : 'Permanently delete account'}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
