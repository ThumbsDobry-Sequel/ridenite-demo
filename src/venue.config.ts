/**
 * Venue configuration. EVERYTHING venue specific lives in this one file:
 * name, address, phone, pickup spot, menu, tax, sample quote and fare scenarios,
 * driver, guest and seeded addresses. Swapping venues means editing only this file.
 *
 * SIMULATED DEMO. Maison Cheryl (Clarendon area) is shown with the
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
  /** Area only (Piper/Riley/Quinn, Oct 11): no street address on any guest, staff, email or receipt screen. */
  addressLine: 'Maison Cheryl, Clarendon area',
  neighborhood: 'Clarendon, Arlington',
  /** Venue header is the venue's own PNG logo (design rev 04.1: no venue font). Light recolor on night, teal on day. */
  logo: { night: '/venue/mc-horizontal-light.png', day: '/venue/mc-horizontal-teal.png', width: 471, height: 96 },
  /** Venue words (Nico 22:40): v1 is bars only, so the bill is a tab and staff are bartenders. Screens read these. */
  terms: { bill: 'tab', Bill: 'Tab', bills: 'tabs', staff: 'bartender', Staff: 'Bartender', staffs: 'bartenders' },
  /** Night summary heading (SCOPE: night summary, built after M2). */
  nightHeading: 'Your night, in one place',
  /** 00:00 to (cutoff - 1):59 counts as the previous night date. */
  nightCutoffHour: 6,
  /** Card hold window in hours (Toast-style POS hold). The charge time must land inside it. */
  holdHours: 24,
  /** RideNite's per-ride fee invoiced to the bar (owner data only). Read ONLY at booking: each ride stores the fee
   *  actually charged (feeChargedCents) and any Payout Return is computed from that stored value, never from here. */
  perRideFeeCents: 100,
  /** Owner data only. Payout Return window: calendar days after the ride's pickup date (ET) by which the
   *  processor's dispute notice must be dated. Harper recommends 150; Jason has not approved it yet. One-line change. */
  payoutReturnWindowDays: 90,
  pickupSpot: 'front door, Maison Cheryl',
  pickupShort: 'Front door, Maison Cheryl.',
  /** Fictional 555-01xx number. */
  phone: '(703) 555-0142',
  phoneTel: '+17035550142',
  disclaimer:
    'Maison Cheryl is shown as an illustrative example, not a live RideNite partner. Menu item names are from its published menu; prices, guests, drivers and rides are sample data.',
  /** Venue's written procedure (shown to staff first on quiet requests). */
  procedure: [
    'Let the manager on duty know (Imani tonight).',
    'Go over in person, low-key. Book the car without asking why.',
    "If the guest raises a concern, get the manager or security first and follow the venue's procedure. The car is one option.",
  ],

  /** Tax applies to bar tab items only, never ride lines (POS 3a item 5). */
  taxRate: 0.11,
  taxLabel: 'Tax 11%',
  taxNote: 'VA sales 6% + Arlington meals 5%, on food and items',

  priceMode: 'fare_on_tab' as PriceMode,
  perkCents: 1000,
  tabLineName: 'RideNite Ride',
  /** M1 has no bartender screens yet, so the guest's Yes books directly (UI 5 P3 venue setting). */
  guestTapBooks: true,
  defaultTipPct: 20,
  tipOptions: [18, 20, 22, 0],

  // Food and neutral items only (Quinn/Nico, Oct 11): nothing on the demo tab reads as a drinking cue.
  // Sum stays $49.00 so the standard night is $64.19 bar sales + $24.60 ride = $88.79.
  menu: [
    { name: 'Dinner for two', cents: 2900, kind: 'food' },
    { name: 'Table snacks', cents: 800, kind: 'food' },
    { name: 'Madeleines', cents: 1200, kind: 'food' },
  ] as MenuItem[],

  /** Sample quote and fare scenarios (POS 3b). */
  quoteCents: 2100,
  /** The quote is all-in (Harper 23:11): everything that can land on the guest's ride line is inside it, so
   *  "never more than $X" (X = quote + cap) holds. Fictional sample split; parts must sum to quoteCents. */
  quoteParts: { fare: 1660, taxes: 110, bookingFee: 330, tolls: 0, wait: 0, tip: 0 },
  e2NewQuoteCents: 2350,
  finalFareCents: { higher: 2460, lower: 1890, equal: 2100, over: 2740 },
  /** Fictional RideNite ride ID for the seeded sample ride (shown on the receipt ride line detail). */
  sampleRideId: 'RN-7Q4K2M',
  /** Over the cap without any guest change (traffic or the driver's route). A guest-added stop is a new quote (E7), never this. */
  overCapReason: "Traffic on the driver's route",
  /** E7 sample: new all-in quote after the guest adds a stop ($24.00, cap $4.80, never more than $28.80). */
  stopQuoteCents: 2400,
  /** Story source (Riley, Oct 11): booked, then pickup etaMinutes later, drop-off tripMinutes after pickup (11:26, 11:32, 11:46). */
  etaMinutes: 6,
  tripMinutes: 14,

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
    home: { line: 'Westover area', area: 'Westover, Arlington' } as Address,
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
  sampleLocation: { line: 'Courthouse area', area: 'Courthouse, Arlington' } as Address,

  /** Seeded address list for forgiving typed matching (UI 9b). Fictional sample data. */
  addresses: [
    // Area-only labels (Oct 11): neighborhoods, never street addresses. Index 3 is the sample location and the staff
    // default; 4-6 are the seeded bar rides; the bartender picker shows 3-6.
    { line: 'Westover area', area: 'Westover, Arlington', aliases: ['home', 'westover village'] },
    { line: 'Lyon Park area', area: 'Lyon Park, Arlington' },
    { line: 'Shirlington area', area: 'Shirlington, Arlington' },
    { line: 'Courthouse area', area: 'Courthouse, Arlington' },
    { line: 'Lyon Village area', area: 'Lyon Village, Arlington' },
    { line: 'Ballston area', area: 'Ballston, Arlington' },
    { line: 'Rosslyn area', area: 'Rosslyn, Arlington' },
    { line: 'Columbia Heights area', area: 'Columbia Heights, Washington DC' },
    { line: 'Penn Quarter area', area: 'Penn Quarter, Washington DC', aliases: ['downtown', 'downtown dc'] },
  ] as Address[],
  /** Bartender side (M2). Seeded open tabs per UI 7 B1, with Maison Cheryl numbers. Fictional guests. */
  bar: {
    status: 'Full Live',
    earlierRidesTonight: 4, // sample: rides completed before the seeded ones
    sideDoor: 'side door, Maison Cheryl',
    managerOnDuty: 'Theo',
    procedure: [
      'Let the manager on duty know (Theo tonight).',
      'Go over in person, low-key. Book the house car without asking why.',
      "If the guest raises a concern, get the manager or security first and follow the venue's procedure. The car is one option.",
    ],
    feeCents: 100,
    // Food and neutral sample items; prices and guests are sample data.
    tabs: [
      { tab: '4468', seat: 'Table 7', guest: 'Maya R.', phoneLast4: '0127', items: [['Dinner for two', 1], ['Table snacks', 1], ['Madeleines', 1]] },
      { tab: '4471', seat: 'Bar 3', guest: 'Dev K.', phoneLast4: '0144', items: [['Table snacks', 2], ['Madeleines', 1]] },
      { tab: '4472', seat: 'Table 12', guest: 'Jordan T.', phoneLast4: '0152', items: [['Dinner for two', 2], ['Madeleines', 1]] },
      { tab: '4474', seat: 'Bar 5', guest: 'Ana G.', phoneLast4: '0163', items: [['Table snacks', 2]] },
      { tab: '4475', seat: 'Table 2', guest: 'Priya S. +2', phoneLast4: '0171', items: [['Dinner for two', 2], ['Table snacks', 2], ['Madeleines', 2]] },
      { tab: '4476', seat: 'Bar 9', guest: 'Sam O.', phoneLast4: '0185', items: [['Table snacks', 1], ['Madeleines', 1]] },
      { tab: '4473', seat: 'Table 4', guest: 'Rosa L.', phoneLast4: '0139', items: [['Dinner for two', 1], ['Table snacks', 2]] },
    ] as { tab: string; seat: string; guest: string; phoneLast4: string; items: [string, number][] }[],
    /** Sample guests for "+ New guest" (no typing in the demo; live product: first name + mobile). */
    newGuests: [
      { guest: 'Lee W.', phoneLast4: '0193' },
      { guest: 'Nia B.', phoneLast4: '0196' },
    ],
    /** Seeded live rides: tab, stage at load, car. Stages advance on the demo timeline. */
    seededRides: [
      { tab: '4472', stage: 'arrived', agoSec: 340, quoteCents: 2350, car: 'White Toyota Prius', plate: 'T555031C', plateSpoken: 'T 5 5 5 0 3 1 C', driver: 'Ravi', partner: 'Northside Car Service', scenario: 'higher' },
      { tab: '4474', stage: 'near', agoSec: 290, quoteCents: 1875, car: 'Black Honda Accord', plate: 'XKR-2207', plateSpoken: 'X K R 2 2 0 7', driver: 'Mei', partner: 'Northside Car Service', scenario: 'lower' },
      { tab: '4476', stage: 'en_route', agoSec: 120, quoteCents: 2600, car: 'Silver Ford Fusion', plate: 'VBN-4410', plateSpoken: 'V B N 4 4 1 0', driver: 'Omar', partner: 'Clarendon Livery', scenario: 'higher' },
    ] as { tab: string; stage: 'arrived' | 'near' | 'en_route'; agoSec: number; quoteCents: number; car: string; plate: string; plateSpoken: string; driver: string; partner: string; scenario: 'higher' | 'lower' | 'equal' | 'over' }[],
    /** B5 history: the earlier completed rides tonight (sample rows; count matches earlierRidesTonight). */
    earlierHistory: [
      { agoMin: 34, tab: '4466', entry: 'Guest request', partner: 'Clarendon Livery', finalCents: 2410 },
      { agoMin: 58, tab: '4463', entry: 'Staff offer', partner: 'Northside Car Service', finalCents: 1960 },
      { agoMin: 87, tab: '4461', entry: 'Guest request', partner: 'Northside Car Service', finalCents: 2275 },
      { agoMin: 112, tab: '4458', entry: 'Guest request', partner: 'Arlington Black Car', finalCents: 1840 },
    ],
    rebookPartner: 'Arlington Black Car',
    quietTab: '4473',
  },
} as const;

export type Venue = typeof venue;

/** Venue words for copy: `${T.bill}` renders 'tab' for Maison Cheryl. */
export const T = venue.terms;
