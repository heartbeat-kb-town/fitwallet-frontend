import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { reissueAccessToken } from './api/client'
import './style.css'

const app = createApp(App).use(createPinia()).use(router)

// access token 은 메모리에만 있어서 새로고침하면 날아간다.
// refreshToken 쿠키가 살아 있으면 여기서 되살린다.
//
// **mount 를 기다리게 한다.** 먼저 mount 하면 requiresAuth 라우트가 토큰이 심어지기 전에
// 판정돼, 로그인 상태인데도 로그인 화면으로 튕긴다.
//
// 실패는 정상적인 경우다 — 로그인한 적이 없으면 쿠키가 없다. 그대로 mount 하면
// 라우터 가드가 알아서 로그인으로 보낸다.
//
// catch 를 finally 앞에 둔다. finally 는 거부를 삼키지 않고 그대로 흘려보내므로
// 부팅 때마다 콘솔에 unhandled rejection 이 찍힌다 (로그인 전에는 매번 실패한다).
reissueAccessToken()
  .catch(() => {})
  .finally(() => app.mount('#app'))
