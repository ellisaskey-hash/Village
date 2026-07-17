import type { Event } from '@/lib/services/types';

function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Builds and downloads an .ics file for an event (add-to-calendar, spec 07). */
export function downloadIcs(e: Event): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Local//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@local`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.startsAt)}`,
    e.endsAt ? `DTEND:${stamp(e.endsAt)}` : '',
    `SUMMARY:${e.title}`,
    e.locationText ? `LOCATION:${e.locationText}` : '',
    e.description ? `DESCRIPTION:${e.description.replace(/\n/g, ' ')}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${e.title.replace(/[^a-z0-9]+/gi, '-')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

/** Start to end range, collapsing to just the end time when it's the same day.
 *  "Sat 19 Jul, 14:00 to 16:00" or "Sat 19 Jul, 14:00 to Sun 20 Jul, 10:00". */
export function formatWhenRange(startIso: string, endIso: string | null): string {
  const start = formatWhen(startIso);
  if (!endIso) return start;
  const s = new Date(startIso);
  const e = new Date(endIso);
  const end = s.toDateString() === e.toDateString()
    ? e.toLocaleTimeString('en-GB', CLOCK)
    : formatWhen(endIso);
  return `${start} to ${end}`;
}

/** Whole years between a YYYY-MM-DD date of birth and today. */
export function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/** Compact relative time for feeds/queues: "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "Needed by Sat 19 Jul", flagged urgent when the deadline is within ~2 days. */
export function deadlineLabel(iso: string | null): { text: string; urgent: boolean } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const days = Math.ceil((d.getTime() - Date.now()) / 864e5);
  return {
    text: `Needed by ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`,
    urgent: days <= 2,
  };
}
