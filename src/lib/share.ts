/** Share a link via the Web Share API, falling back to copying it to the clipboard. */
export async function shareLink(
  title: string,
  url: string,
  toast: (t: { title: string; variant?: 'info' | 'success' | 'error' }) => void,
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', variant: 'success' });
  } catch {
    toast({ title: url, variant: 'info' });
  }
}
