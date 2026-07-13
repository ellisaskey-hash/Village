# Start here

This zip is a repo root. To begin:

1. `git init` and commit everything as-is.
2. Open Claude Code in this directory. It will read CLAUDE.md automatically.
3. First prompt: "Read /docs/spec/00_README.md and /docs/spec/10_BUILD_PLAN_AND_PROMPTS.md, then execute milestone M0."
4. Review the M0 deliverable at /dev/gallery (dark and light) against the PT app before authorising M1. Fidelity issues are cheap to fix at M0 and expensive after.
5. Proceed milestone by milestone (M1 → M8). Each milestone's prompt and acceptance criteria are in spec 10. Do not let a session skip acceptance criteria, especially the RLS tests in M1.
6. You will need accounts/keys as you go: Supabase (eu-west-2), Vercel (lhr1), Sentry, Anthropic, Cloudflare Turnstile, Companies House API. Spec 09 lists every env var.

Expectation setting: M0 is one focused session or two and gives you something to look at. The full build is nine milestones; "get it live to review" means reviewing at every milestone gate, not one shot to production.
