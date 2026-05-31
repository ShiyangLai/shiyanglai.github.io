import { getPublications, getCitation } from '../publications';

// Lists papers (sourced from config.publicationsUrl).
export const publications = async (args: string[]): Promise<string> =>
  getPublications();

// Prints BibTeX for a paper id, e.g. `cite lai2026collapse` (or `cite all`).
export const cite = async (args: string[]): Promise<string> =>
  getCitation(args[0]);
