<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PinPad from '@/components/PinPad.vue'
import * as userApi from '@/api/userApi'
import { useSignupStore } from '@/stores/signupStore'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const signupStore = useSignupStore()
const { showToast } = useToast()

const isSubmitting = ref(false)

/** 처음부터 다시 받는다. 확인만 다시 받으면 어느 쪽을 잘못 눌렀는지 알 수 없다. */
function restart(message) {
  signupStore.reset()
  showToast(message)
  router.replace({ name: 'pin-register' })
}

/**
 * 등록 화면에서 받은 PIN 과 이 화면에서 받은 PIN 을 함께 서버로 보낸다.
 *
 * 백엔드도 두 값의 일치를 검사하지만(PIN_CONFIRM_MISMATCH), 다른 것이 뻔한 요청을
 * 왕복시킬 이유가 없어 먼저 걸러낸다.
 */
async function handleComplete(enteredPin) {
  if (isSubmitting.value) return

  const registeredPin = signupStore.registeredPin

  if (enteredPin !== registeredPin) {
    restart('결제 비밀번호가 일치하지 않습니다. 다시 등록해 주세요.')
    return
  }

  isSubmitting.value = true

  try {
    await userApi.postPaymentPin({ pin: registeredPin, pinConfirm: enteredPin })
    signupStore.reset()
    router.push({ name: 'signup-complete' })
  } catch (error) {
    // 서버가 불일치로 판단한 경우도 사용자에게는 같은 상황이다.
    if (error.code === 'PIN_CONFIRM_MISMATCH') {
      restart(error.message)
      return
    }

    // 401 은 인터셉터가 이미 토큰을 비웠다. 여기서 PIN 만 다시 받아도 소용이 없다.
    if (error.status === 401) {
      signupStore.reset()
      showToast('로그인이 만료됐어요. 다시 로그인해 주세요.')
      router.replace({ name: 'login' })
      return
    }

    const isUnexpected = !error.code || error.status >= 500
    showToast(isUnexpected ? '일시적인 오류가 발생했어요' : error.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <PinPad
    title="결제 비밀번호 6자리를 확인해주세요"
    subtitle="보안을 위해 비밀번호를 노출하지 마세요"
    @complete="handleComplete"
  />
</template>
