<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PasswordEye from '@/components/PasswordEye.vue'
import titleImage from '@/assets/title.png'

const router = useRouter()

const id = ref('')
const password = ref('')
const passwordVisible = ref(false)

// TODO(#27): 실제 로그인 연동은 authStore + userApi 가 붙을 때 처리한다.
//            지금은 기존 프로토타입과 동일하게 입력값 검증 없이 홈으로 보낸다.
function login() {
  router.push({ name: 'app-shell' })
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
      </label>

      <button class="primary-button" type="button" @click="login()">로그인</button>

      <div class="social-divider">
        <span></span>
        <p>또는 소셜 계정으로 로그인</p>
        <span></span>
      </div>

      <button class="kakao-button" type="button" @click="login()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3C6.48 3 2 6.69 2 11.25c0 2.91 1.87 5.47 4.69 6.94L5.5 21l4.13-2.13c.77.11 1.56.17 2.37.17 5.52 0 10-3.69 10-8.25S17.52 3 12 3z"
            fill="#1A1A1A"
          />
        </svg>
        카카오로 로그인하기
      </button>

      <div class="login-links">
        <button type="button" @click="goToSignUp()">회원가입</button>
        <span></span>
        <button type="button">비밀번호 찾기</button>
      </div>
    </div>
  </div>
</template>
