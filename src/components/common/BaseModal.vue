<script setup>
defineProps({
  isOpen: { type: Boolean, default: false },
  title: { type: String, default: '' },
  /** 딤 영역을 눌러 닫을 수 있는지. 결제처럼 실수로 닫히면 곤란한 곳은 false 로 둔다. */
  canCloseOnBackdrop: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])

function handleBackdrop(canClose) {
  if (canClose) emit('close')
}
</script>

<template>
  <!-- .phone 이 position: relative + overflow: hidden 이므로
       absolute inset-0 이면 폰 프레임 안에만 깔린다. 모바일 앱처럼 보인다. -->
  <div
    v-if="isOpen"
    class="absolute inset-0 z-40 flex items-end justify-center"
    role="dialog"
    aria-modal="true"
    :aria-label="title || undefined"
  >
    <div class="absolute inset-0 bg-ink/40" @click="handleBackdrop(canCloseOnBackdrop)" />

    <div class="relative w-full rounded-t-3xl bg-white px-5 pt-6 pb-8">
      <h2 v-if="title" class="mb-3 text-[17px] font-bold text-ink">{{ title }}</h2>

      <div class="text-[15px] text-sub">
        <slot />
      </div>

      <div v-if="$slots.footer" class="mt-6 flex gap-2">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
