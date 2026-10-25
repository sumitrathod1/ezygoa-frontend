import { BOOKING_TYPES, supportsEndDrop, typeLabel, typeName } from './booking-types';
import { BookingTypePipe } from '../pipes/booking-type.pipe';

describe('booking types', () => {
  it('offers North Goa, South Goa and Dudhsagar tours', () => {
    expect(BOOKING_TYPES).toContain('NorthGoaSightseeing');
    expect(BOOKING_TYPES).toContain('SouthGoaSightseeing');
    expect(BOOKING_TYPES).toContain('DudhsagarTour');
  });

  it('shows readable names', () => {
    expect(typeName('NorthGoaSightseeing')).toBe('North Goa Sightseeing');
    expect(typeName('AirportPickup')).toBe('Airport Pickup');
    expect(typeName('Notspecified')).toBe('Not specified');
  });

  it('adds the drop: "North Goa Sightseeing + drop at Mopa Airport"', () => {
    expect(typeLabel('NorthGoaSightseeing', 'Mopa Airport')).toBe('North Goa Sightseeing + drop at Mopa Airport');
    expect(typeLabel('FullDay', '  ')).toBe('Full Day');
    expect(new BookingTypePipe().transform('FullDay', 'Madgaon Railway Station')).toBe('Full Day + drop at Madgaon Railway Station');
  });

  it('a tour can start with a pickup: "Mopa Airport pickup + Dudhsagar Tour"', () => {
    expect(typeLabel('DudhsagarTour', null, 'Mopa Airport')).toBe('Mopa Airport pickup + Dudhsagar Tour');
    expect(typeLabel('NorthGoaSightseeing', 'Dabolim Airport', 'Thivim Railway Station'))
      .toBe('Thivim Railway Station pickup + North Goa Sightseeing + drop at Dabolim Airport');
  });

  it('Full Day shows its package: "Full Day (8 hr / 80 km)" / "(12 hr / 120 km)"', () => {
    expect(typeLabel('FullDay', null, null, 8)).toBe('Full Day (8 hr / 80 km)');
    expect(typeLabel('FullDay', 'Madgaon Railway Station', null, 12)).toBe('Full Day (12 hr / 120 km) + drop at Madgaon Railway Station');
    expect(typeLabel('FullDay')).toBe('Full Day');
  });

  it('only tours and full days can end with a drop', () => {
    expect(supportsEndDrop('SouthGoaSightseeing')).toBeTrue();
    expect(supportsEndDrop('FullDay')).toBeTrue();
    expect(supportsEndDrop('AirportPickup')).toBeFalse();
    expect(supportsEndDrop('SelfDriveRental')).toBeFalse();
  });
});
