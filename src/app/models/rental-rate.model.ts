export interface RentalRate {
  rentalRateId: number;
  vehicleId: number;
  vehicle?: { vehicleId: number; vehicleName: string; vehicleNumber: string };
  pricePerDay: number;
  weeklyRate: number | null;
  securityDeposit: number;
  minDays: number;
  kmPerDay: number | null;
  extraKmRate: number | null;
  isActive: boolean;
  orgId: number;
}

export interface RentalRateUpsertDTO {
  vehicleId: number;
  pricePerDay: number;
  weeklyRate?: number | null;
  securityDeposit: number;
  minDays: number;
  kmPerDay?: number | null;
  extraKmRate?: number | null;
  isActive?: boolean;
}
