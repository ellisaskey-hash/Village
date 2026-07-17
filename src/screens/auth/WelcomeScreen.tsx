import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useServices } from '@/lib/services/provider';
import { Button, Card, Field, Icon, TextLink, useToasts } from '@/components/ui';
import type { CommunityCard } from '@/lib/services/types';
import { AuthLayout } from './AuthLayout';

export function WelcomeScreen() {
  const services = useServices();
  const navigate = useNavigate();
  const push = useToasts();
  const [params] = useSearchParams();
  const invite = params.get('invite') ?? '';

  const [postcode, setPostcode] = useState('');
  const [results, setResults] = useState<CommunityCard[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [postcodeError, setPostcodeError] = useState('');

  async function findCommunities(e?: FormEvent) {
    e?.preventDefault();
    if (!postcode.trim()) {
      setPostcodeError('Enter your postcode to search');
      return;
    }
    setPostcodeError('');
    setSearching(true);
    try {
      setResults(await services.communities.discover(postcode));
    } catch {
      push({ title: 'Could not search just now', variant: 'error' });
    } finally {
      setSearching(false);
    }
  }

  function chooseCommunity(slug: string) {
    const q = new URLSearchParams({ slug, postcode });
    if (invite) q.set('invite', invite);
    navigate(`/auth/sign-up?${q.toString()}`);
  }

  return (
    <AuthLayout
      title="Your community, in one place"
      subtitle="Requests, listings, events and alerts for where you live. Find your community to get started."
      footer={
        <>
          Already a member? <TextLink onClick={() => navigate('/auth/sign-in')}>Sign in</TextLink>
        </>
      }
    >
      {invite && (
        <Card>
          <p className="text-small text-textMuted">
            You have an invite. Confirm your postcode below and we'll add the invite when you join.
          </p>
        </Card>
      )}

      <form onSubmit={findCommunities} className="flex items-start gap-2">
        <Field
          label="Your postcode"
          value={postcode}
          onChange={(e) => { setPostcode(e.target.value); setPostcodeError(''); }}
          placeholder="e.g. TN12 8AA"
          autoComplete="postal-code"
          className="flex-1"
          {...(postcodeError ? { error: postcodeError } : {})}
        />
        <Button variant="primary" size="xl" type="submit" loading={searching} className="mt-[26px]">
          Find
        </Button>
      </form>

      {results && results.length === 0 && (
        <Card>
          <p className="text-body font-medium text-text">No community here yet</p>
          <p className="mt-1 text-small text-textMuted">
            We're rolling out village by village. Horsmonden (TN12) is first. Have an invite from a
            neighbour? Use their link to join.
          </p>
        </Card>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => chooseCommunity(c.slug)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-bgElevated p-cardPad text-left transition-colors hover:border-accent/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--badge-accent-bg)] text-[var(--badge-accent-fg)]">
                <Icon name="home" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-text">{c.name}</span>
                <span className="block text-small text-textMuted">{c.region ?? c.type}</span>
              </span>
              <Icon name="chevron-right" size={18} className="text-textFaint" />
            </button>
          ))}
        </div>
      )}
    </AuthLayout>
  );
}
