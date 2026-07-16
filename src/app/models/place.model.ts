export type PlaceZone = 0 | 1 | 2; // North=0, South=1, Hub=2

export const PLACE_ZONE_LABELS: Record<PlaceZone, string> = {
  0: 'North',
  1: 'South',
  2: 'Hub',
};

export interface Place {
  placeId: number;
  name: string;
  aliases: string | null;
  zone: PlaceZone;
  pickupAllowed: boolean;
  dropAllowed: boolean;
  restrictionMessage: string | null;
  isActive: boolean;
  orgId: number;
}

export interface PlaceUpsertDTO {
  name: string;
  aliases?: string | null;
  zone: PlaceZone;
  pickupAllowed: boolean;
  dropAllowed: boolean;
  restrictionMessage?: string | null;
  isActive?: boolean;
}
