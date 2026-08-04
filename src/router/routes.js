/**
 * 라우트 정의.
 *
 * 화면을 `src/views/` 로 옮길 때마다 **셸 라우트 바로 위에 한 줄씩** 추가한다.
 * 중간에 끼워 넣거나 정렬하지 않는다 (2인 동시 작업 시 충돌을 막기 위함).
 *
 *   { path: '/home', name: 'home', component: () => import('@/views/HomeView.vue') },
 *
 * 셸(`/app`)과 그 뒤의 catch-all 은 이관(#39)이 끝나면 함께 지운다.
 * 그때부터는 원래대로 배열 끝에 추가하면 된다.
 */
export const routes = [
  { path: '/', redirect: { name: 'login' } },

  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },

  // 이관 중(#39): 아직 `views/` 로 옮기지 않은 화면 12개를 담는 임시 셸.
  // 셸 안에서 어느 화면을 볼지는 `?screen=` 으로 넘긴다 (이관이 끝나면 사라지는 임시 수단).
  { path: '/app', name: 'app-shell', component: () => import('@/views/AppShellView.vue') },

  // 모르는 경로는 셸로 보낸다. catch-all 이라 **항상 배열 마지막**이어야 한다.
  // `params: {}` 를 명시하는 이유: 생략하면 catch-all 이 물고 있는 `pathMatch` 파라미터가
  // 그대로 딸려가 "Discarded invalid param(s)" 경고가 콘솔에 찍힌다.
  { path: '/:pathMatch(.*)*', redirect: () => ({ name: 'app-shell', params: {} }) },
]
