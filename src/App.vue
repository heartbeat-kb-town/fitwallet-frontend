<script setup>
import BaseToast from './components/common/BaseToast.vue'
</script>

<template>
  <main class="stage">
    <section class="phone">
      <RouterView />

      <!-- 앱에 한 번만 놓는다. 어느 화면에서든 useToast().showToast() 로 띄운다. -->
      <BaseToast />
    </section>
  </main>
</template>
