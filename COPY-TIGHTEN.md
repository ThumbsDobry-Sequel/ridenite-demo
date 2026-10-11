# Copy tightening proposal (not applied)

Jason: "the app reads a bit wordy." This lists every string in the golden copy snapshot (`tests/golden/copy-snapshot.json`, 48 guest, bar, owner and demo screens, rendered at Sat Oct 10, 10:30 PM ET), with a shorter version where one helps. **Proposal only: nothing in the app was changed.**

Rules kept: no em or en dashes; no safety or liability claims; the quote plus cap disclosure stays whole; "Fare goes on your tab at pickup" timing stays (one SMS proposal adds "at pickup" where the current text implies otherwise). Harper-approved legal lines (the morning ride-question line, the confirm "never more than" line, the approved entry sentence) are marked **needs Harper** and left as is. Required labels (SIMULATED DEMO, Sample data, fictional notices, SMS STOP/HELP), prices, names, times and record lines are kept.

## Totals

| | Words |
|---|---|
| Unique strings | 533 (141 with 6+ words, 392 shorter) |
| Before (all unique strings) | **2584** |
| After (all unique strings) | **2440** (144 fewer, 6%) |
| Before (6+ word strings only) | 1513 |
| After (6+ word strings only) | 1369 (10% fewer) |
| Strings with a proposal | 63 |
| Marked needs Harper | 4 |

Counts are per unique string. A string that appears on several screens counts once. Word count = space-separated tokens.

## Needs Harper (unchanged)

- If you feel unsafe or just need to get home, you can put your ride home on your bar tab. No app, no phone, no separate payment.
- More than that and we'll ask you first. You pay the final fare, never more than $25.20 unless you approve a change.
- If you say no, it is not charged. RideNite settles the rest with the car service; Maison Cheryl pays nothing extra.
- Ride charge look wrong? Tap here. We'll start on it with Maison Cheryl today. If it's wrong, Maison Cheryl refunds it to your card, and we'll text you when that's done. Your bank may take a few business days to show it.

## Strings with 6 or more words

| Current | Proposed | Words now | Words proposed | Screens | Note |
|---|---|---|---|---|---|
| One tap, then confirm the price. | Tap, then confirm the price. | 6 | 5 | /g/home |  |
| Your ride home, on your tab. | KEEP | 6 | 6 | /g/p1 |  |
| Need to head out? Ask your bartender, or tap below and staff will come over. You'll see the price before anything is booked. | Heading out? Ask your bartender or tap below. You'll see the price before booking. | 23 | 14 | /g/p1 |  |
| If you feel unsafe or just need to get home, you can put your ride home on your bar tab. No app, no phone, no separate payment. | needs Harper | 27 | 27 | /g/p1 |  |
| Ride goes on your tab at Maison Cheryl. No app needed. You'll see the price first. | Goes on your tab at Maison Cheryl. No app. Price shown first. | 16 | 12 | /g/p1 |  |
| Rides are provided by licensed drivers. Maison Cheryl is shown as an illustrative example, not a live RideNite partner. | KEEP (partner disclaimer) | 19 | 19 | /g/p1 |  |
| Sample venue and data are fictional. | KEEP | 6 | 6 | /g/p1 |  |
| See the price before we book. | Price shown before booking. | 6 | 4 | /g/p1h |  |
| Got it. Someone from Maison Cheryl is coming over. | Got it. Maison Cheryl staff are coming over. | 9 | 8 | /g/p3w |  |
| You'll get a text to pick where you're going and see the price. | You'll get a text to pick a drop-off and see the price. | 13 | 12 | /g/p3w |  |
| Send it quietly, or show this screen to any staff member. | Send it quietly, or show this screen to staff. | 11 | 9 | /g/p12 |  |
| Thanks. A staff member will find you. | Thanks. Staff will find you. | 7 | 5 | /g/p12s |  |
| 655 N Harrison St, Westover, Arlington, VA 22205 | KEEP | 8 | 8 | /g/p2 |  |
| Staff will set it for you | Staff will set it | 6 | 4 | /g/p2 |  |
| $21.00 goes on your tab when you're picked up. Final fare may differ by up to $4.20. | KEEP (quote and cap disclosure, design rev 04 lock) | 17 | 17 | /g/p3, /g/p4 |  |
| More than that and we'll ask you first. You pay the final fare, never more than $25.20 unless you approve a change. | needs Harper | 22 | 22 | /g/p3 |  |
| Slide to confirm. You can undo for 10 seconds. | Slide to confirm. Undo within 10 seconds. | 9 | 7 | /g/p3 |  |
| Card, keys, phone, jacket, bag. Check with staff if they're holding your card. | Card, keys, phone, jacket, bag. Ask staff if they have your card. | 13 | 12 | /g/e3, /g/p4, /g/p5 +1 |  |
| Cancel now and nothing is added to your tab. | Cancel now and nothing goes on your tab. | 9 | 8 | /g/p4 |  |
| Pickup at front door, N Fillmore St | KEEP | 7 | 7 | /g/p5 |  |
| Before you get in, check the plate. Your driver will say your first name. | Check the plate first. Your driver will say your first name. | 14 | 11 | /g/p5 |  |
| On your tab at Maison Cheryl | KEEP | 6 | 6 | /g/p5, /g/p5w |  |
| Final fare may differ by up to $4.20. | KEEP (cap disclosure) | 8 | 8 | /g/p5, /g/p5w, bar:B3 |  |
| Driver, car and plate are fictional. | KEEP | 6 | 6 | /g/p5 |  |
| You can wait inside. We'll text you when it's at the door. | Wait inside. We'll text you when it's at the door. | 12 | 10 | /g/p5w |  |
| Front door, N Fillmore St. Gray Camry. | KEEP | 7 | 7 | /g/e3 |  |
| The driver waits about 3 more min. After that the ride may be canceled and nothing goes on your tab. | Driver waits about 3 more min. If it's canceled, nothing goes on your tab. | 20 | 14 | /g/e3 |  |
| Arrive near 655 N Harrison St | KEEP | 6 | 6 | /g/p6 |  |
| Map is illustrative. No map tiles are loaded. | Illustrative map. No tiles loaded. | 8 | 5 | /g/p6 |  |
| Your ride from Maison Cheryl is on your tab. | KEEP | 9 | 9 | /g/p7 |  |
| Opens your own messages app. Optional. | Opens your messages app. Optional. | 6 | 5 | /g/p7 |  |
| RideNite books rides. It is not an emergency service. | KEEP (not an emergency service) | 9 | 9 | /g/p8 |  |
| Share my trip with a friend | Share my trip | 6 | 3 | /g/p13 |  |
| We text them the ride service's trip link: car, plate and progress until drop-off. | We text them the trip link: car, plate and progress to drop-off. | 14 | 12 | /g/p13 |  |
| Gray Toyota Camry, driver Luis M. | KEEP | 6 | 6 | /g/p13f |  |
| Exact home address is not shown. Link expires at drop-off. | Home address hidden. Link expires at drop-off. | 10 | 7 | /g/p13f |  |
| Fictional sample trip. Simulated friend view. | KEEP | 6 | 6 | /g/p13f |  |
| Nothing was added to your tab. | KEEP | 6 | 6 | /g/e1 |  |
| The price changed before your car was booked. Nothing was added to your tab. | The price changed before booking. Nothing went on your tab. | 14 | 10 | /g/e2 |  |
| Your new quote once you tap Yes. Final fare may differ by up to $4.70. | New quote once you tap Yes. Final fare may differ by up to $4.70. | 15 | 14 | /g/e2 |  |
| Slide to confirm, or press and hold. You can undo for 10 seconds. | Slide or press and hold to confirm. Undo within 10 seconds. | 13 | 11 | /g/e2 |  |
| Your tab here is already closed. Nothing was added to it. | Your tab is already closed. Nothing was added. | 11 | 8 | /g/e4 |  |
| You can still get a car | KEEP | 6 | 6 | /g/e4 |  |
| Staff can open a ride-only check for you. | Staff can open a ride-only check. | 8 | 6 | /g/e4 |  |
| Last update 9:56 PM. This page refreshes when you're back online. | Updated 9:56 PM. Refreshes when you're back online. | 11 | 8 | /g/e5 |  |
| Phone dying? Staff can see your ride and show you the plate. | Phone dying? Staff can see your ride and plate. | 12 | 9 | /g/e5 |  |
| Your driver cancelled. Nothing was added to your tab. | KEEP | 9 | 9 | /g/e6 |  |
| Please see the bar staff to rebook | See bar staff to rebook | 7 | 5 | /g/e6 |  |
| Staff were told on their screen and can rebook in one tap, with another service if needed. | Staff were alerted and can rebook in one tap, with another service if needed. | 17 | 14 | /g/e6 |  |
| Added, as shown before booking (up to $4.20) | Added, within the $4.20 shown before booking | 8 | 7 | /g/e7 |  |
| You added a stop at 11:28 PM, so the trip came in higher than quoted. The extra $2.20 is not charged unless you say yes. | You added a stop at 11:28 PM, so the fare came in higher. The extra $2.20 is charged only if you say yes. | 25 | 23 | /g/e7 | Keeps the yes-only rule. |
| If you say no, it is not charged. RideNite settles the rest with the car service; Maison Cheryl pays nothing extra. | needs Harper (says RideNite settles the rest and the venue pays nothing extra; a cost-absorption claim) | 21 | 21 | /g/e7 |  |
| Simulated messages on this phone. Nothing was really sent. | Simulated messages. Nothing was sent. | 9 | 5 | /g/inbox |  |
| Your receipt from Maison Cheryl is ready | KEEP | 7 | 7 | /g/inbox |  |
| Email: Your receipt from Maison Cheryl | KEEP | 6 | 6 | /g/inbox |  |
| Last night's tab, ready to review. $88.79 | Your tab, ready to review: $88.79 | 7 | 6 | /g/inbox | Also fixes "Last night's", which is false when read the same night. |
| Sample messages. Names, numbers and links are fictional. | KEEP | 8 | 8 | /g/inbox |  |
| Subject: Your receipt from Maison Cheryl | KEEP | 6 | 6 | /g/m1 |  |
| Here's last night's tab from Maison Cheryl, including your ride home: 10:04 PM, $24.60, on your tab. | Your Maison Cheryl tab, with your ride home (picked up 10:04 PM, $24.60). | 17 | 13 | /g/m1 | Drops "last night's" (false the same night) and the repeated "on your tab". |
| Questions about drinks or food go to Maison Cheryl. | Drink or food questions? Ask Maison Cheryl. | 9 | 7 | /g/m1, /g/p10, /g/p9 |  |
| Saturday, Oct 10. Ride home is on your tab. | KEEP (Harper receipt rule) | 9 | 9 | /g/m1, /g/p9 |  |
| RideNite car home, Clarendon area to Westover area, picked up 10:04 PM, $24.60 | KEEP (line format set by Nico) | 13 | 13 | /g/m1, /g/p9 |  |
| Ride ID RN-7Q4K2M. Courtesy car, Northside Car Service, XLT-5012 | KEEP | 9 | 9 | /g/m1 |  |
| Ride charge look wrong? Tap here. We'll start on it with Maison Cheryl today. If it's wrong, Maison Cheryl refunds it to your card, and we'll text you when that's done. Your bank may take a few business days to show it. | needs Harper | 42 | 42 | /g/m1, /g/p9 |  |
| Your card ending 4242 is on hold. If you do nothing, it's charged Sun, Oct 11 at 11:00 AM. Question about a charge? Open Review and tap "Something's wrong." | Card ending 4242 is on hold and is charged Sun, Oct 11 at 11:00 AM if you do nothing. Charge question? Open Review and tap "Something's wrong." | 29 | 27 | /g/m1 | Same meaning; not a Harper-approved line, but it is hold wording, so worth Harper's glance. |
| 2900 Wilson Blvd, Suite 104, Arlington, VA 22201. Maison Cheryl is shown as an illustrative example, not a live RideNite partner. Menu item names are from its published menu; prices, guests, drivers and rides are sample data. SAMPLE: no real charge. | KEEP (venue address and sample-data disclaimer) | 41 | 41 | /g/m1 |  |
| RideNite: Your car is requested. Luis, gray Camry, plate XLT-5012, about 6 min. It goes on your tab at Maison Cheryl ($21.00). Before you get in, check the plate. | RideNite: Car requested. Luis, gray Camry, XLT-5012, about 6 min. $21.00 goes on your Maison Cheryl tab at pickup. Check the plate before you get in. | 29 | 26 | /g/m2 | Current text implies the fare posts at request; adds "at pickup" (charge-at-pickup timing). |
| RideNite: Your car is about 2 min away. You can wait inside. We'll text you when it's at the door. | RideNite: Car about 2 min away. Wait inside; we'll text when it's at the door. | 20 | 15 | /g/m2 |  |
| RideNite: You've arrived. Your ride from Maison Cheryl is on your tab. | RideNite: You've arrived. The ride is on your Maison Cheryl tab. | 12 | 11 | /g/m2 |  |
| RideNite: Your receipt from Maison Cheryl is ready: rdnt.example/m/abc123 Reply STOP to opt out, HELP for help. | KEEP (STOP and HELP wording required for SMS) | 17 | 17 | /g/m2 |  |
| SAMPLE: no real charge. Messages are simulated. | KEEP | 7 | 7 | /g/m2 |  |
| Picked up. Luis M., gray Camry, XLT-5012 | KEEP | 7 | 7 | /g/p9 |  |
| Dropped off near 655 N Harrison St. Final fare $24.60 | KEEP | 10 | 10 | /g/p9 |  |
| VA sales 6% + Arlington meals 5%, on drinks and food | KEEP | 11 | 11 | /g/p9 |  |
| Tip is on drinks and food ($49.00), not the ride. | Tip is on drinks and food ($49.00) only. | 10 | 8 | /g/p9 |  |
| Ride ID RN-7Q4K2M. Made up of the lines below. | Ride ID RN-7Q4K2M. The lines below add up to this. | 9 | 10 | /g/p9 |  |
| Confirmed by guest, 9:56 PM (sample data) | KEEP (guest record) | 7 | 7 | /g/p10, /g/p9 |  |
| Quote $21.00, may differ by up to $4.20, as shown at the time. | KEEP (record of the disclosure shown) | 13 | 13 | /g/p10, /g/p9 |  |
| Ride fare adjustment (final fare $24.60, quoted $21.00) | Ride fare adjustment (final $24.60, quoted $21.00) | 8 | 7 | /g/p9 |  |
| Within the $4.20 you saw before booking. | Within the $4.20 shown before booking. | 7 | 6 | /g/p9 |  |
| Card ending 4242 is on hold. If you do nothing, it's charged Sun, Oct 11 at 11:00 AM. | Card ending 4242 is on hold and is charged Sun, Oct 11 at 11:00 AM if you do nothing. | 18 | 19 | /g/p9 |  |
| Fictional sample bill. SAMPLE: no real charge. | KEEP | 7 | 7 | /g/p9 |  |
| Pick what's wrong to send it. | Pick what's wrong. | 6 | 3 | /g/p10 |  |
| $88.79 paid with card ending 4242. | KEEP | 6 | 6 | /g/p11 |  |
| Save my home address for next time | Save my home address | 7 | 4 | /g/p11 |  |
| Simulated. Each fault starts from a fresh ride, so faults never stack. | Simulated. Each fault starts fresh, so faults never stack. | 12 | 9 | /g/demo |  |
| E7 Over the cap: your OK | KEEP | 6 | 6 | /g/demo |  |
| Driver accepts, then cancels (current ride) | KEEP | 6 | 6 | /g/demo |  |
| Force "stale quote" (older than 5 min) | KEEP | 7 | 7 | /g/demo |  |
| Linked to Table 7, tab #4468 | KEEP | 6 | 6 | /g/demo |  |
| Static screens for review. Every number here is sample data, not real results. | Static review screens. All numbers are sample data. | 13 | 8 | /o |  |
| Rides on tabs, adjustments and credits | KEEP | 6 | 6 | /o |  |
| Maison Cheryl, Fri night. Placeholder layout. | KEEP | 6 | 6 | /o/summary |  |
| Counts only. No guest names, reasons or notes are shown. | Counts only. No guest names, reasons or notes. | 10 | 8 | /o/summary |  |
| Display only. Controls are disabled in this preview. | Display only. Controls disabled. | 8 | 4 | /o/limits |  |
| Booked in 2 taps Sample data | KEEP | 6 | 6 | /o/bar |  |
| Placeholder. Riley will mock the full bartender screens. | KEEP | 8 | 8 | /o/bar |  |
| Take the 12-minute RideNite module in the next 14 days. You can book guest requests now. | Take the 12-min RideNite module within 14 days. You can book guest requests now. | 16 | 14 | bar:B0 |  |
| The training module is not part of this demo. | Training module is not in this demo. | 9 | 7 | bar:B0 |  |
| Quiet request · Table 4 · 10:28 PM | KEEP | 8 | 8 | bar:B1 |  |
| Link sent · waiting for drop-off | KEEP | 6 | 6 | bar:B1 |  |
| Dev saw $21.00 on their phone | KEEP | 6 | 6 | bar:B1 |  |
| Table 2 · Priya S. +2 | KEEP | 6 | 6 | bar:B1, bar:B2, bar:More |  |
| Demo: + New guest adds a sample guest. The live app asks for first name and mobile. | Demo: + New guest adds a sample guest. The live app asks for first name and mobile. | 17 | 17 | bar:B1 |  |
| Sample data Guests, tabs and cars are fictional. | KEEP | 8 | 8 | bar:B1 |  |
| We record only which one. No reason, notes or drink counts. | Only the choice is recorded. No reasons, notes or drink counts. | 11 | 11 | bar:B2 |  |
| Can I get you a car home? It goes on your tab. | KEEP | 12 | 12 | bar:B2 |  |
| A car never replaces stopping service. | KEEP | 6 | 6 | bar:B2 |  |
| Pick Guest asked or I offered first. | Pick Guest asked or I offered. | 7 | 6 | bar:B2 |  |
| + New guest: sample guest, opens a tab | KEEP | 8 | 8 | bar:B2 |  |
| Bar seat 3 · tab #4471 | KEEP | 6 | 6 | bar:B3 |  |
| Dev K. ...0144 · pickup: front door | KEEP | 7 | 7 | bar:B3 |  |
| Dev said yes on their phone. | KEEP | 6 | 6 | bar:B3 |  |
| Priya S. +2 ...0171 · pickup: front door | KEEP | 8 | 8 | bar:B3 staff |  |
| Pick the drop-off the guest tells you, then show them the price. Sample list, no typing. | Pick the guest's drop-off, then show them the price. Sample list, no typing. | 16 | 13 | bar:B3 staff |  |
| Ride booked. Fare goes on tab #4472 at pickup. | KEEP | 9 | 9 | bar:B6, bar:Booked |  |
| Quoted fare $21.00. Posts to tab #4472 at pickup. | KEEP | 9 | 9 | bar:Booked |  |
| Jordan can scan this to follow the ride on their phone. | Jordan can scan this to follow the ride. | 11 | 8 | bar:Booked |  |
| tab #4472 · Guest request · booked 10:29 PM | KEEP | 9 | 9 | bar:B4 |  |
| tab #4474 · Staff offer · booked 10:29 PM | KEEP | 9 | 9 | bar:B4 |  |
| tab #4476 · Guest request · booked 10:29 PM | KEEP | 9 | 9 | bar:B4 |  |
| Nothing here asks staff to confirm arrival. No sound. | Staff never confirm arrival here. No sound. | 9 | 7 | bar:B4 |  |
| Staff offer · Northside Car Service | KEEP | 6 | 6 | bar:B5 |  |
| Guest request · Northside Car Service | KEEP | 6 | 6 | bar:B5 |  |
| Counts and rows only. No reasons, notes or drink counts. Earlier rides tonight are not in this demo. | KEEP | 18 | 18 | bar:B5 |  |
| Table 12 · Jordan T. · tab #4472 | KEEP | 8 | 8 | bar:B6 |  |
| Tip prompt base: $71.00 (drinks and food, not the ride). | Tip base: $71.00 (drinks and food only). | 10 | 7 | bar:B6 |  |
| Ride pending pickup. The fare goes on this tab at pickup. | Ride pending pickup. Fare posts to this tab at pickup. | 11 | 10 | bar:B6 |  |
| White Toyota Prius · T555031C · driver Ravi | KEEP | 8 | 8 | bar:B6 |  |
| Offered to any guest. Never tied to drinks purchased. | Offered to any guest, never tied to drinks bought. | 9 | 9 | bar:B8 |  |
| Venue procedure (shown first on quiet requests) | KEEP | 7 | 7 | bar:B8 |  |
| Let the manager on duty know (Theo tonight). | KEEP | 8 | 8 | bar:B10, bar:B8 |  |
| Go over in person, low-key. Book the house car without asking why. | Go over in person, low-key. Book the house car; don't ask why. | 12 | 12 | bar:B10, bar:B8 |  |
| If the guest raises a concern, get the manager or security first and follow the venue's procedure. The car is one option. | KEEP | 22 | 22 | bar:B10, bar:B8 |  |
| White Toyota Prius · driver Ravi | KEEP | 6 | 6 | bar:B9 |  |
| Front door, N Fillmore St · $21.00 on your tab | KEEP | 10 | 10 | bar:B9 |  |
| The driver can call the bar at (703) 555-0142 if needed. | KEEP | 11 | 11 | bar:B9 |  |
| Car for a guest at Table 4 | KEEP | 7 | 7 | bar:B10 |  |
| Book the house car (Guest asked) | KEEP | 6 | 6 | bar:B10 |  |
| Pickup at side door (Wilson Blvd) | KEEP | 6 | 6 | bar:B10 |  |
| Shown as "Guest asked" in ride history. This alert is deleted after 30 days. No reason codes or notes. No sound. | Logged as "Guest asked". Alert deleted after 30 days. No reason codes, notes or sound. | 21 | 15 | bar:B10 |  |

## Short strings (under 6 words): kept as is

Labels, buttons, headings, amounts, names and times. Already short; no change proposed.

| Current | Words | Screens |
|---|---|---|
| SIMULATED DEMO | 2 | /g/demo, /g/e1, /g/e2 +45 |
| Menu | 1 | /g/demo, /g/e1, /g/e2 +45 |
| Ride home, | 2 | /g/home |
| on your tab. | 3 | /g/home |
| MORE | 1 | /g/home |
| Somewhere else | 2 | /g/home |
| Type an address | 3 | /g/home |
| › | 1 | /g/home, /o |
| Last night's receipt | 3 | /g/home |
| Sat Oct 10 · $88.79 | 5 | /g/home |
| Fictional sample data | 3 | /g/home |
| No real cars or charges. | 5 | /g/home |
| Ride home | 2 | /g/home |
| To 655 N Harrison St | 5 | /g/home |
| SIMULATED DEMO. Fictional data only. | 5 | /g/demo, /g/e1, /g/e2 +45 |
| Table 7 | 2 | /g/p1, /g/p12s |
| Ask staff for a car | 5 | /g/e1, /g/p1, /g/p12 +1 |
| How it works | 3 | /g/p1, /g/p1h |
| Ask quietly instead | 3 | /g/p1 |
| Back | 1 | /g/demo, /g/inbox, /g/m1 +16 |
| Maison Cheryl | 2 | /g/e1, /g/e4, /g/e6 +6 |
| 1 | 1 | /g/p1h, bar:B4 |
| Tell us where you're going. | 5 | /g/p1h |
| 2 | 1 | /g/p1h, bar:B4 |
| 3 | 1 | /g/p1h |
| It goes on your check. | 5 | /g/p1h |
| Maya R. | 2 | /g/e2, /g/p2, /g/p3w +1 |
| Cancel request | 2 | /g/p12s, /g/p3w |
| I'd like the house car. | 5 | /g/p12 |
| Where are you sitting? (optional) | 5 | /g/p12 |
| Send quietly | 2 | /g/p12 |
| No need to explain. | 4 | /g/p12s |
| Where to? | 2 | /g/p2 |
| Home | 1 | /g/p2 |
| Type it | 2 | /g/p2, /g/p2t |
| Big keyboard, we'll fix typos | 5 | /g/p2 |
| Use my location | 3 | /g/p2, /g/p2t |
| Sample location (simulated) | 3 | /g/p2 |
| Ask the bartender | 3 | /g/p2 |
| Addresses are fictional sample data. | 5 | /g/p2 |
| Address or place | 3 | /g/p2t |
| Suggestions are fictional sample data. | 5 | /g/p2t |
| Confirm ride | 2 | /g/p3 |
| Going to | 2 | /g/p3 |
| Home, 655 N Harrison St | 5 | /g/p3 |
| Change | 1 | /g/p3 |
| Just me | 2 | /g/p3 |
| Me + 1 to 3 | 5 | /g/p3 |
| $21.00 | 1 | /g/e2, /g/e7, /g/p3 +5 |
| Pickup | 1 | /g/p3 |
| Front door, N Fillmore St | 5 | /g/p3 |
| Car | 1 | /g/p3 |
| Partner car, about 6 min | 5 | /g/p3 |
| Slide to confirm | 3 | /g/p3 |
| Cancel | 1 | /g/p3, bar:B2 |
| Ride requested. Finding a driver. | 5 | /g/p4 |
| Do you have everything? | 4 | /g/e3, /g/p4, /g/p5 +1 |
| Got it | 2 | /g/e3, /g/p4, /g/p5 +1 |
| Cancel ride | 2 | /g/p4 |
| Driver on the way | 4 | /g/p5, /o/bar |
| 6 min | 2 | /g/p5, bar:B4 |
| XLT-5012 | 1 | /g/e3, /g/e5, /g/p13f +2 |
| Share | 1 | /g/p5, /g/p5w, /g/p6 |
| Help | 1 | /g/e6, /g/p5, /g/p5w +3 |
| L | 1 | /g/p5, /g/p5w |
| Luis M. | 2 | /g/p5, /g/p5w |
| Gray Toyota Camry | 3 | /g/p5, /g/p5w |
| Northside Car Service (local partner) | 5 | /g/p5 |
| 2 min away | 3 | /g/p5w |
| Driver is 2 minutes away. | 5 | /g/p5w |
| Car is outside | 3 | /g/e3 |
| Your car is here | 4 | /g/e3 |
| I'm coming | 2 | /g/e3 |
| Call the driver | 3 | /g/e3, /g/p8 |
| Picked up | 2 | /g/p6 |
| 10:04 PM | 2 | /g/p6, /g/p9 |
| PickupHome | 1 | /g/p13f, /g/p6 |
| 11 min | 2 | /g/p13f, /g/p6 |
| arrive about 11:43 PM | 4 | /g/p6 |
| Picked up 10:04 PM | 4 | /g/p6 |
| On the way | 3 | /g/p6 |
| RideNite | 1 | /g/p13f, /g/p7 |
| 10:22 PM | 2 | /g/m2, /g/p7, /g/p9 |
| Dropped off | 2 | /g/p7 |
| You've arrived. | 2 | /g/p7 |
| Text a friend I'm home | 5 | /g/p7 |
| Done | 1 | /g/p11, /g/p7, bar:B9 |
| Call 911 | 2 | /g/p8 |
| Call the bar | 3 | /g/p8 |
| Cancel or change ride | 4 | /g/p8 |
| Close | 1 | /g/p8 |
| Share my trip | 3 | /g/p13 |
| Friend's mobile number | 3 | /g/p13 |
| Send trip link | 3 | /g/p13 |
| Number is fictional. | 3 | /g/p13 |
| Shared trip | 2 | /g/p13f |
| Maya is heading home | 4 | /g/p13f |
| to arrival area | 3 | /g/p13f |
| No driver found yet. | 4 | /g/e1 |
| Keep looking | 2 | /g/e1 |
| Staff can see this too. | 5 | /g/e1 |
| Was | 1 | /g/e2 |
| New quote | 2 | /g/e2 |
| $23.50 | 1 | /g/e2 |
| Slide: $23.50 is OK | 4 | /g/e2 |
| No, look for another car | 5 | /g/e2 |
| Ask staff to add it | 5 | /g/e4 |
| No signal | 2 | /g/e5 |
| Your ride is still booked | 5 | /g/e5 |
| Gray Toyota Camry, Luis M. | 5 | /g/e5 |
| Try again | 2 | /g/e5 |
| Ask staff to rebook | 4 | /g/e6 |
| Sat 10:30 PM | 3 | /g/e7, /g/m2, /g/p9 |
| Your ride came to $27.40. | 5 | /g/e7 |
| Quote you OK'd | 3 | /g/e7 |
| +$4.20 | 1 | /g/e7 |
| Needs your OK | 3 | /g/e7 |
| $2.20 | 1 | /g/e7 |
| Yes, add $2.20 | 3 | /g/e7 |
| No, don't add it | 4 | /g/e7 |
| Fictional sample amounts. | 3 | /g/e7 |
| Sat 9:00 AM | 3 | /g/inbox |
| Morning inbox | 2 | /g/inbox |
| Messages: RideNite | 2 | /g/inbox |
| Email | 1 | /g/m1 |
| RideNite for Maison Cheryl | 4 | /g/m1 |
| To: maya.r@example.test | 2 | /g/m1 |
| Sat, Oct 10, 10:30 PM | 5 | /g/m1 |
| Good morning, Maya. | 3 | /g/m1 |
| BAR SALES | 2 | /g/m1, /g/p9 |
| Drinks and food $49.00 | 4 | /g/m1 |
| Tax 11% $5.39 | 3 | /g/m1 |
| Staff tip (20%) $9.80 | 4 | /g/m1, /g/p9 |
| Bar sales subtotal $64.19 | 4 | /g/m1, /g/p9 |
| RIDENITE RIDES | 2 | /g/m1, /g/p9 |
| $24.60 | 1 | /g/m1 |
| RideNite rides subtotal $24.60 | 4 | /g/m1, /g/p9 |
| Total $88.79 | 2 | /g/m1, /g/p9 |
| Review and pay | 3 | /g/m1 |
| RideNite (555) 010-0100 | 3 | /g/m2 |
| Messages | 1 | /g/m2 |
| Sat 9:56 PM | 3 | /g/m2 |
| Night of Sat, Oct 10 | 5 | /g/p9 |
| Ready to review: $88.79 | 4 | /g/p9 |
| Your night | 2 | /g/p9 |
| 6:30 PM | 2 | /g/p9 |
| Tab opened at Maison Cheryl | 5 | /g/p9 |
| 9:56 PM | 2 | /g/p9 |
| Ride home booked (you confirmed) | 5 | /g/p9 |
| Drinks | 1 | /g/p9 |
| The Pear Necessities $14.00 | 4 | /g/p9, bar:B6 |
| Old Fashioned $15.00 | 3 | /g/p9 |
| House Beer $8.00 | 3 | /g/p9 |
| Food | 1 | /g/p9 |
| Madeleines $12.00 | 2 | /g/p9, bar:B6 |
| Tax 11% | 2 | /g/p9 |
| $5.39 | 1 | /g/p9 |
| Tip for bar staff | 4 | /g/p9 |
| 18% | 1 | /g/p9 |
| 20% | 1 | /g/p9 |
| 22% | 1 | /g/p9 |
| None | 1 | /g/p9 |
| Courtesy car, quoted fare | 4 | /g/p9 |
| Northside Car Service | 3 | /g/p9, bar:B4 |
| +$3.60 | 1 | /g/p9 |
| Approve and pay $88.79 | 4 | /g/p9 |
| Something's wrong | 2 | /g/p9 |
| What's wrong? | 2 | /g/p10 |
| Ride on your tab | 4 | /g/p10 |
| I don't recognize a charge | 5 | /g/p10 |
| An amount is wrong | 4 | /g/p10 |
| The ride didn't happen | 4 | /g/p10 |
| Something else | 2 | /g/p10 |
| Note about the charge (optional) | 5 | /g/p10 |
| Send to Maison Cheryl | 4 | /g/p10 |
| Sat 9:06 AM | 3 | /g/p11 |
| Paid | 1 | /g/p11 |
| All set | 2 | /g/p11 |
| Receipt sent to maya.r@example.test | 4 | /g/p11 |
| Download receipt (PDF) | 3 | /g/p11 |
| SAMPLE: no real charge. | 4 | /g/p11 |
| Demo controls | 2 | /g/demo |
| EDGE CASES | 2 | /g/demo |
| E1 No car available | 4 | /g/demo |
| E2 Price changed before booking | 5 | /g/demo |
| E3 Car is waiting | 4 | /g/demo |
| E4 Tab already closed | 4 | /g/demo |
| E5 No signal | 3 | /g/demo |
| E6 Driver cancelled | 3 | /g/demo |
| DRIVER SEARCH | 2 | /g/demo |
| Force "No driver found" | 4 | /g/demo |
| TAB LINK | 2 | /g/demo |
| Unlink this phone | 3 | /g/demo |
| SAVED HOME | 2 | /g/demo |
| Forget saved home (first-time guest) | 5 | /g/demo |
| FINAL FARE (MORNING RECEIPT $88.79) | 5 | /g/demo |
| Higher | 1 | /g/demo, bar:B6 |
| Lower | 1 | /g/demo, bar:B6 |
| Same | 1 | /g/demo, bar:B6 |
| Over cap | 2 | /g/demo, bar:B6 |
| Next re-quote: same price (off) | 5 | /g/demo |
| RIDE | 1 | /g/demo |
| Next ride status | 3 | /g/demo |
| Open the staff link (P2) | 5 | /g/demo |
| ALL GUEST SCREENS | 3 | /g/demo |
| HOME | 1 | /g/demo |
| P1 | 1 | /g/demo |
| P1H | 1 | /g/demo |
| P3W | 1 | /g/demo |
| P12 | 1 | /g/demo |
| P12S | 1 | /g/demo |
| P2 | 1 | /g/demo |
| P2T | 1 | /g/demo |
| P3 | 1 | /g/demo |
| P4 | 1 | /g/demo |
| P5 | 1 | /g/demo |
| P5W | 1 | /g/demo |
| E3 | 1 | /g/demo |
| P6 | 1 | /g/demo |
| P7 | 1 | /g/demo |
| P8 | 1 | /g/demo |
| P13 | 1 | /g/demo |
| P13F | 1 | /g/demo |
| E1 | 1 | /g/demo |
| E2 | 1 | /g/demo |
| E4 | 1 | /g/demo |
| E5 | 1 | /g/demo |
| E6 | 1 | /g/demo |
| E7 | 1 | /g/demo |
| INBOX | 1 | /g/demo |
| M1 | 1 | /g/demo |
| M2 | 1 | /g/demo |
| P9 | 1 | /g/demo |
| P10 | 1 | /g/demo |
| P11 | 1 | /g/demo |
| DEMO | 1 | /g/demo, bar:B8, bar:More |
| /O | 1 | /g/demo |
| /O/SUMMARY | 1 | /g/demo |
| /O/LIMITS | 1 | /g/demo |
| /O/BAR | 1 | /g/demo |
| Reset demo data | 3 | /g/demo, bar:B8, bar:More |
| Demo screen, sample data | 4 | /o, /o/bar, /o/limits +1 |
| Owner preview | 2 | /o, /o/bar, /o/limits +1 |
| Morning summary | 2 | /o, /o/summary |
| Ride limit per tab | 4 | /o, /o/limits |
| Setting preview, display only | 4 | /o |
| Bar view | 2 | /o, /o/bar |
| What staff see | 3 | /o |
| Rides on guest tabs | 4 | /o/summary |
| 7 Sample data | 3 | /o/summary |
| Guest asked | 2 | /o/summary, bar:B1, bar:B2 +1 |
| 5 Sample data | 3 | /o/summary |
| I offered | 2 | /o/summary, bar:B1, bar:B2 +1 |
| 2 Sample data | 3 | /o/summary |
| Fare adjustments posted | 3 | /o/summary |
| 3, total +$8.40 Sample data | 5 | /o/summary |
| Fare credits posted | 3 | /o/summary |
| 1, total -$2.10 Sample data | 5 | /o/summary |
| Held for guest OK | 4 | /o/summary |
| 1, $2.20 Sample data | 4 | /o/summary |
| Rides per tab per night | 5 | /o/limits |
| Current value: 1 Sample data | 5 | /o/limits |
| Table 7 · tab #4468 | 5 | /o/bar |
| $49.00 Sample data | 3 | /o/bar |
| Welcome, partner. | 2 | bar:B0 |
| Go to Tonight | 3 | bar:B0 |
| Start the module | 3 | bar:B0 |
| Tonight | 1 | bar:B1, bar:B4, bar:B5 +4 |
| Live | 1 | bar:B1, bar:B4, bar:B5 +3 |
| History | 1 | bar:B1, bar:B4, bar:B5 +3 |
| More | 1 | bar:B1, bar:B4, bar:B5 +3 |
| 10:30 PM | 2 | bar:B1, bar:B4, bar:B5 +3 |
| Rides tonight: 7 | 3 | bar:B1, bar:B4, bar:B5 +3 |
| Full Live | 2 | bar:B1, bar:B4, bar:B5 +3 |
| Open | 1 | bar:B1 |
| Bar 9 · Sam O. | 5 | bar:B1, bar:B2, bar:B4 +1 |
| tab #4476 | 2 | bar:B1 |
| $22.00 | 1 | bar:B1, bar:B2 |
| Driver declined. Rebook? | 3 | bar:B1, bar:B4, bar:B5 |
| Rebook | 1 | bar:B1, bar:B4 |
| Table 4 · Rosa L. | 5 | bar:B1, bar:B2, bar:More |
| tab #4473 | 2 | bar:B1 |
| $58.00 | 1 | bar:B1, bar:B2 |
| Quiet request · 10:28 PM | 5 | bar:B1, bar:B10 |
| Table 7 · Maya R. | 5 | bar:B1, bar:B2, bar:More |
| tab #4468 | 2 | bar:B1 |
| $49.00 | 1 | bar:B1, bar:B2 |
| Resend text | 2 | bar:B1 |
| Bar 3 · Dev K. | 5 | bar:B1, bar:B2, bar:More |
| tab #4471 | 2 | bar:B1 |
| $36.00 | 1 | bar:B1, bar:B2 |
| tab #4475 | 2 | bar:B1 |
| $112.00 | 1 | bar:B1, bar:B2 |
| Table 12 · Jordan T. | 5 | bar:B1, bar:B4, bar:Booked +1 |
| tab #4472 | 2 | bar:B1 |
| $71.00 | 1 | bar:B1 |
| Arrived | 1 | bar:B1, bar:B4, bar:B5 +2 |
| Open tab | 2 | bar:B1, bar:B4 |
| Bar 5 · Ana G. | 5 | bar:B1, bar:B4, bar:More |
| tab #4474 | 2 | bar:B1 |
| $28.00 | 1 | bar:B1 |
| Driver on the way (XKR-2207) | 5 | bar:B1, bar:B4, bar:B5 |
| + New guest | 3 | bar:B1 |
| Book ride | 2 | bar:B1, bar:B4 |
| Book a car | 3 | bar:B2 |
| Whose tab? | 2 | bar:B2 |
| Drop-off | 1 | bar:B3, bar:B3 staff |
| Text guest a link | 4 | bar:B3, bar:B3 staff |
| Show a QR | 3 | bar:B3, bar:B3 staff |
| I'll enter the drop-off | 4 | bar:B3, bar:B3 staff |
| Drop-off: Clarendon (Dev entered) | 4 | bar:B3 |
| Local partner, 6 min | 4 | bar:B3 |
| Quote, goes on tab #4471. | 5 | bar:B3 |
| Guest saw the price | 4 | bar:B3, bar:B3 staff |
| Guest says they feel unsafe? | 5 | bar:B3, bar:B3 staff |
| Book | 1 | bar:B3, bar:B3 staff, bar:B6 |
| Demo: price changes before booking | 5 | bar:B3 |
| Table 2 · tab #4475 | 5 | bar:B3 staff |
| 1200 N Garfield St | 4 | bar:B3 staff |
| Clarendon | 1 | bar:B3 staff |
| 3100 Clarendon Blvd | 3 | bar:B3 staff |
| 4301 Fairfax Dr | 3 | bar:B3 staff |
| Ballston | 1 | bar:B3 staff |
| 1500 Wilson Blvd | 3 | bar:B3 staff |
| Rosslyn | 1 | bar:B3 staff |
| Waiting for a price. | 4 | bar:B3 staff |
| Ride booked | 2 | bar:Booked |
| Entry point: Guest asked | 4 | bar:Booked |
| Open the guest link | 4 | bar:Booked |
| Go to Live rides | 4 | bar:Booked |
| Another partner | 2 | bar:B4 |
| Active now | 2 | bar:B4 |
| Avg pickup wait tonightSample | 4 | bar:B4 |
| 4 | 1 | bar:B4 |
| Completed tonight | 2 | bar:B4 |
| Needs attention | 2 | bar:B4 |
| Live rides | 2 | bar:B4 |
| White Toyota Prius · T555031C | 5 | bar:B4 |
| Quote $21.00 | 2 | bar:B4 |
| Show plate card | 3 | bar:B4, bar:B6 |
| Black Honda Accord · XKR-2207 | 5 | bar:B4 |
| Silver Ford Fusion · VBN-4410 | 5 | bar:B4 |
| Clarendon Livery | 2 | bar:B4 |
| Ride history, tonight | 3 | bar:B5 |
| All entry points | 3 | bar:B5 |
| Guest request | 2 | bar:B5 |
| Staff offer | 2 | bar:B5 |
| 10:29 PM · tab #4474 | 5 | bar:B5 |
| 10:29 PM · tab #4476 | 5 | bar:B5 |
| Guest request · Clarendon Livery | 5 | bar:B5 |
| 10:29 PM · tab #4472 | 5 | bar:B5 |
| Old Fashioned x3 $45.00 | 4 | bar:B6 |
| Tax $7.81 | 2 | bar:B6 |
| Total before tip $78.81 | 4 | bar:B6 |
| Ride | 1 | bar:B6 |
| Demo: final fare | 3 | bar:B6 |
| Demo: skip to drop-off | 4 | bar:B6 |
| Demo: driver cancels before pickup | 5 | bar:B6 |
| Close tab now | 3 | bar:B6 |
| Hold for morning checkout | 4 | bar:B6 |
| Settings | 1 | bar:B8, bar:More |
| RIDES AND PRICING | 3 | bar:B8 |
| Price display | 2 | bar:B8 |
| Fare on tab | 3 | bar:B8 |
| Venue perk, first $10.00 | 4 | bar:B8 |
| Tab line name | 3 | bar:B8 |
| Courtesy car | 2 | bar:B8 |
| RideNite Ride | 2 | bar:B8 |
| VENUE | 1 | bar:B8, bar:More |
| Morning receipt | 2 | bar:B8 |
| Neutral (recommended) | 2 | bar:B8 |
| Detailed | 1 | bar:B8 |
| Car-close notice | 2 | bar:B8 |
| 2 min | 2 | bar:B8 |
| Show this to the guest | 5 | bar:B9 |
| Jordan, your car is outside | 5 | bar:B9 |
| T555031C | 1 | bar:B9 |
| Maison Cheryl procedure | 3 | bar:B10 |
| Just one rider | 3 | bar:B10 |
| Mark seen | 2 | bar:B10 |
| TABS | 1 | bar:More |
| tab #4468 · $49.00 | 4 | bar:More |
| tab #4471 · $36.00 | 4 | bar:More |
| tab #4472 · $71.00 | 4 | bar:More |
| tab #4474 · $28.00 | 4 | bar:More |
| tab #4475 · $112.00 | 4 | bar:More |
| tab #4476 · $22.00 | 4 | bar:More |
| tab #4473 · $58.00 | 4 | bar:More |
| Quiet request | 2 | bar:More |
| THIS PHONE | 2 | bar:More |
| Switch to guest view | 4 | bar:More |
| Same phone, same demo | 4 | bar:More |
