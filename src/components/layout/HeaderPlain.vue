<script setup>
import { Menu } from 'lucide-vue-next'

// 뒤로가기 없이 왼쪽 정렬된 큰 제목 + 햄버거. 결제 등 하단탭 루트 화면에서 쓴다.
defineProps({
  title: { type: String, default: '' },
})
</script>

<template>
  <div class="flex h-full items-center justify-between">
    <h1 class="text-xl font-bold">{{ title }}</h1>
    <button class="p-1">
      <Menu :size="24" />
    </button>
  </div>
</template>
