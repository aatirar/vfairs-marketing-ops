/**
 * push-cro-to-sheets.js
 *
 * Pushes Google Ads CRO analysis (2026-04-28) to a new tab in an existing spreadsheet.
 *
 * Usage: node automation/push-cro-to-sheets.js
 * Target sheet: https://docs.google.com/spreadsheets/d/1P4uZEZ3JJ4Cv_zI50cG92KAYKCh3DRftbsbmNGByrbU
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SPREADSHEET_ID = '1P4uZEZ3JJ4Cv_zI50cG92KAYKCh3DRftbsbmNGByrbU';
const TAB_TITLE = 'CRO Analysis 2026-04-28';

const COLUMNS = [
  'Campaign',
  'Landing Page URL',
  'Search Term Cluster',
  'Buyer Intent',
  'Ad Group',
  'Current Ad Headlines',
  'Current Ad Descriptions',
  'Proposed Ad Headlines (≤30 chars each)',
  'Proposed Ad Descriptions (≤90 chars each)',
  'Current LP H1',
  'Current LP H2',
  'Proposed Action',
  'Proposed H1',
  'Proposed H2',
  'Negatives to Add'
];

const COLUMN_WIDTHS = [
  200, // Campaign
  320, // Landing Page URL
  280, // Search Term Cluster
  180, // Buyer Intent
  200, // Ad Group
  350, // Current Ad Headlines
  380, // Current Ad Descriptions
  320, // Proposed Ad Headlines
  340, // Proposed Ad Descriptions
  280, // Current LP H1
  280, // Current LP H2
  280, // Proposed Action
  280, // Proposed H1
  280, // Proposed H2
  300  // Negatives to Add
];

// ─────────────────────────────────────────────
// DATA: All 24 rows across 4 page sections
// ─────────────────────────────────────────────
const EMP_B_URL = 'https://www.vfairs.com/lp/platform/event-management-platform-new-b';
const MOBILE_APP_URL = 'https://www.vfairs.com/lp/platform/mobile-event-app-new-b';
const VCONF_URL = 'https://www.vfairs.com/lp/platform/virtual-conference-new';
const VJF_URL = 'https://www.vfairs.com/event-management-platform/virtual-job-fair/';

const EMP_H1 = 'One Platform to Plan, Run, and Measure Every Event You Host';
const EMP_H2 = 'Replace multiple tools with just one. Automate registration, check-in, engagement, and reporting — all in vFairs.';
const MOBILE_H1 = 'Empower Attendees With An All-in-one Mobile Event App';
const MOBILE_H2 = 'Deliver exceptional events with a Mobile Event App that lets attendees create their schedules, join live polls and Q&A, get real-time updates, and connect easily with others.';

const DATA = [
  // ──────────────────────────────────────────────────────────────────────
  // CAMPAIGN 1: All-In-One Event Solution → EMP-B
  // ──────────────────────────────────────────────────────────────────────
  {
    campaign: '*vFairs | USA | All-In-One Event Solution',
    lpUrl: EMP_B_URL,
    cluster: 'event management software, event management platform, event management tools',
    intent: 'Commercial — software buyer. Mid-funnel, comparing options.',
    adGroup: 'Event Management',
    currentH: '"Event Management Software" · "Easy Event Management" · "#1 All-in-one Event Management" · "Best Event Management Software" · "Plan & Launch Events Fast"',
    currentD: '"Simplify event management with one platform from registration to reporting." · "30K+ in-person events delivered. 100M+ attendees managed. 1,700+ reviews." · "Gartner Magic Quadrant Leader. Book a Demo of our Event Management Software."',
    proposedH: '"Replace Your Event Tool Stack" (29) · "All Events in One Platform" (26) · "Registration to Reporting" (25)',
    proposedD: '"One login, one vendor, one bill. Registration, check-in, reporting in one place." (80) · "100M+ attendees managed. 5,000+ brands trust vFairs. Gartner Leader." (68)',
    currentH1: EMP_H1,
    currentH2: EMP_H2,
    proposedAction: 'Edit LP H1 — directionally right but lacks specificity. Keep same LP.',
    proposedH1: 'Run Registration, Check-In, and Reporting Without Switching Tools',
    proposedH2: 'Replace disconnected tools with one platform. 20,000+ events trust vFairs.',
    negatives: 'event management companies, event management agency, event management firm'
  },
  {
    campaign: '*vFairs | USA | All-In-One Event Solution',
    lpUrl: EMP_B_URL,
    cluster: 'event planning software, event planning tools, conference planning software',
    intent: 'Commercial — planner buying software. Clear purchase intent. Manages 5–50 events/year.',
    adGroup: 'Event Planning',
    currentH: '"Best Event Planning Software" · "Plan Events Like A Pro" · "Built for Event Planners" · "All-in-One Planning Tool" · "Easy Agenda Management" · "Lead Capture Included"',
    currentD: '"Streamline your planning process & create unforgettable events with vFairs." · "Plan and launch events of any size. 100M+ attendees managed with vFairs." · "Manage sessions, booths & leads. Trusted by 5,000+ planners. vFairs powers 30K+ events."',
    proposedH: '"Plan Events From One Dashboard" (30) · "Built for Event Planners" (24) · "Agenda to Check-In, One Tool" (28)',
    proposedD: '"Manage sessions, booths & leads. Trusted by 5,000+ planners. vFairs powers 30K+ events." (88) · "Gartner Leader. 1,700+ reviews. End-to-end planning software for pros." (70)',
    currentH1: EMP_H1,
    currentH2: EMP_H2,
    proposedAction: 'Edit LP H1. Add ad group-level headline customizer for conference planning queries.',
    proposedH1: 'Plan Events From Registration to Wrap-Up — All in One Platform',
    proposedH2: 'No more spreadsheets or juggling 4 tools. Build your entire event workflow in vFairs.',
    negatives: 'event planning tips, how to plan an event, event planner career, event planner jobs'
  },
  {
    campaign: '*vFairs | USA | All-In-One Event Solution',
    lpUrl: EMP_B_URL,
    cluster: 'event planning app, event planner app, event organizer app',
    intent: 'Mixed — leans consumer. "App" implies mobile-first personal planning. Low B2B intent.',
    adGroup: 'Event Planning (same RSA pool)',
    currentH: '"Best Event Planning Software" · "Plan Events Like A Pro" · "Best Event Management App"',
    currentD: '"Streamline your planning process & create unforgettable events with vFairs." · "vFairs offers everything from registrations, virtual & onsite solutions to reporting."',
    proposedH: 'PAUSE or bid down. If kept: "Event App for Organizers" (24) · "App Built for Event Teams" (25)',
    proposedD: 'If kept: "Event teams managing 500+ attendees use vFairs for check-in, app, and reporting." (77)',
    currentH1: EMP_H1,
    currentH2: EMP_H2,
    proposedAction: 'Add consumer intent queries as negatives. Keep only organizer-intent variants with +for +organizers.',
    proposedH1: 'The Event Organizer App for Teams Running 100+ Attendees',
    proposedH2: 'Check-in, agenda, lead capture, and analytics. One app. Built for organizers.',
    negatives: 'event planning app free, party planning app, wedding planner app, event planner app free'
  },
  {
    campaign: '*vFairs | USA | All-In-One Event Solution',
    lpUrl: EMP_B_URL,
    cluster: 'conference management software, conference management system, conference registration platform',
    intent: 'Commercial — conference-specific buyer. High intent. Looking for CFP, sessions, registration platform.',
    adGroup: 'Conference Management',
    currentH: '"Conference Management Software" · "Conference Planning Made Easy" · "Host Conferences Like A Pro" · "An All-in-one Event Solution" · "You Deserve Epic Event Tools"',
    currentD: '"Manage your conferences effectively with vFairs conference management software." · "Take control of your events with vFairs end-to-end conference management software." · "Drive revenue, generate leads, retain customers with vFairs conferences."',
    proposedH: '"Manage Conferences End-to-End" (29) · "CFP to Check-In, One Platform" (29) · "Conference Platform by vFairs" (29)',
    proposedD: '"Manage conferences from CFP to post-event reporting. Book a demo today." (69) · "Drive revenue, generate leads with vFairs conferences. Get started today." (71)',
    currentH1: EMP_H1,
    currentH2: EMP_H2,
    proposedAction: 'REDIRECT this ad group to /lp/platform/conference-management-new — dedicated LP already exists.',
    proposedH1: 'Manage Your Conference From Abstract Submission to Final Wrap-Up Report',
    proposedH2: 'Handle CFP, sessions, registration, check-in, and post-event analytics — no third-party tools.',
    negatives: 'conference call, video conferencing, zoom conference, conference bridge'
  },
  {
    campaign: '*vFairs | USA | All-In-One Event Solution',
    lpUrl: EMP_B_URL,
    cluster: 'event management software for nonprofits, nonprofit event management software, nonprofit event registration',
    intent: 'Commercial — nonprofit buyer. 20% CVR in data. Ready to buy. Budget-sensitive.',
    adGroup: 'Event Management (no dedicated nonprofit ad group — "Event Software for Nonprofits" is one headline in general RSA pool)',
    currentH: '"Event Software for Nonprofits" · "Event Management Software" · "#1 All-in-one Event Management" · "Gartner Leader in Events"',
    currentD: '"vFairs event management platform offers all the tools you need to host epic events." · "Manage end-to-end events. Trusted by 5,000+ brands. 30K+ events coordinated."',
    proposedH: '"Event Platform for Nonprofits" (29) · "Nonprofit Event Management" (26) · "Fundraisers to Galas, One Tool" (30)',
    proposedD: '"Run galas, fundraisers, and conferences without enterprise pricing. Get a demo." (76) · "Used by nonprofits worldwide. Handles registration, ticketing, and reporting." (74)',
    currentH1: EMP_H1,
    currentH2: EMP_H2,
    proposedAction: 'REDIRECT to /lp/platform/non-profits-event-platform. Scale bids 2–3x. Do not waste 20% CVR on generic EMP page.',
    proposedH1: 'The Event Platform Nonprofits Use to Run More With Less',
    proposedH2: 'Handle galas, fundraisers, conferences, and virtual events — without enterprise pricing.',
    negatives: 'crm for nonprofits, donor management software, nonprofit website builder'
  },
  {
    campaign: '*vFairs | USA | All-In-One Event Solution',
    lpUrl: EMP_B_URL,
    cluster: 'corporate event management companies, corporate event agencies, corporate event planning agency',
    intent: 'WRONG AUDIENCE — agency seeker. Buyers want to hire a company, not buy software. Zero conversion potential.',
    adGroup: 'Event Management / Event Planning (broad match leakage)',
    currentH: '"Event Management Software" · "Easy Event Management" · "#1 All-in-one Event Management"',
    currentD: '"vFairs event management platform offers all the tools you need to host epic events."',
    proposedH: 'N/A — do not run ads to these terms',
    proposedD: 'N/A',
    currentH1: EMP_H1,
    currentH2: EMP_H2,
    proposedAction: 'ADD AS EXACT MATCH NEGATIVES immediately across campaign.',
    proposedH1: 'N/A',
    proposedH2: 'N/A',
    negatives: 'corporate event agency, event management company, event company, event agency, hire event planner, event production company'
  },
  {
    campaign: '*vFairs | USA | All-In-One Event Solution',
    lpUrl: EMP_B_URL,
    cluster: 'virtual event platforms, virtual exhibition platform, virtual events',
    intent: 'Commercial — but wrong LP. Buyers want a virtual events page; landing on generic EMP page.',
    adGroup: 'Event Management',
    currentH: '"Virtual + Hybrid Events" · "Event Management Software" · "Your One-stop Event Solution"',
    currentD: '"vFairs event management platform offers all the tools you need to host epic events."',
    proposedH: '"Host Virtual Events at Scale" (28) · "Branded Virtual Event Platform" (30) · "Virtual Events, One Platform" (28)',
    proposedD: '"Branded virtual lobbies, live sessions, and networking. Fully managed by vFairs." (78)',
    currentH1: EMP_H1,
    currentH2: EMP_H2,
    proposedAction: 'REDIRECT to /lp/platform/virtual-events-new',
    proposedH1: 'Host Virtual Events for Thousands — Without Managing 5 Vendors',
    proposedH2: 'Branded environment, live sessions, networking, and analytics. One platform, one team.',
    negatives: '—'
  },
  {
    campaign: '*vFairs | USA | All-In-One Event Solution',
    lpUrl: EMP_B_URL,
    cluster: 'ems event management system, event management system ems',
    intent: 'WRONG AUDIENCE — EMS = Emergency Management System. Healthcare/government traffic. Zero purchase intent.',
    adGroup: 'Event Management (broad match)',
    currentH: '"Event Management Software" · "Easy Event Management"',
    currentD: '"vFairs event management platform offers all the tools you need to host epic events."',
    proposedH: 'N/A',
    proposedD: 'N/A',
    currentH1: EMP_H1,
    currentH2: EMP_H2,
    proposedAction: 'ADD AS NEGATIVES immediately.',
    proposedH1: 'N/A',
    proposedH2: 'N/A',
    negatives: 'ems, emergency management, ems software, emergency management system'
  },
  {
    campaign: '*vFairs | USA | All-In-One Event Solution',
    lpUrl: EMP_B_URL,
    cluster: 'strive fair, networking events online, event hosting (web-hosting intent)',
    intent: 'WRONG AUDIENCE — branded search for another product / attendee search / web hosting.',
    adGroup: 'Event Management / Event Planning (broad match leakage)',
    currentH: '"Event Management Software" · "Host Locally, Reach Globally"',
    currentD: '"vFairs event management platform offers all the tools you need to host epic events."',
    proposedH: 'N/A',
    proposedD: 'N/A',
    currentH1: EMP_H1,
    currentH2: EMP_H2,
    proposedAction: 'ADD AS NEGATIVES immediately.',
    proposedH1: 'N/A',
    proposedH2: 'N/A',
    negatives: 'strive fair, networking events near me, events to attend, event space, venue, web hosting, website hosting'
  },

  // ──────────────────────────────────────────────────────────────────────
  // CAMPAIGN 2: Mobile App & Lead Capture → Mobile App (B)
  // ──────────────────────────────────────────────────────────────────────
  {
    campaign: '*vFairs | USA | Mobile App & Lead Capture',
    lpUrl: MOBILE_APP_URL,
    cluster: 'lead retrieval app, lead retrieval app for trade shows, lead retrieval software, lead retrieval device',
    intent: 'Bottom-funnel — exhibitor buying a scanner. Highest value cluster (34 clicks, converting). Pain: badge scanning at trade shows.',
    adGroup: 'Mobile Event Management (no dedicated lead retrieval ad group)',
    currentH: '"Mobile Event Management" · "Conference Lead Capture" · "Branded Mobile Event App" · "#1 Hybrid Meetings And Events" · "G2\'s #1 Hybrid Event Solution"',
    currentD: '"Engage online and onsite audiences with the perfect hybrid event platform." · "Looking for a smooth conference registration process? vFairs is what you\'re looking for." — hybrid conference copy served to an exhibitor buying a badge scanner',
    proposedH: '"Scan Badges at Any Trade Show" (29) · "No Proprietary Hardware Needed" (30) · "Export Leads to CRM Same Day" (28)',
    proposedD: '"Capture, qualify, export leads from any show. Works on any phone or device." (73) · "500+ exhibitors use vFairs lead retrieval. Book a badge scan demo." (63)',
    currentH1: MOBILE_H1,
    currentH2: MOBILE_H2,
    proposedAction: 'CREATE dedicated Lead Retrieval ad group → /lp/platform/lead-capture-app-new. Do not mix with conference app traffic.',
    proposedH1: 'The Lead Capture App That Works at Every Trade Show',
    proposedH2: 'Scan badges, qualify leads, and sync to your CRM — no proprietary hardware required.',
    negatives: '—'
  },
  {
    campaign: '*vFairs | USA | Mobile App & Lead Capture',
    lpUrl: MOBILE_APP_URL,
    cluster: 'lead capture app, lead capture app for trade shows, trade show lead capture app, lead capture software',
    intent: 'Bottom-funnel — exhibitor or event marketer. Ready to buy, comparing lead capture tools.',
    adGroup: 'Mobile Event Management (same RSA pool)',
    currentH: '"Mobile Event Management" · "Conference Lead Capture" · "Your All-in-one Event App"',
    currentD: '"Engage online and onsite audiences with the perfect hybrid event platform." · "Customize the registration process, offer group discounts, and more. Book a demo today." — platform copy served to a lead capture buyer',
    proposedH: '"Capture Leads on Any Device" (27) · "No Hardware Rental Required" (27) · "Sync Leads to CRM in Real Time" (30)',
    proposedD: '"Scan badges, fill forms, or capture cards. Sync to your CRM in real time." (72) · "Works at trade shows, conferences, and job fairs. No hardware rental required." (76)',
    currentH1: MOBILE_H1,
    currentH2: MOBILE_H2,
    proposedAction: 'REDIRECT to /lp/platform/lead-capture-app-new — purpose-built LP already exists.',
    proposedH1: 'Capture Every Lead at Every Booth — Without Renting the Show\'s Scanner',
    proposedH2: 'Digital forms, badge scanning, and card capture. Leads synced to your CRM before the show closes.',
    negatives: 'lead generation software, crm software, email capture'
  },
  {
    campaign: '*vFairs | USA | Mobile App & Lead Capture',
    lpUrl: MOBILE_APP_URL,
    cluster: 'conference app, conference apps, event app for conferences, conference mobile app',
    intent: 'Mid-funnel — event organizer shopping for a conference app. Worth keeping; needs organizer-centric framing.',
    adGroup: 'Mobile Event Management',
    currentH: '"Mobile Event Management" · "Branded Mobile Event App" · "Conference Registration Tools" · "Your All-in-one Event App" · "The Best Hybrid Event Platform"',
    currentD: '"Engage online and onsite audiences with the perfect hybrid event platform." · "Customize the registration process, offer group discounts, and more. Book a demo today."',
    proposedH: '"Conference App by vFairs" (23) · "Branded App for Your Event" (26) · "Organizer-Managed Event App" (27)',
    proposedD: '"Live agenda, networking, polls, and push alerts — branded to your event." (71) · "Manage the entire app from your organizer dashboard. Attendees get a branded experience." (83)',
    currentH1: MOBILE_H1,
    currentH2: MOBILE_H2,
    proposedAction: 'Edit LP H1 to signal organizer control — organizers buy this, not attendees.',
    proposedH1: 'Give Your Conference Attendees an App That Actually Works',
    proposedH2: 'Agenda, networking, live polls, and push alerts — managed from your organizer dashboard. Branded in 48 hours.',
    negatives: 'conference apps for attendees, best conference apps list, conference apps review'
  },
  {
    campaign: '*vFairs | USA | Mobile App & Lead Capture',
    lpUrl: MOBILE_APP_URL,
    cluster: 'event app, mobile event app, events app, app for events, apps for events',
    intent: 'CONSUMER INTENT — attendees looking for apps to attend events. Will not convert on a B2B LP. CVR killer by volume.',
    adGroup: 'Mobile Event Management',
    currentH: '"Mobile Event Management" · "Branded Mobile Event App" · "The Best Hybrid Event Platform" · "#1 Event Management Solution"',
    currentD: '"Engage online and onsite audiences with the perfect hybrid event platform."',
    proposedH: 'N/A — wrong audience entirely',
    proposedD: 'N/A',
    currentH1: MOBILE_H1,
    currentH2: MOBILE_H2,
    proposedAction: 'ADD AS NEGATIVES. If kept, TOFU campaign only with strict organizer intent modifiers.',
    proposedH1: 'N/A',
    proposedH2: 'N/A',
    negatives: 'event app free, events near me app, local events app, event discovery app, social events app'
  },
  {
    campaign: '*vFairs | USA | Mobile App & Lead Capture',
    lpUrl: MOBILE_APP_URL,
    cluster: 'event planning apps, event planner apps, apps for planning events, event scheduling app',
    intent: 'Consumer/prosumer. Personal party planning. Zero conversions across all months.',
    adGroup: 'Mobile Event Management (same RSA pool)',
    currentH: '"Mobile Event Management" · "Branded Mobile Event App" · "Conference Registration Tools"',
    currentD: '"Engage online and onsite audiences with the perfect hybrid event platform."',
    proposedH: 'N/A',
    proposedD: 'N/A',
    currentH1: MOBILE_H1,
    currentH2: MOBILE_H2,
    proposedAction: 'PAUSE or add as negatives.',
    proposedH1: 'N/A',
    proposedH2: 'N/A',
    negatives: 'event planning apps free, party planning app, birthday party planner app, wedding planning app'
  },
  {
    campaign: '*vFairs | USA | Mobile App & Lead Capture',
    lpUrl: MOBILE_APP_URL,
    cluster: 'best mobile event apps, best event apps for conferences, top conference apps',
    intent: 'Review/comparison intent. Searching for a ranked list, not a single vendor page.',
    adGroup: 'Mobile Event Management',
    currentH: '"Mobile Event Management" · "G\'s #1 Hybrid Event Solution" · "#1 Hybrid Event Solution"',
    currentD: '"Engage online and onsite audiences with the perfect hybrid event platform."',
    proposedH: 'N/A — single vendor page cannot satisfy comparison intent',
    proposedD: 'N/A',
    currentH1: MOBILE_H1,
    currentH2: MOBILE_H2,
    proposedAction: 'ADD AS NEGATIVES. Bid on G2/Capterra listing pages for these terms instead.',
    proposedH1: 'N/A',
    proposedH2: 'N/A',
    negatives: 'best event apps, top event apps, event app comparison, event app reviews, event app alternatives'
  },
  {
    campaign: '*vFairs | USA | Mobile App & Lead Capture',
    lpUrl: MOBILE_APP_URL,
    cluster: 'conference apps for attendees, attendee mobile app, conference attendee app',
    intent: 'WRONG BUYER — attendee side. Already ADDED_EXCLUDED in some ad groups but still surfacing.',
    adGroup: 'Mobile Event Management',
    currentH: '"Mobile Event Management" · "Branded Mobile Event App" · "Bind Onsite & Online Audiences"',
    currentD: '"Deliver a seamless event experience to your in-person & remote audiences with vFairs."',
    proposedH: 'N/A',
    proposedD: 'N/A',
    currentH1: MOBILE_H1,
    currentH2: MOBILE_H2,
    proposedAction: 'VERIFY negation is applied across every ad group in the campaign.',
    proposedH1: 'N/A',
    proposedH2: 'N/A',
    negatives: 'attendee app, attendee mobile app, apps for conference attendees'
  },
  {
    campaign: '*vFairs | USA | Mobile App & Lead Capture',
    lpUrl: MOBILE_APP_URL,
    cluster: 'xpress leads app, leadscon app, gartner conference app, vidyoconnect app, freeconferencecall app, lettucemeet, eshow events app',
    intent: 'BRANDED COMPETITOR SEARCHES — zero conversion potential. Broad match leakage serving hybrid event copy.',
    adGroup: 'Mobile Event Management (broad match leakage)',
    currentH: '"Mobile Event Management" · "Branded Mobile Event App" · "#1 Hybrid Meetings And Events"',
    currentD: '"Engage online and onsite audiences with the perfect hybrid event platform."',
    proposedH: 'N/A',
    proposedD: 'N/A',
    currentH1: MOBILE_H1,
    currentH2: MOBILE_H2,
    proposedAction: 'ADD AS EXACT MATCH NEGATIVES immediately. Pure spend waste.',
    proposedH1: 'N/A',
    proposedH2: 'N/A',
    negatives: 'xpress leads, leadscon, gartner conference navigator, vidyoconnect, freeconferencecall, lettucemeet, eshow, whova app, eventmobi'
  },
  {
    campaign: '*vFairs | USA | Mobile App & Lead Capture',
    lpUrl: MOBILE_APP_URL,
    cluster: 'white label event app, custom event app, branded event app',
    intent: 'Niche enterprise — organizer needing a fully branded app. Good intent, low volume. Has a dedicated ad group.',
    adGroup: 'White Label Event App (dedicated)',
    currentH: '"White Label Event App" · "Custom-Branded Mobile App" · "Your Brand. Our Technology." · "White-Labeled Event Mobile App" · "Branded Event App – vFairs" · "Event App With Logo & Theme"',
    currentD: '"Launch fully branded event apps. Used for 30K+ events. 1,700+ trusted reviews." · "Custom white label app for events. 100M+ attendees, 80K+ exhibitors supported." · "Pricing for agencies and enterprise teams available. Request a white-label demo today."',
    proposedH: '"White Label Event App" (21) · "Your Brand. Our Technology." (27) · "Custom-Branded Event App" (24)',
    proposedD: '"Launch branded event apps in 48 hours. 30K+ events. 1,700+ reviews." (67) · "Add your logo, colors & sponsors. Enterprise-ready white label solution." (70)',
    currentH1: MOBILE_H1,
    currentH2: 'Generic mobile app LP — completely misses white-label value prop.',
    proposedAction: 'REDIRECT to /lp/platform/white-label-app — already exists.',
    proposedH1: 'A Conference App That Looks Like Yours, Not Ours',
    proposedH2: 'White-labeled iOS and Android app. Custom icon, name, and colors. Live in 48 hours.',
    negatives: 'white label taxi app, white label delivery app, white label restaurant app'
  },

  // ──────────────────────────────────────────────────────────────────────
  // LP: Virtual Conference
  // ──────────────────────────────────────────────────────────────────────
  {
    campaign: 'Organic SEO (no active USA paid campaign)',
    lpUrl: VCONF_URL,
    cluster: 'virtual conference platform, virtual conference software, online conference platform',
    intent: 'Commercial — BOFU platform evaluator. Comparing vendors, ready to schedule a demo.',
    adGroup: 'No paid ad group',
    currentH: 'No paid ads running',
    currentD: 'No paid ads running',
    proposedH: '"Virtual Conference Platform" (27) · "Host 500 to 50,000 Attendees" (29) · "All-in-One Virtual Conf Tool" (28)',
    proposedD: '"Live sessions, networking, sponsor booths, and analytics — one dashboard." (71) · "3,000+ conferences hosted on vFairs. Book a platform demo today." (61)',
    currentH1: 'Host A Virtual Conference that Connects, Engages & Inspires Global Audiences',
    currentH2: 'Captivate a global audience with a beautiful, user-friendly virtual conference. Manage and host engaging sessions and networking from a powerful platform.',
    proposedAction: 'EDIT LP H1/H2 to address BOFU evaluator intent. Current hero is aspirational with no outcome specificity.',
    proposedH1: 'Host Virtual Conferences for Hundreds or Hundreds of Thousands',
    proposedH2: 'Live sessions, breakout rooms, networking, and sponsor booths in one platform. 3,000+ conferences hosted.',
    negatives: '—'
  },
  {
    campaign: 'Organic SEO (no active USA paid campaign)',
    lpUrl: VCONF_URL,
    cluster: 'best virtual conference platform, virtual conference platform comparison',
    intent: 'Review intent — comparison shopping. Looking for a shortlist, not a single vendor.',
    adGroup: 'No paid ad group',
    currentH: 'No paid ads running',
    currentD: 'No paid ads running',
    proposedH: 'N/A — single vendor LP cannot satisfy comparison intent',
    proposedD: 'N/A',
    currentH1: 'Host A Virtual Conference that Connects, Engages & Inspires Global Audiences',
    currentH2: 'Captivate a global audience...',
    proposedAction: 'Build a feature comparison table on the LP. Do not run paid ads to these terms on a single-vendor LP.',
    proposedH1: 'N/A',
    proposedH2: 'Add "How vFairs compares" feature comparison table to LP.',
    negatives: '—'
  },
  {
    campaign: 'Organic SEO (no active USA paid campaign)',
    lpUrl: VCONF_URL,
    cluster: 'virtual conference, online conference, virtual event',
    intent: 'INFORMATIONAL — top of funnel. Root cause of CVR collapse. Not buying software.',
    adGroup: 'No paid ad group',
    currentH: 'No paid ads running',
    currentD: 'No paid ads running',
    proposedH: 'Never run paid ads to these terms without a strong intent qualifier.',
    proposedD: 'N/A',
    currentH1: 'Host A Virtual Conference that Connects, Engages & Inspires Global Audiences',
    currentH2: '(no buyer qualification signal)',
    proposedAction: 'Do not attempt to convert this organic traffic on the LP. Build a separate SEO content page. Add buyer-qualifier hook to LP hero.',
    proposedH1: 'N/A (LP change: add sub-headline)',
    proposedH2: '"Looking for a virtual conference platform? Here\'s what 3,000 event teams chose."',
    negatives: '—'
  },
  {
    campaign: 'Organic SEO (no active USA paid campaign)',
    lpUrl: VCONF_URL,
    cluster: 'virtual conference for healthcare, virtual conference for education, virtual conference for [industry]',
    intent: 'Vertical-specific buyer. Specific context, closer to purchase.',
    adGroup: 'No paid ad group',
    currentH: 'No paid ads running',
    currentD: 'No paid ads running',
    proposedH: '"[Industry] Virtual Conference" (via ad customizer) · "Virtual Events, One Platform" (28)',
    proposedD: '"Purpose-built virtual conference platform. Compliance-ready. 3,000+ events hosted." (80)',
    currentH1: 'Host A Virtual Conference that Connects, Engages & Inspires Global Audiences',
    currentH2: '(generic)',
    proposedAction: 'Create vertical-specific LPs or use IF functions in RSA for industry-specific headlines.',
    proposedH1: 'Run [Industry] Virtual Conferences Without the IT Overhead',
    proposedH2: 'Session management, compliance-friendly registration, and analytics — built in.',
    negatives: '—'
  },

  // ──────────────────────────────────────────────────────────────────────
  // Solution Page: Virtual Job Fair
  // ──────────────────────────────────────────────────────────────────────
  {
    campaign: 'Organic SEO (no active paid campaign)',
    lpUrl: VJF_URL,
    cluster: 'virtual job fair platform, virtual job fair software, online job fair platform, virtual career fair platform',
    intent: 'Commercial — HR/talent acquisition buyer. Clear B2B purchase intent. Ready to evaluate.',
    adGroup: 'No paid ad group',
    currentH: 'No dedicated paid campaign (organic only)',
    currentD: 'No dedicated paid campaign (organic only)',
    proposedH: '"Virtual Job Fair Platform" (23) · "Recruiters + Candidates, One App" (30) · "Host Virtual Career Fairs" (25)',
    proposedD: '"Candidate registration, live recruiter booths, video interviews — one platform." (73) · "Used for 500+ virtual job fairs. Book a platform demo today." (57)',
    currentH1: '(Solution page — informational, no conversion hero)',
    currentH2: '(No sticky CTA)',
    proposedAction: 'Do NOT change the solution page. Add sticky header CTA strip linking to /lp/platform/virtual-career-fair-new. Route all paid traffic to the LP.',
    proposedH1: 'The Virtual Job Fair Platform That Gets Candidates From Application to Interview in One Day',
    proposedH2: 'Replace disconnected tools with one platform. Recruiters, booths, and applicant data in one place.',
    negatives: 'job fair near me, job fair tips, how to prepare for a job fair, job fair for job seekers'
  },
  {
    campaign: 'Organic SEO (no active paid campaign)',
    lpUrl: VJF_URL,
    cluster: 'virtual career fair, online career fair, virtual hiring event',
    intent: 'Mixed — HR organizer or job seeker. High organic volume; job seekers will not convert.',
    adGroup: 'No paid ad group',
    currentH: 'No dedicated paid campaign (organic only)',
    currentD: 'No dedicated paid campaign (organic only)',
    proposedH: '"Virtual Career Fair Platform" (26) · "Hire at Scale, Virtually" (22) · "Branded Recruiter Booths" (23)',
    proposedD: '"Connect recruiters and candidates at scale. Registration, booths, and interviews in one tool." (87)',
    currentH1: '(Solution page — informational)',
    currentH2: '(No conversion path)',
    proposedAction: 'Add buyer qualifier to LP hero. Move outcome-focused H2 above the fold.',
    proposedH1: 'Run Virtual Career Fairs That Actually Fill Your Talent Pipeline',
    proposedH2: 'Branded virtual booths, candidate registration, live video interviews, and recruiter analytics in one place.',
    negatives: 'virtual job fair job seeker, how to attend a virtual job fair, find jobs, job search'
  }
];

// ─────────────────────────────────────────────
// SHEET CREATION
// ─────────────────────────────────────────────
async function pushToSheets() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Add new tab
  const addResp = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        addSheet: {
          properties: {
            title: TAB_TITLE,
            gridProperties: { frozenRowCount: 1 }
          }
        }
      }]
    }
  });
  const sheetId = addResp.data.replies[0].addSheet.properties.sheetId;

  // 2. Build rows
  const rows = [COLUMNS];
  for (const r of DATA) {
    rows.push([
      r.campaign, r.lpUrl, r.cluster, r.intent, r.adGroup,
      r.currentH, r.currentD, r.proposedH, r.proposedD,
      r.currentH1, r.currentH2, r.proposedAction, r.proposedH1, r.proposedH2,
      r.negatives
    ]);
  }

  // 3. Write data
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_TITLE}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows }
  });

  // 4. Format
  const requests = [];

  // Header style
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.1, green: 0.1, blue: 0.1 },
          textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
          verticalAlignment: 'MIDDLE'
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
    }
  });

  // Header row height
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 36 },
      fields: 'pixelSize'
    }
  });

  // Data rows: wrap text + align top
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: rows.length },
      cell: {
        userEnteredFormat: {
          wrapStrategy: 'WRAP',
          verticalAlignment: 'TOP',
          textFormat: { fontSize: 9 }
        }
      },
      fields: 'userEnteredFormat(wrapStrategy,verticalAlignment,textFormat)'
    }
  });

  // Column widths
  COLUMN_WIDTHS.forEach((width, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: width },
        fields: 'pixelSize'
      }
    });
  });

  // Highlight "Proposed Action" column (col 11) with a subtle teal for action rows
  // Highlight "wrong audience / N/A" rows in grey, "redirect" rows in light blue
  DATA.forEach((r, i) => {
    const rowIndex = i + 1;
    let bgColor = null;

    if (r.proposedAction.toUpperCase().startsWith('ADD AS') || r.intent.startsWith('WRONG') || r.intent.startsWith('BRANDED') || r.intent.startsWith('CONSUMER')) {
      bgColor = { red: 0.95, green: 0.95, blue: 0.95 }; // grey — wrong audience / pure waste
    } else if (r.proposedAction.toUpperCase().startsWith('REDIRECT') || r.proposedAction.toUpperCase().startsWith('CREATE')) {
      bgColor = { red: 0.83, green: 0.93, blue: 1.0 }; // light blue — redirect needed
    } else if (r.proposedAction.toUpperCase().startsWith('EDIT LP')) {
      bgColor = { red: 0.85, green: 0.95, blue: 0.85 }; // light green — LP edit
    }

    if (bgColor) {
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1 },
          cell: { userEnteredFormat: { backgroundColor: bgColor } },
          fields: 'userEnteredFormat(backgroundColor)'
        }
      });
    }
  });

  // Priority column header (Proposed Action, col 11) — teal header
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 11, endColumnIndex: 12 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.05, green: 0.39, blue: 0.45 },
          textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)'
    }
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests }
  });

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${sheetId}`;
  process.stdout.write(`\n✅ Tab created: "${TAB_TITLE}"\n📊 ${sheetUrl}\n`);
}

pushToSheets().catch(err => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
