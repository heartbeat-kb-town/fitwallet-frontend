import { createRouter, createWebHistory } from 'vue-router'

import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // 모바일 앱 UI 라 화면을 옮기면 항상 최상단부터 보여준다.
  scrollBehavior: () => ({ top: 0 }),
})

// TODO(#27): meta.requiresAuth 가드를 붙인다.
// access token 을 메모리에 들고 있는 `api/client.js` 가 아직 없어서,
// 토큰 저장소가 생긴 뒤에 추가한다.

export default router
