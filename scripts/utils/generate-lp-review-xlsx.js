const XLSX = require('xlsx');
const path = require('path');

const outputPath = path.join(__dirname, '../../outputs/landing-page-reviews/vfairs-lp-platform-mobile-event-app-new-b-rewrites-2026-04-29.xlsx');

const wb = XLSX.utils.book_new();

// ─── Sheet 1: Rewrites ──────────────────────────────────────────────────────

const rewriteHeaders = [
  '#', 'Element Type', 'Current Copy', 'Verdict',
  'Rewrite Option 1', 'Rewrite Option 2', 'Rewrite Option 3',
  'Rationale', 'Status', 'Owner'
];

const rewriteRows = [
  [1, 'Eyebrow', 'vFairs Mobile Event App', 'Acceptable', '—', '—', '—', 'Works as a category label; not primary conversion copy', 'Not Started', ''],
  [2, 'H1', 'Empower Attendees With An All-in-one Mobile Event App', 'Needs Rewrite', 'The Only Event App With a Dedicated Support Rep Behind Every Event', 'Check In 180 Attendees in 15 Minutes. Keep Them Engaged All Day.', 'Your Branded Event App Built for In-Person and Hybrid Events', '"Empower" is vendor-speak; "all-in-one" used by 3 of 4 competitors; no outcome stated; fails 5-second differentiation test', 'Not Started', ''],
  [3, 'Sub-headline', 'Deliver exceptional events with a Mobile Event App that lets attendees create their schedules, join live polls and Q&A, get real-time updates, and connect easily with others.', 'Needs Rewrite', 'Built for event teams who need every attendee checked in, engaged, and networked from minute one. White-label branded, with a dedicated rep on call throughout.', 'For event managers running 300 to 5,000 person events who need attendees in the app from the moment they walk in. One branded app. One support rep. Zero check-in chaos.', 'Your attendees get a personalized agenda, floor map, and live networking feed. Your team gets a dedicated rep and real-time analytics. All in one app, branded as yours.', 'Opens with generic filler; lists features not buyer situation; not differentiated from any competitor', 'Not Started', ''],
  [4, 'Primary CTA', 'Request Demo', 'Needs Rewrite', 'See the App in Action', 'Book a Personalized Demo', 'Get a Free Guided Demo', '"Request Demo" is passive and standard across every SaaS vendor; specific CTA signals what the buyer gets', 'Not Started', ''],
  [5, 'H2 (section intro)', 'Offer An App That Elevates The Attendee And Exhibitor Experience', 'Needs Rewrite', 'Everything Your Attendees Need From Check-In to Closing Session', 'One App That Runs the Entire Event Experience for Attendees, Exhibitors, and Sponsors', 'Help Attendees Navigate, Engage, and Network Without Asking Staff for Help', '"Elevates the experience" is vague marketing-speak; no outcome; no ICP specificity', 'Not Started', ''],
  [6, 'H3', 'Help Attendees Quickly Navigate The Event And Build Connections.', 'Needs Rewrite', 'Help Attendees Find Their Next Session and Their Next Connection', 'From Floor Maps to 1:1 Meetings. All in One Tap.', 'Help Attendees Know Where to Go, Who to Meet, and What to Watch. At a Glance.', 'Undersells the full value (navigation + networking + check-in); period at end is stylistically odd', 'Not Started', ''],
  [7, 'Bullet: check-in', 'Check-in to onsite events within seconds, by scanning QR codes.', 'Needs Rewrite', 'Check in 180 attendees in 15 minutes with QR code scanning. No lines, no staff bottlenecks.', 'Scan QR codes at entry for instant check-in. Skip the line, start the event.', 'Cut your check-in time from 30 minutes to under 5 by replacing manual sign-ins with QR badge scanning.', 'Feature-led; real proof point (180 in 15 min) should be surfaced; no outcome stated', 'Not Started', ''],
  [8, 'Bullet: agenda', 'Browse the agenda and save sessions of interest.', 'Needs Rewrite', 'Build a personalized agenda in under 2 minutes. Bookmark sessions, get reminders, and never miss what matters.', 'Let attendees curate their day before they arrive. Personalized agenda with session bookmarks and push reminders.', 'Give attendees a schedule that fits their goals, not just a list of every session.', 'Generic feature description with no benefit; every competitor says this', 'Not Started', ''],
  [9, 'Bullet: floor map', 'Navigate the venue with interactive floor maps.', 'Needs Rewrite', 'Cut "where is room 4B?" questions by 90% with interactive floor maps attendees can search from their phone.', 'Give attendees GPS-style venue navigation so they spend time in sessions, not hallways.', 'Interactive floor maps so no attendee ever has to stop a staff member to find their room.', 'Feature-only; benefit (no confusion, no friction) not stated', 'Not Started', ''],
  [10, 'Bullet: push notifications', 'Stay informed with timely push notifications.', 'Acceptable', '—', '—', '—', 'Functional; not a priority rewrite', 'Not Started', ''],
  [11, 'Bullet: live chat', 'Connect with other attendees through live chat.', 'Needs Rewrite', 'Let attendees reach out to anyone at the event before the formal networking session starts.', 'In-app chat so attendees can connect with speakers, exhibitors, and peers from any session view.', 'Give attendees a way to connect the moment they arrive, not just during scheduled networking breaks.', 'Feature-only with no benefit; undersells value of pre-event and real-time connection', 'Not Started', ''],
  [12, 'Bullet: badge scan', 'Easily exchange contact information by scanning badges.', 'Needs Rewrite', 'Replace paper business cards with QR badge scanning. Contact details transfer instantly, no typing required.', 'One scan at a booth or networking session and attendees have full contact info saved in the app.', 'Give exhibitors and attendees a faster way to swap contacts than apps like LinkedIn require.', '"Easily" is a filler word; benefit (no manual entry, no lost cards) not stated', 'Not Started', ''],
  [13, 'Bullet: 1:1 meetings', 'Collaborate and discuss in group video calls or schedule 1:1 meetings with appointment booking.', 'Needs Rewrite', 'Let attendees schedule 1:1 meetings and join group video calls directly in the app, without emailing back and forth.', 'Book 1:1 meetings with exhibitors, speakers, or peers from any session page, with automatic calendar sync.', 'Give high-value attendees a way to schedule structured meetings before the event even starts.', 'Two features jammed into one bullet; no outcome; "appointment booking" buries the real value', 'Not Started', ''],
  [14, 'Bullet: matchmaking', 'Find perfect connections with smart video matchmaking.', 'Needs Rewrite', 'AI-powered matchmaking surfaces the right connections for each attendee based on their profile and session history.', 'Show attendees who else at the event matches their interests, role, and goals, automatically.', 'Smart attendee matchmaking so networking produces introductions attendees actually want, not random encounters.', '"Perfect connections" is vague; no mechanism stated; does not signal how it works or why it is better', 'Not Started', ''],
  [15, 'H3', 'Improve Attendee Participation & Ease Access to Key Content', 'Needs Rewrite', 'Keep Attendees Engaged Through Every Session, Break, and Networking Moment', 'Give Attendees Live Polls, Session Replays, and a Live Event Feed in One View', 'Boost Session Participation With Polls, Q&As, and On-Demand Replays After Every Talk', '"Improve participation" is vague and unmeasured; ampersand in headline is informal; "ease access" is passive', 'Not Started', ''],
  [16, 'Bullet: polls/Q&A', 'Participate in live polls, surveys and Q&As for real-time feedback.', 'Needs Rewrite', 'Increase session participation rates with in-app live polls, surveys, and Q&A that run without disrupting the presenter.', 'Let every attendee weigh in on every session with live polls and Q&As that display results in real time.', 'Replace passive listening with active participation. Live polls and Q&As run directly through the app during any session.', 'Feature-only; "real-time feedback" is vague; the benefit (higher engagement, richer presenter data) not stated', 'Not Started', ''],
  [17, 'Bullet: content hub', 'Access all event videos in a unified content hub and catch up on missed sessions with replays.', 'Needs Rewrite', 'Give attendees access to every session replay, so time zone conflicts and scheduling overlaps do not mean missed content.', 'A unified content hub where attendees can watch any session on demand, the moment it ends.', 'Stop losing attendees to packed schedules. Session replays let them catch what they missed, on their timeline.', 'Generic library description; the real benefit (zero FOMO, extended post-event engagement) is not mentioned', 'Not Started', ''],
  [18, 'H3', 'Easily Promote Sponsors, And Measure The Impact of Your Event', 'Needs Rewrite', 'Give Sponsors Real Visibility and Give Yourself Real Analytics', 'Track Every Exhibitor Scan, Sponsor Impression, and Check-In in Real Time', 'Turn Sponsor Placements Into Measurable ROI for Every Event', 'Comma placement is awkward; "Easily" is filler; two goals crammed into one H3 weakens both', 'Not Started', ''],
  [19, 'Bullet: CRM integration', 'Seamlessly integrate with CRMs and Martech systems for streamlined data management.', 'Needs Rewrite', 'Push every lead capture and badge scan directly into Salesforce, HubSpot, and Marketo without manual exports.', 'All attendee, lead, and scan data flows automatically into your CRM at event end. No CSV uploads, no data loss.', 'Connect vFairs to Salesforce, HubSpot, or Marketo. Every check-in, scan, and session view lands in your CRM automatically.', '"Seamlessly" is a banned word; "streamlined data management" is vague; CRM benefit (no manual work, no data loss) is the real conversion driver', 'Not Started', ''],
  [20, 'H2', 'What Sets Us Apart', 'Needs Rewrite', 'Why Event Teams Choose vFairs Over Cvent, Whova, and Bizzabo', 'Three Things You Get With vFairs That You Will Not Find in Other Event Apps', 'What Makes the vFairs Event App Different From Everything Else You Have Demoed', 'Generic placeholder heading; naming competitors signals confidence', 'Not Started', ''],
  [21, 'Section body: Complete Event Management Suite', 'Plan, run, and analyze your events, effortlessly—from start to finish. Create amazing event experiences with our all-in-one event platform that offers every tool you need, right at your fingertips.', 'Needs Rewrite', 'Registration, check-in, the mobile app, exhibitor management, and post-event analytics all live in one vFairs platform. No integration fees. No data gaps between tools.', 'Run your entire event from a single login. vFairs connects every module so your team spends the day managing the event, not chasing exports.', 'One platform covers your registration, mobile app, and analytics. Everything shares the same attendee data, in real time.', 'Contains em dash (hard brand violation); "effortlessly" and "amazing event experiences" are filler; "right at your fingertips" is an idiom', 'Not Started', ''],
  [22, 'Section body: Event Services for Any Company Size', 'Host standout events every time, no matter your company size. From startups to big players, our flexible tools easily scale up or down to fit your needs. Whether you\'re hosting a single event or managing multiple, one-time or recurring – we\'ve got your back!', 'Needs Rewrite', 'Run a 50-person internal summit or a 10,000-person annual conference. vFairs scales to your event size without requiring a different plan or a new vendor.', 'Whether you run two flagship events per year or forty regional ones, vFairs handles the load. Same platform, same support team, same pricing structure.', 'From first-time event organizers to teams managing multi-city event calendars. vFairs adjusts to your scale, not the other way around.', '"Standout events" and "big players" are cliches; "we\'ve got your back" is an idiom; no specific proof point', 'Not Started', ''],
  [23, 'Section body: Dedicated Customer Support', 'Count on our expert team to support your success. With quickest and most helpful responses, we offer dedicated assistance at every step of the way, ensuring your events run smoothly and efficiently.', 'Needs Rewrite', 'Every vFairs event comes with a dedicated support rep who knows your setup by name, not a help ticket queue. They are reachable throughout setup, rehearsal, and live event day.', 'When something goes wrong at 8am on event day, you call your rep, not a support hotline. vFairs assigns a named team member to every event, regardless of size.', 'You get one person who knows your event from configuration to closing. Your rep joins pre-event calls, stays on standby during the live event, and follows up after. That is not standard in this industry.', 'This is vFairs\' #1 competitive differentiator written with zero specifics. Dedicated support per event directly addresses the top buyer complaint.', 'Not Started', ''],
  [24, 'H2: awards section', 'No.1 Event Management Platform', 'Needs Rewrite', 'Rated #1 in Mobile Event Apps, Event Networking, and Event Registration by G2', '#1 on G2 and Gartner for Mobile Event Apps, Event Networking, and Event Management', 'The #1-Ranked Event Management Platform on G2 and Gartner', '"No.1" lacks a space (reads as a typo); should name the specific categories', 'Not Started', ''],
  [25, 'Final CTA body', 'Join the thousands of organizations worldwide using vFairs. Create epic event experiences for your audiences of all sizes, whether it\'s 50, 500 or 10,000+', 'Needs Rewrite', '3.5 million attendees. 150+ industries. 100+ countries. See why T-Mobile, Amazon, and Salesforce choose vFairs for their most important events.', 'Your next event can run on the same platform as T-Mobile and NHS. See what the vFairs mobile app looks like for your audience size in a 30-minute demo.', 'From 50-person summits to 10,000-person conferences. Your attendees get the same experience either way. Book a demo to see it configured for your event type.', '"Epic event experiences" is vague; "join the thousands" is boilerplate; existing proof stats (3.5M attendees, logos) should lead this section', 'Not Started', ''],
  [26, 'Final CTA button', 'Contact Sales', 'Needs Rewrite', 'Book a Demo', 'See a Live Demo', 'Get a Personalized Demo', '"Contact Sales" signals friction; buyers at this stage want to see the product, not talk to a rep', 'Not Started', ''],
];

const rewriteData = [rewriteHeaders, ...rewriteRows];
const ws1 = XLSX.utils.aoa_to_sheet(rewriteData);

// Column widths
ws1['!cols'] = [
  { wch: 4 },  // #
  { wch: 28 }, // Element Type
  { wch: 50 }, // Current Copy
  { wch: 14 }, // Verdict
  { wch: 50 }, // Option 1
  { wch: 50 }, // Option 2
  { wch: 50 }, // Option 3
  { wch: 60 }, // Rationale
  { wch: 14 }, // Status
  { wch: 16 }, // Owner
];

// Freeze top row
ws1['!freeze'] = { xSplit: 0, ySplit: 1 };

XLSX.utils.book_append_sheet(wb, ws1, 'Rewrites');

// ─── Sheet 2: Competitor Copy ────────────────────────────────────────────────

const compHeaders = ['Brand', 'Page URL', 'H1', 'Sub-headline', 'Primary CTA', 'Top H2 #1', 'Top H2 #2', 'Top H2 #3'];

const compRows = [
  ['vFairs (current)', 'vfairs.com/lp/platform/mobile-event-app-new-b', 'Empower Attendees With An All-in-one Mobile Event App', 'Deliver exceptional events with a Mobile Event App that lets attendees create their schedules, join live polls and Q&A, get real-time updates, and connect easily with others.', 'Request Demo', 'Offer An App That Elevates The Attendee And Exhibitor Experience', 'What Sets Us Apart', 'What Our Customers Are Saying'],
  ['Cvent', 'cvent.com/en/event-marketing-management/mobile-event-apps', 'AI-POWERED EVENT APP', 'The transformation from Event App to AI assistant', 'Tour the app now', 'Step in the new age of AI-powered attendee experiences', 'Create personalized experiences with CventIQ', 'Keep your event and attendee data safe'],
  ['Bizzabo', 'bizzabo.com/platform/mobile-event-app', 'Delight attendees with a memorable mobile event app', 'Build a mobile hub that puts attendees in the driver\'s seat. Give them the tools to network, navigate the venue, engage in sessions, and more.', 'Request a Demo', 'Provide personalized guidance with Bizzy, an AI attendee copilot', 'Create a powerful networking experience with our conference app', 'Drive ROI for sponsors and exhibitors'],
  ['Accelevents', 'accelevents.com/event-app', 'Event App', 'The only event app that adds to your attendee experience', 'Book a demo', 'Event app for conferences that stays in sync with your event management platform', 'Custom agendas for a personalized experience', 'Advanced networking and collaboration features'],
  ['EventMobi', 'eventmobi.com/experiences/conferences/', 'Make Your Conference or Expo More Informative. Exciting. Interactive. Enriching.', 'Get the #1 Event app for Conferences and Expos. From convenient registration to your conference app, live polls and surveys, onsite digital signage, interactive games and robust analytics.', 'Get Pricing / Book Demo', 'Ensure You Hit Your Conference Goals', 'Keep Attendees Engaged and Informed', 'Drive Additional Sponsorship Revenue'],
];

const compData = [compHeaders, ...compRows];
const ws2 = XLSX.utils.aoa_to_sheet(compData);

ws2['!cols'] = [
  { wch: 16 }, // Brand
  { wch: 44 }, // URL
  { wch: 46 }, // H1
  { wch: 56 }, // Sub-headline
  { wch: 18 }, // CTA
  { wch: 44 }, // H2 1
  { wch: 44 }, // H2 2
  { wch: 44 }, // H2 3
];

ws2['!freeze'] = { xSplit: 0, ySplit: 1 };

XLSX.utils.book_append_sheet(wb, ws2, 'Competitor Copy');

// ─── Sheet 3: Keywords ───────────────────────────────────────────────────────

const kwHeaders = ['Keyword', 'Volume (US)', 'KD', 'Traffic Potential', 'Type', 'Notes'];

const kwRows = [
  // Head terms
  ['event app', 2000, 39, 150, 'Head term', 'High volume, low TP — opportunity for better-converting page'],
  ['conference app', 700, 30, 3200, 'Head term', 'Strong TP; buyers comparing conference app options'],
  ['event apps', 700, 23, 3200, 'Head term', 'Plural variant; same buyer intent as "event app"'],
  ['mobile event app', 600, 4, 400, 'Head term', 'Primary page keyword; KD very low = quick win'],
  ['badge printing', 600, 0, 5900, 'Head term', 'KD 0, TP 5,900 — adjacent feature with almost no competition; add to FAQ'],
  ['event mobile app', 250, 22, 450, 'Head term', 'Word-order variant of primary keyword'],
  ['mobile event app software', 200, 38, 700, 'Head term', 'Buyer further in funnel; software-comparison intent'],
  ['mobile event check in app', 200, 4, 1400, 'Head term', 'Strong buyer intent; check-in angle; KD only 4'],
  ['event management mobile app', 150, 7, 15000, 'Head term', 'TP 15,000 — highest TP in category; organizer intent'],
  ['mobile app for event', 100, 17, 3200, 'Head term', 'TP 3,200; organizer/planner intent'],
  // Long-tail
  ['best mobile event app for conferences', 50, 4, null, 'Long-tail / decision', 'Decision-stage; FAQ or comparison section target'],
  ['best mobile event app', 50, 0, 1100, 'Long-tail / decision', 'KD 0; low-effort FAQ/H2 target'],
  ['best event networking app for mobile', 40, null, null, 'Long-tail / decision', 'Networking-focused buyer segment vFairs can claim'],
  ['corporate event mobile app', 60, 56, 3200, 'Long-tail / segment', 'Enterprise segment; TP 3,200; consider dedicated section'],
  ['mobile event app builder', 50, null, null, 'Long-tail / feature', 'White-label/custom branding intent; vFairs strength'],
  ['free mobile event app', 40, 33, 150, 'Long-tail / objection', 'Pricing objection; add FAQ answer ("is there a free version?")'],
  ['mobile app for event management', 60, 12, 1400, 'Long-tail / feature', 'TP 1,400; organizer-side intent vs attendee intent'],
  ['cvent mobile event app', 50, null, null, 'Competitor-branded', 'Buyers comparing Cvent vs alternatives; comparison page opportunity'],
  ['whova', 12000, 39, 15000, 'Competitor-branded', 'TP 15,000; very high volume; vFairs vs Whova comparison page'],
  ['event management software mobile app', 40, null, null, 'Long-tail / category', 'Researching the category broadly; TOFU'],
];

const kwData = [kwHeaders, ...kwRows];
const ws3 = XLSX.utils.aoa_to_sheet(kwData);

ws3['!cols'] = [
  { wch: 38 }, // Keyword
  { wch: 14 }, // Volume
  { wch: 8 },  // KD
  { wch: 16 }, // TP
  { wch: 22 }, // Type
  { wch: 60 }, // Notes
];

ws3['!freeze'] = { xSplit: 0, ySplit: 1 };

XLSX.utils.book_append_sheet(wb, ws3, 'Keywords');

// ─── Write file ──────────────────────────────────────────────────────────────

XLSX.writeFile(wb, outputPath);
console.log('XLSX written to:', outputPath);
