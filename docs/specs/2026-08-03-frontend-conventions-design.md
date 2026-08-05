# 프론트엔드 공통 개발 규칙 설계

- 작성일: 2026-08-03
- 관련 이슈: #21
- 배경: 2인이 각자 Claude Code로 작업한다. 규칙이 없으면 사람마다 다른 스타일의 코드가 쌓이고,
  같은 파일을 동시에 건드려 매 PR마다 충돌한다.

## 1. 출발점 진단

규칙을 정하기 전에 현재 코드가 어떤 상태인지부터 확인했다.

### 설치된 것과 실제 쓰는 것이 다르다

| 패키지                | 설치 | `src`에서 실제 사용 |
| --------------------- | ---- | ------------------- |
| `vue-router`          | O    | **0곳**             |
| `pinia`               | O    | **0곳**             |
| `@tanstack/vue-query` | O    | **0곳**             |
| `axios`               | O    | **0곳**             |
| `zod`                 | O    | **0곳**             |
| `tailwindcss`         | O    | `HomeScreen` 1곳    |
| `lucide-vue-next`     | O    | 6곳                 |

현재 코드는 **동작하는 UI 프로토타입**이지 앱 골격이 아니다.
폴더도 `src/components/` 평면 하나뿐이고 `views/` `stores/` `api/` `composables/`가 없다.
따라서 "규칙을 정한다"는 것은 실질적으로 "앱 골격을 지금 설계한다"는 뜻이다.

### 2인 동시 작업에서 터질 지점 3개

**1. `App.vue`가 수동 화면 스위처다** (`src/App.vue`, 215줄)

```js
const screen = ref('login') // 이 문자열 하나로 14개 화면을 v-if로 갈아끼운다
```

화면 상태 `ref`가 11개이고, 화면 간 데이터는 props로 내리고 emit으로 올린다.
누구든 화면을 하나라도 추가·수정하면 반드시 `App.vue`를 건드리므로 매 PR이 충돌한다.
라우터를 쓰면 라우트 파일에 한 줄 추가하고 자기 화면 파일만 만지면 된다.
덤으로 뒤로가기, 새로고침, URL 공유가 따라온다. 지금은 새로고침하면 로그인 화면으로 튕긴다.

**2. `style.css`가 4740줄 전역 단일 파일이다**

컴포넌트에 `<style scoped>`가 하나도 없다. 모든 스타일이 전역 클래스명으로 이 파일에 있다.
동시 작업 시 같은 파일 충돌에 더해 `.card`, `.header` 같은 이름이 겹칠 위험이 있다.

**3. 목데이터를 화면이 직접 import한다**

`data.js`(254줄)와 `cardData.js`를 화면들이 직접 가져다 쓴다.
Swagger 연동 시 손댈 범위와 방식이 사람마다 달라진다.

참고로 `.env.example`은 이미 `src/api/client.js`를 전제로 쓰여 있으나 그 파일은 존재하지 않는다.

## 2. 이번 작업의 범위

이번에는 **문서만** 만든다. 코드는 건드리지 않는다.

기존 프로토타입을 새 구조로 옮기는 작업은 양이 크고, 옮기는 중에 화면이 깨질 수 있어
별도 이슈로 분리한다. 대신 규칙 문서 안에 **"현재 적용 상태"** 표를 넣어,
규칙은 있지만 코드에 아직 없는 항목을 명시한다.

### 왜 이 표가 필요한가

라우터가 대표적인 사례다. 규칙만 적어두면 이런 일이 벌어진다.

1. 팀원이 Claude에게 "혜택 상세 화면 만들어줘"라고 요청한다
2. Claude가 `CLAUDE.md`를 읽고 "화면은 `views/`에, 라우트는 `routes.js`에 등록"을 따른다
3. 시키는 대로 파일을 만들고 라우트를 등록한다
4. **화면이 안 뜬다.** `main.js`에 `app.use(router)`가 없고 `App.vue`에 `<RouterView />`가 없다
5. Claude가 그제야 부트스트랩을 하면서 `App.vue`를 뜯는다 — 피하려던 충돌이 그 PR에서 터진다

"규칙"만 적으면 위험하고, "규칙 + 현재 적용 상태"를 함께 적으면 문서만으로도 안전하다.

## 3. 결정 사항

### 3.1 폴더 구조

```
src/
├─ api/                     axios를 만지는 유일한 곳
│  ├─ client.js             인스턴스 + 인터셉터 + ApiError
│  ├─ mock/                 백엔드 미구현분 (기존 data.js·cardData.js 이관 대상)
│  ├─ userApi.js  cardApi.js  storeApi.js
│  ├─ benefitApi.js  paymentApi.js  reportApi.js
├─ router/
│  ├─ index.js
│  └─ routes.js             라우트 추가는 배열 끝에 한 줄. 충돌 최소화
├─ stores/                  authStore.js, cardStore.js …
├─ composables/             useAsyncState.js, useToast.js
├─ views/                   라우트와 1:1 대응하는 화면
├─ components/
│  ├─ common/               BaseButton, BaseToast … 프로젝트 전역 재사용
│  └─ card/ payment/ …      특정 도메인 전용
├─ constants/   utils/   assets/
```

기존 `components/*Screen.vue` 14개는 그 자리에 두고 문서에 "이관 대기"로 표시한다.

### 3.2 API 레이어 — 봉투는 인터셉터에서 한 번만 벗긴다

백엔드 응답은 `{ success, code, message, data }` 봉투로 온다.
이 봉투를 화면마다 벗기면 나중에 화면 전체를 `res.data.data`로 고치게 된다.
그래서 **인터셉터에서 한 번만 벗긴다.**

```js
client.interceptors.response.use(
  (res) => res.data.data, // 봉투를 여기서 벗김
  (error) => {
    /* ... */
  },
)
```

핵심 규칙은 **`api/*Api.js` 함수의 반환값은 항상 `data` 알맹이**라는 것이다.
목데이터도 봉투 모양으로 정의하되 api 함수가 벗겨서 내보낸다.

```js
// 백엔드 미구현
import { monthlyReport } from './mock/report'
// TODO(mock): 백엔드 미구현
export const getMonthlyReport = async () => monthlyReport.data

// 실제 호출
export const getUserCards = () => client.get('/user-cards')
```

두 함수의 **호출부 코드가 완전히 같다.** 실제 호출로 교체해도 화면은 손대지 않는다.

### 3.3 인증

백엔드에서 이미 하이브리드 방식으로 구현을 마쳤다.

- Access Token: 로그인 응답 `data.accessToken`으로 받아 **메모리**(`client.js` 모듈 변수)에 보관하고
  `Authorization: Bearer {token}` 헤더로 보낸다. `localStorage` / `sessionStorage`에 넣지 않는다
- Refresh Token: 백엔드가 HttpOnly 쿠키(`refreshToken`, SameSite=Strict, Path=/)로 내려준다.
  JS가 읽을 수 없고, 프론트는 `withCredentials: true`만 켜면 된다

이유: refresh를 HttpOnly로 감싼 설계이므로, access를 `localStorage`에 두면 XSS 방어가 무의미해진다.

**대가와 현재 제약**

메모리 보관이라 새로고침하면 access token이 날아간다.
원래는 앱 부팅 시 재발급 API로 복구하는 구조지만, **`/reissue`와 `/logout` 엔드포인트가 아직 없다**
(백엔드 `UserController`에 signup/login 둘뿐).
그전까지 401 처리는 재발급 시도 없이 토큰을 비우고 로그인 화면으로 보낸다.
엔드포인트가 생기면 `401 → 재발급 → 원요청 재시도`로 교체한다.

### 3.4 에러 처리

| 상황                      | 표현                                | 담당         |
| ------------------------- | ----------------------------------- | ------------ |
| 입력값 검증 실패          | 해당 입력창 아래 인라인 메시지      | 화면         |
| 400/404/409 비즈니스 에러 | 토스트에 백엔드 `message` 그대로    | 화면         |
| 401                       | 토큰 비우고 로그인 이동             | **인터셉터** |
| 500 · 네트워크            | 토스트 "일시적인 오류가 발생했어요" | 화면         |

`alert()`와 사용자에게 보이는 `console.log`는 금지한다. 에러 표시는 전부 `useToast()`를 거친다.

### 3.5 상태 관리 — Pinia 단독

`@tanstack/vue-query`를 제거하고 Pinia만 쓴다.
배울 개념을 하나 줄이는 대신, 화면마다 `isLoading` / `error` / `try-catch`를 손으로 짜게 되는
보일러플레이트를 감수한다.

이 단점은 규칙으로 막는다. **store의 모든 비동기 action은 `useAsyncState`를 경유한다.**

```js
// composables/useAsyncState.js
export function useAsyncState(fn, initialValue = null) {
  const data = ref(initialValue) // 초기값을 받아야 v-for가 터지지 않는다
  const isLoading = ref(false)
  const error = ref(null)

  async function execute(...args) {
    isLoading.value = true
    error.value = null
    try {
      return (data.value = await fn(...args))
    } catch (e) {
      error.value = e
      throw e
    } finally {
      isLoading.value = false
    }
  }
  return { data, isLoading, error, execute }
}
```

```js
// stores/cardStore.js — 3줄 반복이 1줄로 줄어든다
export const useCardStore = defineStore('card', () => {
  const {
    data: cards,
    isLoading,
    error,
    execute: fetchCards,
  } = useAsyncState(cardApi.getUserCards, [])
  return { cards, isLoading, error, fetchCards }
})
```

서버 데이터는 store, 화면 로컬 상태는 `ref`, store 간 순환 참조는 금지한다.

### 3.6 스타일 — Tailwind 우선

새로 짜는 코드는 Tailwind 유틸리티를 쓴다.

선택 이유는 2인 바이브 코딩에 가장 강해서다.
스타일이 컴포넌트 파일 안에 있으니 파일 충돌이 구조적으로 없고,
`p-4`는 누가 쓰든 항상 16px이라 두 사람의 결과물이 같은 값으로 수렴한다.
클래스명을 짓는 고민도 사라진다.

디자인 토큰은 Tailwind v4의 `@theme`로 정의하고, `data.js`의 `colors` 객체를 여기로 흡수한다.

```css
@import 'tailwindcss';
@theme {
  --color-primary: #ffcc00;
  --color-primary-dark: #e6a800;
  --color-ink: #1a1a1a;
  --color-sub: #60584c;
  --color-line: #e9e4dc;
  --color-icon-bg: #fff8e5;
  --color-muted: #d4c4ab;
}
```

- 색상 하드코딩(`#FFCC00`)을 금지하고 반드시 토큰을 쓴다
- 기존 `style.css` 4740줄은 **동결**한다. 기존 화면 버그 수정만 허용하고 새 클래스 추가는 금지한다
- 클래스가 지나치게 길어지면 `@apply` 대신 컴포넌트로 분리한다

### 3.7 목데이터 전략

화면은 목데이터를 직접 import하지 않는다. 무조건 `api/`를 거친다.
`api/` 함수는 둘 중 하나다.

- 백엔드에 엔드포인트가 있으면 실제 호출 (vite proxy `/api` → `localhost:8080`)
- 없으면 목데이터를 return하고 `// TODO(mock): 백엔드 미구현` 주석을 단다

기존 `data.js` / `cardData.js`는 `api/mock/` 아래로 옮기고 화면에서의 직접 import를 전부 제거한다.
목데이터는 반드시 백엔드 응답 봉투 모양을 그대로 흉내낸다.

**실제 호출 가능한 엔드포인트**

```
GET  /api/user-cards                        GET  /api/store/search
GET  /api/card/{cardId}/summary             GET  /api/store/keywords
GET  /api/card/{cardId}/transactions        DEL  /api/store/keywords/recent/{searchHistoryId}
POST /api/card                              DEL  /api/store/keywords/recent
GET  /api/benefit/expected                  POST /api/payment/pin/verify
POST /api/user/signup                       POST /api/user/login
```

목데이터로 남는 것: 리포트 전체, 토큰 재발급/로그아웃.
필드명과 타입의 정본은 `http://localhost:8080/swagger-ui/index.html`이다.

> **후속(2026-08-04)** — 정본은 백엔드 CI가 `openapi-spec` 브랜치에 발행하는 `openapi.json`으로
> 대체됐다. 위 엔드포인트 목록도 이 문서 작성 시점 기준이라 현재와 다르다.
>
> **후속(2026-08-05)** — 백엔드가 Swagger 어노테이션 강제를 풀고 `openapi-spec` 발행을 중단해
> ([backend#109](https://github.com/heartbeat-kb-town/fitwallet-backend/pull/109)),
> 정본이 다시 **백엔드 저장소 코드**로 바뀌었다. 스펙 URL과 Swagger UI는 정본이 아니다.
> 실제 작업 시에는 [CLAUDE.md](../../CLAUDE.md)의 "API 계약의 정본 — 백엔드 저장소 코드"를 본다.

### 3.8 역할 분담 — 하이브리드

**Phase 1 (초반)**

| 골격 담당                                 | 화면 담당                                                   |
| ----------------------------------------- | ----------------------------------------------------------- |
| 라우터 부트스트랩 + `routes.js`           | 기존 화면 → `views/` 이관 (한 화면 = 한 PR)                 |
| `api/client.js` + 인터셉터 + `ApiError`   | 목데이터 → `api/mock/` 이관                                 |
| `authStore` + 로그인·회원가입 연동        | 대형 파일 분해 (`MyCardScreen` 938줄, `ReportScreen` 815줄) |
| `useAsyncState`, Tailwind 토큰, `common/` |                                                             |

**Phase 2 (골격 완성 후) — 도메인 단위 분할**

- A: 인증 · 마이페이지 · 카드관리 · 결제
- B: 홈 · 가맹점검색 · 리포트

**충돌 방지 3계명**

1. `App.vue`와 `style.css`는 골격 담당만 수정한다
2. `routes.js`는 배열 끝에 한 줄씩만 추가한다
3. 화면 하나 = 이슈 하나 = PR 하나. 작업 시작 전 `git pull origin develop`

## 4. 검토했지만 택하지 않은 것

| 대안                          | 택하지 않은 이유                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| 골격을 먼저 이관하고 시작     | 14개 화면 이관은 양이 크고 화면이 깨질 수 있다. 문서를 먼저 고정하고 이관은 별도 이슈로 나눈다       |
| TanStack Query 유지           | 배울 개념이 하나 늘어난다. 보일러플레이트는 `useAsyncState`로 억제할 수 있다고 판단했다              |
| `<style scoped>` 우선         | Claude가 매번 CSS를 새로 짜서 색상·여백 값이 화면마다 미묘하게 갈린다. 클래스명 규칙도 따로 필요하다 |
| 전역 `style.css` 유지         | 충돌 핫스팟이 그대로 남는다                                                                          |
| MSW 도입                      | Swagger가 곧 나오고 실제 엔드포인트도 이미 12개 있다. 설정·학습 비용 대비 이득이 적다                |
| Access Token을 localStorage에 | Refresh를 HttpOnly로 감싼 설계라 access를 localStorage에 두면 XSS 방어가 무의미해진다                |
| `zod`로 API 응답까지 검증     | 과하다. 폼 검증에만 쓴다                                                                             |

## 5. 후속 이슈

이번 문서 작업 이후 코드에 적용할 항목이다.

- [ ] 라우터 부트스트랩 (`main.js` + `App.vue`에 `RouterView` 공존, 기존 스위처와 병행)
- [ ] `api/client.js` + 인터셉터 + `ApiError` 구현
- [ ] Tailwind `@theme` 디자인 토큰 정의, `data.js`의 `colors` 흡수
- [ ] `useAsyncState`, `useToast` 및 `components/common/` 5종 구현
- [ ] 기존 14개 화면 `views/` 이관 (한 화면 = 한 PR)
- [ ] 목데이터 `api/mock/` 이관 및 화면의 직접 import 제거
- [ ] `@tanstack/vue-query` 의존성 제거
- [ ] `/reissue` · `/logout` 엔드포인트 확정 후 401 재발급 로직으로 교체
