/**
 * Booking types as stored by the API (enum names), in the order offered in forms,
 * with readable names. New types are added at the END of the server enum only —
 * this list just controls the order people see them in.
 */
export const BOOKING_TYPES = [
  'AirportPickup',
  'AirportDrop',
  'RailwayStation',
  'NorthGoaSightseeing',
  'SouthGoaSightseeing',
  'DudhsagarTour',
  'SightSeeing',
  'FullDay',
  'Shuttle',
  'SelfDriveRental',
  'Notspecified',
];

const NAMES: Record<string, string> = {
  AirportPickup: 'Airport Pickup',
  AirportDrop: 'Airport Drop',
  RailwayStation: 'Railway Station',
  NorthGoaSightseeing: 'North Goa Sightseeing',
  SouthGoaSightseeing: 'South Goa Sightseeing',
  DudhsagarTour: 'Dudhsagar Tour',
  SightSeeing: 'Sightseeing',
  FullDay: 'Full Day',
  Shuttle: 'Shuttle',
  SelfDriveRental: 'Self-Drive Rental',
  Notspecified: 'Not specified',
};

/** Tours and full days can finish with a drop somewhere other than the hotel. */
const END_DROP_TYPES = new Set(['NorthGoaSightseeing', 'SouthGoaSightseeing', 'DudhsagarTour', 'SightSeeing', 'FullDay']);

export function typeName(type: string | null | undefined, fullDayHours?: number | null): string {
  if (!type) return '';
  if (type === 'FullDay' && (fullDayHours === 8 || fullDayHours === 12)) return `Full Day (${fullDayHours} hr / ${fullDayHours * 10} km)`;
  return NAMES[type] ?? type.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/** Full Day comes as 8 hr / 80 km or 12 hr / 120 km. */
export const FULL_DAY_PACKAGES = [
  { hours: 8, label: '8 hr / 80 km' },
  { hours: 12, label: '12 hr / 120 km' },
];

/** "Mopa Airport pickup + North Goa Sightseeing + drop at Dabolim Airport" */
export function typeLabel(
  type: string | null | undefined,
  endDrop?: string | null,
  startPickup?: string | null,
  fullDayHours?: number | null
): string {
  let label = typeName(type, fullDayHours);
  if (startPickup && startPickup.trim()) label = `${startPickup.trim()} pickup + ${label}`;
  if (endDrop && endDrop.trim()) label = `${label} + drop at ${endDrop.trim()}`;
  return label;
}

export function supportsEndDrop(type: string | null | undefined): boolean {
  return !!type && END_DROP_TYPES.has(type);
}

/** One-tap choices for "end with a drop at". */
export const END_DROP_PLACES = [
  { label: '✈ Mopa', value: 'Mopa Airport' },
  { label: '✈ Dabolim', value: 'Dabolim Airport' },
  { label: '🚉 Vasco', value: 'Vasco da Gama Railway Station' },
  { label: '🚉 Madgaon', value: 'Madgaon Railway Station' },
  { label: '🚉 Thivim', value: 'Thivim Railway Station' },
];
