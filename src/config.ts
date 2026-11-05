/**
 * Link to the Buy Me a Coffee page, for example https://buymeacoffee.com/yourname.
 * Set it here, or with the VITE_BUY_ME_A_COFFEE_URL environment variable at
 * build time (for example in the Vercel project settings).
 * The button stays hidden while no valid https link is set.
 */
const DEFAULT_BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/flutterby_81';

function httpsOnly(url: string | undefined): string {
  const trimmed = url?.trim() ?? '';
  return /^https:\/\/\S+$/.test(trimmed) ? trimmed : '';
}

export const BUY_ME_A_COFFEE_URL = httpsOnly(
  import.meta.env.VITE_BUY_ME_A_COFFEE_URL || DEFAULT_BUY_ME_A_COFFEE_URL,
);
