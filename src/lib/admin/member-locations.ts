import type { createClient } from '@/lib/supabase/server';
import {
  aggregateLocations,
  type LocationAggregate,
  type LocationGeocode,
  type LocationPerson,
} from './location-aggregates';

export type AdminMemberLocations = {
  all: LocationAggregate;
  buyers: LocationAggregate;
  sellers: LocationAggregate;
  migrationWarning: boolean;
};

type ProfileLocation = LocationPerson & {
  role: string;
};

export type AdminLocationAudiences = {
  all: ProfileLocation[];
  buyers: ProfileLocation[];
  sellers: ProfileLocation[];
};

const PAGE_SIZE = 500;

export function splitAdminLocationAudiences(
  profiles: ProfileLocation[],
  sellerIds: ReadonlySet<string>,
  buyerIds: ReadonlySet<string>,
): AdminLocationAudiences {
  const members = profiles.filter((profile) => profile.role !== 'admin');
  return {
    all: members,
    buyers: members.filter((profile) => buyerIds.has(profile.id)),
    sellers: members.filter((profile) => sellerIds.has(profile.id)),
  };
}

export function isLocationSchemaMissing(error: { code?: string; message?: string }): boolean {
  const missingSchemaCodes = new Set(['42703', 'PGRST204', '42P01', 'PGRST205']);
  return (
    Boolean(error.code && missingSchemaCodes.has(error.code)) &&
    /location_(lat|lng|label|geocodes)/i.test(error.message || '')
  );
}

export function getCompletedSaleBuyerIds(
  listings: readonly { buyer_id: string | null; status: string }[],
): Set<string> {
  const buyerIds = new Set<string>();
  for (const listing of listings) {
    if (listing.status === 'sold' && listing.buyer_id) buyerIds.add(listing.buyer_id);
  }
  return buyerIds;
}

async function loadProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  includeCoordinates: boolean,
): Promise<{ profiles: ProfileLocation[]; missingCoordinates: boolean }> {
  const profiles: ProfileLocation[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = includeCoordinates
      ? await supabase
          .from('profiles')
          .select('id, role, default_location, location_lat, location_lng, location_label')
          .eq('status', 'active')
          .order('id')
          .range(from, from + PAGE_SIZE - 1)
      : await supabase
          .from('profiles')
          .select('id, role, default_location')
          .eq('status', 'active')
          .order('id')
          .range(from, from + PAGE_SIZE - 1);
    if (result.error) {
      if (includeCoordinates && isLocationSchemaMissing(result.error)) {
        return { profiles: [], missingCoordinates: true };
      }
      throw new Error(`Unable to load active member locations: ${result.error.message}`);
    }

    profiles.push(
      ...(result.data ?? []).map((profile) => ({
        id: profile.id,
        role: profile.role,
        location: profile.default_location,
        location_lat:
          'location_lat' in profile && typeof profile.location_lat === 'number'
            ? profile.location_lat
            : null,
        location_lng:
          'location_lng' in profile && typeof profile.location_lng === 'number'
            ? profile.location_lng
            : null,
        location_label:
          'location_label' in profile && typeof profile.location_label === 'string'
            ? profile.location_label
            : null,
      })),
    );
    if (!result.data || result.data.length < PAGE_SIZE) {
      return { profiles, missingCoordinates: false };
    }
  }
}

async function loadMarketplaceAudienceIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ sellerIds: Set<string>; buyerIds: Set<string> }> {
  const sellerIds = new Set<string>();
  const buyerIds = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, seller_id, buyer_id, status')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Unable to load buyer and seller activity for the admin map: ${error.message}`);
    for (const buyerId of getCompletedSaleBuyerIds(data ?? [])) buyerIds.add(buyerId);
    for (const listing of data ?? []) {
      sellerIds.add(listing.seller_id);
    }
    if (!data || data.length < PAGE_SIZE) return { sellerIds, buyerIds };
  }
}

async function loadGeocodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ geocodes: LocationGeocode[]; missingTable: boolean }> {
  const geocodes: LocationGeocode[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('location_geocodes')
      .select('label_key, label, lat, lng')
      .order('label_key')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (isLocationSchemaMissing(error)) return { geocodes: [], missingTable: true };
      throw new Error(`Unable to load cached location coordinates: ${error.message}`);
    }
    geocodes.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { geocodes, missingTable: false };
  }
}

export async function getAdminMemberLocations(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminMemberLocations> {
  const [profileAttempt, audienceIds, geocodeResult] = await Promise.all([
    loadProfiles(supabase, true),
    loadMarketplaceAudienceIds(supabase),
    loadGeocodes(supabase),
  ]);
  const profileResult = profileAttempt.missingCoordinates
    ? await loadProfiles(supabase, false)
    : profileAttempt;
  const profiles = profileResult.profiles;
  const geocodes = geocodeResult.geocodes;
  const migrationWarning = profileAttempt.missingCoordinates || geocodeResult.missingTable;
  if (migrationWarning) {
    console.warn('Location coordinate migration is missing; loading legacy location data for the admin map.');
  }

  const audiences = splitAdminLocationAudiences(
    profiles,
    audienceIds.sellerIds,
    audienceIds.buyerIds,
  );

  return {
    all: aggregateLocations(audiences.all, geocodes),
    buyers: aggregateLocations(audiences.buyers, geocodes),
    sellers: aggregateLocations(audiences.sellers, geocodes),
    migrationWarning,
  };
}
