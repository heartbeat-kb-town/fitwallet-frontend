<script setup>
import { ChevronLeft, Menu } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

defineProps({
  title: { type: String, default: '' },
})

const router = useRouter()
</script>

<template>
  <div class="flex h-full items-center">
    <button class="-ml-1 p-1" @click="router.back()">
      <ChevronLeft :size="24" />
    </button>
    <h1 class="flex-1 truncate text-center text-base font-semibold">{{ title }}</h1>
    <button class="-mr-1 p-1">
      <Menu :size="24" />
    </button>
  </div>
</template>
