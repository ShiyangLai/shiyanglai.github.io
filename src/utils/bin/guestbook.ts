import { GUESTBOOK_TOKEN } from '../mapToken';

// Renders the interactive guestbook panel (see History.tsx + Guestbook.tsx).
// It also appears at the bottom of the `map` view.
export const guestbook = async (args: string[]): Promise<string> =>
  GUESTBOOK_TOKEN;
