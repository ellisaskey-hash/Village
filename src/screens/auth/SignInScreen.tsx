import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '@/lib/services/provider';
import { useSessionStore } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Field, PasswordField, TextLink, useToasts } from '@/components/ui';
import { AuthLayout } from './AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInScreen() {
  const services = useServices();
  const navigate = useNavigate();
  const push = useToasts();
  const setSession = useSessionStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    setBusy(true);
    try {
      const session = await services.auth.signIn(email, password);
      setSession(session);
      navigate(session.memberships.length > 0 ? '/' : '/welcome');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (!EMAIL_RE.test(email)) {
      setEmailError('Enter your email above first, then tap this again');
      return;
    }
    setEmailError('');
    try {
      await services.auth.requestReset(email);
      push({ title: "If that email's registered, we've sent a reset link", variant: 'success' });
    } catch (err) {
      push({ title: errorMessage(err), variant: 'error' });
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      footer={
        <>
          New here? <TextLink onClick={() => navigate('/welcome')}>Find your community</TextLink>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
          autoComplete="email"
          {...(emailError ? { error: emailError } : {})}
        />
        <div className="space-y-1.5">
          <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <div className="flex justify-end">
            <TextLink onClick={forgotPassword}>Forgot password?</TextLink>
          </div>
        </div>
        {error && <p className="text-small text-danger" role="alert">{error}</p>}
        <Button variant="primary" size="xl" fullWidth type="submit" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
