# fitwallet-frontend

최적의 결제수단을 추천하고 놓친 혜택을 알려주는 스마트 전자지갑 fitwallet의 프론트엔드.

> 컴포넌트 구조, 상태 관리 규칙 등 세부 컨벤션은 아직 확정 전이다.
> 확정되는 대로 이 문서에 섹션을 추가한다. 지금 규정하는 것은 **Git/GitHub 작업 플로우**뿐이다.

## 기술 스택

Vue 3 + Vite / Pinia / Vue Router / TanStack Query / Tailwind CSS / Zod / axios

## 빌드

- 로컬 구동: `npm run dev` (Vite, `http://localhost:5173`)
- 빌드: `npm run build`
- 린트: `npm run lint` (`eslint . --fix`)
- 포맷: `npm run format` (`prettier . --write`)
- 커밋 시 lefthook pre-commit 훅이 스테이징된 파일에 ESLint `--fix` + Prettier를 자동 적용한다
  (`npm install` 하면 `prepare` 스크립트가 `lefthook install`을 실행)

## Git 컨벤션

브랜치 네이밍, 커밋 메시지, PR 규칙, 코드 리뷰 규칙의 원본은 [CONTRIBUTING.md](./CONTRIBUTING.md)에 있다.
아래 "GitHub 작업 플로우"는 그 규칙을 실제로 자동 실행하기 위한 순서다.

- `main`은 **배포 브랜치**다. `develop` → `main` 릴리스 PR로만 갱신하며, 병합 방식은 **Merge commit**이다.
- `develop`은 **통합 브랜치이자 기본 브랜치**다. 모든 작업 브랜치는 `develop`에서 분기하고
  **PR의 base는 항상 `develop`**이며, 병합 방식은 **Squash and Merge**다.
- `main`, `develop` 모두 **직접 push 금지**, 모든 변경은 PR로만 반영한다.
- 브랜치 네이밍: `{type}/{설명}` (`feat`, `fix`, `docs`, `chore`, `style`, `refactor`, `test`, `perf`, `ci`)
- 커밋 메시지: `type: 한국어 설명` (Conventional Commits)

## GitHub 작업 플로우 (이슈 → PR 자동화)

새 작업을 시작할 때는 아래 순서를 **사용자 확인 없이 연속으로** 진행한다 (`gh` CLI 사용, 이미 인증되어 있음).
이슈 등록부터 PR 생성까지는 이 문서로 사전 승인된 자동화 범위다.

### 1. 이슈 등록 (`gh issue create --repo heartbeat-kb-town/fitwallet-frontend`)

- 제목: `[TYPE] 한국어 설명` (`.github/ISSUE_TEMPLATE/*.md` 참고)
- **타입 라벨**은 제목 접두사와 1:1로 반드시 매칭:

  | 접두사       | 템플릿 파일          | 라벨          |
  | ------------ | -------------------- | ------------- |
  | `[BUG]`      | `bug_report.md`      | `🐛 버그`     |
  | `[FEAT]`     | `feature_request.md` | `✨ 기능`     |
  | `[TASK]`     | `task.md`            | `🛠️ 작업`     |
  | `[REFACTOR]` | `refactor.md`        | `🧹 리팩터링` |
  | `[DOCS]`     | `docs.md`            | `📝 문서`     |
  | `[QUESTION]` | `question.md`        | (라벨 없음)   |
  | `[LEARN]`    | `learn.md`           | (라벨 없음)   |

- 내용상 해당되면 아래 라벨을 **추가로** 붙인다:
  - 우선순위: `🔼 높음` / `➖ 보통` / `🔽 낮음`
  - 상태: `🧊 대기` / `👀 검토필요` / `🚧 진행중`
  - 영역: `🎨 UI` / `🧩 컴포넌트` / `🔌 API연동` / `📱 반응형` / `♿ 접근성` / `🔐 인증` / `🔒 보안` / `✅ 테스트` / `🧭 도메인` / `🧰 인프라`
  - 긴급도가 높으면 `🔥 긴급`
- 본문은 접두사에 대응하는 템플릿의 섹션 구조를 그대로 따른다:

  | 접두사       | 섹션 구성                                                                        |
  | ------------ | -------------------------------------------------------------------------------- |
  | `[BUG]`      | 버그 설명 / 재현 방법 / 예상 동작 / 실제 동작 / 스크린샷 / 환경 / 추가 정보      |
  | `[FEAT]`     | 기능 요약 / 배경 및 이유 / 구현 방법 나열 / 추가 정보                            |
  | `[TASK]`     | 작업 내용 / 작업 목표 / 세부 작업 목록(체크박스) / 참고 자료 / 완료 조건         |
  | `[REFACTOR]` | 리팩토링 대상 / 현재 문제점 / 개선 방향 / 예상 영향 범위(체크박스) / 주의사항    |
  | `[DOCS]`     | 문서 작업 내용 / 작업 이유 / 작업 범위(체크박스) / 참고 자료                     |
  | `[QUESTION]` | 질문 내용 / 배경 / 시도해본 것 / 참고 자료(+코드블록)                            |
  | `[LEARN]`    | 무엇을 했나 / 왜 이렇게 했나 / 어떻게 동작하나 / 몰랐다가 알게 된 것 / 참고 사항 |

- 관련 마일스톤이 있으면 `--milestone`으로 바로 연결한다

### 2. 브랜치 생성

```bash
git checkout develop
git pull origin develop
git checkout -b {type}/{설명}
```

### 3. 구현 + 빌드 확인

- `npm run lint`와 `npm run build`로 린트/빌드 성공을 확인한다 (테스트가 구성되기 전까지는 이 둘만 확인)
- 세부 구현 컨벤션(컴포넌트 구조, 상태 관리 규칙 등)은 아직 확정 전이므로, 확정되면 이 섹션에 추가한다

### 4. 커밋

- 형식: `type: 한국어 설명` + `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` 트레일러
- 이 작업과 관련 없는 미추적 파일은 같이 add하지 않는다

### 5. push

```bash
git push -u origin {브랜치명}
```

### 6. PR 생성 (`gh pr create --repo heartbeat-kb-town/fitwallet-frontend`)

- base: `develop` (`gh pr create --base develop`)
- 제목: `[#이슈번호] type: 작업 내용` (`.github/PULL_REQUEST_TEMPLATE.md` 형식)
- 본문: 관련 이슈(`closes #N`) / 작업 내용 / 변경 유형(체크박스, 커밋 type과 동일한 것 체크) / 체크리스트 / 리뷰어에게 전달할 내용
- 이슈가 마일스톤에 연결돼 있으면 PR도 같은 마일스톤에 `--milestone`으로 연결한다

이슈가 여러 개로 쪼개지는 큰 작업은 먼저 상위 이슈나 마일스톤으로 묶고, 하위 작업 단위로 이 플로우를 반복한다.

### 릴리스 플로우 (develop → main)

배포 시점에만, **사용자가 명시적으로 요청할 때** 실행한다. 위 이슈 → PR 플로우와 별개다.

```bash
gh pr create --repo heartbeat-kb-town/fitwallet-frontend \
  --base main --head develop --title "release: {날짜 또는 버전} 배포"
```

- 이슈를 만들지 않고, 제목에 이슈 번호도 붙이지 않는다
- 본문에는 이번 배포에 포함된 PR 목록을 적는다 (`git log main..develop --oneline`으로 확인)
- **Merge commit**으로 머지한다 (Squash 금지 — 히스토리가 갈라져 다음 릴리스에서 충돌한다)
- 머지 후 `main`은 `develop`의 조상이 되므로 역머지는 필요 없다

## 라벨 전체 목록

| 라벨                                    | 설명                                     |
| --------------------------------------- | ---------------------------------------- |
| `✨ 기능`                               | 새 기능 또는 기존 기능 개선              |
| `🐛 버그`                               | 재현 가능한 오류 또는 예상과 다른 동작   |
| `🛠️ 작업`                               | 구현, 설정, 정리처럼 실행할 작업         |
| `📝 문서`                               | README, 컴포넌트 문서, 가이드, 주석 개선 |
| `🧹 리팩터링`                           | 동작 변경 없는 구조와 품질 개선          |
| `✅ 테스트`                             | 테스트 추가, 수정, 검증 작업             |
| `🔒 보안`                               | 취약점, 민감정보, 권한 오남용 방지       |
| `🧰 인프라`                             | CI/CD, 빌드, 설정, 의존성, 개발환경      |
| `🎨 UI`                                 | 화면, 레이아웃, 스타일, 디자인 반영      |
| `🧩 컴포넌트`                           | 공통 컴포넌트, 라우팅, 상태 관리         |
| `🔌 API연동`                            | 백엔드 API 연동, 요청과 응답, 에러 처리  |
| `📱 반응형`                             | 모바일, 태블릿, 뷰포트 대응              |
| `♿ 접근성`                             | 스크린리더, 키보드 내비게이션, 대비      |
| `🔐 인증`                               | 로그인, 토큰, 인가, 세션                 |
| `🔥 긴급`                               | 즉시 처리해야 하는 장애, 보안, 차단 이슈 |
| `🧭 도메인`                             | 핵심 비즈니스 로직, 정책, 유스케이스     |
| `📚 학습`                               | 새롭게 배운 것 공유                      |
| `➖ 보통` / `🔼 높음` / `🔽 낮음`       | 우선순위                                 |
| `🧊 대기` / `👀 검토필요` / `🚧 진행중` | 진행 상태                                |
