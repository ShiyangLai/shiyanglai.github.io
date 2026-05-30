import axios from 'axios';
import config from '../../config.json';
import { TAG, renderMarkup, link } from './format';

export const getReadme = async () => {
  const { data } = await axios.get(config.readmeUrl);
  return data;
};

export const getNews = async () => {
  try {
    const { data } = await axios.get(config.newsUrl);
    const items = String(data)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [date, text, url] = line.split('|').map((s) => s.trim());
        const label = renderMarkup(text ?? '');
        const body = url ? link(label, url) : label;
        return `<span style="color:${TAG}">${date}</span>  ${body}`;
      });
    if (items.length === 0) {
      return 'No news yet — check back soon!';
    }
    return `<b style="color:${TAG}">Recent news &amp; achievements:</b>\n\n${items.join(
      '\n',
    )}\n`;
  } catch (error) {
    return 'Could not load news right now. Please try again later.';
  }
};

export const getWeather = async (city: string) => {
  try {
    const { data } = await axios.get(`https://wttr.in/${city}?ATm`);
    return data;
  } catch (error) {
    return error;
  }
};

export const getQuote = async () => {
  try {
    const { data } = await axios.get('https://dummyjson.com/quotes/random');
    return {
      quote: `“${data.quote}” — ${data.author}`,
    };
  } catch (error) {
    return {
      quote: 'Could not fetch a quote right now. Please try again later.',
    };
  }
};
