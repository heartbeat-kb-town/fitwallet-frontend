/**
 * 라우트 정의.
 *
 * 화면을 `src/views/` 로 옮길 때마다 이 배열 **끝에 한 줄씩** 추가한다.
 * 중간에 끼워 넣거나 정렬하지 않는다 (2인 동시 작업 시 충돌을 막기 위함).
 *
 *   { path: '/home', name: 'home', component: () => import('@/views/HomeView.vue') },
 */

// 아직 `src/views/` 로 이관된 화면이 없다.
// 라우트가 하나도 없으면 vue-router 가 초기 위치를 매칭하지 못해 개발 콘솔에 경고를 남기므로,
// 첫 화면이 이관될 때까지 아무것도 그리지 않는 자리표시자로 모든 경로를 받아둔다.
// 그때까지 화면 렌더링은 `src/App.vue` 의 수동 스위처가 그대로 담당한다.
const placeholder = { render: () => null }

export const routes = [{ path: '/:pathMatch(.*)*', name: 'app-shell', component: placeholder }]
