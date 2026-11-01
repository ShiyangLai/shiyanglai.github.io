import { Html, Head, Main, NextScript } from 'next/document';
import { THEME_INIT_SCRIPT } from '../utils/theme';

// Custom document so the day/night class is applied before first paint
// (avoids a flash of the wrong theme on load).
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
