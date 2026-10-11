/**
 * Venue configuration. EVERYTHING venue specific lives in this one file:
 * name, address, phone, pickup spot, menu, tax, sample quote and fare scenarios,
 * driver, guest and seeded addresses. Swapping venues means editing only this file.
 *
 * SIMULATED DEMO. Maison Cheryl (2900 Wilson Blvd, Arlington, VA) is shown with the
 * venue's permission (founder decision 2026-10-10); it is not a live RideNite partner. Menu item names come from its
 * published menu; every price, guest, driver, plate, phone number and address below
 * is fictional sample data (555-01xx numbers, example.test emails).
 * Values match sober-ride-deck/pos-demo (build-spec section 3b).
 */

export type PriceMode = 'fare_on_tab' | 'venue_perk';

export interface MenuItem { name: string; cents: number; kind: 'drink' | 'food' }
export interface Address { line: string; area: string; aliases?: string[] }

export const venue = {
  slug: 'maison-cheryl',
  name: 'Maison Cheryl',
  addressLine: '2900 Wilson Blvd, Suite 104, Arlington, VA 22201',
  neighborhood: 'Clarendon, Arlington',
  pickupSpot: 'front door, N Fillmore St',
  pickupShort: 'Front door, N Fillmore St.',
  /** Fictional 555-01xx number. */
  phone: '(703) 555-0142',
  phoneTel: '+17035550142',
  disclaimer:
    'Maison Cheryl is shown as an illustrative example, not a live RideNite partner. Menu item names are from its published menu; prices, guests, drivers and rides are sample data.',
  /** Venue's written procedure (shown to staff first on quiet requests). */
  procedure: [
    'Let the manager on duty know (Imani tonight).',
    'Go over in person, low-key. Book the car without asking why.',
    'If the guest raises a concern, get the manager or security first and follow venue policy. The car is one option.',
  ],

  /** Tax applies to drinks and food only, never ride lines (POS 3a item 5). */
  taxRate: 0.11,
  taxLabel: 'Tax 11%',
  taxNote: 'VA sales 6% + Arlington meals 5%, on drinks and food',

  priceMode: 'fare_on_tab' as PriceMode,
  perkCents: 1000,
  tabLineName: 'Courtesy car',
  /** M1 has no bartender screens yet, so the guest's Yes books directly (UI 5 P3 venue setting). */
  guestTapBooks: true,
  defaultTipPct: 20,
  tipOptions: [18, 20, 22, 0],

  menu: [
    { name: 'The Pear Necessities', cents: 1400, kind: 'drink' },
    { name: 'Old Fashioned', cents: 1500, kind: 'drink' },
    { name: 'House Beer', cents: 800, kind: 'drink' },
    { name: 'Madeleines', cents: 1200, kind: 'food' },
  ] as MenuItem[],

  /** Sample quote and fare scenarios (POS 3b). */
  quoteCents: 2100,
  e2NewQuoteCents: 2350,
  finalFareCents: { higher: 2460, lower: 1890, equal: 2100, over: 2740 },
  overCapReason: 'You added a stop at 11:28 PM',
  etaMinutes: 6,

  seat: 'Table 7',
  tabNumber: '4468',
  card: { last4: '4242' }, // hold deadline is computed from the tab open time (src/lib/hold.ts)
  night: {
    morningClock: 'Sat 9:04 AM',
    tabOpened: '7:42 PM',
    booked: '11:11 PM',
    pickedUp: '11:19 PM',
    complete: '11:37 PM',
  },

  guest: {
    name: 'Maya R.',
    first: 'Maya',
    phoneLast4: '0127',
    email: 'maya.r@example.test',
    home: { line: '655 N Harrison St', area: 'Westover, Arlington, VA 22205' } as Address,
  },
  friend: { name: 'Jess', phone: '(555) 010-4471' },
  driver: {
    name: 'Luis M.',
    first: 'Luis',
    car: 'Gray Toyota Camry',
    carShort: 'gray Camry',
    plate: 'XLT-5012',
    plateSpoken: 'X L T 5 0 1 2',
    partner: 'Northside Car Service',
    phoneTel: '+15550100188',
  },
  smsFrom: '(555) 010-0100',

  /** 'Use my location' is SIMULATED: no geolocation or geocoder call, it fills this sample address. */
  sampleLocation: { line: '1200 N Garfield St', area: 'Clarendon, Arlington, VA 22201' } as Address,

  /** Seeded address list for forgiving typed matching (UI 9b). Fictional sample data. */
  addresses: [
    { line: '655 N Harrison St', area: 'Westover, Arlington, VA 22205' },
    { line: '655 S Harrison St', area: 'Arlington, VA 22204' },
    { line: '655 Harrison St NW', area: 'Washington, DC' },
    { line: '1200 N Garfield St', area: 'Clarendon, Arlington, VA 22201' },
    { line: '3100 Clarendon Blvd', area: 'Clarendon, Arlington, VA 22201' },
    { line: '4301 Fairfax Dr', area: 'Ballston, Arlington, VA 22203' },
    { line: '1500 Wilson Blvd', area: 'Rosslyn, Arlington, VA 22209' },
    { line: '2200 Columbia Pike', area: 'Arlington, VA 22204' },
    { line: 'Capital One Arena', area: '601 F St NW, Washington, DC', aliases: ['capital one arena', 'the arena'] },
  ] as Address[],
  /** Bartender side (M2). Seeded open tabs per UI 7 B1, with Maison Cheryl numbers. Fictional guests. */
  bar: {
    status: 'Full Live',
    earlierRidesTonight: 4, // sample: rides completed before the seeded ones
    sideDoor: 'side door, Wilson Blvd',
    managerOnDuty: 'Theo',
    procedure: [
      'Let the manager on duty know (Theo tonight).',
      'Go over in person, low-key. Book the house car without asking why.',
      'If the guest raises a concern, get the manager or security first and follow venue policy. The car is one option.',
    ],
    feeCents: 100,
    // Item names are Maison Cheryl menu items; prices and guests are sample data.
    tabs: [
      { tab: '4468', seat: 'Table 7', guest: 'Maya R.', phoneLast4: '0127', items: [['The Pear Necessities', 1], ['Old Fashioned', 1], ['House Beer', 1], ['Madeleines', 1]] },
      { tab: '4471', seat: 'Bar 3', guest: 'Dev K.', phoneLast4: '0144', items: [['The Pear Necessities', 2], ['House Beer', 1]] },
      { tab: '4472', seat: 'Table 12', guest: 'Jordan T.', phoneLast4: '0152', items: [['Old Fashioned', 3], ['The Pear Necessities', 1], ['Madeleines', 1]] },
      { tab: '4474', seat: 'Bar 5', guest: 'Ana G.', phoneLast4: '0163', items: [['The Pear Necessities', 2]] },
      { tab: '4475', seat: 'Table 2', guest: 'Priya S. +2', phoneLast4: '0171', items: [['Old Fashioned', 4], ['The Pear Necessities', 2], ['Madeleines', 2]] },
      { tab: '4476', seat: 'Bar 9', guest: 'Sam O.', phoneLast4: '0185', items: [['The Pear Necessities', 1], ['House Beer', 1]] },
      { tab: '4473', seat: 'Table 4', guest: 'Rosa L.', phoneLast4: '0139', items: [['The Pear Necessities', 2], ['Old Fashioned', 2]] },
    ] as { tab: string; seat: string; guest: string; phoneLast4: string; items: [string, number][] }[],
    /** Sample guests for "+ New guest" (no typing in the demo; live product: first name + mobile). */
    newGuests: [
      { guest: 'Lee W.', phoneLast4: '0193' },
      { guest: 'Nia B.', phoneLast4: '0196' },
    ],
    /** Seeded live rides: tab, stage at load, car. Stages advance on the demo timeline. */
    seededRides: [
      { tab: '4472', stage: 'arrived', car: 'White Toyota Prius', plate: 'T555031C', plateSpoken: 'T 5 5 5 0 3 1 C', driver: 'Ravi', partner: 'Northside Car Service', scenario: 'higher' },
      { tab: '4474', stage: 'en_route', car: 'Black Honda Accord', plate: 'XKR-2207', plateSpoken: 'X K R 2 2 0 7', driver: 'Mei', partner: 'Northside Car Service', scenario: 'lower' },
      { tab: '4476', stage: 'declined', car: 'Silver Ford Fusion', plate: 'VBN-4410', plateSpoken: 'V B N 4 4 1 0', driver: 'Omar', partner: 'Clarendon Livery', scenario: 'higher' },
    ] as { tab: string; stage: 'arrived' | 'en_route' | 'declined'; car: string; plate: string; plateSpoken: string; driver: string; partner: string; scenario: 'higher' | 'lower' | 'equal' | 'over' }[],
    rebookPartner: 'Arlington Black Car',
    quietTab: '4473',
  },
} as const;

export type Venue = typeof venue;
