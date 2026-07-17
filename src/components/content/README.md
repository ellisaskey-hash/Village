# components/content

Domain UI for community content (listings, events, directory). Photo-forward cards + heroes
(spec 07). Domain-specific, not primitives — coupled to the entity shapes and their semantics.

| Component | Role |
|---|---|
| `ListingCard` | Listing card: photo, price/FREE/WANTED badge, status, author; kind-tinted gradient fallback. Explore grid + Home scroller (compact). |
| `EventCard` | Event card: hero photo/category gradient, floating date chip, title, time, going count. |
| `DirectoryCard` | Business / place card: photo, title, subtitle, optional overlay badge (Claim it / Verified); icon-gradient fallback. |
| `PhotoHero` | Full-width detail-screen hero: photo strip, or tinted gradient + icon when there are no photos, so a detail page is never a bare card. |
| `ContactRow` | Tappable contact/action row for directory detail pages (call, email, website, directions). Renders as an `<a>` so `tel:`/`mailto:`/maps deep-links work; 44px+ target. |
| `SaveButton` | Save/bookmark toggle for a listing, request or event. Reads the shared `['saves']` query so every surface stays in sync; wired to the `saves` service (`saved_items` table, owner-only RLS). |

All fall back to a gradient when an entity has no photo, so a seeded stub is never blank.
