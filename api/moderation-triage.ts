// Server-side moderation triage (Vercel function). Advisory only — it returns a suggestion,
// never acts. Anthropic runs here, never in the client bundle (CLAUDE.md rule 6). Tool-use is
// forced so the reply is a typed object. With no ANTHROPIC_API_KEY set it returns the same
// rule-based fixture the client uses, so the seam is real before the key lands (AWAITING-KEYS).
import type { ApiRequest, ApiResponse } from './_types';

interface TriageInput { reason: string; note: string | null }
interface TriageSuggestion {
  recommendation: 'hide' | 'watch' | 'dismiss';
  confidence: number;
  rationale: string;
  fixture: boolean;
}

const HIGH_HARM = new Set(['unsafe', 'abuse']);
const COMMERCE_HARM = new Set(['scam', 'spam']);
const RISK_WORDS = /(http|www\.|\bmoney\b|\bpayment\b|\bbank\b|\bthreat|\bhurt\b|\bweapon)/i;

function fixture(input: TriageInput): TriageSuggestion {
  const note = input.note ?? '';
  const risky = RISK_WORDS.test(note);
  if (HIGH_HARM.has(input.reason))
    return { recommendation: 'hide', confidence: 0.7, rationale: `Reported as ${input.reason}. Safety-related reports lean towards hiding while a person reviews.`, fixture: true };
  if (COMMERCE_HARM.has(input.reason))
    return { recommendation: risky ? 'hide' : 'watch', confidence: risky ? 0.6 : 0.5, rationale: risky ? `Reported as ${input.reason} with links or money mentioned.` : `Reported as ${input.reason}. Keep an eye on it.`, fixture: true };
  return { recommendation: 'watch', confidence: 0.4, rationale: `Reported as ${input.reason}. No strong signal either way.`, fixture: true };
}

const TOOL = {
  name: 'triage',
  description: 'Return an advisory moderation triage suggestion for a reported item.',
  input_schema: {
    type: 'object',
    properties: {
      recommendation: { type: 'string', enum: ['hide', 'watch', 'dismiss'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      rationale: { type: 'string' },
    },
    required: ['recommendation', 'confidence', 'rationale'],
  },
};

interface AnthropicBlock { type: string; input?: Record<string, unknown> }
interface AnthropicResponse { content?: AnthropicBlock[] }

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const input = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})) as TriageInput;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(200).json(fixture(input)); return; } // AWAITING-KEYS

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        tool_choice: { type: 'tool', name: 'triage' },
        tools: [TOOL],
        messages: [{
          role: 'user',
          content: `A community platform item was reported. Reason: ${input.reason}. Reporter note: ${input.note ?? '(none)'}. Give an advisory triage suggestion. You never make the final call; a human decides.`,
        }],
      }),
    });
    const data = (await r.json()) as AnthropicResponse;
    const block = (data.content ?? []).find((b) => b.type === 'tool_use');
    if (!block?.input) { res.status(200).json(fixture(input)); return; }
    res.status(200).json({ ...block.input, fixture: false });
  } catch {
    res.status(200).json(fixture(input));
  }
}
