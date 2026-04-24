// shared-core/vitals-tool.mjs
import { pickIntensityRange, scheduleRandom, pickRandom } from './vitals-core.mjs';

const METER_BY_INTENSITY = { low: [300, 600], med: [120, 300], high: [60, 180] };
const ACTION_BY_INTENSITY = { low: [30, 90], med: [15, 40], high: [5, 15] };

const ACTIONS_DAW = ['트랙 솔로 · 02:34', '볼륨 -2.1dB · 드럼', '반복 구간 설정 · 3:12–3:44', 'FX 체인 업데이트'];
const ACTIONS_3D  = ['면 추출 · v=127', '루프 컷 추가 · edge 248', '서브디비전 레벨 +1', '머티리얼 재할당'];

function pickAction() {
  if (location.pathname.includes('daw')) return pickRandom(ACTIONS_DAW);
  if (location.pathname.includes('3dmodel')) return pickRandom(ACTIONS_3D);
  return pickRandom([...ACTIONS_DAW, ...ACTIONS_3D]);
}

function renderProgressBanner() {
  const banner = document.createElement('div');
  banner.className = 'busy-vitals-save-badge';
  document.body.appendChild(banner);
  let pct = 0;
  let remain = 120;
  const update = () => {
    pct = Math.min(100, pct + Math.random() * 2);
    remain = Math.max(0, remain - 1);
    const mm = Math.floor(remain / 60), ss = remain % 60;
    const label = location.pathname.includes('daw') ? '믹스다운' : '렌더';
    banner.textContent = `${label} 중 · ${pct.toFixed(0)}% · ${mm}:${String(ss).padStart(2,'0')} 남음`;
    banner.classList.add('show');
    if (pct >= 100) {
      setTimeout(() => { banner.classList.remove('show'); pct = 0; remain = 60 + Math.floor(Math.random() * 120); }, 2000);
    }
  };
  update();
  setInterval(update, 2000);
}

function animatePlayhead() {
  const heads = document.querySelectorAll('[class*="playhead"], [class*="marker"], .cursor-line');
  heads.forEach((h) => {
    let pos = 0;
    setInterval(() => {
      pos = (pos + 1) % 100;
      h.style.left = pos + '%';
    }, 200);
  });
}

function jitterMeters() {
  const meters = document.querySelectorAll('[class*="meter"], [class*="vu"], [class*="level"]');
  meters.forEach((m) => {
    let phase = Math.random() * Math.PI * 2;
    setInterval(() => {
      phase += 0.18 + Math.random() * 0.3;
      m.style.transform = `scaleY(${0.4 + 0.4 * Math.abs(Math.sin(phase))})`;
    }, 80);
  });
}

export function mount(settings) {
  renderProgressBanner();
  animatePlayhead();
  jitterMeters();

  const actionLog = document.querySelector('[class*="history"], [class*="recent"], .log');
  if (actionLog) {
    scheduleRandom(
      () => {
        const line = document.createElement('div');
        line.textContent = `· ${pickAction()}`;
        line.style.cssText = 'padding:2px 6px; font-size:11px; opacity:0; transition:opacity 200ms;';
        actionLog.prepend(line);
        requestAnimationFrame(() => (line.style.opacity = '1'));
        while (actionLog.children.length > 20) actionLog.lastChild.remove();
      },
      () => pickIntensityRange(ACTION_BY_INTENSITY, settings.intensity),
    );
  }
}
