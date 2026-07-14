import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { screenEnter } from '@/lib/motion';
import { BrandLogo, Button, IconBadge, TextLink, type IconName } from '@/components/ui';

const VALUE: { icon: IconName; title: string; body: string }[] = [
  { icon: 'requests', title: 'Ask a neighbour', body: 'A lift, a ladder, a recommendation. Post a request and someone nearby will help.' },
  { icon: 'listings', title: 'Buy, sell, lend', body: 'Give things a new home and borrow from the village lending library.' },
  { icon: 'events', title: "What's on", body: 'The fete, the market, the cricket. RSVP and add it to your calendar.' },
  { icon: 'alerts', title: 'Stay in the know', body: 'Lost pets, road closures and notices from the people who actually run things.' },
];

/** Public marketing landing (spec 07). Logged-out visitors land here; members are routed
 *  straight to the app. Kept light for SEO + Lighthouse. */
export function LandingScreen() {
  const navigate = useNavigate();
  return (
    <motion.main
      id="main"
      variants={screenEnter}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-3xl px-screenX py-16"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <BrandLogo size={64} withWordmark />
        <h1 className="font-display text-display font-bold text-text">Your village, in one place</h1>
        <p className="max-w-xl text-h3 font-normal text-textMuted">
          Requests, listings, events and alerts for where you live. Local is a calmer place to be a
          neighbour, built for one community at a time.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button variant="primary" size="xl" trailingIcon="chevron-right" onClick={() => navigate('/welcome')}>
            Find your community
          </Button>
          <span className="text-small text-textMuted">
            Already a member? <TextLink onClick={() => navigate('/auth/sign-in')}>Sign in</TextLink>
          </span>
        </div>
      </div>

      <section className="mt-16 grid gap-4 sm:grid-cols-2">
        {VALUE.map((v) => (
          <div key={v.title} className="rounded-lg border border-border bg-bgElevated p-cardPad">
            <IconBadge icon={v.icon} tone="accent" size="md" />
            <h2 className="mt-3 text-h3 font-semibold text-text">{v.title}</h2>
            <p className="mt-1 text-small text-textMuted">{v.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-16 text-center text-small text-textFaint">
        Launching first in Horsmonden, Kent. Places data © OpenStreetMap contributors.
      </footer>
    </motion.main>
  );
}
