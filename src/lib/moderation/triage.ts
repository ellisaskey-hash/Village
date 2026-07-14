// Moderation triage — advisory only (spec 04). It never hides or acts; it produces a
// suggestion the admin reads next to a report. Anthropic is server-side only (CLAUDE.md rule
// 6), so this calls the /api/moderation-triage function when it is reachable and a key is set;
// with no key it returns a deterministic rule-based fixture marked { fixture: true }.
// AWAITING-KEYS: set ANTHROPIC_API_KEY in the deploy env to switch from fixture to live.
import type { TriageSuggestion } from '@/lib/services/types';

export interface TriageInput {
  reason: string;
  note: string | null;
}

const HIGH_HARM = new Set(['unsafe', 'abuse']);
const COMMERCE_HARM = new Set(['scam', 'spam']);
const RISK_WORDS = /(http|www\.|\bmoney\b|\bpayment\b|\bbank\b|\bthreat|\bhurt\b|\bweapon)/i;

/** The fixture heuristic — transparent, so the admin knows exactly why it suggested what it did. */
export function fixtureTriage(input: TriageInput): TriageSuggestion {
  const note = input.note ?? '';
  const risky = RISK_WORDS.test(note);
  if (HIGH_HARM.has(input.reason)) {
    return {
      recommendation: 'hide',
      confidence: 0.7,
      rationale: `Reported as ${input.reason}. Safety-related reports lean towards hiding while a person reviews. This is a rule-based suggestion, not a judgement.`,
      fixture: true,
    };
  }
  if (COMMERCE_HARM.has(input.reason)) {
    return {
      recommendation: risky ? 'hide' : 'watch',
      confidence: risky ? 0.6 : 0.5,
      rationale: risky
        ? `Reported as ${input.reason} and the note mentions links or money. Worth hiding until checked.`
        : `Reported as ${input.reason}. Keep an eye on it; one report is rarely conclusive.`,
      fixture: true,
    };
  }
  return {
    recommendation: 'watch',
    confidence: 0.4,
    rationale: `Reported as ${input.reason}. No strong signal either way. A human read is the right next step.`,
    fixture: true,
  };
}

export async function triageReport(input: TriageInput): Promise<TriageSuggestion> {
  // Only attempt the live call in a browser where a same-origin function may exist.
  if (typeof fetch === 'function') {
    try {
      const res = await fetch('/api/moderation-triage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = (await res.json()) as TriageSuggestion;
        if (data && typeof data.recommendation === 'string') return { ...data, fixture: Boolean(data.fixture) };
      }
    } catch {
      // fall through to fixture
    }
  }
  return fixtureTriage(input);
}
