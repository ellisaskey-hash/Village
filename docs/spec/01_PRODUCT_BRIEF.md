# 01 — Product Brief

## What Local is

Local is the place a community helps itself. One app where the people of a real geographic community discover, request, organise, buy, sell, borrow, lend, hire, attend and communicate — built on the belief that people are going to need each other more over the coming years, and that the connection infrastructure for that barely exists.

Local is **not** a social network, a forum, a marketplace, or a noticeboard. It contains a marketplace and a noticeboard the way a town contains a market square and a noticeboard: as facilities of something larger.

## The two-layer identity

- **LocalOS** — the platform and company. One architecture serving every community type.
- **Local** (working name) — the consumer product a resident installs. The name slot stays open; when the final brand lands it is a token + copy change, not a refactor (see 05 § Brandability).

## Who it's for, in order

1. **Launch:** Horsmonden, Kent. A few thousand residents, all ages. Pub, social club, shop, butcher, church, parish council, vet, pharmacy, cricket club, primary school with active PTA. Current channels: a village Facebook group, PTA emails/WhatsApp, the noticeboard.
2. **Next:** neighbouring Kent villages, connected — a member of one village can see opted-in content from adjacent communities (a tradesperson in the next village over is often the answer to "I need a plumber").
3. **Then:** any community type. Estates, apartment blocks, new-builds, retirement communities, caravan parks, student accommodation, towns. Same entities, different `communities.type` configuration and skin.

## Product principles

1. **Utility before social.** The home screen answers "what's happening, what's needed, what's available, what's important" — it is not a feed optimised for scrolling. Engagement is a by-product of usefulness, never the goal.
2. **A village is an outcome, not a customer.** Individuals install Local because they need a plumber, want to sell a bike, lost a cat, or want to know what's on this weekend. The whole-village adoption moment (the Facebook-group and school-gate launch) works only because each individual finds immediate personal utility.
3. **Useful at one user.** The seeding system (08) guarantees the first person to open the app in any community finds a populated directory, real events, and live alerts. Emptiness is a launch-killing bug, treated as such.
4. **Nobody has to run it.** No appointed village admins, no volunteer moderators, no platform dependency on community goodwill. Moderation is a platform capability (automation + platform admin), not a community staffing requirement. This is what lets village #2 through #200 launch without recruiting anyone.
5. **People help each other; the platform gets out of the way.** The measure of every feature: does it shorten the distance between "I need" and "a neighbour has"?
6. **Search is a primary surface.** Users never need to know where information lives. Global search covers all ten entities and is reachable from every screen.
7. **Trust is graduated, not gatekept.** Joining is easy (postcode). Capability grows with trust (invites, tenure, verification). Security lives in what accounts can do, not in who gets through the door.

## Scope

### Phase 1 — the launch build (this package)

Everything below ships in the launch app. "Complete-feeling" is the bar: a resident should not find a dead end for any everyday community need.

- **Communities & membership** — postcode-gated join, invite links, trust levels, member profiles with multiple identities (resident, parent, tradesperson, business owner, organisation officer).
- **Places** — seeded directory of every physical point in the village: shops, pub, church, hall, school, green, footpaths, defibrillator, postbox. Opening hours, photos, linked businesses/organisations.
- **Businesses** — profiles (seeded stubs claimable by owners, plus self-created for home businesses and side hustles), offers, products, services, booking requests by message.
- **Organisations** — parish council, PTA, cricket club, church: profiles, officer roles, announcements, documents, events. Verified-source status for alerts.
- **Events** — community/school/sports/club events with RSVP, capacity, recurrence, event threads. Seeded from public calendars at launch.
- **Listings** — sell / free / wanted / lend. Photos, price, status lifecycle (active → reserved → completed/expired), auto-expiry.
- **Requests** — "I need a plumber / a lift / a babysitter / recommendations." Category, status lifecycle, responses via threads. The flagship interaction.
- **Services & skills** — trades directory (from business + tradesperson facets), skills directory, **equipment directory** (ladder, trailer, pressure washer — who has one and will lend it).
- **Alerts** — three tiers: community (lost pet, found keys — any established member), verified-source (road closure, school notice — organisations only), platform (severe weather — system/admin only). Push fan-out with per-category preferences.
- **Messages** — context threads on every listing/request/event/business enquiry; group threads for organisations and events; direct messages (built fully; launch default = in-context always, cold DMs allowed at trust level 1+ with recipient opt-out).
- **Global search** — across all entities, from every screen.
- **Notifications** — push + in-app, with Elevra's full preference chain (categories, quiet hours, frequency caps, daily digest).
- **Moderation & safety** — reporting on everything, auto-hide thresholds, rate limits, platform admin console.
- **Seeding & admin** — ingestion pipeline, claim flows, community launch console (08).

### Phase 2 — explicitly deferred (schema anticipates, UI does not ship)

AI community assistant · welfare daily check-ins & elderly support · prescription help · school-run coordination & playdate matching · click & collect · local delivery · repeat ordering / stock notifications / demand forecasting · payments · advanced reputation · availability calendars for trades · reviews (deferred deliberately: reviews in a village where everyone knows everyone are a defamation and feud engine; revisit with the moderation data from phase 1).

### Out of scope indefinitely (until revisited)

Revenue mechanics (deliberate: acquire users first) · native app shells (PWA only) · under-16 accounts.

## Launch strategy (Horsmonden)

1. **Pre-launch (founder, ~weeks):** run the seeding pipeline; review/enrich in the admin console; invite the parish council, school/PTA, and 5–10 businesses privately to claim their profiles and add their first events/offers, so launch day has verified sources and claimed businesses already live.
2. **Launch day:** post to the village Facebook group + school/PTA channels with a join link. The link carries the community slug; signup asks for postcode confirmation. First-open experience: populated Home showing real alerts, this week's events, the full directory.
3. **First fortnight:** founder as platform admin watches telemetry daily (09 § Telemetry), responds to reports within hours, personally messages every business claim. The product goal of the fortnight: every resident completes one *transaction-shaped* action (posted, responded, RSVP'd, messaged, claimed).
4. **Village #2:** triggered when Horsmonden hits sustained weekly-active thresholds (below). Adjacency connection turned on between the two.

## Success criteria

Not installs, not posts. Measured from telemetry:

- **Resolution rate:** % of Requests that reach `answered`/`fulfilled` within 72h. Target ≥ 60% by week 4.
- **Weekly problem-solvers:** unique members per week who complete a transaction-shaped action. Target ≥ 25% of members by week 4.
- **Return without push:** % of weekly actives who open the app organically (no notification referrer). Target ≥ 50%.
- **Supply-side retention:** % of claimed businesses/organisations active (posted or replied) in the last 14 days. Target ≥ 70%.
- **Seeded-to-live:** % of seeded business stubs claimed by week 8. Target ≥ 40%.

## Naming

"Local" is the working name used in code (`local:` storage prefixes, `local-app` package name) and copy placeholders. The brand direction when finalised: community, mutual aid, people helping each other ("Muck In" and "Many Hands" shortlisted; decision deferred). All brand-carrying surfaces are tokenised (05 § Brandability) so the rename is a one-day change.
