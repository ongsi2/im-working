// shared-core/eventbus.mjs — tiny pub/sub on window

const PREFIX = 'busy:';

export function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(PREFIX + name, { detail }));
}

export function on(name, fn) {
  const handler = (e) => fn(e.detail);
  window.addEventListener(PREFIX + name, handler);
  return () => window.removeEventListener(PREFIX + name, handler);
}
