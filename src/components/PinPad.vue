<script setup>
import { ref } from 'vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
})

const emit = defineEmits(['complete'])
const pin = ref('')
const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '완료']

function handleKey(key) {
  if (key === '←') {
    pin.value = pin.value.slice(0, -1)
    return
  }

  if (key === '완료') {
    if (pin.value.length === 6) emit('complete', pin.value)
    return
  }

  if (pin.value.length < 6) pin.value += key
}
</script>

<template>
  <div class="screen pin-screen">
    <section class="pin-sheet">
      <div class="sheet-handle"><span></span></div>
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>

      <div class="pin-dots">
        <span v-for="index in 6" :key="index" :class="{ filled: index <= pin.length }"></span>
      </div>

      <div class="keypad">
        <button
          v-for="key in keys"
          :key="key"
          type="button"
          :class="{ complete: key === '완료', backspace: key === '←' }"
          @click="handleKey(key)"
        >
          <svg v-if="key === '←'" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12H7M7 12L13 6M7 12L13 18"
              stroke="#1A1A1A"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M3 6L3 18" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" />
          </svg>
          <template v-else>{{ key }}</template>
        </button>
      </div>
    </section>
  </div>
</template>
