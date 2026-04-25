// shared-core/fake-shortcuts.mjs — intercept Cmd/Ctrl + (S|P|F|Z) and show fake feedback
import { show as showToast } from './toast.mjs';

const RESPONSES = {
  s: { cat: 'sys', title: '저장됨', body: () => `${docName()} · ${nowHM()}` },
  p: { cat: 'sys', title: '프린터 대기열 추가', body: () => `${docName()} · 1부 · 컬러` },
  f: { cat: 'sys', title: '검색', body: () => '0개 결과 (페이지 내)' },
  z: { cat: 'sys', title: '실행 취소', body: () => `이전 상태로 복귀` },
};

function docName() {
  return document.body.dataset.title || document.title || 'Untitled';
}
function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export function mount() {
  document.addEventListener('keydown', (e) => {
    // Allow real typing in inputs
    if (e.target instanceof Element && e.target.matches('input, textarea, [contenteditable]')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    const r = RESPONSES[key];
    if (!r) return;
    e.preventDefault();
    showToast({ cat: r.cat, title: r.title, body: r.body(), target: null });
  });
}
