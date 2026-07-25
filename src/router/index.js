import { createRouter, createWebHistory } from 'vue-router'

import DefaultLayout from '@/layouts/DefaultLayout.vue'

/**
 * meta.header 로 상단바 종류를 지정한다 (AppHeader 참고).
 * meta.activeTab 은 하단탭 활성 표시를 다른 이름으로 강제할 때만 쓴다
 * (예: 검색·가맹점 리스트는 '홈' 플로우라 하단탭은 '홈'이 계속 켜져 있어야 함).
 *
 * 하단탭 화면(내 카드·리포트 등)에서 "상세보기"로 들어가는 세부 화면은
 * 아래처럼 type: 'default' (뒤로가기 + 가운데 제목 + 햄버거 메뉴, 밑줄 있음)를 쓴다.
 * 이 라우트 객체를 그대로 복사해서 path·name·component·title만 바꾸면 된다.
 *
 *   {
 *     path: 'card/:cardId/transactions',
 *     name: 'card-transactions',
 *     component: () => import('@/pages/CardTransactionsPage.vue'),
 *     meta: { header: { type: 'default', title: '카드별 세부 결제내역' } },
 *   },
 */
const routes = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/HomePage.vue'),
        meta: { header: { type: 'home' } },
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/pages/SearchPage.vue'),
        meta: { header: { type: 'search' }, activeTab: 'home' },
      },
      {
        path: 'payment',
        name: 'payment',
        component: () => import('@/pages/PaymentPage.vue'),
        meta: { header: { type: 'plain', title: '결제' } },
      },
      {
        path: 'card',
        name: 'card',
        component: () => import('@/pages/CardPage.vue'),
        meta: { header: { type: 'plain', title: '내 카드' } },
      },
      {
        path: 'report',
        name: 'report',
        component: () => import('@/pages/ReportPage.vue'),
        // 리포트 안에서 '받은 혜택'/'놓친 혜택' 등을 눌러 들어가는 세부 화면은
        // type: 'default' (뒤로가기 + 가운데 제목)를 쓴다. 라우트 추가 시 참고.
        meta: { header: { type: 'plain', title: '혜택 리포트' } },
      },
      {
        // :type 이 카테고리 key (예: mart, cafe) — 제목·아이콘은 constants/categories.js 에서 자동으로 찾는다.
        path: 'category/:type',
        name: 'category',
        component: () => import('@/pages/CategoryListPage.vue'),
        meta: { header: { type: 'category' }, activeTab: 'home' },
      },
    ],
  },

  // 없는 경로 → 홈
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
