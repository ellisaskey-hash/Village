import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '@/lib/services/provider';
import { useSessionStore } from '@/app/state/session';
import { errorMessage } from '@/lib/errors';
import { Button, Field, TextLink } from '@/components/ui';
import { AuthLayout } from './AuthLayout';

export function SignInScreen() {
  const services = useServices();
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
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
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <p className="text-small text-danger">{error}</p>}
        <Button variant="primary" size="xl" fullWidth type="submit" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
