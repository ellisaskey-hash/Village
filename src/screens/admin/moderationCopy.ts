// Plain-English labels for moderation enums (Law 21 — never surface raw codes to users).
import type { ModerationAction, ReportReason } from '@/lib/services/types';

const REASON: Record<ReportReason, string> = {
  scam: 'Scam or fraud',
  spam: 'Spam or advertising',
  abuse: 'Abuse or harassment',
  unsafe: 'Someone may be at risk',
  wrongInfo: 'Wrong or misleading',
  privacy: 'Privacy concern',
  other: 'Something else',
};
export function reasonLabel(r: string): string {
  return REASON[r as ReportReason] ?? r;
}

const ACTION: Record<ModerationAction, string> = {
  autoHide: 'Auto-hidden after reports',
  hide: 'Hidden',
  unhide: 'Un-hidden',
  remove: 'Removed',
  warn: 'Warned',
  suspend: 'Suspended',
  unsuspend: 'Suspension lifted',
  trustChange: 'Trust changed',
  note: 'Note added',
};
export function actionLabel(a: string): string {
  return ACTION[a as ModerationAction] ?? a;
}

const KIND: Record<string, string> = {
  listing: 'Listing', request: 'Request', event: 'Event', alert: 'Alert', message: 'Message',
  profile: 'Member', business: 'Business', organisation: 'Organisation', place: 'Place',
  service: 'Service', equipment: 'Equipment', organisation_post: 'Noticeboard post',
};
export function kindLabel(k: string): string {
  return KIND[k] ?? k;
}
