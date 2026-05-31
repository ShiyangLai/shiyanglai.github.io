// Shared inline-style text helpers for terminal command output.
// Output is rendered via dangerouslySetInnerHTML, so colors use inline styles
// with the theme's ansi colors (identical in light/dark, so they read on both
// backgrounds). Tailwind classes are unreliable here because the Tailwind
// `content` glob does not scan src/utils.
export const HL = '#BF568B'; // magenta accent — for **highlights**
export const TAG = '#568BBF'; // cyan accent — for dates / names / dirs / links
export const ORANGE = '#E0913C'; // warm orange accent — for call-to-action (e.g. `agent`)

const LINK_CLASS = 'text-light-blue dark:text-dark-blue underline';

// Lightweight markup: `**text**` -> bold highlight. Raw HTML (e.g. <i>…</i>)
// passes straight through.
export const renderMarkup = (s: string): string =>
  s.replace(/\*\*(.+?)\*\*/g, `<b style="color:${HL}">$1</b>`);

export const link = (label: string, url: string): string =>
  `<u><a class="${LINK_CLASS}" style="color:${TAG}" href="${url}" target="_blank">${label}</a></u>`;
