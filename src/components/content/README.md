# components/content

Domain UI for community content (listings, requests). Domain-specific, not primitives.

| Component | Why it lives here, not in `components/ui` |
|---|---|
| `ListingCard` | The photo-forward listing card (spec 07: photo, price/FREE/WANTED badge, title, status). Coupled to the `Listing` shape and its kind semantics; falls back to a kind-tinted gradient when a listing has no photo so it is never blank. Used in Explore (grid) and the Home "New in the village" scroller (compact). |
