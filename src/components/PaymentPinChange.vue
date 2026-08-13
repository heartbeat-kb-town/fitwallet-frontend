<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as userApi from '@/api/userApi'
import { useAsyncState } from '@/composables/useAsyncState'
import { useToast } from '@/composables/useToast'

const emit = defineEmits(['done'])

const router = useRouter()
const { showToast } = useToast()

const PIN_LENGTH = 6

// 입력 순서다. 되돌릴 때 "여기부터 뒤" 를 지우는 기준으로도 쓴다.
//
// 현재 PIN 을 먼저 받는 이유는 백엔드가 요구해서다 — `PATCH /user/payment-pin` 은
// currentPin 으로 본인 확인을 대신한다. 새 PIN 만 받아서는 요청을 만들 수 없다.
const PHASES = ['current', 'new', 'confirm']

const TITLES = {
  current: '현재 결제 비밀번호 6자리를 입력해주세요',
  new: '새 결제 비밀번호 6자리를 입력해주세요',
  confirm: '새 결제 비밀번호 6자리를 확인해주세요',
}

const phase = ref('current')
const pins = reactive({ current: '', new: '', confirm: '' })
const isMounted = ref(false)
const errorMessage = ref('')
const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '완료']

// 완료 화면(`phase === 'done'`)에는 대응하는 칸이 없다. 템플릿이 v-else 안에서만 읽지만
// 전환 순간에도 평가되므로 빈 문자열로 떨어뜨린다.
const enteredPin = computed(() => pins[phase.value] ?? '')

const { isLoading: isSubmitting, execute: submitPinChange } = useAsyncState(userApi.patchPaymentPin)

onMounted(() => {
  requestAnimationFrame(() => {
    isMounted.value = true
  })
})

/**
 * `target` 단계로 되돌리고 그 단계부터 뒤의 입력을 전부 지운다.
 *
 * 앞 단계로 돌아가면서 뒷 입력을 남겨두면, 사용자가 다시 진행할 때 이미 채워진 칸을
 * 지나치게 되어 무엇이 서버로 나가는지 알 수 없어진다.
 */
function resetTo(target, message = '') {
  PHASES.slice(PHASES.indexOf(target)).forEach((name) => {
    pins[name] = ''
  })
  phase.value = target
  errorMessage.value = message
}

/**
 * 세 값을 함께 보낸다.
 *
 * 백엔드도 새 PIN 과 확인값의 일치를 검사하지만(NEW_PAYMENT_PIN_CONFIRM_MISMATCH),
 * 다른 것이 뻔한 요청을 왕복시킬 이유가 없어 호출 전에 먼저 걸러낸다.
 */
async function submit() {
  try {
    await submitPinChange({
      currentPin: pins.current,
      newPin: pins.new,
      newPinConfirm: pins.confirm,
    })
    phase.value = 'done'
  } catch (error) {
    // 틀린 값을 받은 단계로 되돌린다. 문구는 백엔드 message 를 그대로 쓴다.
    // 이 화면의 입력창은 키패드 하나뿐이라, 검증 실패를 토스트로 띄우면
    // 사용자가 어느 단계를 다시 눌러야 하는지 알 수 없다.
    if (error.code === 'INVALID_CURRENT_PAYMENT_PIN') {
      resetTo('current', error.message)
      return
    }

    if (error.code === 'NEW_PAYMENT_PIN_CONFIRM_MISMATCH') {
      resetTo('new', error.message)
      return
    }

    // 여기 401 은 전부 세션 만료다. 변경 API 에는 비즈니스 401 이 없다.
    // 인터셉터가 이미 토큰을 비웠으므로 PIN 을 다시 받아도 소용이 없다.
    if (error.status === 401) {
      resetTo('current')
      showToast('로그인이 만료됐어요. 다시 로그인해 주세요.')
      router.replace({ name: 'login' })
      return
    }

    const isUnexpected = !error.code || error.status >= 500
    if (isUnexpected) {
      resetTo('current')
      showToast('일시적인 오류가 발생했어요')
      return
    }

    resetTo('current', error.message)
  }
}

async function completePhase() {
  if (enteredPin.value.length !== PIN_LENGTH) return

  if (phase.value === 'current') {
    resetTo('new')
    return
  }

  if (phase.value === 'new') {
    resetTo('confirm')
    return
  }

  if (pins.new !== pins.confirm) {
    resetTo('confirm', '비밀번호가 일치하지 않습니다. 다시 입력해 주세요.')
    return
  }

  await submit()
}

function handleKey(key) {
  // 전송 중에는 입력을 받지 않는다. 완료를 두 번 누르면 같은 변경이 두 번 나간다.
  if (isSubmitting.value) return

  if (key === '←') {
    pins[phase.value] = enteredPin.value.slice(0, -1)
    errorMessage.value = ''
    return
  }

  if (key === '완료') {
    completePhase()
    return
  }

  if (enteredPin.value.length < PIN_LENGTH) {
    pins[phase.value] = enteredPin.value + key
    errorMessage.value = ''
  }
}

async function closeSheet() {
  // 전송 중에 닫으면 컴포넌트가 사라진 뒤 응답이 도착한다. 성공해도 사용자는 모른다.
  if (isSubmitting.value) return

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
    <button
      class="pin-change-scrim"
      type="button"
      aria-label="닫기"
      style="position: absolute; inset: 0; background: transparent"
      @click="closeSheet"
    ></button>

    <div class="pin-change-sheet" :class="{ mounted: isMounted }" :aria-busy="isSubmitting">
      <div class="pin-change-handle" aria-hidden="true"><span></span></div>

      <h2>{{ TITLES[phase] }}</h2>
      <p class="pin-change-subtitle">보안을 위해 비밀번호를 노출하지 마세요</p>

      <div class="pin-change-dots" aria-label="입력한 비밀번호 자리 수">
        <span
          v-for="index in PIN_LENGTH"
          :key="index"
          :class="{ filled: index <= enteredPin.length }"
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
          :disabled="isSubmitting"
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
    </div>
  </section>
</template>
