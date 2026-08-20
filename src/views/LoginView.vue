<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PasswordEye from '@/components/PasswordEye.vue'
import titleImage from '@/assets/title.png'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const authStore = useAuthStore()
const { showToast } = useToast()

const id = ref('')
const password = ref('')
const passwordVisible = ref(false)

// 입력창 아래에 붙는 인라인 메시지. 백엔드 검증 실패(400)의 필드별 사유를 담는다.
const fieldErrors = ref({})

async function login() {
  // 이전 시도의 메시지를 남겨두면 어느 시도의 결과인지 헷갈린다.
  fieldErrors.value = {}

  try {
    await authStore.login({ loginId: id.value, password: password.value })
    // 로그인 첫 화면은 결제다 (#226). `home` 은 매장 검색 화면이라 앱을 열자마자
    // 검색부터 하게 됐다. 하단 탭에서도 결제가 가운데 서 있는 기본 자리다.
    router.push({ name: 'payment' })
  } catch (error) {
    // 검증 실패는 토스트로 띄우지 않는다. 어느 입력창이 문제인지 알려주지 못한다.
    if (error.code === 'INVALID_INPUT_VALUE') {
      fieldErrors.value = {
        loginId: error.reasonFor('loginId'),
        password: error.reasonFor('password'),
      }
      return
    }

    // 아이디·비밀번호 불일치(401 INVALID_CREDENTIALS)는 특정 입력창의 문제가 아니라
    // 조합의 문제다. 백엔드 message 를 그대로 보여준다.
    // 응답 자체가 없는 네트워크 오류면 백엔드 message 도 없으므로 문구를 통일한다.
    showToast(error.status ? error.message : '일시적인 오류가 발생했어요')
  }
}

function goToSignUp() {
  router.push({ name: 'signup' })
}
</script>

<template>
  <div class="screen login-screen">
    <div class="login-character">
      <img src="/pickpig-login.svg" alt="Pick Pig" />
    </div>

    <div class="brand-copy">
      <img :src="titleImage" class="brand-logo" alt="Pick pig" />
      <p>피그가 골라주는 카드, 픽피</p>
      <span></span>
    </div>

    <div class="login-form">
      <label class="field">
        <span>아이디</span>
        <div class="input-wrap">
          <AppIcon name="user" />
          <input v-model="id" placeholder="아이디를 입력하세요" />
        </div>
        <p v-if="fieldErrors.loginId" class="mt-1.5 text-[13px] text-danger">
          {{ fieldErrors.loginId }}
        </p>
      </label>

      <label class="field">
        <span>비밀번호</span>
        <div class="input-wrap">
          <AppIcon name="lock" />
          <input
            v-model="password"
            :type="passwordVisible ? 'text' : 'password'"
            placeholder="••••••••"
          />
          <PasswordEye :visible="passwordVisible" @toggle="passwordVisible = !passwordVisible" />
        </div>
        <p v-if="fieldErrors.password" class="mt-1.5 text-[13px] text-danger">
          {{ fieldErrors.password }}
        </p>
      </label>

      <button class="primary-button" type="button" :disabled="authStore.isLoading" @click="login()">
        {{ authStore.isLoading ? '로그인 중…' : '로그인' }}
      </button>

      <div class="login-links">
        <button type="button" @click="goToSignUp()">회원가입</button>
        <span></span>
        <button type="button">비밀번호 찾기</button>
      </div>
    </div>
  </div>
</template>
