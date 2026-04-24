# Busy Realism Layer — Design Spec

**Date:** 2026-04-24
**Project:** `C:\working\` ("열일하는중" / busy-hub)
**Goal:** 기존 24개 "일하는 척" 프로토타입 HTML 위에 **전역 생동감 레이어**를 얹어, 멀리서·가까이서·장시간 모두 진짜 근무 중으로 보이게 만든다.

---

## 1. 배경과 원칙

### 1.1 현재 상태
- 25개 독립 HTML 파일 (허브 1 + 씬 24)
- 허브: 카드 그리드 + 초 단위 시계 + 숫자키 네비(12개만 매핑됨, `q~p,[,]` 미구현)
- 씬 24개 중 **13개는 자체 애니메이션 있음** (sys.monitor / trader / crypto / videoedit / devops / email / calendar / messenger / issuetracker / cad / ppt / design + 1)
- 나머지 **11개는 정지** (legal / medical / 3dmodel / atc / daw / erp / hts / latex / notebook / soc / translator / wms)

### 1.2 깨는 요인 (왜 지금은 가짜 티가 남)
1. 탭 제목·파비콘 고정 (멀리서 제일 먼저 보이는 단서)
2. 정지 씬 11개가 스크린샷 수준
3. 소리 0 — 진짜 일하는 자리엔 타자 소리
4. 씬 간 자동 전환 없음 — 근무자는 Alt+Tab 한다
5. 전역 OS 크롬·알림 없음
6. 커서 움직임 없음 — 어깨너머 10초면 AFK 티남

### 1.3 기술 방향
- **바닐라 HTML/CSS/JS 유지.** 프레임워크·빌드 스텝 추가하지 않음.
- 공용 레이어를 **`shared.js` + `shared.css` + `shared-vitals.js`** 3개 파일에 모두 담는다.
- 각 씬 HTML은 `<body>` 태그 한 줄(`data-*` attribute)과 `<script>` 태그 한 줄만 추가.
- 빌드 아티팩트·로딩 화면 없음 → "네이티브 앱처럼 보이기" 목표 유지.

### 1.4 우선순위
사용자 명시: **"최대한 화면에 생동감을 불어넣는 게 중요"**
→ 생명 신호 주입(섹션 4)에 무게, 운영 레이어(설정 패널 등)는 간결하게.

---

## 2. 파일 구조

```
C:\working\
├── index.html                          (허브 사본 — 기본 진입점)
├── 열일하는중 허브.html                 (허브 원본)
├── 열일하는중.html                      (씬 #1 — SYS.MONITOR)
├── shared.js                           [NEW] 전역 리얼리즘 레이어
├── shared.css                          [NEW] OS 바·토스트·커서 스타일
├── shared-vitals.js                    [NEW] 정지 씬 생명 신호 주입
├── robots.txt                          [NEW] 검색엔진 차단
├── vercel.ts                           [NEW] 보안 헤더
├── .vercelignore                       [NEW]
├── busy/
│   └── *.html (23개 — 각 파일에 <body data-*> 와 <script src="../shared.js"> 추가)
└── docs/superpowers/specs/
    └── 2026-04-24-busy-realism-layer-design.md   (이 문서)
```

---

## 3. `shared.js` 모듈 구성

단일 파일, 모듈 7개. 부팅 순서 고정. 한 모듈 실패가 다른 모듈 막지 않음.

### 3.1 OSChrome (상단·하단바)
- body에 고정 오버레이 주입 (`z-index: 99998`, `pointer-events: none`)
- **상단:** 좌측 OS 로고 / 중앙 현재 씬 이름 / 우측 시계·배터리·와이파이·DnD
- **하단 Dock:** 앱 아이콘 6개, 랜덤 알림 점 점멸
- `settings.osChrome ∈ { mac, win, off }` — 2스킨 + 끔

### 3.2 ToastManager
- 메시지 풀 ~60개 (Slack / Mail / Calendar / System) — 타입별 아이콘·색
- 랜덤 간격 (강도별 타이밍 표 섹션 4.5 참조)
- 우상단 슬라이드 인, 4.5s 유지 후 페이드
- 클릭 시 해당 카테고리 씬으로 점프 (카테고리↔씬 매핑 테이블)
- 동시 최대 2개, 큐잉

### 3.3 CursorDrift
- 유령 커서 오버레이 (`<div class="ghost-cursor">`)
- Perlin-스타일 저주파 노이즈로 좌표 생성 (3~8 px/s)
- 5~25s마다 점프 (easeOutCubic 70~200ms)
- 씬 전환 시 마지막 위치 sessionStorage에 저장 → 연속성

### 3.4 SoundEngine (WebAudio)
- 에셋 0바이트, 신디사이즈
- 타자음: short noise burst + envelope, 8종 피치 랜덤
- 마우스 클릭음: 5~20분 간격 (희귀)
- 알림 딩: 토스트 동기화
- `AudioContext.state === 'suspended'` 면 첫 사용자 제스처에서 `resume()`
- `settings.volume` ∈ [0, 1], 기본 0.35

### 3.5 WakeLock
- `navigator.wakeLock.request('screen')`
- visibilitychange 시 자동 재획득
- 실패 시 1×1 `<video autoplay muted loop playsinline>` fallback

### 3.6 Rotator (오토로테이션)
데이터 모델 (sessionStorage `busy.rotation`):
```js
{
  enabled: true,
  order: [path, path, ...],    // Fisher-Yates 셔플된 24개
  cursor: 7,
  baseSec: 75,                 // low=180 · med=75 · high=35
  jitterPct: 0.25,
  nextAt: 1745538000000,
  blacklist: ["busy/hts.html"],
  pausedUntil: null
}
```

씬 로드 시:
1. 상태 읽음 → `!enabled || pausedUntil > now` 면 no-op
2. `msLeft = nextAt - now` → 만료면 즉시 `advance()`, 아니면 `setTimeout`
3. `beforeunload` 시 타이머 clear

`advance()`:
```
cursor = (cursor + 1) % order.length
while (order[cursor] ∈ blacklist) cursor++
nextAt = now + baseSec * 1000 * (1 + (rand()*2 - 1) * jitterPct)
save(state)
location.replace(order[cursor])    // history 안 쌓음
```

셔플: "시작" 버튼 클릭 시 Fisher-Yates, 한 사이클 후 재셔플. 연속 중복 불가, 사이클 내 모든 씬 1회 노출.

방어:
- 최소 주기 20s 바닥
- 멀티탭: `BroadcastChannel('busy')` 리더 선출, 후발 탭 비활성
- 북마크 직접 진입: state 없으면 조용히 static 로드
- 씬 404: 해당 씬 자동 blacklist

가중치 버전은 YAGNI — 기본 균등 셔플만.

### 3.7 IdentityTag (제목·파비콘)
- `<body data-title="..." data-favicon="emoji|data-uri">` 읽음
- `document.title`, `<link rel="icon">` 교체
- 미확인 토스트 카운터를 제목 앞에 붙임: `(3) #growth — Slack`
- 씬 진입 시 카운터 리셋

### 3.8 모듈 계약
전역은 `window.Busy = { settings, state, emit, on }` 하나만 노출.

커스텀 이벤트 버스 (`window.dispatchEvent`):
- `busy:toast` — ToastManager 소비
- `busy:panic` — Rotator 소비
- `busy:focus` — CursorDrift가 jump target 좌표 수령

부팅 순서:
```
OSChrome → IdentityTag → WakeLock → Rotator → ToastManager → CursorDrift → SoundEngine
```

---

## 4. 생명 신호 주입 (이 스펙의 핵심)

### 4.1 전 씬 공통 (shared.js가 자동)

| # | 신호 | med 기준 간격 |
|---|---|---|
| 1 | 타자음 버스트 | 140~380ms (3~12회 치고 쉼) |
| 2 | 유령 커서 드리프트 | 3~8 px/s + 점프 5~25s |
| 3 | 토스트 알림 | 60~180s |
| 4 | OS 상단 시계 | 1s |
| 5 | 배터리 게이지 | 1분에 1% 하락, 15%에서 충전 아이콘 |
| 6 | 와이파이 깜빡 | 2~10분 |
| 7 | Dock 알림 점 | 30~120s |
| 8 | "자동 저장됨" 하단 배지 | 40~120s |
| 9 | 탭 제목 읽지않음 카운터 | 토스트 동기화 |
| 10 | 마우스 클릭음 | 5~20분 |

### 4.2 정지 씬 11개 — 4개 타입으로 묶음

타입 선언 방식: `<body data-deadzone="true" data-vitals-type="document|table|dashboard|tool">`

`shared-vitals.js`가 body attr 읽어 DOM 훑고 자동 주입. **씬 HTML 본문은 수정하지 않음.**

#### 📄 문서형 — legal / medical / translator / latex / notebook
- 점멸 커서 (가장 긴 `<p>` 끝에 `::after` 오버레이)
- 자동 타이핑 (5~15s마다 단어 1~3개 추가)
- 문장 벼락 입력 (10~30s마다 한 문장 통째로)
- 미세 스크롤 지터 ±20px
- 우상단 "편집 중 · MM:SS" 증가 타이머

씬별 개성:
- `translator` — 좌우 번갈아 타이핑 (원문/번역)
- `latex` — 하단 "컴파일 중..." 스피너, 수식 블록 심볼 추가
- `notebook` — `[*]` 실행 셀, 출력 영역 값 추가
- `medical` — "EMR 동기화 중 · N/200 레코드"

#### 📊 표형 — erp / wms
- 셀 플래시 (3~8s마다 랜덤 `<td>` 노란 페이드 1s)
- 합계 행 숫자 ±1 (10~20s)
- 숫자 옆 ↑↓ 화살표 흔듦
- 하단 상태바 "마지막 갱신 · N분 전", "승인 대기 3건"
- 스크롤바 ±50px 점프 (저빈도)

씬별:
- `erp` — "월마감 처리 중... N/128 전표"
- `wms` — 재고 ±1, "입고 처리 중" 로그

#### 🎛 대시보드형 — atc / soc / hts
- 숫자 틱 (1~3s마다 랜덤 값 변경, 가중치)
- 게이지 호흡 (sin wave ±5%)
- 로그 스크롤 (5~15s마다 새 라인 추가, 타임스탬프+레벨 색)
- 알림 뱃지 증감
- 스파크라인 포인트 추가

씬별:
- `atc` — 항공기 점 이동, 레이더 sweep, "KAL101 · RWY 34R 접근 중"
- `soc` — 위협 레벨 게이지, 이벤트 카드 튀어나옴
- `hts` — 호가창 깜빡, 체결 로그 틱, PnL 틱

#### 🎨 전문 툴형 — daw / 3dmodel
- 플레이헤드 전진 (타임라인/뷰포트)
- 인스펙터/VU 미터 값 흔듦
- "렌더 중 · N% · MM:SS 남음" 배너
- 최근 액션 패널 라인 추가

씬별:
- `daw` — 스펙트럼 아날라이저, 재생 커서
- `3dmodel` — 회전 썸네일, "폴리곤: N,NNN→N,NNN"

### 4.3 살아있는 씬 13개 — 간섭 방지
- `shared.js` 공용 층은 얹음
- `shared-vitals.js`는 건너뜀 (`data-deadzone` 없거나 false)
- 억제 플래그: `<body data-suppress="cursor|toast">` — 씬 자체 커서/발표 모드

### 4.4 DOM-agnostic 주입 전략
씬 HTML 구조를 가정하지 않고 querySelectorAll로 타겟 자동 탐색:
- `p, li, h1~h6` → 타이핑 타겟
- `td, [data-value]` → 셀 플래시 타겟
- `.bar, [class*="progress"], [role="progressbar"]` → 게이지
- `[class*="log"] li, .log-line` → 로그 추가

새 씬 추가 시 body attr 한 줄만 바꾸면 생명 신호 자동 부여.

### 4.5 타이밍 상수표 (`settings.intensity`)

| 이벤트 | low | med | high |
|---|---|---|---|
| 타자 버스트 간격 | 8~20s | 3~10s | 1~4s |
| 토스트 간격 | 180~420s | 60~180s | 20~90s |
| 문서 타이핑 | 10~25s | 5~15s | 2~8s |
| 표 셀 플래시 | 5~15s | 2~8s | 0.5~3s |
| 대시보드 틱 | 2~5s | 1~3s | 0.3~1.5s |
| 로그 추가 | 20~60s | 5~15s | 2~6s |

---

## 5. 허브 설정 UI

### 5.1 헤더 개편
```
[열일하는중 허브  v2.0]      [🎬 시작] [⚙] [10:23:45]
[● 로테이션 ON · 다음 00:47 · 강도 보통 · 사운드 ON · 패닉: 📧]  ← status strip (24px)
```

### 5.2 "시작" FAB
- 최초: 우하단 64×64 금색 그라디언트 + 펄스, "🎬 시작"
- 클릭 시 원자적으로: Fullscreen → AudioContext.resume → WakeLock 요청 → PiP 더미 video 진입 → Rotator 활성화 → FAB는 "⏸ 정지" 알약으로 변신

### 5.3 설정 패널 (우측 drawer, 380px)
`⚙` 토글, `Esc`/외부 클릭으로 닫힘.

섹션:
1. **강도** — 라디오 3: 차분함 / 보통 / 광기
2. **오토 로테이션** — 토글 + 주기 라디오 3 (3분 / 75초 / 35초)
3. **패닉 씬** — . 키 이동 대상. 24개 중 선택 (기본 📧 이메일)
4. **제외할 씬** — 24개 체크박스 그리드
5. **사운드** — 토글 + 볼륨 슬라이더
6. **OS 크롬** — mac / win / 끔
7. **Wake Lock / PiP / 유령 커서** — 각각 토글

변경 시 즉시 `localStorage['busy.settings']` 저장.

### 5.4 Status strip
- `●` 색: ON 초록 / OFF 회색 / 패닉 빨강
- 다음 전환 카운트다운 실시간
- 씬 안에선 안 보임 (OS 크롬바가 대체)

### 5.5 UX 플로우
1. index.html 열림 → 허브
2. (선택) 설정 조정
3. 🎬 시작 클릭 → 풀스크린 + 사운드 언락 + WakeLock + PiP + 첫 씬 네비
4. 75s ±25% 후 다음 씬 자동 전환
5. `.` 패닉 / `Esc Esc` 재개 / `h` 허브 복귀 / 단축키로 즉시 이동
6. `?` 단축키 치트시트 모달

### 5.6 허브 단축키 확장
- 기존: `1-9, 0, -, =` (12개, 이미 구현)
- 추가: `q, w, e, r, t, y, u, i, o, p, [, ]` → 13~24번 씬
- `h` → 허브 복귀 (씬 안에서)
- `?` → 치트시트

---

## 6. 에러/폴백

### 6.1 API 실패 매트릭스

| API | 실패 조건 | 폴백 |
|---|---|---|
| Wake Lock | Safari iOS<16.4 / 거부 | `<video>` hack 대체 |
| Fullscreen | 거부 / Esc | 윈도우 모드, 시작 버튼 "재시도" 상태 |
| AudioContext | 제스처 전 suspended | 첫 입력에 `resume()` |
| Picture-in-Picture | Firefox / iOS / 거부 | 조용히 skip, 설정 토글 회색 |
| localStorage | private mode | in-memory 폴백 |
| BroadcastChannel | 구 Safari | skip, 멀티탭 감지 없이 진행 (한계) |

### 6.2 부팅 격리
```js
const mods = [OSChrome, IdentityTag, WakeLock, Rotator, Toast, Cursor, Sound];
const failed = [];
for (const m of mods) {
  try { m.mount(); } catch (e) { failed.push(m.name); console.warn(...); }
}
if (failed.length) console.info(`[Busy] skipped: ${failed.join(', ')}`);
```

씬 고유 JS 에러는 독립 페이지라 자연 격리.

### 6.3 북마크 직접 진입
- 제스처 없음 → Audio/WakeLock 대기
- 우상단 작은 펄스 뱃지 `▶ 클릭해서 전체 활성화`
- 첫 클릭/키 입력 시 `resume() + request()` + 로테이션 재개 여부 토스트
- 안 눌러도 시각 애니메이션·토스트·커서 드리프트는 작동

### 6.4 로테이션 엣지
- 뒤로가기 → `location.replace()` (히스토리 안 쌓음)
- 멀티탭 → BroadcastChannel 리더 선출
- 씬 404 → 자동 blacklist
- 최소 1s 쿨다운

### 6.5 지원 브라우저
**대상:** Chrome/Edge ≥110 · Firefox ≥115 · Safari ≥16.4 (데스크톱)
**미대상:** IE · 모바일 — 설정 패널에 ⚠ 배너

### 6.6 감지 기반 UI
```js
if (!('wakeLock' in navigator)) disable('wake-lock-toggle');
if (!document.pictureInPictureEnabled) disable('pip-toggle');
if (!('BroadcastChannel' in window)) noop('multi-tab-guard');
```

### 6.7 로깅
프로덕션 조용함. 부팅 시 1줄:
```
[Busy] shared.js v1.0 · intensity=med · rotation=on · skipped: pip
```

---

## 7. 배포 (Vercel, MCP 경유)

### 7.1 도구
**Vercel MCP 서버 연결 & 인증 완료** — 팀 `thmms-projects` (id `team_TTL9XmFJP8He45flqTEozZvu`).

CLI 설치 불필요. 사용 도구:
- `deploy_to_vercel` — 배포
- `list_projects`, `get_deployment` — 상태 조회
- `get_deployment_build_logs`, `get_runtime_logs` — 진단
- `get_access_to_vercel_url` — 배포 후 접근 확인

### 7.2 프로젝트 설정
- 이름 후보: `busy-hub` (기본 추천)
- URL: `<name>.vercel.app`
- 빌드: 없음 (정적)
- 프리셋: Other

### 7.3 프라이버시 전략

**Tier 1 — 기본 (무료, 필수):**
- `robots.txt` 전체 차단
- 모든 HTML `<head>`에 `<meta name="robots" content="noindex,nofollow">`
- `vercel.ts`에서 `X-Robots-Tag: noindex, nofollow` 헤더

**Tier 2 — Vercel Authentication (무료):**
- 대시보드 → Deployment Protection → Vercel Authentication
- Vercel 로그인 필요 → 너만 접근

**Tier 3 — 커스텀 비밀번호 (유료):** 오버스펙, 무시.

### 7.4 `vercel.ts`
```ts
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  headers: [
    routes.header('/(.*)', [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
    ]),
  ],
};
```

### 7.5 `.vercelignore`
```
docs/
.git/
*.md
_design/
```

### 7.6 배포 후 점검
- [ ] HTTPS — Wake Lock 정상
- [ ] `view-source:` → noindex meta 확인
- [ ] 시크릿 모드 URL 접속 → Vercel 로그인 요구됨 (Tier 2)
- [ ] 48h 후 `site:busy-hub.vercel.app` Google 검색 결과 0

### 7.7 롤백
Vercel 대시보드 → 이전 deployment → "Promote to Production".

### 7.8 자동 재배포
YAGNI. 수동 MCP 호출로 충분. 나중에 GitHub 연동 원하면 추가.

---

## 8. 구현 범위 & 예상 분량

| 산출물 | 예상 LOC |
|---|---|
| `shared.js` | ~700 (모듈 7 + 이벤트 버스) |
| `shared.css` | ~300 (OS 바, 토스트, 커서, 배지) |
| `shared-vitals.js` | ~400 (4개 타입 injector) |
| 허브 HTML 수정 (FAB, 설정 패널, status strip, 단축키 확장) | +400 |
| 씬 24개 `<body data-*> + <script>` 추가 | 각 +2 lines |
| `robots.txt`, `vercel.ts`, `.vercelignore` | 합 ~30 |
| **합계** | **~1,900 lines 신규 / ~50 lines 기존 수정** |

기존 25개 HTML 중 **로직 재작성 없음**. 바디 태그 2줄씩만 추가.

---

## 9. 검증 계획

### 9.1 로컬 검증 (shared.js 작업 완료 시점마다)
- `python -m http.server 8000` 띄우고 Playwright MCP로 스크린샷
- 체크리스트:
  - [ ] 허브에서 "시작" 버튼 클릭 → 풀스크린 진입
  - [ ] 오토로테이션 75s 지나서 다음 씬 이동
  - [ ] 정지 씬 중 최소 3개(erp, legal, hts) 진입 시 생명 신호 발견
  - [ ] 토스트 1개 이상 나타남
  - [ ] 타자음 들림 (콘솔에서 AudioContext.state 확인)
  - [ ] 탭 제목이 씬 따라 바뀜
  - [ ] 설정 패널에서 강도 변경 시 간격 즉시 반영
  - [ ] `.` 누르면 패닉 씬 이동, `Esc Esc`로 재개
  - [ ] 뒤로가기 눌렀을 때 히스토리 누적 없음

### 9.2 배포 후 검증
- `get_deployment` / `get_runtime_logs` 로 에러 없음 확인
- HTTPS URL 접속 → Wake Lock 정상 요청
- noindex 메타 확인

---

## 10. 범위 외 (YAGNI)

명시적으로 빼는 것:
- 씬 가중치 (모두 균등)
- 사운드 에셋 파일 (신디사이즈만)
- 커스텀 도메인
- GitHub Auto-deploy
- 모바일 레이아웃
- 다국어 (한글만)
- 접근성 WCAG 준수 (의도적으로 "숨기는" 앱 — a11y 최소만)
- 설정 내보내기/가져오기
- 서비스 워커 / 오프라인

---

## 11. 열린 질문 (모두 결정됨)

- ✅ 기술 스택: vanilla HTML/JS
- ✅ 우선순위: 생동감 최우선
- ✅ 배포: Vercel MCP (CLI 없음)
- ✅ 프라이버시: Tier 1+2 (robots.txt + Vercel Auth)
- ✅ 모듈 분할: shared.js / shared.css / shared-vitals.js
- ✅ 정지 씬 11개 타입 분류: document / table / dashboard / tool
- ✅ 강도 프리셋: low / med / high

---

## 12. 다음 단계
1. 이 스펙 리뷰 (사용자)
2. 승인 시 `writing-plans` 스킬로 실행 계획 생성
3. 구현 → 로컬 검증 → Vercel 배포
