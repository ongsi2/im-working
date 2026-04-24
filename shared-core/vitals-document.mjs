// shared-core/vitals-document.mjs
import { pickIntensityRange, scheduleRandom, pickRandom, fmtDuration } from './vitals-core.mjs';

const TYPING_BY_INTENSITY = { low: [10, 25], med: [5, 15], high: [2, 8] };
const SCROLL_BY_INTENSITY = { low: [60, 180], med: [30, 90], high: [15, 40] };
const SENTENCES = [
  '이 조항은 본 계약의 목적에 비추어 해석되어야 한다.',
  '환자의 주증상은 지속되는 간헐적 흉부 압박감이다.',
  '다음 단계에서는 분기 성과와 직접적으로 연동되어 평가된다.',
  '이 블록은 입력 데이터의 정규화 이후에 실행되어야 합니다.',
  '상기 일정은 이해관계자 승인 이후 재조정될 수 있습니다.',
  '결과 값은 신뢰구간 95% 이상에서 유의미한 차이를 보였다.',
  '이 변경은 이전 버전과 호환되지 않을 수 있으니 주의하시기 바랍니다.',
];
const WORDS = [' · ', '확인 ', '검토 ', '업데이트 ', '수정 ', '추가 ', '반영 '];

let startTs = 0;
let editingEl = null;

function findTypingTarget() {
  // Prefer largest text block that's visible
  const cand = [...document.querySelectorAll('p, li, .content, article, .document, [class*="body"]')]
    .filter((el) => el.offsetParent !== null && el.innerText && el.innerText.length > 30);
  cand.sort((a, b) => b.innerText.length - a.innerText.length);
  return cand[0] || document.body;
}

function attachCaret(target) {
  if (target.querySelector('.busy-vitals-caret')) return;
  const caret = document.createElement('span');
  caret.className = 'busy-vitals-caret';
  target.appendChild(caret);
  return caret;
}

function typeChars(target, text) {
  const caret = target.querySelector('.busy-vitals-caret');
  let i = 0;
  const step = () => {
    if (i >= text.length) return;
    const node = document.createTextNode(text[i]);
    target.insertBefore(node, caret);
    i++;
    setTimeout(step, 50 + Math.random() * 90);
  };
  step();
}

function addEditingBadge() {
  editingEl = document.createElement('div');
  editingEl.className = 'busy-vitals-editing';
  document.body.appendChild(editingEl);
  startTs = Date.now();
  setInterval(() => {
    editingEl.textContent = `편집 중 · ${fmtDuration(Date.now() - startTs)}`;
  }, 1000);
}

function sceneQuirks() {
  const type = location.pathname;
  if (type.includes('translator')) return translatorQuirks();
  if (type.includes('latex'))      return latexQuirks();
  if (type.includes('notebook'))   return notebookQuirks();
  if (type.includes('medical'))    return medicalQuirks();
  return null;
}

function translatorQuirks() {
  // Alternate typing between left and right columns (if any)
  const cols = document.querySelectorAll('.left, .source, .original, .right, .target, .translation, [class*="col"]');
  if (cols.length < 2) return null;
  let side = 0;
  return () => {
    const col = cols[side % cols.length];
    side++;
    const target = col.querySelector('p, div') || col;
    attachCaret(target);
    typeChars(target, pickRandom(WORDS));
  };
}

function latexQuirks() {
  const badge = document.createElement('div');
  badge.className = 'busy-vitals-save-badge';
  badge.textContent = '컴파일 중... main.tex';
  document.body.appendChild(badge);
  setInterval(() => {
    badge.classList.add('show');
    setTimeout(() => badge.classList.remove('show'), 1800);
  }, 15000 + Math.random() * 10000);
  return null;
}

function notebookQuirks() {
  const cells = document.querySelectorAll('[class*="cell"], .code-cell, .input');
  if (!cells.length) return null;
  setInterval(() => {
    const c = pickRandom([...cells]);
    const pre = c.querySelector('.prompt, .input-prompt') || c;
    const orig = pre.textContent;
    pre.textContent = '[*]';
    setTimeout(() => { pre.textContent = `[${1 + Math.floor(Math.random() * 40)}]`; }, 1500);
  }, 8000 + Math.random() * 12000);
  return null;
}

function medicalQuirks() {
  const badge = document.createElement('div');
  badge.className = 'busy-vitals-save-badge';
  document.body.appendChild(badge);
  let n = 14;
  setInterval(() => {
    n = Math.min(200, n + 1 + Math.floor(Math.random() * 3));
    badge.textContent = `EMR 동기화 중 · ${n}/200 레코드`;
    badge.classList.add('show');
    setTimeout(() => badge.classList.remove('show'), 2000);
  }, 7000);
  return null;
}

export function mount(settings) {
  const target = findTypingTarget();
  attachCaret(target);
  addEditingBadge();

  const quirk = sceneQuirks();

  // Word typing
  scheduleRandom(
    () => {
      if (quirk) return quirk();
      typeChars(target, pickRandom(WORDS));
    },
    () => pickIntensityRange(TYPING_BY_INTENSITY, settings.intensity),
  );

  // Sentence burst
  scheduleRandom(
    () => typeChars(target, pickRandom(SENTENCES) + ' '),
    () => {
      const [a, b] = pickIntensityRange(TYPING_BY_INTENSITY, settings.intensity);
      return [a * 2, b * 2];
    },
  );

  // Scroll jitter
  scheduleRandom(
    () => {
      const delta = (Math.random() - 0.5) * 40;
      window.scrollBy({ top: delta, behavior: 'smooth' });
    },
    () => pickIntensityRange(SCROLL_BY_INTENSITY, settings.intensity),
  );
}
