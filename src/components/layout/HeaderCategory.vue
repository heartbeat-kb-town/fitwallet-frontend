<script setup>
import { ChevronDown, ChevronLeft, Menu } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

defineProps({
  title: { type: String, default: '' },
  // 카테고리 아이콘 컴포넌트 (예: lucide-vue-next 의 ShoppingCart). route.meta.header.icon 으로 전달.
  icon: { type: [Object, Function], default: null },
})

const router = useRouter()

// TODO: 실제 위치·정렬 기준 선택 기능(바텀시트 등)이 붙으면 이 버튼에 연결한다.
</script>

<template>
  <div class="flex h-full flex-col gap-0.5 pt-3">
    <div class="flex items-center gap-2">
      <button class="-ml-1 p-1" @click="router.back()">
        <ChevronLeft :size="24" />
      </button>
      <component :is="icon" v-if="icon" :size="20" class="text-amber-500" />
      <h1 class="text-base font-semibold">{{ title }}</h1>
      <button class="ml-auto p-1">
        <Menu :size="24" />
      </button>
    </div>

    <button type="button" class="flex items-center gap-1 pl-9 text-xs text-gray-400">
      <ChevronDown :size="14" />
      현재 위치 기준 · 거리순
    </button>
  </div>
</template>
