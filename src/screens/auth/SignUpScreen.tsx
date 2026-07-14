import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useServices } from '@/lib/services/provider';
import { useSessionStore } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Checkbox, Field, InfoCallout, TextLink } from '@/components/ui';
import { AuthLayout } from './AuthLayout';

export function SignUpScreen() {
  const services = useServices();
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const [params] = useSearchParams();
  const slug = params.get('slug');
  const postcode = params.get('postcode') ?? undefined;
  const invite = params.get('invite') ?? undefined;

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError('Please agree to the community standard to continue');
      return;
    }
    setBusy(true);
    try {
      const session = await services.auth.signUp({
        displayName,
        email,
        password,
        dateOfBirth: dob,
      });
      setSession(session);
      if (slug) {
        await services.communities.join({
          slug,
          ...(postcode ? { postcode } : {}),
          ...(invite ? { inviteCode: invite } : {}),
        });
        setSession(await services.auth.currentSession());
        navigate('/onboarding');
      } else {
        navigate('/welcome');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Real names keep a village a village."
      footer={
        <>
          Already a member? <TextLink onClick={() => navigate('/auth/sign-in')}>Sign in</TextLink>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Sam Fletcher" autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} helper="At least 8 characters" autoComplete="new-password" />
        <Field label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} helper="You need to be 16 or over to join" />

        <InfoCallout heading="The community standard" icon="shield" tone="accent">
          Be a good neighbour: real names, keep disputes to messages, and list only lawful things.
          Tap to read it in full once you're in.
        </InfoCallout>
        <Checkbox checked={agreed} onChange={setAgreed} label="I agree to the community standard" />

        {error && <p className="text-small text-danger">{error}</p>}

        <Button variant="primary" size="xl" fullWidth type="submit" loading={busy}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
