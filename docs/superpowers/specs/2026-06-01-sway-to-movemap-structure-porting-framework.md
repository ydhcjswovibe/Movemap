# Sway → Movemap 구조 이식 프레임워크

## 목적

이 문서는 Sway의 UI/UX를 단순 참고 수준에서 끝내지 않고, **Movemap의 정보구조·화면구조·컴포넌트 구조·실행 backlog**로 옮기기 위한 프레임워크다.

이 문서의 목표는 네 가지다.

1. Sway에서 실제로 배워야 할 구조적 패턴과 버려야 할 패턴을 분리한다.
2. 현재 Movemap의 화면/컴포넌트 구조와 Sway의 구조를 1:1로 비교한다.
3. 단순 스타일 수정이 아니라 **정보구조 개편과 편집 경험 재배치**까지 가능한 형태로 정리한다.
4. 결과를 실제 구현 우선순위와 backlog로 떨어뜨린다.

이 문서는 감상문이 아니라 **구조 이식용 설계 문서**다.

---

## 이 문서가 해결하려는 문제

이전에 참고 문서가 구조 변경으로 이어지지 못한 이유는 대체로 아래와 같았다.

- 참고 사이트가 주는 인상을 묘사하는 수준에서 끝났다.
- 좋은 점이 어떤 UI 규칙으로 반복되는지 분해되지 않았다.
- Movemap의 현재 구조와 어떤 충돌이 있는지 표시되지 않았다.
- “무엇을 바꾸면 되는지”가 아니라 “무엇이 좋아 보이는지”만 남았다.
- 구현 단위 backlog로 전환되지 않았다.

따라서 이번에는 분석 결과를 아래 4층으로 분리한다.

1. **Reference Surface** — Sway 화면에서 보이는 결과물
2. **System Rule** — 그 결과를 만들어내는 반복 규칙
3. **Movemap Mapping** — 현재 제품 어디에 이식할지
4. **Execution Backlog** — 실제 변경 작업 목록

---

## 입력 자료

이 프레임워크는 아래 자료를 기준으로 한다.

- Sway 공개 사이트 및 기존 조사 문서
- `docs/superpowers/specs/2026-05-28-movemap-competitive-product-design.md`
- `SPEC.md`
- `README.md`
- 현재 Movemap 구현의 핵심 화면 구조 (`src/App.jsx`, `src/styles.css`)

즉, 이 문서는 추상적인 디자인 메모가 아니라 **현재 Movemap 코드베이스에 연결 가능한 구조 설계**를 의도한다.

---

## 핵심 원칙

### 1. Sway를 복제하지 않는다

Movemap은 Sway와 문제 영역이 가깝지만 동일하지 않다.

Movemap은 계속 아래 정체성을 유지해야 한다.

- transition-first planning
- mobile full editing
- lightweight production scope
- 2D canonical model + 3D preview

즉, Sway의 장점은 흡수하되 다음은 그대로 가져오지 않는다.

- 과도한 production-management 확장
- 카메라/운영 기능 중심 구조
- 모바일을 review-only로 보는 편집 철학
- 기능은 많지만 흐름이 무거워지는 패널 구성

### 2. 시각 언어보다 먼저 정보구조를 이식한다

이번 작업의 우선순위는 다음이다.

1. 정보구조
2. 화면 구조
3. 편집 흐름
4. 컴포넌트 시스템
5. 스타일/비주얼 polish

즉, 버튼 색이나 radius보다 먼저 **어떤 정보를 어디에 놓고 어떤 순서로 편집하게 할지**를 정해야 한다.

### 3. Movemap의 현재 강점을 희석하지 않는다

현재 Movemap은 이미 다음 강점을 가진다.

- 음악 타이밍과 대형 전환의 밀접한 결합
- 페어/파트너 및 이동 문맥
- 3D preview
- 공유 링크
- 모바일 편집 지향성

따라서 구조 개편은 “새 기능 추가”보다 **강점을 더 읽히게 만드는 재배치**여야 한다.

---

## 분석 단위

Sway를 참고할 때 페이지 단위가 아니라 아래 단위로 쪼개서 본다.

### A. Product IA
- 랜딩 진입 구조
- 주요 CTA 계층
- 팀 생성 / 참가 / 로그인 흐름
- 템플릿 / AI / 가이드 연결 구조

### B. Editor Layout
- 상단 글로벌 액션
- 좌측 작업 패널
- 중앙 스테이지 캔버스
- 하단 타임라인
- 공유/오디오/3D 진입점

### C. Interaction Model
- 어떤 작업이 어디서 일어나는지
- 선택 → 수정 → 저장 흐름
- 고빈도 작업의 위치
- 모바일에서의 조작 단위

### D. Visual System
- 레이아웃 밀도
- 패널 분리 방식
- 버튼 hierarchy
- 카드/패널 스타일
- spacing rhythm

---

## Sway에서 가져올 구조적 패턴

### 1. 편집기 안의 기능 구획이 명확하다

Sway 편집기는 기능이 많아도 사용자가 현재 무엇을 조정하는지 패널 이름만 보면 이해된다.

대표 구획:

- Roster
- Formation
- Production
- Templates
- Stage

#### Movemap 적용 원칙
Movemap도 현재 기능을 늘리기보다 먼저 **기존 기능을 의미 단위로 재구획**해야 한다.

현재의 도구/설정/세부 항목이 흩어져 보인다면 다음처럼 묶는 것이 맞다.

- Cast
- Formation
- Timeline
- Stage
- Share/Review
- AI/Templates

### 2. 상단 글로벌 액션이 로컬 편집 설정과 분리돼 있다

Sway는 저장, 이력, 다운로드, 공유, 3D, 오디오처럼 프로젝트 단위 액션이 상단에서 한 번에 읽힌다.

#### Movemap 적용 원칙
Movemap도 전역 액션과 로컬 편집 액션을 분리해야 한다.

전역 액션 예시:
- 저장
- 공유
- 3D preview
- 오디오 업로드
- 템플릿/AI 진입
- 계정/프로젝트 상태

로컬 액션 예시:
- 출연자 추가
- 대형 복제
- 노트 수정
- 이동 시간 조정
- 스냅 변경

### 3. 타임라인이 보조가 아니라 편집의 중심축이다

Sway는 하단 타임라인이 단순 재생바가 아니라 formation block을 조작하는 핵심 구조다.

#### Movemap 적용 원칙
Movemap은 Sway보다 더 강하게 타임라인을 중심축으로 삼아야 한다.

이유:
- Movemap의 차별점이 transition-first planning이기 때문
- 대형 그 자체보다 “언제, 얼마나, 어떻게 이동하는가”가 핵심이기 때문

즉, Movemap은 타임라인을 단순 하단 부속물이 아니라 다음을 묶는 중심 레이어로 강화해야 한다.

- 도착 시각
- 이동 시작/종료 감각
- 폼 순서
- 블록 선택
- 전환 preview
- 오디오와의 관계

### 4. 공유/리뷰 경로가 제품 문맥 안에 있다

Sway는 공유가 편집 외부 기능이 아니라 팀 협업 구조의 일부로 읽힌다.

#### Movemap 적용 원칙
Movemap도 공유를 결과물 export가 아니라 **리허설 운영 흐름**으로 보여야 한다.

즉 공유는:
- “링크 만들기” 단일 버튼이 아니라
- 누가 볼 링크인지
- 누가 수정할 링크인지
- 모바일 리뷰에서 어떻게 쓰이는지

까지 연결되어야 한다.

### 5. 3D/오디오/템플릿은 부가 기능이 아니라 확장 축으로 읽힌다

Sway는 이 기능들이 뜬금없이 섞이지 않고, 편집기 중심에서 옆으로 확장되는 보조 축처럼 보인다.

#### Movemap 적용 원칙
Movemap도 3D / 템플릿 / AI / 오디오를 메인 편집 방해요소가 아니라 **문맥형 확장 진입점**으로 재배치해야 한다.

---

## Sway에서 가져오지 말아야 할 구조적 패턴

### 1. Production 패널 중심 확장
Movemap은 공연 전체 제작 관리도구가 아니라 formation/transition editor다.

따라서 아래는 후순위로 둔다.
- 카메라 중심 모델
- 복잡한 production inventory
- 운영 관리형 사이드 패널 확장

### 2. 모바일 review-first 철학
Movemap의 스펙은 모바일을 실제 편집 표면으로 본다.

따라서 모바일에서:
- 보기만 가능하게 만드는 설계
- 데스크탑 대비 축소판 인터페이스
- 고밀도 패널을 그대로 우겨 넣는 설계

는 지양한다.

### 3. 기능별 독립성만 높고 transition 문맥이 약한 구조
Sway는 formation editor로는 강하지만, Movemap은 **이동 경로와 시간 감각**을 더 전면에 보여야 한다.

즉, Movemap은 대형 패널보다도 아래 항목의 가시성을 더 높여야 한다.
- 이동 거리 경고
- 전환 경로
- arrival / duration
- pair/group movement

---

## 현재 Movemap 구조 진단

현재 코드베이스 기준으로 Movemap은 이미 기능적으로 넓은 범위를 다루고 있다.

- 프로젝트 생성
- 출연자 편집
- 대형 편집
- 페어/파트너
- 음악 업로드
- 공유 링크
- 3D preview
- 템플릿/AI 관련 모듈
- stage reference
- timeline / movement timing

하지만 구조 관점에서 보면 다음 리스크가 있다.

### 1. 기능은 많지만 구획 언어가 아직 제품 언어로 굳지 않았을 수 있다
사용자는 “어디에서 무엇을 바꾸는지”를 기능 단위가 아니라 화면 구조 단위로 기억한다.

필요한 방향:
- 같은 성격의 편집을 한곳에 모은다.
- 패널 제목이 곧 mental model이 되게 만든다.
- 전역 액션과 로컬 편집 액션을 분리한다.

### 2. 타임라인 중심성은 제품 전략만큼 강하게 드러나야 한다
스펙상 Movemap은 transition-first지만, 화면 구조에서 그 우선순위가 충분히 드러나지 않으면 사용자는 여전히 “대형 찍는 앱”으로 받아들일 수 있다.

필요한 방향:
- timeline selection이 전체 편집의 기준점이 되도록 강화
- formation 정보와 movement 정보의 연결 강화
- transition preview를 숨겨진 보조 기능이 아니라 상시 문맥으로 재배치

### 3. 모바일 편집 철학이 데스크탑 구조 복사로 보이면 안 된다
SPEC은 모바일을 first-class editing surface로 본다.

필요한 방향:
- Stage / Timeline / Cast / Review 중심의 명확한 하위 구조
- 큰 탭 전환과 하단 액션 중심 설계
- 세부 inspector를 touch-native 구조로 재해석

### 4. 공유는 export가 아니라 rehearsal workflow로 읽혀야 한다
현재 공유 기능이 있어도 제품 구조 안에서 “운영 흐름”으로 보이지 않으면 가치가 약하게 인식된다.

필요한 방향:
- view link / edit link 역할 분리
- 모바일 리뷰 진입 강조
- 공유 이후 사용 시나리오를 UI에서 읽히게 구성

---

## 구조 이식 프레임

아래 프레임을 기준으로 Sway의 요소를 Movemap으로 변환한다.

### Layer 1. Reference Capture
각 참고 요소마다 아래를 수집한다.

- 캡처명
- 화면 상태 (desktop / mobile / hover / modal / timeline / share 등)
- 보이는 UI 요소
- 반복되는 패턴
- 사용자가 이 화면에서 수행하는 핵심 작업

### Layer 2. Extracted Rule
캡처를 보고 다음 규칙으로 환원한다.

- 정보구조 규칙
- 레이아웃 규칙
- 액션 계층 규칙
- 인터랙션 규칙
- 밀도/spacing 규칙

예:
- 상단에는 프로젝트 전역 액션만 둔다.
- 좌측 패널은 한 번에 하나의 작업 범주만 강조한다.
- 하단 타임라인은 선택 상태의 기준점이다.
- 3D와 공유는 별도 페이지가 아니라 문맥 진입점이다.

### Layer 3. Movemap Mapping
각 규칙을 Movemap에 붙일 때 아래 항목으로 정리한다.

- 현재 위치
- 현재 문제
- 제안 구조
- 영향 받는 화면
- 구현 난이도
- 구조 변경 여부

### Layer 4. Execution Backlog
모든 항목을 실제 작업 단위로 환원한다.

- IA 정리
- 레이아웃 재배치
- 패널 명칭 개편
- 모바일 구조 개편
- 타임라인 강화
- 공유 흐름 재설계
- 비주얼 polish

---

## Sway → Movemap 매핑 표

## 1. Global Header / Top Action Bar

### Sway 특징
- 저장, 버전, 다운로드, 오디오, 공유, 3D가 상단에서 읽힌다.
- 프로젝트 전역 액션이 편집 세부 설정과 섞이지 않는다.

### Movemap 현재 문제
- 프로젝트 전역 액션과 로컬 편집 액션이 화면에서 동일 밀도로 보이면 우선순위가 흐려질 수 있다.

### Movemap 제안
상단을 **프로젝트 command bar**로 재정의한다.

포함 항목:
- 저장 상태
- 프로젝트 제목
- 오디오
- 공유
- 3D preview
- AI/templates 진입
- 로그인/플랜 상태

### 구조 변경 여부
중간

### 기대 효과
- 제품이 더 SaaS editor처럼 읽힘
- 사용자가 “프로젝트 레벨 액션”을 빠르게 인지
- 로컬 패널 복잡도 감소

---

## 2. Left Panel Information Architecture

### Sway 특징
- Roster / Formation / Templates / Stage 같은 의미 단위 구획이 명확하다.
- 편집자는 “무엇을 조정 중인지”를 놓치지 않는다.

### Movemap 현재 문제
- 출연자, 대형, 무대, 공유, AI, 페어/이동 관련 제어가 기능상 강해도 구조 언어가 충분히 분리되지 않으면 사용성이 떨어질 수 있다.

### Movemap 제안
좌측/사이드 편집 구조를 다음 5개 범주로 고정한다.

1. **Cast**
   - 출연자 목록
   - 이름/라벨/색상/역할
   - pair/group 메타데이터

2. **Formation**
   - 현재 대형 정보
   - 대형 이름/메모
   - 선택된 출연자 상세
   - 위치 관련 로컬 편집

3. **Timeline**
   - 도착 시각
   - 이동 시간
   - formation order
   - transition 관련 경고

4. **Stage**
   - 스냅
   - 그리드
   - stage 크기
   - reference objects

5. **Review & Share**
   - view link
   - edit link
   - 모바일 리뷰 진입
   - 3D preview shortcut

AI / Templates는 독립 대분류로 두거나, Formation 보조 탭으로 붙일 수 있다.

### 구조 변경 여부
높음

### 기대 효과
- 사용자의 mental model 정착
- 기능 탐색 비용 감소
- 모바일 재구성에도 동일한 분류 체계를 재사용 가능

---

## 3. Timeline As Primary Product Axis

### Sway 특징
- formation block과 재생 흐름이 하단 구조로 일관되게 보인다.

### Movemap 현재 문제
- Movemap의 차별점은 transition-first인데, 타임라인이 충분히 제품 중심축으로 읽히지 않으면 전략이 UI에서 희석된다.

### Movemap 제안
타임라인을 단순 하단 bar가 아니라 **primary editing rail**로 재정의한다.

핵심 강화 요소:
- 현재 선택된 formation과 timing inspector의 강한 연결
- move duration / arrival / path warning의 즉시 노출
- pair/group movement 문맥 표시
- 전환 preview와 timeline selection의 연결
- mobile에서도 독립 탭으로 동일 중요도 유지

### 구조 변경 여부
높음

### 기대 효과
- Movemap 차별점이 UI에 드러남
- “대형 편집 앱”이 아니라 “이동 설계 앱”으로 인식 전환

---

## 4. Share As Rehearsal Workflow

### Sway 특징
- 공유가 협업 구조의 일부로 보인다.
- view와 access 개념이 제품 맥락 안에 있다.

### Movemap 현재 문제
- 공유 기능이 존재해도 export 유틸처럼 보이면 팀 협업 가치가 약하게 보인다.

### Movemap 제안
공유를 별도 보조 기능이 아니라 **Review & Share surface**로 끌어올린다.

필수 노출:
- 보기 링크
- 수정 링크
- 누가 어떤 목적으로 쓰는 링크인지 설명
- 모바일 리뷰에 적합한 사용 시나리오
- 링크 발급 이후 next action

### 구조 변경 여부
중간

### 기대 효과
- 제품 가치 전달력 상승
- 리뷰/리허설 흐름 강화
- 저장과 공유의 관계가 더 자연스러워짐

---

## 5. Mobile Editing Surface

### Sway 특징
- 공개 메시지는 mobile review를 강하게 미는 편이다.

### Movemap 현재 문제
- Movemap은 review-only보다 더 넓은 모바일 편집을 목표로 하므로, 데스크탑 구조 축소판을 쓰면 제품 전략과 충돌한다.

### Movemap 제안
모바일 편집 구조를 데스크탑의 복제가 아니라 별도 IA로 정의한다.

권장 구조:
- **Stage**: 토큰 선택/이동/배치
- **Timeline**: 대형 선택/추가/복제/삭제/도착 시각/이동 시간
- **Cast**: 출연자 정보/추가/색상/파트너
- **Review**: 재생/전환/3D/공유

하단 고정 액션:
- 선택
- 추가
- 복제
- 삭제
- 실행 취소
- 공유

### 구조 변경 여부
높음

### 기대 효과
- rehearsal 상황에서 실제 수정 가능
- 모바일 사용성이 제품 차별점으로 전환

---

## 6. Visual Tone And Density

### Sway 특징
- 기능이 많아도 패널 계층과 간격이 정돈되어 무겁게 느껴지지 않는다.

### Movemap 현재 문제
- 현재 기능 밀도는 이미 높은 편이므로 시각 시스템이 구조를 받쳐주지 않으면 복잡도가 체감될 수 있다.

### Movemap 제안
비주얼 수정은 구조 개편 이후 아래 원칙으로 제한한다.

- panel/card hierarchy 명확화
- spacing scale 통일
- 전역 액션 / 로컬 액션 버튼 계층 분리
- state color 절제
- 정보 블록 간 breathing room 확대
- mobile tap target 재조정

### 구조 변경 여부
낮음 ~ 중간

### 기대 효과
- 복잡한 기능도 덜 위협적으로 보임
- 기능 구조가 시각적으로 더 읽힘

---

## 적용 우선순위

### Phase 1. 구조 언어 정리
목표: 화면을 열었을 때 “어디서 무엇을 하는 앱인지”가 명확해지게 만들기

우선 작업:
- 전역 상단 액션 바 재정의
- 좌측 패널 IA 재정의
- 패널 명칭 정리
- 공유/리뷰 위치 상향

### Phase 2. transition-first 강화
목표: Movemap의 차별점이 실제 UI 중심축으로 읽히게 만들기

우선 작업:
- 타임라인 중심성 강화
- timing inspector 정리
- transition warning / path preview 노출 강화
- formation ↔ timeline 결합 강화

### Phase 3. 모바일 편집 구조 재설계
목표: 모바일이 진짜 편집 표면이 되도록 구조 재편

우선 작업:
- Stage / Timeline / Cast / Review 탭 구조
- 하단 액션 바 설계
- touch-native inspector 재배치

### Phase 4. 시각 polish
목표: 구조 변경이 사용자에게 자연스럽게 받아들여지도록 마감

우선 작업:
- spacing scale 통일
- 버튼 hierarchy 재정의
- 패널/카드 density 조정
- 상태/배너/보조 액션 톤 정리

---

## 실제 실행 backlog

## P0 — 정보구조 정리
- [ ] 현재 편집 화면의 전역 액션과 로컬 액션 분리
- [ ] 상단 command bar 정보 설계
- [ ] 좌측 패널 대분류를 Cast / Formation / Timeline / Stage / Review & Share로 재배치
- [ ] 각 패널에 포함될 세부 필드/액션 정의
- [ ] 중복 액션 제거

## P1 — transition-first 화면 강화
- [ ] 선택된 formation과 timeline inspector의 관계를 재설계
- [ ] arrival / duration / move mode 노출 우선순위 상향
- [ ] transition warning UI를 상시 문맥으로 강화
- [ ] pair/group movement 정보가 timing 문맥과 함께 읽히도록 재배치

## P1 — 공유/리뷰 구조 강화
- [ ] view link / edit link의 역할 분리 UI 정리
- [ ] 공유 후 다음 액션 안내 설계
- [ ] 모바일 리뷰 진입점 강조
- [ ] 3D preview와 리뷰 흐름 연결

## P2 — 모바일 구조 재설계
- [ ] 모바일 탭 구조 설계
- [ ] 하단 고정 액션 바 설계
- [ ] 데스크탑 inspector의 touch-native 재해석
- [ ] 모바일에서 formation/timeline 선택 흐름 단순화

## P3 — 시각 시스템 정리
- [ ] spacing scale 정의
- [ ] panel/card/button hierarchy 정의
- [ ] 상태 배너/피드백 컴포넌트 정리
- [ ] mobile tap target 기준 정리

---

## 스크린샷 기반 운영 방식

이 프레임워크를 실제로 쓰려면 이후 분석/구현 사이클을 아래처럼 운영한다.

### Step 1. 참고 캡처 수집
- Sway desktop 핵심 화면
- Sway mobile 핵심 화면
- hover / share / timeline / panel 상태 캡처

### Step 2. 현재 Movemap 캡처 수집
동일 상태로 캡처한다.

예:
- 편집기 기본 상태
- 출연자 편집 상태
- 대형 선택 상태
- 타임라인 편집 상태
- 공유 상태
- 모바일 상태

### Step 3. 비교 시트 작성
각 상태마다 아래 5개 칼럼으로 비교한다.

- Reference behavior
- Current Movemap behavior
- Gap
- Proposed structure
- Backlog item

### Step 4. 구현 후 재캡처
구조 개편 전/후 스크린샷으로 비교 검증한다.

---

## 최종 판단 기준

이 프레임워크가 잘 작동했다면, 결과는 아래처럼 보여야 한다.

### 사용자가 느껴야 하는 변화
- 화면을 처음 봐도 구조가 더 빨리 이해된다.
- 무엇을 어디서 바꾸는지 덜 헤맨다.
- 타임라인이 제품 중심이라는 점이 더 분명해진다.
- 공유와 모바일이 부가 기능이 아니라 핵심 워크플로처럼 느껴진다.

### 제품이 얻어야 하는 변화
- Sway의 장점을 참조했지만 Movemap의 차별점은 더 선명해진다.
- UI 개선이 스타일 보정이 아니라 제품 구조 개선으로 이어진다.
- 이후 실제 구현 태스크로 이어질 수 있는 backlog가 남는다.

---

## 바로 다음 추천 작업

이 문서 다음 단계는 아래 순서가 가장 적합하다.

1. **Sway 핵심 상태 캡처 세트 정의**
2. **현재 Movemap 동일 상태 캡처**
3. **비교표 작성**
4. **P0 구조 개편안 와이어프레임 작성**
5. **그 다음 실제 UI 구현**

즉, 다음 산출물은 일반 문서가 아니라 아래 둘 중 하나여야 한다.

- 비교 캡처 기반 audit 문서
- P0 구조 개편 와이어프레임/레이아웃 스펙

이 둘이 준비되면 그 다음부터는 실제 코드 변경이 가능하다.
