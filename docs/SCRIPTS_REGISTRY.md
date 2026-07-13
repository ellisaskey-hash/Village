# Scripts Registry

Every file in `scripts/`: purpose, lifetime, deletion criteria. Keep this list short.

| Script | Purpose | Lifetime | Deletion criteria |
|---|---|---|---|
| `check-voice.mjs` | Custom lint grep — no em-dashes / "the system" in shipped copy (spec 00 rule 6). Runs in `npm run lint` and CI. | ongoing | never (enforces a Law) |
| `check-hex.mjs` | Custom lint grep — no hex colour literals in component code / SVGs (spec 00 rule 3, fix #2). Runs in `npm run lint` and CI. | ongoing | never (enforces a Law) |
| `gen-icons.mjs` | Generates placeholder PWA raster icons (192 / 512 / 512-maskable) with no dependency. | one-shot-ish | delete once a brand pass ships real icon artwork |
