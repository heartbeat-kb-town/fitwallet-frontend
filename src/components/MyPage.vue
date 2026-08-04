<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import profileImage from '../assets/icons/pig-face.svg'
import PaymentPinChange from './PaymentPinChange.vue'
import { useAuthStore } from '@/stores/authStore'

defineEmits(['back', 'manage-cards'])

const router = useRouter()
const authStore = useAuthStore()

const showPinChange = ref(false)

function logout() {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <section class="my-page-screen">
    <header class="my-page-header">
      <button
        class="my-page-back"
        type="button"
        aria-label="홈으로 돌아가기"
        @click="$emit('back')"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 6L9 12L15 18"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <h1>마이페이지</h1>
    </header>

    <div class="my-page-content">
      <section class="my-profile-card">
        <div class="my-profile-image-wrap">
          <img :src="profileImage" alt="김지연 프로필" />
          <span class="my-profile-badge" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M5 1L6.12 3.59L9 3.82L7 5.61L7.63 8.5L5 6.97L2.37 8.5L3 5.61L1 3.82L3.88 3.59L5 1Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </div>
        <strong>김지연</strong>
      </section>

      <section class="my-settings">
        <h2>설정 및 관리</h2>
        <div class="my-settings-list">
          <button type="button" aria-label="결제 비밀번호 변경" @click="showPinChange = true">
            <span>결제 비밀번호 변경</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 6L15 12L9 18"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button type="button" @click="$emit('manage-cards')">
            <span>내 카드 관리</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 6L15 12L9 18"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </section>

      <button class="my-logout" type="button" @click="logout()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M16 17L21 12L16 7"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <path
            d="M9 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H9"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        <span>로그아웃</span>
      </button>
    </div>

    <PaymentPinChange v-if="showPinChange" @done="showPinChange = false" />
  </section>
</template>
