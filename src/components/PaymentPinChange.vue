<script setup>
import { nextTick, onMounted, ref } from 'vue'

const emit = defineEmits(['done'])

const phase = ref('register')
const pin = ref('')
const pinConfirm = ref('')
const isMounted = ref(false)
const errorMessage = ref('')
const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '완료']

const currentPin = () => (phase.value === 'register' ? pin.value : pinConfirm.value)

onMounted(() => {
  requestAnimationFrame(() => {
    isMounted.value = true
  })
})

function setCurrentPin(value) {
  if (phase.value === 'register') pin.value = value
  else pinConfirm.value = value
}

function completePhase() {
  if (currentPin().length !== 6) return

  if (phase.value === 'register') {
    phase.value = 'confirm'
    errorMessage.value = ''
    return
  }

  if (pin.value !== pinConfirm.value) {
    pinConfirm.value = ''
    errorMessage.value = '비밀번호가 일치하지 않습니다. 다시 입력해 주세요.'
    return
  }

  phase.value = 'done'
}

function handleKey(key) {
  if (key === '←') {
    setCurrentPin(currentPin().slice(0, -1))
    errorMessage.value = ''
    return
  }

  if (key === '완료') {
    completePhase()
    return
  }

  if (currentPin().length < 6) {
    setCurrentPin(currentPin() + key)
    errorMessage.value = ''
  }
}

async function closeSheet() {
  isMounted.value = false
  await nextTick()
  window.setTimeout(() => emit('done'), 280)
}
</script>

<template>
  <section v-if="phase === 'done'" class="pin-change-complete" aria-live="polite">
    <div class="pin-change-check" aria-hidden="true">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 6L9 17L4 12"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <h2>비밀번호가 변경되었습니다</h2>
    <p>새 결제 비밀번호가 안전하게 저장되었습니다.</p>
    <button type="button" @click="$emit('done')">확인</button>
  </section>

  <section v-else class="pin-change-overlay" aria-modal="true" role="dialog">
    <div class="pin-change-sheet" :class="{ mounted: isMounted }">
      <div class="pin-change-handle" aria-hidden="true"><span></span></div>

      <h2>
        {{
          phase === 'register'
            ? '결제 비밀번호 6자리를 등록해주세요'
            : '결제 비밀번호 6자리를 확인해주세요'
        }}
      </h2>
      <p class="pin-change-subtitle">보안을 위해 비밀번호를 노출하지 마세요</p>

      <div class="pin-change-dots" aria-label="입력한 비밀번호 자리 수">
        <span
          v-for="index in 6"
          :key="index"
          :class="{ filled: index <= currentPin().length }"
        ></span>
      </div>

      <p v-if="errorMessage" class="pin-change-error" role="alert">{{ errorMessage }}</p>

      <div class="pin-change-keypad">
        <button
          v-for="key in keys"
          :key="key"
          type="button"
          :class="{ complete: key === '완료', backspace: key === '←' }"
          :aria-label="key === '←' ? '한 자리 지우기' : undefined"
          @click="handleKey(key)"
        >
          <svg v-if="key === '←'" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12H7M7 12L13 6M7 12L13 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M3 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <template v-else>{{ key }}</template>
        </button>
      </div>

      <button class="pin-change-cancel" type="button" @click="closeSheet">취소</button>
    </div>
  </section>
</template>
