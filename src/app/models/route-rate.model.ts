import { Place } from './place.model';

export const VEHICLE_TYPES = ['Dzire', 'Ertiga', 'Innova', 'TT14', 'TT20', 'Urbania'] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

export interface RouteRate {
  routeRateId: number;
  fromPlaceId: number;
  fromPlace?: Place;
  toPlaceId: number;
  toPlace?: Place;
  vehicleType: string;
  price: number;
  peakPrice: number | null;
  floorPrice: number | null;
  isActive: boolean;
  orgId: number;
}

export interface RouteRateUpsertDTO {
  fromPlaceId: number;
  toPlaceId: number;
  vehicleType: string;
  price: number;
  peakPrice?: number | null;
  floorPrice?: number | null;
  isActive?: boolean;
}

export interface QuoteRate {
  routeRateId: number;
  vehicleType: string;
  price: number;
  peakPrice: number | null;
}

export interface QuoteResult {
  from: { placeId: number; name: string };
  to:   { placeId: number; name: string };
  rates: QuoteRate[];
}
