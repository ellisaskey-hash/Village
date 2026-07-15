# DEMO_GUIDE — a guided tour of Local

This is a **complete-build exercise, not production**. The live database carries a rich, clearly-fake demo layer so you can explore every feature without setting anything up. Everything demo-authored is prefixed **DEMO** or uses obviously fictional names.

**App:** https://village-tau-mauve.vercel.app
**Rebuild the demo any time:** `node scripts/db/seed-admin.mjs` then `node scripts/db/seed-demo.mjs` (run seed-demo last).

There are **two communities**:
- **Dev Village** (launched) — the resident-facing demo. All the demo residents live here; this is where listings, requests, events, alerts, threads, the business and the organisation are.
- **Horsmonden** (seeding) — the real-ingestion demo. Real Kent places/businesses/organisations/events pulled from live public APIs + Claude URL-extract, accepted into the directory. Visible to the **admin** account (it is still in `seeding` status).

---

## Accounts

All passwords are simple on purpose. Sign in at the app URL → **Sign in**.

### Admin / steward

| Email | Password | Role | Sees |
|---|---|---|---|
| `admin@thelocal.test` | `Local-admin-2026` | **Platform admin** + steward of Dev Village | Everything: the `/admin` console, both communities, the Horsmonden seeding queue |

### Dev Village residents (`demo1234` for all)

| Name | Email | Trust | Why they're interesting |
|---|---|---|---|
| Priya Kaur | `demo+priya@thelocal.test` | 3 — **Steward** | Community-scoped moderation; posts as the Residents Association; hosts the fete |
| Tom Fielding | `demo+tom@thelocal.test` | 2 — Verified | **Owns a claimed business** (Fielding Joinery); selling the oak table |
| Grace Odei | `demo+grace@thelocal.test` | 2 — Verified | **Author of the auto-hidden listing** (see the "hidden pending review" state) |
| Ruth Levy | `demo+ruth@thelocal.test` | 2 — Verified | Can vouch for others |
| Dev Sharma | `demo+dev@thelocal.test` | 1 — Established | **Has an active thread** with Tom about the table; asked for a plumber |
| Maria Santos | `demo+maria@thelocal.test` | 1 | Posted the lost-cat alert; selling a kids' bike |
| Jack Reilly | `demo+jack@thelocal.test` | 1 | Fulfilled Omar's ladder request; posted the found-keys alert |
| Nina Patel | `demo+nina@thelocal.test` | 1 | Wanted-ad for a shredder; reported the cot |
| Sam Okafor | `demo+sam@thelocal.test` | 1 | Runs the cricket social; lending a lawnmower |
| Omar Haddad | `demo+omar@thelocal.test` | 0 — New | **Trust-0 caps in action**; his ladder request is fulfilled |
| Chloe Baker | `demo+chloe@thelocal.test` | 0 — New | Asked for a lift; maybe-RSVP'd the fete |
| Leo Marsh | `demo+leo@thelocal.test` | 0 — New | Newest neighbour; going to the cricket social |

---

## Tour 1 — the resident journey (sign in as **Dev Sharma**, `demo+dev`)

1. **Home** — the card stack: the **Alerts strip** (Maria's lost cat), **Happening soon** (Village fete, Cricket social), **Needs a hand** (open requests), **New in the village** (listings), and the noticeboard (Residents Association posts). Pull to refresh.
2. **Explore → Listings** — browse. Open **DEMO Oak dining table** → it has **photos**, price, the author card, and **Message about this**.
3. **Inbox → Messages** — Dev already has a **real back-and-forth thread** with Tom about the table (4 messages). Open it; the context header links back to the listing.
4. **Explore → Events → DEMO Village fete** — see the attendee count and **RSVP** (going / maybe). Dev is already going.
5. **Post (+)** — open **Request help**, type a few words, then (to see the offline draft) turn on airplane mode: the *Offline* pill appears and your text is kept; come back online and it's still there.
6. **Me → Settings → Your data** — download a JSON export, or remove the account (anonymises, content survives).

## Tour 2 — trust-0 caps (sign in as **Omar Haddad**, `demo+omar`, trust 0)

1. **Post (+) → Sell or give away** — post two listings, then try a third: a friendly cap explains new neighbours get two until they settle in (server-enforced).
2. **Post a request** — same for open requests (one at a time at trust 0).
3. Omar can still browse everything, RSVP, and reply in context — capability is gated, not entry.

## Tour 3 — the business journey (sign in as **Tom Fielding**, `demo+tom`)

1. **Me → My business** — Tom owns **DEMO Fielding Joinery** (claimed, verified). Manage its details.
2. **Explore → Directory → Businesses** — find **DEMO Green Leaf Café**, an **unclaimed stub** showing *"Is this yours? Claim it."* — the self-serve claim flow.
3. Tom is a verified (trust-2) member, so he can create events, post community alerts and cold-message neighbours.

## Tour 4 — the organisation journey (sign in as **Priya Kaur**, `demo+priya`, steward)

1. **Home noticeboard** / **Directory → Organisations → DEMO Dev Village Residents Association** — a `verified_source` org with two **announcements** (spring clean-up, new benches).
2. As a **steward (trust 3)**, Priya has community-scoped moderation: she can hide/unhide content in Dev Village (every action logged and reversible by the platform admin).

## Tour 5 — the auto-hidden item (see moderation from both sides)

1. Sign in as **Grace** (`demo+grace`, the author) → **Explore → Listings**: her **DEMO Cot** shows a **"hidden pending review"** banner — she can still see it.
2. Sign in as anyone else (e.g. **Leo**) → the cot is **invisible** (3 neighbours reported it; it auto-hid).

## Tour 6 — the admin journey (sign in as **admin@thelocal.test**)

1. **Me → Admin console** (`/admin`):
   - **Dashboard** — today's numbers; priority reports first.
   - **Reports** — the **DEMO Cot** with 3 reports; tap it for detail + the **advisory triage** (now **live AI** — the Anthropic key is set) and one-tap **Uphold / Dismiss**.
   - **Hidden** — the cot, with Restore / Keep hidden.
   - **Members** — all 12 residents with their trust; open one to **change trust** or **suspend** (suspension blocks posting, not reading).
   - **Action log** — every action, including the automatic auto-hide.
   - **Config** — Dev Village thresholds (reports-before-auto-hide, trust gates).
2. **Seeding** (`/admin/seeding`) — the console follows your **active community**. The admin belongs to both, so use the **community switcher** (the community name, top-left of the shell) to switch to **Horsmonden**, then open the Seeding console:
   - The **Launch checklist** shows the accepted counts (13 places, 15 businesses, 5 verified organisations, 3 events).
   - The **Review queue** is empty (all proposals decided — the Goudhurst spillover and council sub-committees were rejected).
   - **Launch copy** — generated join link + Facebook / PTA-email / poster templates, copy-to-clipboard.
   - Re-run `node scripts/db/ingest-horsmonden.mjs` to see fresh proposals land (idempotent).

---

## Notes

- The demo lives in the live database; it does not affect the automated test suites (they use their own `rlstest+` / `m7test+` fixtures and clean up after themselves; `seed-demo` purges any residue).
- No launch step has been run — Horsmonden stays in `seeding`. `launch_community('horsmonden')` would flip it live.
- Photos on demo listings are inline SVG placeholders (CSP allows `data:` images); they are obviously not real product photos.
