<script setup>
import { RouterView } from 'vue-router'

import AppHeader from '@/components/layout/AppHeader.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import { HEADER_LAYOUT } from '@/components/layout/headerLayout'
</script>

<template>
  <div class="mx-auto min-h-screen max-w-[414px] bg-white shadow-xl">
    <AppHeader />

    <!-- 상단바(68px)·하단탭(58px)에 가리지 않게 여백 -->
    <main class="min-h-screen pb-[58px]" :class="HEADER_LAYOUT.paddingTop">
      <RouterView />
    </main>

    <BottomNav />
  </div>
</template>
