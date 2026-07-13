# 04 — Trust, Moderation & Safety

The design goal, stated once: **the platform must stay safe without asking the community to staff it.** Automation does the daily work; the platform admin (the founder, for launch communities) handles judgement calls; the community's only job is tapping Report when something looks wrong.

## Trust levels

Stored on `memberships.trust_level`. Gates **capability, not entry**. All thresholds are per-community config, defaults below.

| Level | Name | How you get it | What it unlocks |
|---|---|---|---|
| 0 | New | Postcode-confirmed signup | Browse everything; RSVP; respond to listings/requests/events via context threads; post up to 2 active listings + 1 open request; join org/event group threads; report |
| 1 | Established | Any of: joined via a member's invite link · 1 vouch from a level-2+ member · 14 days tenure + 3 completed transaction-shaped actions with no upheld reports | Unlimited listings/requests; create events; post community-tier alerts (lost pet etc.); cold DMs (subject to recipient's `dm_privacy`); create invites; equipment & skills directory entries; create a business/service profile |
| 2 | Verified resident | Address verification: postcard code to the address, or in-person admin confirmation, or 2 vouches from level-2 members | Vouch for others; claim seeded business stubs (claims from level 1 allowed but queue behind level 2); organisation officer eligibility |
| 3 | Steward | Granted by platform admin, per community, sparingly | Community-scoped soft-moderation: hide (not remove), pin, verify events. Every action logged and reversible by platform admin. Exists so villages #10+ can have local help without local dependency — Horsmonden launches with zero stewards |

Platform admin (`profiles.platform_role='admin'`) is global and separate: full moderation, claim decisions, trust changes, community launch controls.

**Demotion:** upheld reports subtract; 2 upheld reports in 30 days drops a level and notifies; suspension (time-boxed on `memberships.suspended_until`) for severe cases. All via `admin_moderate`, all logged.

## Verification design rationale

Postcode-gating (district match, e.g. TN12 for Horsmonden) is deliberately weak — it exists to keep out drive-by internet, not determined bad actors. Real security is the capability ladder: an account that lied about its postcode can browse but can barely act, and every action it can take is reportable, rate-limited, and attributable. Address verification (postcard code) is offered, never required — it's the fast lane, not the gate. Edge residents (farms, next hamlet, tradespeople serving the village) join via invite or vouch: the community itself decides who belongs at its edges, which no radius can.

## Alert tiers (D4)

| Tier | Who can post | Categories | Delivery |
|---|---|---|---|
| Community | Trust 1+ members | lostPet, foundItem, lostItem, notice | In-app + push to members with the category on. Rate limit: 2/day/member. |
| Verified | Officers of organisations with `verified_source=true`, acting-as that organisation | + roadClosure, utilityOutage, safety | Push default-on, respects quiet hours. |
| Platform | Platform admin / system feeds only | weather, emergency | Push default-on; emergency ignores quiet hours and frequency caps. |

Horsmonden launch verified sources: Parish Council, the school, the PTA (church optional). `verified_source` is set by platform admin only. Alerts carry `resolved_at` — "Milo is home!" is a second push worth sending; resolution rate is a health metric.

## Reporting & auto-moderation

- **Report** is available on every content row and profile via one shared sheet: reason (scam / spam / abuse / unsafe / wrongInfo / privacy / other) + optional note. One report per person per target.
- **Auto-hide:** when open reports on a target reach the community threshold (default 3; 2 for messages; 1 report from a steward/admin counts as threshold), `hidden_at` is set. Hidden content is invisible to everyone except its author (who sees a "hidden pending review" state) and admins. Nothing is auto-deleted — hiding is reversible, deletion is a human decision.
- **Rate limits (server-enforced in RPCs):** trust-0 caps (above); message rate 30/hour, 5/hour to distinct new recipients at trust 0–1; alert caps per tier; report cap 10/day (report-spam is itself moderatable).
- **New-account friction:** first post of each kind from a trust-0 account is delayed-published by 10 minutes with an admin-visible queue — long enough for the admin to catch a launch-day troll, short enough to be invisible in normal use. Config-switchable off once a community matures.
- **Content rules in copy, not vibes:** a one-screen community standard shown at signup: real names, no politics/national news re-litigations (there's Facebook for that), disputes go to messages not posts, no doorbell-footage vigilantism, listings must be lawful (no weapons, no animals-as-goods beyond rehoming via alerts, no age-restricted sales — enforced category list in code).

## The admin console (platform admin; ships M7, spec in 08 for seeding parts)

Queues, each a list-detail screen on the standard scaffold: open reports (with one-tap uphold/dismiss + action) · auto-hidden items · pending business claims · trust-0 first-post delay queue · new members today · alert log. Plus: member detail (trust history, reports by/against, actions), community config editor, and the moderation action log (every action ever, filterable — the audit trail is the accountability mechanism for a platform that moderates itself).

## Escalation & duty-of-care

- **Threats, safeguarding concerns, or content suggesting someone is at risk:** the report sheet's "unsafe" reason surfaces an immediate banner to the reporter with UK emergency/support signposting (999, 101, Childline for 16–17s, Samaritans), and flags the report as priority in the admin queue. The platform signposts; it does not adjudicate emergencies.
- **Defamation/dispute pattern** (the named-neighbour post): admin playbook is hide → message both parties → keep it in DMs. The community standard pre-commits to this so the first incident isn't improvised.
- **GDPR:** Elevra's account-delete (anonymise content authorship, hard-delete auth) and account-export functions, adapted. Content created as an organisation survives the author's deletion (reassigned to the org).

## 16+ policy

- DOB collected at signup; `adults_only` check constraint; under-16 signups refused with a friendly explanation.
- 16–17-year-olds: full members with two defaults locked until 18 — `dm_privacy='contacts'` (cold DMs off) and their profile omits identity chips like "childcare offered". They can respond to and post everything else; a 17-year-old offering to mow lawns is exactly the platform working.
- No child profiles, no child-directed features, no photos-of-children guidance ambiguity: event photos policy in the community standard asks organisers not to publish identifiable children's photos without consent — standard PTA practice, stated in-product.
