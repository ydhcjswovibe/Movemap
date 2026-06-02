# Movemap P0 구조 개편 Codex handoff

## 목적

이 문서는 Codex CLI가 바로 실행 가능한 수준으로,
현재까지 만든 분석 문서를 실제 구조 리팩터링 작업으로 넘기기 위한 handoff다.

## 먼저 읽을 문서

1. `docs/superpowers/specs/2026-06-01-sway-to-movemap-structure-porting-framework.md`
2. `docs/superpowers/specs/2026-06-01-sway-movemap-capture-comparison.md`
3. `docs/superpowers/specs/2026-06-01-movemap-p0-desktop-block-layout.md`
4. `SPEC.md`
5. `README.md`

## 이번 작업 범위

이번 P0는 **기존 기능 추가가 아니라 데스크탑 편집기 구조 재배치**가 목적이다.

반드시 유지할 것:
- 현재 동작하는 편집 플로우
- stage canvas 편집 기능
- timeline 기능
- transition-first 제품 방향
- share / audio / 3D 진입 기능

이번 단계에서 꼭 만들 것:
- 상단 command bar 재구성
- 좌측 work panel 뼈대 도입
- 우측 context surface 뼈대 도입
- 하단 timeline rail의 구조적 강조
- 기존 `전환 리뷰`의 재배치

## 목표 레이아웃

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Global Command Bar                                                   │
├───────────────┬──────────────────────────────────────┬───────────────┤
│ Left Work     │ Main Stage Canvas                    │ Right Context │
│ Panel         │                                      │ Surface       │
├───────────────┴──────────────────────────────────────┴───────────────┤
│ Bottom Timeline Rail                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

## 블록별 요구사항

### 1) Global Command Bar
포함:
- 프로젝트 제목
- 저장 상태
- 저장하기
- 프로젝트 메뉴 버튼
- 음악 버튼
- 공유 버튼
- 2D/3D 전환 버튼
- 로그인/계정 상태

제외:
- 전환 리뷰 본문
- 선택 대형 상세 폼
- 경고 통계 본문

### 2) Left Work Panel
탭/세그먼트 구조로 최소 도입:
- Cast
- Formation
- Timeline
- Stage
- Review & Share

P0에서는 완전한 기능 이전보다 **뼈대와 범주 분리**가 중요하다.

### 3) Main Stage Canvas
유지:
- stage SVG/canvas
- performer drag/select
- 최소 무대 툴바

정리:
- 캔버스 밖 정보는 최대한 좌/우 패널로 이동
- 무대 툴바는 무대 조작 도구만 남김

### 4) Bottom Timeline Rail
유지 및 강조:
- 재생 컨트롤
- 현재 시간
- 확대/축소
- forms row
- audio row

강화:
- selection과 연결감
- 타임라인이 제품 중심축처럼 보이는 구조

### 5) Right Context Surface
최소 포함:
- 선택 대형 정보
- 도착 시각
- 이동 시간
- 이동 모드
- 메모
- 전환 리뷰 요약
- 공유 관련 surface

## 구현 우선순위

### Step 1
`src/App.jsx`에서 상단 영역과 본문 영역의 큰 레이아웃 블록 분리

### Step 2
좌측 패널 / 중앙 / 우측 패널 / 하단 타임라인 DOM 구조 재배치

### Step 3
`src/styles.css`에서 grid/flex 기반으로 새 레이아웃 구성

### Step 4
기존 `전환 리뷰`를 축소하거나 우측 surface로 이동

### Step 5
공유 영역을 드롭다운 export 묶음에서 더 명확한 context surface로 재배치

## 파일 범위

주요 수정 예상 파일:
- `src/App.jsx`
- `src/styles.css`

가능하면 유지:
- 로직 모듈들 (`*.mjs`)은 최소 수정

## 하지 말아야 할 것

- 새 제품 기능 추가
- 데이터 모델 변경
- 모바일 전체 재설계까지 한 번에 진행
- share/audio/business logic 대수술
- timeline core 로직 변경

## 완료 기준

다음이 실제 화면에서 보여야 한다.

1. 상단이 command bar처럼 읽힌다.
2. 좌측 패널이 편집 범주를 설명한다.
3. 중앙 무대가 메인 작업 공간처럼 보인다.
4. 우측 패널이 선택 상세/리뷰/공유 문맥을 받는다.
5. 타임라인이 구조적으로 더 중심축처럼 보인다.

## 검증

작업 후 최소 검증:

1. `npm run build`
2. 가능하면 로컬에서 편집기 샘플 화면 열기
3. 기존 기본 편집 흐름이 깨지지 않았는지 확인

## Codex 실행 프롬프트

아래 프롬프트를 그대로 써도 된다.

```bash
codex exec --full-auto 'You are refactoring the Movemap desktop editor layout only. Read these files first: docs/superpowers/specs/2026-06-01-sway-to-movemap-structure-porting-framework.md, docs/superpowers/specs/2026-06-01-sway-movemap-capture-comparison.md, docs/superpowers/specs/2026-06-01-movemap-p0-desktop-block-layout.md, SPEC.md, README.md. Then restructure src/App.jsx and src/styles.css so the desktop editor clearly separates: (1) a global command bar, (2) a left work panel with category tabs Cast/Formation/Timeline/Stage/Review & Share, (3) a main stage canvas, (4) a bottom timeline rail, and (5) a right context surface for selection details / transition review / share context. Do not add major new features or change core data logic. Preserve existing editing behavior as much as possible. After editing, run npm run build and fix any issues.'
```

## 추천 실행 방식

Movemap 루트에서 실행:

```bash
cd /home/ydhcjswo/projects/Movemap
codex exec --full-auto '<위 프롬프트>'
```
