// // List of commands that require API calls

import { getQuote } from '../api';
import { getReadme } from '../api';
import { getWeather } from '../api';
import { getNews } from '../api';
import { getProjects } from '../api';

// Recent achievements / news (sourced from a GitHub file via config.newsUrl)
export const news = async (args: string[]): Promise<string> => {
  return await getNews();
};

// Projects, grouped into ongoing / finished (sourced from config.projectsUrl)
export const ls = async (args: string[]): Promise<string> => {
  return await getProjects();
};

export const quote = async (args: string[]): Promise<string> => {
  const data = await getQuote();
  return data.quote;
};

export const readme = async (args: string[]): Promise<string> => {
  const readme = await getReadme();
  return `Opening GitHub README...\n${readme}`;
};

export const weather = async (args: string[]): Promise<string> => {
  const city = args.join('+');
  if (!city) {
    return 'Usage: weather [city]. Example: weather casablanca';
  }
  const weather = await getWeather(city);
  return weather;
};
