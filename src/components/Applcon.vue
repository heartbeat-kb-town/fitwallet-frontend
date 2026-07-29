<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 16 },
})
</script>

<template>
  <svg v-if="name === 'user'" :width="size" :height="size" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8" />
    <path
      d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
    />
  </svg>
  <svg v-else-if="name === 'lock'" :width="size" :height="size" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.8" />
    <path
      d="M7 11V7a5 5 0 0110 0v4"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
    />
  </svg>
  <svg v-else-if="name === 'phone'" :width="size" :height="size" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="1.8" />
    <circle cx="12" cy="17" r="1.2" fill="currentColor" />
  </svg>
  <svg v-else-if="name === 'back'" :width="size" :height="size" viewBox="0 0 24 24" fill="none">
    <path
      d="M15 6L9 12L15 18"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
  <svg v-else-if="name === 'chevron'" :width="size" :height="size" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 6L15 12L9 18"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
