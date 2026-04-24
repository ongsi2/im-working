// shared-core/identity-tag.mjs
// Reads <body data-title="..." data-favicon="..."> and sets document.title + favicon.
// Unread counter: prepend "(N) " to title when toasts arrive; reset on load.

import { on } from './eventbus.mjs';

let baseTitle = '';
let unread = 0;

function emojiToDataUri(emoji) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<text y="52" font-size="56" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">${emoji}</text>` +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function applyFavicon(value) {
  if (!value) return;
  const href = value.startsWith('data:') || value.startsWith('http') || value.includes('.')
    ? value
    : emojiToDataUri(value);
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

function render() {
  const prefix = unread > 0 ? `(${unread}) ` : '';
  document.title = prefix + baseTitle;
}

export function mount() {
  baseTitle = document.body?.dataset.title || document.title || '열일하는중';
  const favicon = document.body?.dataset.favicon;
  applyFavicon(favicon);
  render();

  on('toast', () => { unread += 1; render(); });
  // Reset counter on any user interaction (focus "read" the tab)
  const reset = () => { if (unread) { unread = 0; render(); } };
  ['click', 'keydown', 'mousemove'].forEach((t) =>
    window.addEventListener(t, reset, { once: true, passive: true })
  );
}

export const _test = { setBaseForTest: (t) => { baseTitle = t; unread = 0; } };
