import { createRouter, createWebHistory } from 'vue-router'

import { getAccessToken } from '@/api/client'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // 모바일 앱 UI 라 화면을 옮기면 항상 최상단부터 보여준다.
  scrollBehavior: () => ({ top: 0 }),
})

// meta.requiresAuth 가 붙은 라우트는 토큰이 없으면 로그인으로 보낸다.
router.beforeEach((to) => {
  if (!to.meta.requiresAuth || getAccessToken()) return true

  // 로그인 화면이 아직 `src/views/` 로 이관되기 전이면 login 라우트가 없다.
  // 없는 라우트로 보내면 터지므로, 그때까지는 막지 않는다.
  return router.hasRoute('login') ? { name: 'login' } : true
})

export default router
