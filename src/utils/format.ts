// Shared inline-style text helpers for terminal command output.
// Output is rendered via dangerouslySetInnerHTML, so colors use inline styles
// (identical in light/dark, chosen to read on both the paper and the night
// background of the drafting palette). Tailwind classes are unreliable here because the Tailwind
// `content` glob does not scan src/utils.
export const HL = '#C25A44'; // red ink — for **highlights**
export const TAG = '#5E7FA0'; // blue-grey ink — for dates / names / dirs / links
export const ORANGE = '#9C6A28'; // sepia — for call-to-action (e.g. `agent`)

const LINK_CLASS = 'text-light-blue dark:text-dark-blue underline';

// Lightweight markup: `**text**` -> bold highlight. Raw HTML (e.g. <i>…</i>)
// passes straight through.
export const renderMarkup = (s: string): string =>
  s.replace(/\*\*(.+?)\*\*/g, `<b style="color:${HL}">$1</b>`);

export const link = (label: string, url: string): string =>
  `<u><a class="${LINK_CLASS}" style="color:${TAG}" href="${url}" target="_blank">${label}</a></u>`;
