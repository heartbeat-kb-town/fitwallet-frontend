# fitwallet-frontend

최적의 결제수단을 추천하고 놓친 혜택을 알려주는 스마트 전자지갑 fitwallet의 프론트엔드.

> 개발 컨벤션의 결정 배경과 근거는 [docs/specs/2026-08-03-frontend-conventions-design.md](./docs/specs/2026-08-03-frontend-conventions-design.md)에 있다.
> 이 문서는 그 결론을 **실제 작업 지침**으로 옮긴 것이다.

## 기술 스택

Vue 3 + Vite / Pinia / Vue Router / Tailwind CSS / Zod / axios

- 상태 관리는 **Pinia 단독**이다. 서버 데이터 캐싱 라이브러리(`@tanstack/vue-query` 등)를 새로 들이지 않는다.
  비동기 상태는 `useAsyncState`로 처리한다 (아래 "상태 관리" 참고).
- `zod`는 **폼 검증에만** 쓴다. API 응답 검증에는 쓰지 않는다.

## 빌드

- 로컬 구동: `npm run dev` (Vite, `http://localhost:5173`)
- 빌드: `npm run build`
- 린트: `npm run lint` (`eslint . --fix`)
- 포맷: `npm run format` (`prettier . --write`)
- 커밋 시 lefthook pre-commit 훅이 스테이징된 파일에 ESLint `--fix` + Prettier를 자동 적용한다
  (`npm install` 하면 `prepare` 스크립트가 `lefthook install`을 실행)

## 현재 적용 상태 (작업 전 반드시 확인)

**아래 개발 규칙은 확정됐지만, 상당수가 아직 코드에 적용되지 않았다.**
현재 `src`는 동작하는 UI 프로토타입이고 앱 골격이 아니다.
규칙만 믿고 코드를 짜면 "규칙대로 짰는데 안 돌아가는" 상황이 생긴다.

| 규칙                       | 상태                                                                             |
| -------------------------- | -------------------------------------------------------------------------------- |
| 라우터                     | **부트스트랩됨** — 라우트 추가는 `router/routes.js`                              |
| Pinia                      | **부트스트랩됨** — store 를 만들면 바로 동작한다                                 |
| `src/api/client.js`        | **추가됨** — `useAsyncState`도 함께                                              |
| 도메인 API                 | `userApi` · `cardApi` · `paymentApi` · `storeApi` — `benefit` · `report` 는 아직 |
| Tailwind `@theme` 토큰     | **정의됨** — 유틸리티 사용 가능 (Preflight 는 제외)                              |
| `components/common/`       | **추가됨** — `Base*` 5종 + `useToast()`                                          |
| `src/views/` 이관          | **완료** — 화면 14개가 라우트와 1:1                                              |
| `@tanstack/vue-query` 제거 | **완료** — 의존성에서 제거됨                                                     |
| 폴더 구조·네이밍·Git 규칙  | **즉시 적용** — 코드 없이도 바로 지킬 수 있다                                    |

**지금 코드가 어떻게 돼 있나**

- `src/App.vue`는 `<RouterView />` + `<BaseToast />`만 남았다. **더 이상 고치지 않는다.**
  화면은 전부 `src/views/`에 있고 라우트와 1:1이다. 새 화면은 `views/`에 만들고
  `routes.js`의 catch-all 바로 위에 한 줄 추가한다.
- 스타일은 전역 `src/style.css` 4740줄 한 파일이고 `<style scoped>`가 하나도 없다.
- 보유 카드는 `cardStore` 하나에서만 나온다. 화면이 자체 카드 배열을 두지 않는다(#76).
  `src/cardData.js`는 목데이터가 아니라, 목록 응답에 없는 카드사명·카드 이미지를
  메꾸는 **표시 메타**다. 백엔드가 필드를 실어주면 사라진다(backend#111).
- `MyCardView`의 이용 실적·결제 내역도 API에서 온다(#77).
  단 결제 내역은 **첫 묶음만** 보여준다. 백엔드가 커서 방식이라 `hasNext`·`nextCursor`가
  오는데 무한 스크롤을 아직 안 붙였다.
- 가맹점 검색과 검색어도 API에서 온다(#89). **최근 검색어를 화면이 만들지 않는다** —
  `/store/search`로 키워드 검색을 하면 백엔드가 기록하고 `/store/keywords`가 읽는다.
- 가맹점 조회는 위도·경도가 필수다. `src/utils/geolocation.js`가 확보하고,
  못 구하면 시연용 좌표로 떨어진다. 시드 가맹점이 광진구 일대에만 있어서다.
- 남은 목데이터는 `src/data.js`뿐이다. 홈 화면이 직접 import한다
  (`categories`는 가맹점 화면도 아이콘 때문에 쓴다).
  `benefit`·`report` 도메인을 연동하면 대부분 사라진다.

**따라서**

- 표에서 "미착수/미부트스트랩"인 항목에 의존하는 작업을 시작할 때는,
  그 부트스트랩을 **별도 이슈로 먼저 만들고** 진행한다. 다른 작업 PR에 끼워 넣지 않는다.
- 기존 화면을 수정할 때는 전역 CSS를 그대로 따른다.
  한 PR에서 규칙 이관과 기능 변경을 같이 하지 않는다.
- 표의 항목이 적용되면 **이 표를 같이 갱신한다.**

## 폴더 구조

```
src/
├─ api/                     axios 를 만지는 유일한 곳
│  ├─ client.js             인스턴스 + 인터셉터 + ApiError
│  ├─ mock/                 백엔드 미구현분 목데이터
│  └─ {도메인}Api.js        userApi / cardApi / storeApi / benefitApi / paymentApi / reportApi
├─ router/
│  ├─ index.js
│  └─ routes.js             라우트 추가는 배열 끝에 한 줄
├─ stores/                  authStore.js, cardStore.js …
├─ composables/             useAsyncState.js, useToast.js …
├─ views/                   라우트와 1:1 대응하는 화면
├─ components/
│  ├─ common/               BaseButton, BaseToast … 프로젝트 전역 재사용
│  └─ {도메인}/             card/, payment/, report/ … 해당 도메인 전용
├─ constants/               매직 넘버·문자열
├─ utils/                   순수 함수 (포맷터 등)
└─ assets/
```

- 컴포넌트를 둘 위치는 **재사용 범위**로 정한다. 두 도메인 이상에서 쓰면 `common/`, 아니면 `{도메인}/`.
- 파일이 300줄을 넘으면 분리를 검토한다.

## 네이밍 규칙

| 대상          | 규칙                                    | 예시                           |
| ------------- | --------------------------------------- | ------------------------------ |
| 화면(뷰)      | PascalCase + `View` 접미사              | `HomeView.vue`                 |
| 컴포넌트      | PascalCase, 2단어 이상                  | `CardListItem.vue`             |
| 공용 컴포넌트 | `Base` 접두사                           | `BaseButton.vue`               |
| API 파일      | `{도메인}Api.js`                        | `cardApi.js`                   |
| API 함수      | HTTP 동사 + 대상 (camelCase)            | `getUserCards()`, `postCard()` |
| store         | `use{도메인}Store` / `{도메인}Store.js` | `useAuthStore`                 |
| composable    | `use` 접두사                            | `useAsyncState`                |
| 상수          | SCREAMING_SNAKE_CASE                    | `MAX_CARD_COUNT`               |
| 라우트 `name` | kebab-case                              | `card-detail`                  |
| emit 이벤트   | kebab-case                              | `@card-select`                 |
| boolean prop  | `is` / `has` / `can` 접두사             | `isLoading`, `hasBenefit`      |

- 파일명 대소문자를 틀리지 않는다. macOS 로컬은 통과해도 CI·배포에서 깨진다 (`Merchantflow.vue` 사례, #18).

## API 레이어

**`axios`를 직접 import하는 곳은 `src/api/client.js` 하나뿐이다.**
화면과 store는 반드시 `api/{도메인}Api.js`를 거친다.

### 응답 봉투는 인터셉터에서 한 번만 벗긴다

백엔드 응답은 `{ success, code, message, data, errors }` 봉투로 온다.
(`/api` 전체가 같은 모양이다 — 백엔드 `global/common/dto/ApiResponse.java`)

`errors`는 검증 실패(400 `INVALID_INPUT_VALUE`)일 때만 채워지는 필드별 사유다.
`[{ field: 'loginId', reason: '아이디는 필수입니다.' }, ...]` 형태이고, 이게 아래 "에러 처리"의
**입력창 아래 인라인 메시지**를 만드는 재료다.

```js
// src/api/client.js
client.interceptors.response.use(
  (res) => res.data.data, // 봉투를 여기서 한 번만 벗긴다
  (error) => {
    /* 아래 "에러 처리" 참고 */
  },
)
```

**규칙: `api/*Api.js` 함수의 반환값은 항상 `data` 알맹이다.**
화면과 store에 `res.data.data`가 등장하면 잘못 짠 것이다.

### 목데이터도 같은 모양으로 맞춘다

백엔드에 엔드포인트가 있으면 실제 호출하고, 없으면 목데이터를 반환하되 `TODO(mock)` 주석을 단다.
**목데이터는 반드시 봉투 모양(`{ success, code, message, data }`)으로 정의하고, api 함수가 벗겨서 내보낸다.**

```js
// 백엔드 미구현
import { monthlyReport } from './mock/report'
// TODO(mock): 백엔드 미구현
export const getMonthlyReport = async () => monthlyReport.data

// 실제 호출
export const getUserCards = () => client.get('/user-cards')
```

두 함수의 **호출부 코드가 같아야 한다.** 그래야 실제 호출로 교체할 때 화면을 안 고친다.

### API 계약의 정본 — 백엔드 저장소 코드

**엔드포인트 목록, 필드명, 타입, 에러 문구는 전부 백엔드 저장소에서 직접 확인한다. 추측하지 않는다.**

```
heartbeat-kb-town/fitwallet-backend   (기준 브랜치: develop)
```

**OpenAPI 스펙은 더 이상 정본이 아니다.** 백엔드가 Swagger 어노테이션 강제를 풀고
`openapi-spec` 브랜치 자동 발행을 중단했다([backend#109](https://github.com/heartbeat-kb-town/fitwallet-backend/pull/109)).
그 브랜치는 갱신이 멈췄으니 **읽지 않는다.** 거기 없다고 미구현으로 판단하면
이미 구현된 API를 목데이터로 짜게 된다.

#### 읽는 법

로컬에 클론이 있으면 그걸 읽는다. 프론트 저장소와 형제 디렉터리에 두는 것을 권장한다:

```bash
git -C ../fitwallet-backend switch develop && git -C ../fitwallet-backend pull   # 먼저 최신화
```

클론이 없으면 원격에서 바로 읽는다 (`gh`는 이미 인증돼 있다):

```bash
BE=heartbeat-kb-town/fitwallet-backend
gh api "repos/$BE/contents/src/main/java/com/fitwallet/domain/user/controller?ref=develop" --jq '.[].name'
curl -s "https://raw.githubusercontent.com/$BE/develop/src/main/java/com/fitwallet/domain/user/controller/UserController.java"
```

#### 무엇을 어디서 보나

경로는 전부 백엔드 저장소 기준이고, `{도메인}`은 `user` / `card` / `payment` / `benefit` / `store` / `report`다.

| 확인할 것                | 볼 곳                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| 엔드포인트·HTTP 메서드   | `src/main/java/com/fitwallet/domain/{도메인}/controller/*.java`                                        |
| 요청 바디 필드           | `.../domain/{도메인}/dto/request/*.java`                                                               |
| 응답 필드                | `.../domain/{도메인}/dto/response/*.java`                                                              |
| 폼 검증 규칙·문구        | request DTO의 `@Pattern` / `@Size` / `@NotNull`의 `message`                                            |
| 에러 `code`·`message`    | `.../domain/{도메인}/exception/{도메인}ErrorCode.java`, 공통은 `global/exception/CommonErrorCode.java` |
| 성공 `code`·`message`    | `.../domain/{도메인}/dto/{도메인}SuccessCode.java`                                                     |
| 응답 봉투                | `global/common/dto/ApiResponse.java`                                                                   |
| **실제로 채워지는 필드** | `src/main/resources/mapper/{도메인}/*.xml`                                                             |

```bash
# 전체 엔드포인트 훑기 (로컬 클론에서)
grep -rn "Mapping(" ../fitwallet-backend/src/main/java/com/fitwallet/domain/*/controller/
```

- ⚠️ **DTO에 필드가 있어도 매퍼 XML이 그 컬럼을 SELECT하지 않으면 항상 `null`이다.**
  MyBatis `resultType` 매핑이 조용히 버린다. 응답 모양을 확정할 때는 **DTO와 매퍼 XML을 함께 본다.**
  스펙으로는 절대 드러나지 않던 항목이라, 목데이터를 실제 호출로 바꿀 때 여기서 깨진다.
- 컨트롤러에 없는 엔드포인트는 백엔드 미구현이므로 목데이터로 둔다(위 규칙 참고).
- 이름만으로 의미가 안 드러나는 값은 백엔드가 주석/Javadoc에 남긴다.
  예: `cardId` 경로 변수는 `card_product_id`가 아니라 `user_card_id`다. 컨트롤러 주석을 확인한다.
- Swagger UI(`http://localhost:8080/swagger-ui/index.html`)는 **백엔드를 직접 띄웠을 때 경로를 훑는
  보조 수단**이다. 어노테이션이 없는 엔드포인트도 많고, JSR-303 검증 규칙은 아예 실리지 않는다.
- 개발 시 `/api` 요청은 vite proxy가 `localhost:8080`으로 넘긴다 (`vite.config.js`).

## 인증

백엔드가 하이브리드 방식으로 구현을 마쳤다.

- **Access Token**: 로그인 응답 `data.accessToken`을 **메모리**(`client.js` 모듈 변수)에 보관하고
  `Authorization: Bearer {token}` 헤더로 보낸다.
  **`localStorage` / `sessionStorage`에 절대 넣지 않는다.**
- **Refresh Token**: 백엔드가 HttpOnly 쿠키(`refreshToken`, SameSite=Strict, Path=/)로 내려준다.
  JS가 읽을 수 없다. 프론트는 axios에 **`withCredentials: true`** 를 켜기만 하면 된다.
  이걸 안 켜면 `Set-Cookie` 자체가 저장되지 않는다.

> 왜 메모리인가: refresh를 HttpOnly로 감싼 설계라, access를 localStorage에 두면 XSS 방어가 무의미해진다.

`setAccessToken()` / `clearAccessToken()`을 `client.js`에서 export하고 로그인·로그아웃 시 갈아끼운다.

### 현재 제약 — 재발급·로그아웃 엔드포인트 미구현

메모리 보관이라 **새로고침하면 access token이 날아간다.**
원래는 앱 부팅 시 재발급 API로 복구하지만, 백엔드에 `/reissue`와 `/logout`이 아직 없다.

- 그전까지 401 처리는 **재발급 시도 없이** access token을 비우고 로그인 화면으로 보낸다.
- 엔드포인트가 생기면 `401 → 재발급 → 원요청 재시도`로 교체한다 (경로는 백엔드 확정 후 반영).

라우터 가드는 `meta.requiresAuth`가 있는 라우트에서 토큰이 없으면 `login`으로 리다이렉트한다.

## 에러 처리

| 상황                                         | 표현                                | 담당         |
| -------------------------------------------- | ----------------------------------- | ------------ |
| 입력값 검증 실패 (400 `INVALID_INPUT_VALUE`) | 해당 입력창 아래 인라인 메시지      | 화면         |
| 400/404/409 비즈니스 에러                    | 토스트에 백엔드 `message` 그대로    | 화면         |
| 401 `INVALID_CREDENTIALS` (로그인 실패)      | 토스트에 백엔드 `message` 그대로    | 화면         |
| 401 `PIN_MISMATCH` (결제 비밀번호 불일치)    | 화면에 메시지 + 남은 시도 횟수      | 화면         |
| 401 `UNAUTHORIZED` (세션 끊김)               | 토큰 비우고 로그인 이동             | **인터셉터** |
| 500 · 네트워크                               | 토스트 "일시적인 오류가 발생했어요" | 화면         |

- **`alert()` 금지.** 사용자에게 보이는 에러는 전부 `useToast()`를 거친다.
- **401이 전부 세션 만료가 아니다.** 백엔드의 401은 셋이고 그중 세션 끊김은 **하나뿐**이다.
  나머지 둘을 세션 끊김으로 처리하면 사용자가 메시지를 보지도 못하고 로그인 화면으로 되튕긴다.

  | code                  | 의미                   | 담당     |
  | --------------------- | ---------------------- | -------- |
  | `UNAUTHORIZED`        | 진짜 세션 끊김         | 인터셉터 |
  | `INVALID_CREDENTIALS` | 아이디·비밀번호 불일치 | 화면     |
  | `PIN_MISMATCH`        | 결제 비밀번호 불일치   | 화면     |

  **경로가 아니라 `code`로 가른다.** 경로 목록으로 가르면 비즈니스 401을 주는 엔드포인트가
  늘 때마다 목록에 넣는 것을 잊고, 그 화면에서 사용자가 조용히 로그아웃된다.
  실제로 결제 PIN이 그렇게 새어 나갔다(#79). 새 비즈니스 401이 생기면
  `client.js`의 `BUSINESS_401_CODES`에 코드를 추가한다.
  코드를 모르는 401(응답 봉투 자체가 없는 경우)은 세션 만료로 본다.

- 세션이 끊긴 401은 인터셉터가 전담한다. 화면에서 따로 처리하지 않는다.
- 검증 실패를 토스트로 띄우지 않는다. 어느 입력창이 문제인지 알려주지 못한다.
  `ApiError.reasonFor('loginId')`로 해당 입력창 메시지를 꺼내 쓴다.
- 인터셉터는 `ApiError(code, message, status, errors, data)`로 감싸서 reject한다.
  `data`는 실패 응답에도 봉투에 실려 오는 알맹이다. 대부분 null이지만
  `PIN_MISMATCH`는 여기에 `{ remainingAttempts }`를 담아 준다. 버리면 몇 번 남았는지 알려줄 수 없다.

## 상태 관리

- **서버 데이터** → Pinia store
- **여러 화면이 공유하는 클라이언트 상태**(로그인 등) → Pinia store
- **그 화면 안에서만 쓰는 상태**(입력값, 모달 열림) → `ref` / `reactive`
- store 간 순환 참조 금지.

### 비동기 action은 반드시 `useAsyncState`를 경유한다

`isLoading` / `error` / `try-catch`를 손으로 짜지 않는다. 사람마다 모양이 갈린다.

```js
// src/composables/useAsyncState.js
export function useAsyncState(fn, initialValue = null) {
  const data = ref(initialValue) // 초기값을 받아야 v-for 가 터지지 않는다
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
// src/stores/cardStore.js
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

## 스타일

**새로 짜는 마크업은 Tailwind 유틸리티를 쓴다.** 새 CSS 파일이나 `<style scoped>`를 만들지 않는다.

- 디자인 토큰은 `@theme`로 정의하고 `bg-primary`, `text-ink`, `border-line`처럼 쓴다.
- **색상 하드코딩(`#FFCC00`) 금지.** 반드시 토큰을 쓴다. 토큰에 없는 색이 필요하면 토큰을 먼저 추가한다.
- 기존 `src/style.css` 4740줄은 **동결**이다. 기존 화면의 버그 수정만 허용하고, **새 클래스 추가는 금지**한다.
- 클래스가 길어져 읽기 어려우면 `@apply` 대신 **컴포넌트로 분리**한다.

```css
/* src/style.css 상단 (적용 완료) */
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);

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

**Preflight(Tailwind 전역 리셋)는 일부러 빼놨다.** `@import 'tailwindcss'` 한 줄로 가져오면
Preflight가 딸려 오는데, 그게 `html`에 `line-height: 1.5`를 건다. 기존 `style.css` 4740줄은
line-height를 지정한 적이 없어 전부 `normal`(≈1.2)로 그려진 코드라, 리셋이 들어가면 텍스트
블록마다 높이가 늘어 화면 아래로 갈수록 밀린다 (홈 카테고리 타일 109px → 112.8px로 확인).
그래서 theme·utilities만 가져온다. 기존 화면을 전부 Tailwind로 이관한 뒤에 Preflight를 켜는
것을 검토한다.

모바일 앱 UI라 `.phone` 컨테이너 고정폭을 쓴다. 브레이크포인트 대응은 당장 하지 않는다.

## 공용 컴포넌트

`src/components/common/`에 두고 `Base` 접두사를 붙인다.
아래는 위 규칙을 실제로 강제하는 장치다. **5종 모두 추가돼 있으니 바로 쓰면 된다.**

`BaseToast`는 `App.vue`에 이미 한 번 걸려 있다. 화면에서 또 놓지 않는다.
어디서든 `useToast().showToast('메시지')`만 부르면 된다.

| 컴포넌트                       | 역할                                       |
| ------------------------------ | ------------------------------------------ |
| `BaseButton.vue`               | primary / secondary / ghost variant        |
| `BaseInput.vue`                | 라벨 + 인라인 에러 메시지 슬롯 (검증 규칙) |
| `BaseToast.vue` + `useToast()` | 에러 표시 창구 (에러 처리 규칙)            |
| `BaseSpinner.vue`              | 로딩                                       |
| `BaseModal.vue`                | 모달                                       |

화면에서 버튼·입력창·모달을 새로 만들기 전에 `common/`에 있는지 먼저 확인한다.

## 협업 규칙 (2인)

### 역할 분담 — 하이브리드

**Phase 1 (초반):** 한 명이 공통 골격을 몰아서 깔고, 다른 한 명은 골격과 겹치지 않는 화면 작업을 한다.

| 골격 담당                                 | 화면 담당                                                   |
| ----------------------------------------- | ----------------------------------------------------------- |
| 라우터 부트스트랩 + `routes.js`           | 기존 화면 → `views/` 이관 (한 화면 = 한 PR)                 |
| `api/client.js` + 인터셉터 + `ApiError`   | 목데이터 → `api/mock/` 이관                                 |
| `authStore` + 로그인·회원가입 연동        | 대형 파일 분해 (`MyCardScreen` 938줄, `ReportScreen` 815줄) |
| `useAsyncState`, Tailwind 토큰, `common/` |                                                             |

**Phase 2 (골격 완성 후):** 도메인 단위로 나눈다.

- A: 인증 · 마이페이지 · 카드관리 · 결제
- B: 홈 · 가맹점검색 · 리포트

### 충돌 방지 3계명

1. **`src/App.vue`와 `src/style.css`는 골격 담당만 수정한다.** 둘 다 지금 최대 충돌 지점이다.
2. **`routes.js`는 배열 끝에 한 줄씩만 추가한다.** 중간에 끼워 넣거나 정렬하지 않는다.
3. **화면 하나 = 이슈 하나 = PR 하나.** 여러 화면을 한 PR에 묶지 않고, 작업 시작 전 `git pull origin develop`.

### 환경변수

- `.env.example`을 `.env`로 복사해 쓴다. `.env`는 커밋하지 않는다.
- 클라이언트에 노출되므로 **비밀 키를 넣지 않는다.** `VITE_` 접두사가 붙은 값만 코드에서 읽힌다.
- **`VITE_API_BASE_URL`은 개발·배포 모두 `/api`다.** 여기에 백엔드 주소를 넣지 않는다.
  이유는 아래 "배포" 참고.

## 배포 (Cloudflare Workers)

`wrangler.jsonc` 하나로 **정적 자산과 `/api` 프록시를 같이** 배포한다.

```
                    run_worker_first: ["/api/*"]
                              │
      /api/*  ────────────────┴──▶  worker/index.js ──HTTP──▶ 백엔드(Elastic Beanstalk)
      그 외    ───────────────────▶  dist (정적 자산)
                                       └─ 매칭 실패 시 index.html (SPA 폴백)
```

- **개발의 vite proxy와 같은 구조다.** 브라우저가 보기엔 화면과 API가 같은 오리진이라
  CORS 설정이 필요 없고, refreshToken 쿠키의 `SameSite=Strict`가 그대로 통한다.
  **백엔드 수정이 필요 없다.**
- 백엔드가 `http://`인데도 동작하는 이유가 이것이다. 브라우저는 Worker와 HTTPS로만
  대화하므로 mixed content 차단에 걸리지 않는다. `VITE_API_BASE_URL`에 백엔드 주소를
  직접 넣는 방식은 이 때문에 **성립하지 않는다.**
- 백엔드 주소는 `wrangler.jsonc`의 `vars.BACKEND_ORIGIN`이다. Worker **런타임** 설정이라
  주소가 바뀌어도 재빌드가 필요 없고 브라우저 번들에도 안 들어간다.
  `VITE_*`는 빌드 타임에 번들로 박히므로 여기 쓰면 안 된다.
- `not_found_handling: "single-page-application"`이 없으면 `createWebHistory` 라우터의
  경로(`/home` 등)가 새로고침·직접 진입에서 전부 404다.
- 로컬에서 배포본 그대로 확인: `npm run build && npm run preview:worker`

### 배포는 push 하면 자동으로 된다

Cloudflare **Workers Builds**(Git 연동)가 `wrangler.jsonc`를 읽고 `wrangler deploy`를 돌린다.
`npm run deploy`는 수동 배포용이고 평소에는 쓰지 않는다. 손으로 돌리면 Git 연동이 올린 것과
어긋나므로, 대시보드에서 이력을 확인해야 하는 상황이 아니면 건드리지 않는다.

- 프로덕션: <https://fitwallet-frontend.hyanj14.workers.dev>
- 지금 무엇이 올라가 있는지: `npx wrangler deployments list`
- 어느 커밋인지: `wrangler`에는 커밋 정보가 없다. GitHub 체크런 본문의 Version ID로 역매핑한다

  ```bash
  R=heartbeat-kb-town/fitwallet-frontend
  S=$(gh api "repos/$R/commits/develop" --jq .sha)
  gh api "repos/$R/commits/$S/check-runs" --jq '.check_runs[].output.summary' | grep "Version ID"
  ```

> 🔥 **지금은 어느 브랜치를 push 하든 프로덕션이 그 브랜치로 갈린다** (#85).
> 머지도 리뷰도 필요 없다. 실제로 2026-08-05에 서로 다른 두 사람의 작업 브랜치가
> PR이 열려 있는 상태에서 프로덕션에 나갔다.
>
> **그때까지는 작업 브랜치 push = 라이브 반영이다.** 깨진 상태를 push 하지 않는다.
> 되돌리려면 정상 커밋을 다시 push 하거나 `npx wrangler rollback {version-id}`를 쓴다.
> 이 제약이 풀리면 이 문단을 지우고 실제 정책(어느 브랜치가 프로덕션인가)으로 교체한다.

> ⚠️ **Worker ↔ 백엔드 구간은 평문 HTTP다.** 로그인 비밀번호와 토큰이 암호화 없이 지난다.
> `*.elasticbeanstalk.com`은 ACM 인증서를 발급받을 수 없어(도메인 소유 확인 불가)
> 백엔드 HTTPS에는 커스텀 도메인이 필요하다. 팀원·테스트 계정만 쓰는 동안의 한시적 타협이며,
> **실사용자를 받기 전에 반드시 해소한다** (#82).

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
