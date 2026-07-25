<script setup>
import { ChevronLeft, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const model = defineModel({ type: String, default: '' })

const router = useRouter()
</script>

<template>
  <div class="flex h-full items-center gap-2">
    <button class="-ml-1 p-1" @click="router.back()">
      <ChevronLeft :size="24" />
    </button>
    <div class="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
      <Search :size="18" class="text-gray-400" />
      <input
        v-model="model"
        type="text"
        placeholder="검색어를 입력하세요"
        class="flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  </div>
</template>
