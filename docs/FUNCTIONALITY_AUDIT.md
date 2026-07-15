# FUNCTIONALITY_AUDIT.md

App-wide functionality audit (started 2026-07-15, after founder feedback that the app has
missing logic, e.g. no photo upload when posting for sale). Honest map of what is real, what is
stubbed, and what is missing, against `/docs/spec`. Status: **DONE** · **IN PROGRESS** · **MISSING** · **STUB (dead control)**.

## Fixed in this pass

| Item | Was | Now |
|---|---|---|
| Blank page on navigation | Shell `AnimatePresence mode="wait"` stalled exits → blank until refresh | Removed; Outlet renders directly (screenEnter still fades in) — **DONE** |
| **Photo upload when posting** | No upload UI anywhere despite photo columns on listings/events/alerts/businesses/places | `photos` storage bucket + RLS, `media.upload` service (Supabase Storage / mock data-URI), `PhotoInput`, wired into **Listing, Event, Equipment and Alert composers**; photos render on cards, detail heroes, and the alert strip — **DONE** (business/place management still to come) |
| Listing condition | `condition` in the DB, not collected or shown | Condition control in the Sell composer (New/Like-new/Good/Fair/Spares); shown on the listing detail — **DONE** |
| Business "Enquire" button | Toasted "Messaging lands in the next update" — a dead control (Law 13) | Opens a real thread with the owner (claimed businesses only) — **DONE** |

## Still MISSING / to do (prioritised)

| Area | Gap | Priority |
|---|---|---|
| Acting-as | No "post as your business / organisation" selector on composers (spec 07); every post is personal | High |
| Profile editing | No UI to change name, avatar, bio or identity chips after signup (the service `profiles.update` supports it) | High |
| Directory: Skills | No way to add a skill (the Post sheet has no "skill" option); the Skills tab is read-only | Medium |
| Me screen | Spec 07 "My equipment & skills" management section is absent | Medium |
| Events | No "This month" grid toggle (spec 07); no map snippet (PostGIS, deferred with map view) | Medium |
| Business management | Owner can't add hours, items/offers, or org posts from the UI | Medium |
| Notifications / DM privacy / quiet hours | Toggles exist; not verified that they actually gate delivery end-to-end | Medium |
| Vouching | No UI to vouch for another member (trust ladder step, spec 04) | Medium |
| Alerts | Acting-as-org for verified-tier alerts; category gating by trust | Medium |
| Realtime | Threads poll (4s) rather than subscribe to a Supabase channel | Low |

## Notes

- The service layer is broader than the UI: several capabilities exist behind `services.*` but have
  no screen wired to them (profile edit, acting-as ids on composers, org posts). Much of this is
  "wire the existing service to a control", not new backend work.
- This audit is the working list for the functionality remediation; items move to the "Fixed" table
  as they land.
