<script setup>
import { useRouter } from 'vue-router'
import PinPad from '@/components/PinPad.vue'
import { useSignupStore } from '@/stores/signupStore'

const router = useRouter()
const signupStore = useSignupStore()

function handleComplete(pin) {
  signupStore.setRegisteredPin(pin)
  router.push({ name: 'pin-confirm' })
}
</script>

<template>
  <PinPad
    title="결제 비밀번호 6자리를 등록해주세요"
    subtitle="보안을 위해 비밀번호를 노출하지 마세요"
    @complete="handleComplete"
  />
</template>
