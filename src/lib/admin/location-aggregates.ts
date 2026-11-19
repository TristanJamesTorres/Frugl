import { formatPrivacyCount } from '../format';

export const LOCATION_MINIMUM_GROUP_SIZE = 1;

export type LocationPerson = {
  id: string;
  location: string | null;
  location_label?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
};

export type LocationGeocode = {
  label_key: string;
  label: string;
  lat: number;
  lng: number;
};

export type LocationArea = {
  name: string;
  province: string | null;
  lat: number;
  lng: number;
  count: number;
};

export type UnmappedLocationArea = {
  name: string;
  count: number;
};

export type LocationAggregate = {
  areas: LocationArea[];
  unmapped: UnmappedLocationArea[];
  totalPeople: number;
  mappedPeople: number;
  unmappedPeople: number;
  suppressedPeople: number;
};

type AreaIdentity = {
  key: string;
  name: string;
  province: string | null;
};

type LocationGroup = AreaIdentity & {
  lat: number | null;
  lng: number | null;
  count: number;
};

const LAGUNA_MUNICIPALITIES = [
  { name: 'Alaminos', aliases: ['alaminos'], lat: 14.063, lng: 121.246 },
  { name: 'Bay', aliases: ['bay'], lat: 14.183, lng: 121.286 },
  { name: 'Biñan', aliases: ['binan', 'binan city'], lat: 14.341, lng: 121.08 },
  { name: 'Cabuyao', aliases: ['cabuyao', 'cabuyao city'], lat: 14.272, lng: 121.125 },
  { name: 'Calamba', aliases: ['calamba', 'calamba city'], lat: 14.211, lng: 121.165 },
  { name: 'Calauan', aliases: ['calauan'], lat: 14.15, lng: 121.315 },
  { name: 'Cavinti', aliases: ['cavinti'], lat: 14.245, lng: 121.508 },
  { name: 'Famy', aliases: ['famy'], lat: 14.436, lng: 121.449 },
  { name: 'Kalayaan', aliases: ['kalayaan'], lat: 14.35, lng: 121.478 },
  { name: 'Liliw', aliases: ['liliw'], lat: 14.132, lng: 121.436 },
  { name: 'Los Baños', aliases: ['los banos', 'los banos city'], lat: 14.17, lng: 121.242 },
  { name: 'Luisiana', aliases: ['luisiana'], lat: 14.187, lng: 121.52 },
  { name: 'Lumban', aliases: ['lumban'], lat: 14.297, lng: 121.46 },
  { name: 'Mabitac', aliases: ['mabitac'], lat: 14.43, lng: 121.43 },
  { name: 'Magdalena', aliases: ['magdalena'], lat: 14.2, lng: 121.43 },
  { name: 'Majayjay', aliases: ['majayjay'], lat: 14.145, lng: 121.473 },
  { name: 'Nagcarlan', aliases: ['nagcarlan'], lat: 14.136, lng: 121.416 },
  { name: 'Paete', aliases: ['paete'], lat: 14.36, lng: 121.48 },
  { name: 'Pagsanjan', aliases: ['pagsanjan'], lat: 14.27, lng: 121.45 },
  { name: 'Pakil', aliases: ['pakil'], lat: 14.38, lng: 121.48 },
  { name: 'Pangil', aliases: ['pangil'], lat: 14.4, lng: 121.46 },
  { name: 'Pila', aliases: ['pila'], lat: 14.23, lng: 121.36 },
  { name: 'Rizal', aliases: ['rizal'], lat: 14.11, lng: 121.4 },
  { name: 'San Pablo', aliases: ['san pablo', 'san pablo city'], lat: 14.07, lng: 121.325 },
  { name: 'San Pedro', aliases: ['san pedro', 'san pedro city'], lat: 14.36, lng: 121.06 },
  { name: 'Santa Cruz', aliases: ['santa cruz', 'santa cruz laguna', 'sta cruz'], lat: 14.28, lng: 121.42 },
  { name: 'Santa Maria', aliases: ['santa maria', 'sta maria'], lat: 14.47, lng: 121.43 },
  { name: 'Santa Rosa', aliases: ['santa rosa', 'santa rosa city', 'sta rosa'], lat: 14.31, lng: 121.11 },
  { name: 'Siniloan', aliases: ['siniloan'], lat: 14.42, lng: 121.45 },
  { name: 'Victoria', aliases: ['victoria'], lat: 14.23, lng: 121.33 },
] as const;

const ADDRESS_PART = /\d|\b(street|st\.|road|rd\.|avenue|ave\.|building|bldg|unit|floor|lot|block|purok|barangay|brgy)\b/i;

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(city|municipality|town|province|region|philippines)\b/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeLocationKey(value: string): string {
  return normalizeText(value);
}

function findLagunaMunicipality(value: string) {
  const segments = value.split(/[,/]/).map(normalizeText).filter(Boolean).reverse();
  for (const segment of segments) {
    const municipality = LAGUNA_MUNICIPALITIES.find(({ aliases }) =>
      aliases.some((alias) => normalizeText(alias) === segment),
    );
    if (municipality) return municipality;
  }
  return null;
}

export function hasLagunaGazetteerLocation(value: string): boolean {
  return findLagunaMunicipality(value) !== null;
}

export function getSafeLocationQuery(value: string): string | null {
  if (!value.trim()) return null;
  const municipality = findLagunaMunicipality(value);
  if (municipality) return `${municipality.name}, Laguna`;

  const identity = getAreaIdentity(value);
  if (
    identity.name === 'Unrecognized location' ||
    ADDRESS_PART.test(identity.name)
  ) {
    return null;
  }
  return [identity.name, identity.province].filter(Boolean).join(', ');
}

function getAreaIdentity(value: string | null): AreaIdentity {
  if (!value?.trim()) {
    return { key: 'unmapped:location-not-set', name: 'Location not set', province: null };
  }

  const municipality = findLagunaMunicipality(value);
  if (municipality) {
    const name = municipality.name;
    return {
      key: `${normalizeText(name)}|laguna`,
      name,
      province: 'Laguna',
    };
  }

  const safeParts = value
    .split(/[,/]/)
    .map((part) => part.trim())
    .filter((part) => part && !ADDRESS_PART.test(part));
  const city = safeParts[0]?.slice(0, 80) || 'Unrecognized location';
  const province = safeParts[1]?.slice(0, 80) || null;
  const key = `${normalizeText(city)}|${normalizeText(province || '')}`;
  return { key: `unmapped:${key}`, name: city, province };
}

function getValidCoordinates(
  lat: unknown,
  lng: unknown,
): { lat: number; lng: number } | null {
  if (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  ) {
    return { lat, lng };
  }
  return null;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function aggregateLocations(
  people: readonly LocationPerson[],
  geocodes: readonly LocationGeocode[] = [],
): LocationAggregate {
  const geocodeByKey = new Map(geocodes.map((entry) => [entry.label_key, entry]));
  const uniquePeople = new Map<string, LocationPerson>();
  for (const person of people) uniquePeople.set(person.id, person);

  const groups = new Map<string, LocationGroup>();
  let mappedPeople = 0;
  let unmappedPeople = 0;

  for (const person of uniquePeople.values()) {
    const label = person.location_label?.trim() || person.location?.trim() || null;
    const identity = getAreaIdentity(label);
    const cached = label ? geocodeByKey.get(normalizeLocationKey(label)) : undefined;
    const coordinates =
      getValidCoordinates(person.location_lat, person.location_lng) ??
      (cached ? getValidCoordinates(cached.lat, cached.lng) : null) ??
      findLagunaMunicipality(label || '');
    const lat = coordinates?.lat ?? null;
    const lng = coordinates?.lng ?? null;

    const existing = groups.get(identity.key);
    if (existing) {
      existing.count += 1;
      if (existing.lat === null && lat !== null && lng !== null) {
        existing.lat = roundCoordinate(lat);
        existing.lng = roundCoordinate(lng);
      }
    } else {
      groups.set(identity.key, {
        ...identity,
        lat: lat === null || lng === null ? null : roundCoordinate(lat),
        lng: lat === null || lng === null ? null : roundCoordinate(lng),
        count: 1,
      });
    }

    if (lat !== null && lng !== null) mappedPeople += 1;
    else unmappedPeople += 1;
  }

  const areas: LocationArea[] = [];
  const unmapped: UnmappedLocationArea[] = [];
  let suppressedPeople = 0;

  for (const group of groups.values()) {
    if (group.count < LOCATION_MINIMUM_GROUP_SIZE) {
      suppressedPeople += group.count;
      continue;
    }

    if (group.lat !== null && group.lng !== null) {
      areas.push({
        name: group.name,
        province: group.province,
        lat: group.lat,
        lng: group.lng,
        count: group.count,
      });
    } else {
      const name = ADDRESS_PART.test(group.name) ? 'Unrecognized location' : group.name;
      unmapped.push({ name, count: group.count });
    }
  }

  areas.sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));
  unmapped.sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));

  return {
    areas,
    unmapped,
    totalPeople: uniquePeople.size,
    mappedPeople,
    unmappedPeople,
    suppressedPeople,
  };
}

export { formatPrivacyCount };
