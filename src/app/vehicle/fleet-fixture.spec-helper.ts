import { FleetSummary, FleetVehicle } from '../services/dashboard.service';

/** A small fleet for the Vehicles screen tests */
export function fleetFixture(opts: { only?: number; profitLoss?: boolean } = {}): FleetSummary {
  const v = (id: number, name: string, revenue: number, expenses: number, busyDays: number, outToday: boolean, extra: Partial<FleetVehicle> = {}): FleetVehicle => ({
    vehicleId: id, vehicleName: name, vehicleNumber: `GA-0${id}-X-100${id}`, vehicleType: 'Suv', seats: 7,
    trips: Math.round(revenue / 3000), revenue, expenses, profit: revenue - expenses, fuel: 0, emi: 0, repairs: 0,
    busyDays, utilisation: Math.round((busyDays / 20) * 100), perTrip: 3000, outToday,
    nextTrip: null, serviceDue: null, docsDue: 0, ...extra,
  });
  let vehicles = [
    v(1, 'Urbania', 90000, 30000, 12, true),
    v(2, 'ERTIGA', 40000, 10000, 18, false, { serviceDue: { type: 'oilChange', due: '2026-10-30', daysLeft: 4 } }),
    v(3, 'TT20Seater', 5000, 15000, 2, false),
  ];
  if (opts.only) vehicles = vehicles.filter((x) => x.vehicleId === opts.only);
  const revenue = vehicles.reduce((s, x) => s + x.revenue, 0);
  const expenses = vehicles.reduce((s, x) => s + x.expenses, 0);
  return {
    from: '2026-10-01', to: '2026-10-20', days: 20, daysSoFar: 20,
    totals: {
      vehicles: vehicles.length, trips: 45, revenue, expenses, profit: revenue - expenses, margin: 60, perTrip: 3000, utilisation: 53, unlinked: 1200,
      previous: { trips: 40, revenue: 100000, expenses: 50000, profit: 50000 },
      change: { revenue: 35, expenses: 10, profit: 60, trips: 12 },
    },
    today: { out: vehicles.filter((x) => x.outToday).length, free: vehicles.filter((x) => !x.outToday).length },
    vehicles,
    byCategory: [{ category: 'Fuel', amount: 30000 }, { category: 'EMI', amount: 25000 }],
    trend: [{ label: 'Oct 26', year: 2026, month: 10, revenue, expenses, profit: revenue - expenses }],
    alerts: {
      documents: [{ documentID: 9, title: 'Insurance', vehicleID: 1, vehicleName: 'Urbania', vehicleNumber: 'GA-01-X-1001', driverName: null, expiryDate: '2026-10-18', daysLeft: -2 }],
      services: [{ vehicleID: 2, vehicleName: 'ERTIGA', vehicleNumber: 'GA-02-X-1002', type: 'oilChange', due: '2026-10-24', daysLeft: 4 }],
    },
  };
}
