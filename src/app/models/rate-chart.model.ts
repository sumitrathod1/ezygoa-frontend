export interface RcVehicle {
  id: string;
  name: string;
  icon: string;
  capacity: string;
  fleetRef?: string;
}

export interface RcRoute {
  id: string;
  emoji: string;
  name: string;
  prices: { [vehicleId: string]: number };
  peakPrices?: { [vehicleId: string]: number };
}

export interface RcSurcharge {
  id: string;
  label: string;
  amounts: { [vehicleId: string]: number };
}

export interface RcNote {
  icon: string;
  title: string;
  content: string;
}

export interface RcFooter {
  companyName: string;
  website: string;
  phone: string;
  email: string;
  yearRange: string;
}

export interface RateChart {
  id: string;
  templateName: string;
  agentName: string;
  agentNumber?: string;
  agentLogo?: string;
  companyName: string;
  tagline: string;
  validFrom: string;
  validTo: string;
  specialDaysNote: string;
  locations: string;
  vehicles: RcVehicle[];
  routes: RcRoute[];
  surcharges: RcSurcharge[];
  notes: RcNote[];
  footer: RcFooter;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  seasonMode: 'regular' | 'peak';
  peakSeasonDates?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_RATE_CHART: Omit<
  RateChart,
  'id' | 'createdAt' | 'updatedAt'
> = {
  templateName: 'Standard Rate Chart',
  agentName: '',
  agentNumber: '',
  companyName: 'EZY GOA TRAVELS',
  tagline: 'Your Trusted Travel Partner',
  validFrom: '2025-01-01',
  validTo: '2025-12-31',
  specialDaysNote:
    'Christmas & New Year (Dec 24 – Jan 2): +20% surcharge applies',
  locations:
    'North Goa: Calangute · Baga · Candolim · Anjuna · Vagator · Siolim\nSouth Goa: Colva · Benaulim · Cavelossim · Palolem · Agonda\nAirports: Goa International (Dabolim) · Manohar Airport (Mopa)',
  vehicles: [
    { id: 'v1', name: 'Sedan', icon: '🚗', capacity: '4 Pax' },
    { id: 'v2', name: 'Ertiga', icon: '🚐', capacity: '6 Pax' },
    { id: 'v3', name: 'Innova', icon: '🚙', capacity: '7 Pax' },
    { id: 'v4', name: 'TT 20', icon: '🚌', capacity: '20 Pax' },
  ],
  routes: [
    {
      id: 'r1',
      emoji: '✈',
      name: 'Airport Pickup / Drop',
      prices: { v1: 900, v2: 1100, v3: 1300, v4: 3500 },
      peakPrices: { v1: 1100, v2: 1300, v3: 1600, v4: 4200 },
    },
    {
      id: 'r2',
      emoji: '🚉',
      name: 'Railway Station Transfer',
      prices: { v1: 700, v2: 900, v3: 1100, v4: 2800 },
      peakPrices: { v1: 850, v2: 1100, v3: 1300, v4: 3200 },
    },
    {
      id: 'r3',
      emoji: '🌅',
      name: 'Full Day Sightseeing (8 hrs)',
      prices: { v1: 2500, v2: 3000, v3: 3500, v4: 8000 },
      peakPrices: { v1: 3000, v2: 3600, v3: 4200, v4: 9500 },
    },
    {
      id: 'r4',
      emoji: '⏰',
      name: 'Half Day (4 hrs)',
      prices: { v1: 1500, v2: 1800, v3: 2100, v4: 4500 },
      peakPrices: { v1: 1800, v2: 2200, v3: 2500, v4: 5500 },
    },
    {
      id: 'r5',
      emoji: '🏨',
      name: 'Hotel / Resort Transfer',
      prices: { v1: 600, v2: 750, v3: 900, v4: 2200 },
      peakPrices: { v1: 750, v2: 950, v3: 1100, v4: 2800 },
    },
    {
      id: 'r6',
      emoji: '🚢',
      name: 'Cruise Terminal Transfer',
      prices: { v1: 800, v2: 1000, v3: 1200, v4: 3000 },
      peakPrices: { v1: 1000, v2: 1200, v3: 1400, v4: 3600 },
    },
  ],
  surcharges: [
    {
      id: 's1',
      label: 'Night Surcharge (11 PM – 6 AM)',
      amounts: { v1: 300, v2: 350, v3: 400, v4: 800 },
    },
    {
      id: 's2',
      label: 'Out of Goa Transfer (per km extra)',
      amounts: { v1: 12, v2: 14, v3: 16, v4: 22 },
    },
  ],
  notes: [
    {
      icon: '✓',
      title: "What's Included",
      content:
        'AC vehicle & fuel charges\nDriver allowance & meals\nAll state taxes & permits\nParking at hotels / restaurants',
    },
    {
      icon: 'P',
      title: 'Parking & Entry Fees',
      content:
        'Monument & attraction entry tickets\nParking fees at sightseeing spots\nToll charges on highways\nAny personal shopping expenses',
    },
    {
      icon: '₹',
      title: 'Payment Policy',
      content:
        '30% advance to confirm booking\nBalance before trip starts\nUPI / Bank transfer / Cash accepted\nReceipt provided for all payments',
    },
    {
      icon: '★',
      title: 'Special Days',
      content:
        'Christmas & New Year (Dec 24–Jan 2): +20%\nNew Year Eve (Dec 31): +30%\nGoa Liberation Day (Dec 19): +15%\nLocal carnival weekends: +10%',
    },
  ],
  footer: {
    companyName: 'EZY GOA TRAVELS',
    website: 'ezygoataxiservices.in',
    phone: '+91 7406008393',
    email: 'ezygoataxiservices@gmail.com',
    yearRange: '2025 – 2026',
  },
  currency: 'INR',
  seasonMode: 'regular',
};
