import { type ReactNode } from 'react';

/** Gallery section wrapper — a titled block with a soft eyebrow and generous spacing. */
export function Section({ id, title, subtitle, children }: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <header className="mb-4">
        <h2 className="text-h2 font-semibold text-text">{title}</h2>
        {subtitle && <p className="mt-0.5 text-small text-textMuted">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

/** A labelled specimen slot so each state reads clearly in screenshots. */
export function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-eyebrow uppercase text-textFaint">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
