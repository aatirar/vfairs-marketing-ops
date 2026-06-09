# vFairs Product Capability Library

Canonical, AI-readable reference for every vFairs product module, event use case, and industry solution. Built so skills (`/page-builder`, `/comparison-page`, `/re-write`, `/sales-pitch`, `/write-landing-page`) can pull capability context from one place instead of re-scraping the marketing site each run.

## Structure

```
products/
├── platform-modules/   # individual product capabilities (mobile app, badge printing, check-in, etc.)
├── event-types/        # use cases by event format (conferences, trade shows, job fairs, etc.)
└── industries/         # solutions by vertical (healthcare, higher-ed, nonprofit, etc.)
```

## Per-file template

Every capability file should contain:
1. One-liner
2. Source URLs (marketing page + KB)
3. Positioning (H1 + sub-head from marketing page)
4. Capability map (grouped sub-features)
5. Deployment / packaging options
6. Integrations
7. Supported event types
8. Customer proof points
9. Support model
10. Pricing notes (reference `pricing.md`)
11. FAQs (verbatim from marketing page)
12. Related modules
13. Source KB articles (admin-facing how-tos)

## Index

### Platform modules
- [Mobile Event App](platform-modules/mobile-event-app.md) — iOS + Android attendee app, personalized agenda, AI matchmaking, lead capture, white-label option
- [Event Registration](platform-modules/event-registration.md) — branded event websites, drag-and-drop forms, conditional logic, payments via 30+ gateways, real-time analytics
- [Event Ticketing](platform-modules/event-ticketing.md) — unlimited custom ticket types and tiers, promos / coupons, add-ons, real-time revenue tracking
- [Badge Printing](platform-modules/badge-printing.md) — drag-and-drop badge design, on-demand + pre-print, branded kiosks, Zebra / Epson / Brother / HP printer support
- [Check-In](platform-modules/check-in.md) — QR + RFID smart badges + AI facial recognition, branded kiosks, real-time session capacity, walk-in handling
- [Virtual Event Platform](platform-modules/virtual-event-platform.md) — immersive 3D or streamlined 2D environments, virtual booths, AI matchmaking, scales to 100K+ concurrent attendees
- [Lead Capture](platform-modules/lead-capture.md) — sponsor / exhibitor mobile app, QR + business card scan, lead scoring + voice notes, real-time CRM sync
- [Speaker Management](platform-modules/speaker-management.md) — call for speakers, blind review, accepted-speaker portal, in-platform broadcast studio
- [Exhibitor Portal](platform-modules/exhibitor-portal.md) — self-serve booth setup, sponsor tiering, booth negotiation, jobs module, hybrid support
- [Abstract Management Software](platform-modules/abstract-management-software.md) — call for papers, blind / double-blind / peer review, auto session generation
- [Event Analytics](platform-modules/event-analytics.md) — real-time dashboards, AI reporting chatbot, Reporting 360, CRM / FTP / S3 export
- [Event Marketing](platform-modules/event-marketing.md) — branded emails, landing pages, SMS / WhatsApp, AI content assistant, LinkedIn integration
- [Integrations](platform-modules/integrations.md) — CRMs, video, payments, SSO, marketing automation, Zapier (8,000+ apps), RESTful API + webhooks

### Event types
*(empty — add as built)*

### Industries
*(empty — add as built)*

## Conventions

- Pull verbatim language from vFairs marketing pages where possible (so downstream skills don't paraphrase the brand voice incorrectly)
- Use Markdown tables for comparison/deployment matrices
- No em dashes in body copy; hyphens only
- Reference `context/vfairs/branding-guidelines/website-style-guide.md` for any HTML mockup work
- Reference `context/vfairs/pricing.md` rather than duplicating pricing inside capability files
