// shared-core/keys.mjs — global keyboard shortcuts (works in every scene)

import * as Rotator from './rotator.mjs';
import { focusCurrent } from './start.mjs';

let escCount = 0;
let escTimer = null;

export function mount(settings) {
  document.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs
    if (e.target.matches('input, textarea, [contenteditable]')) return;

    // . → panic
    if (e.key === '.' || e.key === '>') {
      e.preventDefault();
      Rotator.panic(settings);
      return;
    }

    // Esc Esc → resume panic
    if (e.key === 'Escape') {
      escCount++;
      clearTimeout(escTimer);
      escTimer = setTimeout(() => { escCount = 0; }, 500);
      if (escCount >= 2) { escCount = 0; Rotator.resumePanic(); }
      return;
    }

    // h → return to hub
    if (e.key === 'h' || e.key === 'H') {
      const base = location.pathname.includes('/busy/') ? '../' : './';
      location.href = base + 'index.html';
      return;
    }

    // f → fullscreen + audio unlock + wake lock for current scene
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      focusCurrent(settings);
      return;
    }

    // ? → shortcuts cheatsheet
    if (e.key === '?') {
      showCheatSheet();
      return;
    }
  });
}

function showCheatSheet() {
  if (document.getElementById('busy-cheat')) return;
  const el = document.createElement('div');
  el.id = 'busy-cheat';
  el.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.85);display:grid;place-items:center;color:#fff;font-family:system-ui;font-size:14px;';
  el.innerHTML = `<div style="background:#1b1d22;padding:24px 32px;border-radius:10px;min-width:340px;">
    <h3 style="margin:0 0 12px">단축키</h3>
    <pre style="font-family:system-ui;line-height:1.7;margin:0;">
1~9,0,-,=   씬 1~12
q~p,[,]     씬 13~24
F           전체화면 + 사운드 + Wake Lock (현재 씬)
h           허브 복귀
.           패닉 (위장 씬)
Esc Esc     패닉 해제
?           이 도움말
</pre>
    <div style="margin-top:12px;text-align:right;"><button id="busy-cheat-close" style="background:#2a2d34;color:#ddd;border:0;padding:6px 14px;border-radius:6px;cursor:pointer;">닫기</button></div>
  </div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.querySelector('#busy-cheat-close').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  document.addEventListener('keydown', function once(ev) {
    if (ev.key === 'Escape' || ev.key === '?') { close(); document.removeEventListener('keydown', once); }
  });
}
