# components/moderation

Domain UI for reporting and moderation (spec 04). These are domain-specific, not primitives:
they compose `components/ui` primitives with moderation semantics and the moderation service.

| Component | Why it lives here, not in `components/ui` |
|---|---|
| `ReportSheet` | The one shared Report affordance. Domain-coupled to `services.moderation.report`, the seven report reasons, and the duty-of-care escalation. Not a generic sheet. |
| `EscalationNotice` | UK emergency/support signposting shown for the "unsafe" reason. Exported for reuse in any safety context. Copy is duty-of-care specific. |
| `ReportButton` | Small trailing "Report" affordance for content rows and detail headers; opens `ReportSheet`. Thin, but domain-named so consumers read clearly. |
