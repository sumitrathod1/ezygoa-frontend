import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { AssignBoardComponent } from './assign-board.component';
import { testProviders } from '../../testing/test-providers';
import { AssignmentBoard, BoardBooking } from '../../services/dispatch.service';

describe('AssignBoardComponent', () => {
  const iso = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const p = (n: number) => (n < 10 ? '0' + n : String(n));
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const bk = (o: Partial<BoardBooking>): BoardBooking => ({
    bookingId: 1, travelDate: iso(0), returnDate: null, travelTime: '10:00:00', from: 'Airport', to: 'Calangute',
    pax: 2, amount: 3000, bookingType: 'AirportPickup', status: 'Pending', customerName: 'Anita', customerNumber: '9876500001',
    vehicleId: null, vehicleName: null, vehicleNumber: null, userId: null, driverName: null,
    needsDriver: true, fullyAssigned: false, isOpen: true, isMissed: false, transferredFrom: null, ...o,
  });

  const board = (): AssignmentBoard => ({
    from: iso(0), to: iso(6),
    bookings: [
      bk({ bookingId: 1 }),
      bk({ bookingId: 2, travelTime: '11:00:00', userId: 7, driverName: 'Ramesh', vehicleId: 3, vehicleName: 'ERTIGA', fullyAssigned: true, status: 'Assigned' }),
      bk({ bookingId: 3, travelDate: iso(1) }),
      bk({ bookingId: 4, bookingType: 'SelfDriveRental', needsDriver: false, travelDate: iso(0), returnDate: iso(3), vehicleId: 9 }),
      bk({ bookingId: 5, travelDate: iso(-1), isMissed: true }),
    ],
    drivers: [{ userId: 7, name: 'Ramesh', number: '9000000002' }, { userId: 8, name: 'Suresh', number: null }],
    vehicles: [
      { vehicleId: 3, vehicleName: 'ERTIGA', vehicleNumber: 'GA-01', vehicleType: 'Suv', seatingcapacity: 7, rentalOnly: false },
      { vehicleId: 9, vehicleName: 'Thar', vehicleNumber: 'RENTAL-001', vehicleType: 'Suv', seatingcapacity: 4, rentalOnly: true },
    ],
  });

  let c: AssignBoardComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AssignBoardComponent], providers: testProviders() }).compileComponents();
    const fixture = TestBed.createComponent(AssignBoardComponent);
    c = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/Booking/assignment-board')).flush({ data: board() });
    http.expectOne((r) => r.url.endsWith('/Booking/transfer-targets')).flush({ data: [] });
    fixture.detectChanges();
  });

  it('shows only bookings that still need something, grouped by day', () => {
    expect(c.visible.map((b) => b.bookingId)).toEqual([1, 3, 5]);
    expect(c.missingCount).toBe(3);
    c.onlyMissing = false;
    expect(c.visible.map((b) => b.bookingId)).toEqual([1, 2, 3, 4, 5]);
  });

  it('a past booking that never got a driver is shown first, marked as missed', () => {
    expect(c.groups[0].date).toBe(iso(-1));
    expect(c.dayLabel(iso(-1))).toContain('Missed');
    expect(c.isPast(iso(-1))).toBeTrue();
    expect(c.groups.length).toBe(3);
  });

  it('warns when the dragged driver is already busy that day', () => {
    const first = c.board!.bookings[0];
    expect(c.busyText(first, 'driver', 7)).toContain('#2');
    expect(c.busyText(first, 'driver', 8)).toBe('');
    // A self-drive rental keeps its car busy on the following days too
    expect(c.busyText(c.board!.bookings[2], 'vehicle', 9)).toContain('rental #4');
  });

  it('a driver only drops on a driver slot; rent-a-car only on self-drive', () => {
    const [b1, , , rental] = c.board!.bookings;
    const drop = (booking: BoardBooking, kind: string) => ({ data: { booking, kind } }) as any;
    const drag = (kind: string, id: number) => ({ data: { kind, id } }) as any;
    expect(c.canEnter(drag('driver', 8), drop(b1, 'driver'))).toBeTrue();
    expect(c.canEnter(drag('driver', 8), drop(b1, 'vehicle'))).toBeFalse();
    expect(c.canEnter(drag('vehicle', 9), drop(b1, 'vehicle'))).toBeFalse();
    expect(c.canEnter(drag('vehicle', 9), drop(rental, 'vehicle'))).toBeTrue();
    expect(c.noEnter()).toBeFalse();
  });

  it('dropping a driver assigns it and updates the card', () => {
    const b1 = c.board!.bookings[0];
    c.dropped({ previousContainer: {}, container: { data: { booking: b1, kind: 'driver' } }, item: { data: { kind: 'driver', id: 8 } } } as any);
    const req = http.expectOne((r) => r.url.endsWith('/Booking/1/assign'));
    expect(req.request.body.userId).toBe(8);
    expect(c.saving.size).toBe(1);
    req.flush({ data: { bookingId: 1, userId: 8, driverName: 'Suresh', vehicleId: null, vehicleName: null, status: 'Pending', fullyAssigned: false, warnings: [] } });
    http.expectOne((r) => r.url.endsWith('/Booking/pending-assignment-count')).flush({ data: { total: 1 } });
    expect(b1.driverName).toBe('Suresh');
    expect(c.saving.size).toBe(0);
  });

  it('a fully assigned card stays visible until the page is reloaded', () => {
    const b1 = c.board!.bookings[0];
    c.assign(b1, 'vehicle', 3);
    http.expectOne((r) => r.url.endsWith('/Booking/1/assign'))
      .flush({ data: { bookingId: 1, userId: 8, driverName: 'Suresh', vehicleId: 3, vehicleName: 'ERTIGA', status: 'Assigned', fullyAssigned: true, warnings: [] } });
    http.expectOne((r) => r.url.endsWith('/Booking/pending-assignment-count')).flush({ data: { total: 1 } });
    expect(c.visible.some((b) => b.bookingId === 1)).toBeTrue();
    expect(c.missingCount).toBe(2);   // booking 3 + yesterday's missed booking 5
  });

  it('tap to assign: picking from the picker saves and closes it', () => {
    const b3 = c.board!.bookings[2];
    c.openPicker(b3, 'driver');
    expect(c.picker).toBeTruthy();
    c.pick(7);
    expect(c.picker).toBeNull();
    http.expectOne((r) => r.url.endsWith('/Booking/3/assign')).flush({ data: { bookingId: 3, userId: 7, warnings: [] } });
    http.expectOne((r) => r.url.endsWith('/Booking/pending-assignment-count')).flush({ data: { total: 1 } });
  });

  it('choosing the same driver again does nothing', () => {
    const b2 = c.board!.bookings[1];
    c.assign(b2, 'driver', 7);
    http.expectNone((r) => r.url.includes('/assign'));
  });

  it('a failed save shows the server message and clears the spinner', () => {
    const b1 = c.board!.bookings[0];
    c.assign(b1, 'vehicle', 9);
    http.expectOne((r) => r.url.endsWith('/Booking/1/assign'))
      .flush({ message: 'Thar is a rent-a-car listing.' }, { status: 400, statusText: 'Bad Request' });
    expect(c.saving.size).toBe(0);
    expect(b1.vehicleId).toBeNull();
  });
});
