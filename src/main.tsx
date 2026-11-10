import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

// Windows browsers have no flag emoji: load a self-hosted flag-only font when needed.
// Accessibility: ECharts puts an aria-label on its container without a role. Give every chart container role="img"
// so screen readers announce the chart description (and axe accepts the label).
if (typeof MutationObserver !== 'undefined') {
  const fix = (root: ParentNode) => root.querySelectorAll?.('[_echarts_instance_]:not([role])').forEach((el) => {
    el.setAttribute('role', 'img');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Chart. Use the View as table option or the Download menu for the data.');
  });
  new MutationObserver(() => fix(document)).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['_echarts_instance_'] });
}

polyfillCountryFlagEmojis('Twemoji Country Flags', `${import.meta.env.BASE_URL}fonts/TwemojiCountryFlags.woff2`);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
