<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import profileImage from '@/assets/icons/pig-face.svg'
import PaymentPinChange from '@/components/PaymentPinChange.vue'

const route = useRoute()
const router = useRouter()

const showPinChange = ref(false)

// 마이페이지는 홈·가맹점·결제·내카드·리포트 다섯 곳에서 열린다.
// 셸이 `previousScreen` 으로 기억하던 값을 이관 중에는 `from` query 로 넘긴다.
//
// `router.back()` 은 아직 쓸 수 없다. 셸 안에서 화면을 바꾸는 것은 히스토리 항목을
// 만들지 않아서, `/app` 으로 돌아가면 셸이 기본값인 홈으로 리셋된다.
// 돌아갈 다섯 화면이 전부 라우트가 되면 `from` 을 버리고 `router.back()` 으로 바꾼다.
function goBack() {
  const from = typeof route.query.from === 'string' ? route.query.from : 'home'
  router.push({ name: 'app-shell', query: { screen: from } })
}

// 내 카드 관리는 아직 셸에 있다 (#39 로 순차 이관 중).
// `from` 을 그대로 딸려 보낸다. 카드 관리에서 뒤로 누르면 마이페이지로 돌아오는데,
// 그때도 원래 온 곳(홈·결제 …)을 잃지 않아야 기존 동작과 같다.
function goToCardManagement() {
  router.push({
    name: 'app-shell',
    query: { screen: 'card-management', from: route.query.from },
  })
}
</script>

<template>
  <section class="my-page-screen">
    <header class="my-page-header">
      <button class="my-page-back" type="button" aria-label="홈으로 돌아가기" @click="goBack()">
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
          <button type="button" @click="goToCardManagement()">
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

      <button class="my-logout" type="button" aria-disabled="true">
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
