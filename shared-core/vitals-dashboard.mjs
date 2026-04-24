// shared-core/vitals-dashboard.mjs
import { pickIntensityRange, scheduleRandom, pickRandom } from './vitals-core.mjs';

const TICK_BY_INTENSITY  = { low: [2, 5], med: [1, 3], high: [0.3, 1.5] };
const LOG_BY_INTENSITY   = { low: [20, 60], med: [5, 15], high: [2, 6] };
const GAUGE_ANIM_MS = 1500;

const LOG_LINES_ATC = [
  'KAL101 · RWY 34R 접근 중',
  'AAR234 · FL280 · 터미널 진입',
  'JNA543 · 체공 시간 +2min',
  'UAE485 · 방위 270 · 하강 중',
  'SQ606 · 순항 · 고도 유지',
];
const LOG_LINES_SOC = [
  '🟡 PORT SCAN from 203.241.x.x',
  '🟢 알려진 IOC 매치 · 격리 완료',
  '🔴 비정상 로그인 시도 · user=admin',
  '🟡 외부 DNS 쿼리 이상치 감지',
  '🟢 방화벽 룰 업데이트 적용',
];
const LOG_LINES_HTS = [
  '체결 · 삼성전자 · 73,200 · 100주',
  '호가 변경 · SK하이닉스 · 매수 1호가',
  '체결 · 네이버 · 213,500 · 50주',
  '호가 변경 · 카카오 · 매도 1호가',
  'PnL · +₩1,284,300 (+0.42%)',
];

function pickLogLine() {
  if (location.pathname.includes('atc')) return pickRandom(LOG_LINES_ATC);
  if (location.pathname.includes('soc')) return pickRandom(LOG_LINES_SOC);
  if (location.pathname.includes('hts')) return pickRandom(LOG_LINES_HTS);
  return '이벤트 감지 · ' + Math.random().toString(16).slice(2, 10);
}

function findNumbers() {
  return [...document.querySelectorAll('.num, .value, [data-value], td, [class*="metric"]')].filter(
    (el) => el.offsetParent !== null && /\d/.test(el.textContent)
  );
}

function tickNumber(el) {
  const txt = el.textContent;
  const m = txt.match(/(-?\d[\d,]*(?:\.\d+)?)/);
  if (!m) return;
  const n = parseFloat(m[1].replace(/,/g, ''));
  const d = Math.round(n * (Math.random() * 0.004 - 0.002)) || (Math.random() > 0.5 ? 1 : -1);
  el.textContent = txt.replace(m[1], (n + d).toLocaleString('ko-KR'));
  el.classList.add('busy-vitals-flash');
  setTimeout(() => el.classList.remove('busy-vitals-flash'), 600);
}

function animateGauges() {
  const bars = document.querySelectorAll('.bar, [class*="progress"], [role="progressbar"]');
  bars.forEach((bar) => {
    const inner = bar.querySelector('[style*="width"]') || bar;
    const base = parseFloat(inner.style.width) || 50;
    let phase = Math.random() * Math.PI * 2;
    setInterval(() => {
      phase += 0.12;
      const w = Math.max(5, Math.min(95, base + Math.sin(phase) * 5));
      inner.style.width = w + '%';
    }, GAUGE_ANIM_MS / 30);
  });
}

function findLogContainer() {
  return document.querySelector('[class*="log"], .events, .feed, [data-role="log"]');
}

export function mount(settings) {
  scheduleRandom(
    () => {
      const nums = findNumbers();
      if (nums.length) tickNumber(pickRandom(nums));
    },
    () => pickIntensityRange(TICK_BY_INTENSITY, settings.intensity),
  );

  animateGauges();

  const logContainer = findLogContainer();
  if (logContainer) {
    scheduleRandom(
      () => {
        const line = document.createElement('div');
        line.textContent = `[${new Date().toTimeString().slice(0, 8)}] ${pickLogLine()}`;
        line.style.cssText = 'padding:2px 6px; font-family:monospace; font-size:11px; opacity:0; transition:opacity 300ms;';
        logContainer.prepend(line);
        requestAnimationFrame(() => (line.style.opacity = '1'));
        // Trim old entries
        while (logContainer.children.length > 40) logContainer.lastChild.remove();
      },
      () => pickIntensityRange(LOG_BY_INTENSITY, settings.intensity),
    );
  }
}
