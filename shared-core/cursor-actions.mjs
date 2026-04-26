// shared-core/cursor-actions.mjs — visual & audio simulation when ghost cursor arrives
//
// 7 action types: click, type, select, hover, drag, scroll, contextmenu
// All visual/audio only — never calls .click() / .focus() / mutates form data permanently.
// Probability of action firing per arrival: ACTION_PROBABILITY (0..1).

import { on, emit } from './eventbus.mjs';

const ACTION_PROBABILITY = 0.7;

const TYPING_PHRASES = [
  '확인했습니다',
  'Q2 검토 중',
  'OK',
  '14:30 미팅',
  '확인 부탁드립니다',
  '진행하겠습니다',
  '내일 회신드릴게요',
  '검토 후 회신',
  '수고하셨습니다',
  '내용 반영했습니다',
  '논의 후 결정',
  '일단 보류',
];

const CONTEXT_MENU_ITEMS = [
  ['📋 복사', 'Ctrl+C'],
  ['✂️ 잘라내기', 'Ctrl+X'],
  ['📌 붙여넣기', 'Ctrl+V'],
  ['🔗 링크 복사', ''],
  ['🔍 페이지에서 검색', 'Ctrl+F'],
  ['ⓘ 속성', ''],
];

let suppressed = false;

/** Decide which action to perform given the target element. */
function pickAction(el) {
  if (el.matches('input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, [contenteditable]')) {
    return Math.random() < 0.7 ? 'type' : 'click';
  }
  if (el.matches('button, a, [role="button"]')) {
    const r = Math.random();
    if (r < 0.6) return 'click';
    if (r < 0.9) return 'hover';
    return 'contextmenu';
  }
  if (el.matches('td, .cell, [class*="row"], [class*="item"], li')) {
    const r = Math.random();
    if (r < 0.4) return 'select';
    if (r < 0.7) return 'click';
    if (r < 0.9) return 'drag';
    return 'scroll';
  }
  return Math.random() < 0.5 ? 'hover' : 'click';
}

function doClick(x, y) {
  const pulse = document.createElement('div');
  pulse.className = 'busy-click-pulse';
  pulse.style.left = x + 'px';
  pulse.style.top = y + 'px';
  document.body.appendChild(pulse);
  setTimeout(() => pulse.remove(), 600);
  emit('cursor:click');  // sound engine plays "tick"
}

function doSelect(el) {
  if (el.classList.contains('busy-fake-selected')) return;
  el.classList.add('busy-fake-selected');
  setTimeout(() => el.classList.remove('busy-fake-selected'), 1500);
}

function doHover(_el) {
  // dwell phase already handles hover; nothing extra needed
}

function doType(el) {
  const phrase = TYPING_PHRASES[Math.floor(Math.random() * TYPING_PHRASES.length)];
  const isFormField = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
  const original = isFormField ? el.value : el.textContent;

  el.classList.add('busy-fake-focused');

  let i = 0;
  const writeAt = (n) => {
    const text = original + phrase.slice(0, n);
    if (isFormField) el.value = text;
    else el.textContent = text;
  };

  function step() {
    if (i > phrase.length) {
      // hold for a bit then restore
      setTimeout(() => {
        try {
          if (isFormField) el.value = original;
          else el.textContent = original;
        } catch {}
        el.classList.remove('busy-fake-focused');
      }, 2200);
      return;
    }
    writeAt(i);
    i++;
    setTimeout(step, 90 + Math.random() * 140);
  }
  step();
}

function doDrag(el, x, y) {
  // Visual hint: pulse on source, pulse on a sibling target after a beat
  doClick(x, y);
  const parent = el.parentElement;
  if (!parent) return;
  const siblings = [...parent.children].filter((c) => c !== el && c.nodeType === 1);
  if (siblings.length === 0) return;
  const target = siblings[Math.floor(Math.random() * siblings.length)];
  const tr = target.getBoundingClientRect();
  if (tr.width < 4 || tr.height < 4) return;
  setTimeout(() => {
    doClick(tr.left + tr.width / 2, tr.top + tr.height / 2);
  }, 380 + Math.random() * 220);
}

function doScroll(_el) {
  const delta = (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 100);
  try { window.scrollBy({ top: delta, behavior: 'smooth' }); } catch {}
}

function doContextMenu(x, y) {
  // Only one menu at a time
  const existing = document.querySelector('.busy-fake-context-menu');
  if (existing) return;

  const menu = document.createElement('div');
  menu.className = 'busy-fake-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.innerHTML = CONTEXT_MENU_ITEMS.map(([label, kbd]) =>
    `<div class="busy-fake-context-menu-item"><span>${label}</span><span class="kbd">${kbd}</span></div>`
  ).join('');
  document.body.appendChild(menu);

  // Reposition if overflowing
  const r = menu.getBoundingClientRect();
  if (r.right > window.innerWidth - 8) menu.style.left = Math.max(4, window.innerWidth - r.width - 8) + 'px';
  if (r.bottom > window.innerHeight - 8) menu.style.top = Math.max(4, window.innerHeight - r.height - 8) + 'px';

  setTimeout(() => menu.remove(), 1200);
}

export function mount() {
  if (document.body.dataset.suppress?.includes('cursor')) {
    suppressed = true;
    return;
  }

  on('cursor:arrived', ({ element, x, y }) => {
    if (suppressed) return;
    if (!element || !element.isConnected) return;
    if (Math.random() > ACTION_PROBABILITY) return;

    const action = pickAction(element);
    try {
      switch (action) {
        case 'click':       doClick(x, y); break;
        case 'select':      doSelect(element); break;
        case 'hover':       doHover(element); break;
        case 'type':        doType(element); break;
        case 'drag':        doDrag(element, x, y); break;
        case 'scroll':      doScroll(element); break;
        case 'contextmenu': doContextMenu(x, y); break;
      }
    } catch (e) {
      console.warn('[cursor-actions]', action, e);
    }
  });
}
