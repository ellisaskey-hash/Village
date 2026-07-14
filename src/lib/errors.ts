import { ZodError } from 'zod';

/** Turns any thrown value into a friendly, voice-passed message for a toast or field error. */
export function errorMessage(e: unknown): string {
  if (e instanceof ZodError) return e.issues[0]?.message ?? 'Please check the form';
  if (e instanceof Error) return e.message;
  return 'Something went wrong. Please try again.';
}
