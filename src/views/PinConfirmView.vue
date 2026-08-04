<script setup>
import { useRouter } from 'vue-router'
import PinPad from '@/components/PinPad.vue'
import { useSignupStore } from '@/stores/signupStore'

const router = useRouter()
const signupStore = useSignupStore()

// TODO: registeredPin과 입력한 pin이 다르면 다시 입력받는 로직을 나중에 추가하면 좋아요
//       (동작 변경이라 이관 PR 에서는 넣지 않았다 — #45)
function handleComplete() {
  signupStore.reset()
  router.push({ name: 'app-shell', query: { screen: 'complete' } })
}
</script>

<template>
  <PinPad
    title="결제 비밀번호 6자리를 확인해주세요"
    subtitle="보안을 위해 비밀번호를 노출하지 마세요"
    @complete="handleComplete"
  />
</template>
