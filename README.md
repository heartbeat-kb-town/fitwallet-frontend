# fitwallet Frontend

Vue 3 + Vite + Tailwind CSS v4 기반 모바일 웹앱.

## 기술 스택

| 구분             | 기술                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| 프레임워크       | Vue 3 (`<script setup>`), JavaScript, Vite                           |
| 상태·라우팅·HTTP | Pinia, Vue Router, axios                                             |
| 스타일           | Tailwind CSS v4 (`@tailwindcss/vite`)                                |
| 검증·서버데이터  | Zod, TanStack Query                                                  |
| 코드 품질        | ESLint + Prettier (작은따옴표·no semi·100) + lefthook (커밋 시 자동) |
| 공통 API         | `src/api/client.js` — ApiResponse 래퍼 벗기기·JWT 자동첨부·에러 변환 |
| 설정             | `@` → `src` alias · `/api` → `:8080` 프록시                          |

## 실행

```bash
npm install      # 최초 1회 (의존성 설치 + lefthook 훅 자동 설치 + Pretendard 폰트 포함)
npm run dev      # 개발 서버 (http://localhost:5173, /api → 8080 프록시)
npm run build    # 프로덕션 빌드
npm run lint     # 전체 ESLint --fix
npm run format   # 전체 Prettier
```

- 폰트는 **Pretendard**로 고정되어 있습니다(`src/assets/main.css`). 별도 설정 없이 `npm install`만 하면 적용됩니다.
- 아이콘은 **Lucide** (`lucide-vue-next`)를 사용합니다.
- API 호출은 반드시 `src/api/client.js`의 `api`를 통해서 합니다. raw axios 직접 호출 금지.
