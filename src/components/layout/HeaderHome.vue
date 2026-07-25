<script setup>
import { Menu } from 'lucide-vue-next'

// TODO: authStore 연동되면 실제 로그인 사용자 이름으로 교체
defineProps({
  greeting: { type: String, default: '안녕하세요' },
  userName: { type: String, default: '회원님' },
})
</script>

<template>
  <div class="flex h-full items-center justify-between">
    <div class="flex items-center gap-2">
      <!-- 아바타 자리. 실제 캐릭터/프로필 이미지는 디자인 에셋 확정 후 교체 -->
      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-lg">
        🐷
      </div>
      <div>
        <p class="text-xs text-gray-500">{{ greeting }}</p>
        <p class="text-base font-bold">{{ userName }}</p>
      </div>
    </div>
    <button class="p-1">
      <Menu :size="24" />
    </button>
  </div>
</template>
