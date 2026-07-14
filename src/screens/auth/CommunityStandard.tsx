import { Card, Icon, type IconName } from '@/components/ui';

const RULES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'user', title: 'Real names', body: "You're a neighbour here, not a handle. Go by the name people would know you by." },
  { icon: 'messages', title: 'Disputes go to messages', body: 'If something is wrong, sort it in a private message or tell us with Report. Not in a public post.' },
  { icon: 'home', title: 'Keep it local', body: 'This is for village life, not politics or national news. There are other places for that.' },
  { icon: 'eye', title: 'No camera call-outs', body: "Don't post doorbell or camera footage to name or shame a neighbour." },
  { icon: 'listings', title: 'List only lawful things', body: 'No weapons, no animals as goods (rehoming goes through alerts), nothing age-restricted.' },
  { icon: 'people', title: "Children's photos", body: "Organisers, please don't post identifiable photos of children without a parent's ok." },
];

/** The one-screen community standard (spec 04 §Content rules in copy, not vibes). Shown at
 *  the start of onboarding; the rules are stated so the first incident isn't improvised. */
export function CommunityStandard() {
  return (
    <Card className="space-y-4">
      <p className="text-body text-textMuted">
        A few things everyone signs up to. They keep this a place worth being part of.
      </p>
      <ul className="space-y-3">
        {RULES.map((r) => (
          <li key={r.title} className="flex gap-3">
            <Icon name={r.icon} size={18} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="text-body font-medium text-text">{r.title}</p>
              <p className="text-small text-textMuted">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
