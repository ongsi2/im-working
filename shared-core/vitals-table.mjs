// shared-core/vitals-table.mjs
import { pickIntensityRange, scheduleRandom, pickRandom } from './vitals-core.mjs';

const FLASH_BY_INTENSITY  = { low: [5, 15], med: [2, 8],   high: [0.5, 3] };
const TOTAL_BY_INTENSITY  = { low: [15, 30], med: [10, 20], high: [3, 10] };
const STATUS_BY_INTENSITY = { low: [30, 90], med: [20, 45], high: [8, 20] };

function findCells() {
  return [...document.querySelectorAll('td, [data-value], .cell, .num')].filter(
    (el) => el.offsetParent !== null && /\d/.test(el.textContent)
  );
}

function bumpNumber(el) {
  const txt = el.textContent;
  const m = txt.match(/(-?\d[\d,]*(?:\.\d+)?)/);
  if (!m) return;
  const num = parseFloat(m[1].replace(/,/g, ''));
  const delta = Math.round(num * (Math.random() * 0.02 - 0.01)) || (Math.random() > 0.5 ? 1 : -1);
  const newNum = num + delta;
  const newStr = txt.replace(m[1], newNum.toLocaleString('ko-KR'));
  el.textContent = newStr;
  el.classList.add('busy-vitals-flash');
  setTimeout(() => el.classList.remove('busy-vitals-flash'), 1100);
}

function sceneMessage() {
  if (location.pathname.includes('erp')) {
    const n = Math.floor(Math.random() * 128);
    return `월마감 처리 중... ${n}/128 전표`;
  }
  if (location.pathname.includes('wms')) {
    return pickRandom(['입고 처리 중 · 3-A-04', '출고 완료 · 7건', '재고 실사 진행 중', '바코드 스캔 대기']);
  }
  return '데이터 갱신 중...';
}

export function mount(settings) {
  // Status badge
  const badge = document.createElement('div');
  badge.className = 'busy-vitals-save-badge';
  document.body.appendChild(badge);

  scheduleRandom(
    () => {
      const cells = findCells();
      if (!cells.length) return;
      const c = pickRandom(cells);
      c.classList.add('busy-vitals-flash');
      setTimeout(() => c.classList.remove('busy-vitals-flash'), 1100);
    },
    () => pickIntensityRange(FLASH_BY_INTENSITY, settings.intensity),
  );

  scheduleRandom(
    () => {
      const cells = findCells().filter((c) => c.closest('tfoot, .total, [class*="sum"]'));
      if (cells.length) bumpNumber(pickRandom(cells));
      else {
        const all = findCells();
        if (all.length) bumpNumber(pickRandom(all));
      }
    },
    () => pickIntensityRange(TOTAL_BY_INTENSITY, settings.intensity),
  );

  scheduleRandom(
    () => {
      badge.textContent = sceneMessage();
      badge.classList.add('show');
      setTimeout(() => badge.classList.remove('show'), 2500);
    },
    () => pickIntensityRange(STATUS_BY_INTENSITY, settings.intensity),
  );
}
