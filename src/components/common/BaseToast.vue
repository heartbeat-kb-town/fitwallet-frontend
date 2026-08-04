<script setup>
import { useToast } from '@/composables/useToast'

// 앱에 한 번만 놓는다. 지금은 App.vue 의 .phone 안에 있다.
// .phone 이 position: relative 이므로 absolute 가 폰 프레임 기준으로 잡힌다.
const { toasts, removeToast } = useToast()
</script>

<template>
  <div
    class="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-5"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <button
        v-for="toast in toasts"
        :key="toast.id"
        type="button"
        class="pointer-events-auto w-full rounded-2xl bg-ink/90 px-4 py-3 text-left text-[14px] text-white shadow-lg"
        @click="removeToast(toast.id)"
      >
        {{ toast.message }}
      </button>
    </TransitionGroup>
  </div>
</template>
