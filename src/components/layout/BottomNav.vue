<script setup>
import { CreditCard, Home, TrendingUp, Wallet } from 'lucide-vue-next'
import { useRoute } from 'vue-router'

/**
 * 하단탭. 항상 동일 — 화면마다 새로 만들지 않는다.
 * 활성 탭은 현재 라우트의 name 으로 판단한다.
 * 검색·가맹점 리스트 화면처럼 '홈' 플로우에 속하지만 다른 name 을 쓰는 화면은
 * route.meta.activeTab 으로 강제 지정한다 (예: meta: { activeTab: 'home' }).
 */
const route = useRoute()

const tabs = [
  { name: 'home', label: '홈', icon: Home },
  { name: 'payment', label: '결제', icon: CreditCard },
  { name: 'card', label: '내 카드', icon: Wallet },
  { name: 'report', label: '리포트', icon: TrendingUp },
]

const activeTab = () => route.meta.activeTab ?? route.name
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-[58px] max-w-[414px] items-center justify-around border-t border-gray-100 bg-white"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="flex flex-col items-center gap-1 text-xs"
      :class="activeTab() === tab.name ? 'font-semibold text-amber-500' : 'text-gray-400'"
    >
      <component :is="tab.icon" :size="22" />
      {{ tab.label }}
    </RouterLink>
  </nav>
</template>
