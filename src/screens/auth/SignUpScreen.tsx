import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useServices } from '@/lib/services/provider';
import { useSessionStore } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Checkbox, Field, PasswordField, Sheet, TextLink } from '@/components/ui';
import { AuthLayout } from './AuthLayout';
import { CommunityStandard } from './CommunityStandard';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whole years between a YYYY-MM-DD date and today. */
function ageFrom(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

type FieldErrors = { displayName?: string; email?: string; password?: string; dob?: string };

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [standardOpen, setStandardOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const clearError = (key: keyof FieldErrors) =>
    setFieldErrors((f) => {
      const next = { ...f };
      delete next[key];
      return next;
    });

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!displayName.trim()) next.displayName = 'Tell us your name';
    if (!EMAIL_RE.test(email)) next.email = 'Enter a valid email address';
    if (password.length < 8) next.password = 'Use at least 8 characters';
    if (!dob) next.dob = 'Add your date of birth';
    else if (ageFrom(dob) < 16) next.dob = 'You need to be 16 or over to join';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    if (!agreed) {
      setError('Please agree to the community standard to continue');
      return;
    }
    setBusy(true);
    try {
      const session = await services.auth.signUp({ displayName, email, password, dateOfBirth: dob });
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
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Your name" value={displayName} onChange={(e) => { setDisplayName(e.target.value); clearError('displayName'); }} placeholder="Sam Fletcher" autoComplete="name" {...(fieldErrors.displayName ? { error: fieldErrors.displayName } : {})} />
        <Field label="Email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }} autoComplete="email" {...(fieldErrors.email ? { error: fieldErrors.email } : {})} />
        <PasswordField label="Password" value={password} onChange={(e) => { setPassword(e.target.value); clearError('password'); }} helper="At least 8 characters" autoComplete="new-password" {...(fieldErrors.password ? { error: fieldErrors.password } : {})} />
        <Field label="Date of birth" type="date" value={dob} onChange={(e) => { setDob(e.target.value); clearError('dob'); }} helper="You need to be 16 or over to join" {...(fieldErrors.dob ? { error: fieldErrors.dob } : {})} />

        <div className="rounded-lg border border-border bg-bgElevated p-3">
          <p className="text-small text-textMuted">
            Everyone here agrees to a short community standard: real names, disputes to messages, list
            only lawful things. <TextLink onClick={() => setStandardOpen(true)}>Read it in full</TextLink>
          </p>
        </div>
        <Checkbox checked={agreed} onChange={setAgreed} label="I agree to the community standard" />

        {error && <p className="text-small text-danger" role="alert">{error}</p>}

        <Button variant="primary" size="xl" fullWidth type="submit" loading={busy}>
          Create account
        </Button>
      </form>

      <Sheet open={standardOpen} onClose={() => setStandardOpen(false)} title="The community standard" hero={{ icon: 'shield', tone: 'accent' }}>
        <CommunityStandard />
      </Sheet>
    </AuthLayout>
  );
}
