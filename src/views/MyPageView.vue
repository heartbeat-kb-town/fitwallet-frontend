<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import profileImage from '@/assets/icons/pig-face.svg'
import PaymentPinChange from '@/components/PaymentPinChange.vue'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const showPinChange = ref(false)

// 마이페이지는 홈·가맹점·결제·내카드·리포트 다섯 곳에서 열린다.
// 여는 쪽이 **돌아올 주소 전체**를 `returnTo` 로 넘긴다.
//
// 화면 이름(`from=merchants`)으로는 부족하다. 가맹점으로 돌아가려면 검색 조건
// (`?query=스타벅스`)까지 알아야 하고, 이관이 끝난 화면은 셸에 있지도 않다. (#61)
//
// `router.back()` 은 아직 쓸 수 없다. 셸 안에서 화면을 바꾸는 것은 히스토리 항목을
// 만들지 않아서, `/app` 으로 돌아가면 셸이 기본값인 홈으로 리셋된다.
// 남은 화면이 전부 라우트가 되면 `returnTo` 를 버리고 `router.back()` 으로 바꾼다.
function goBack() {
  const returnTo = typeof route.query.returnTo === 'string' ? route.query.returnTo : ''
  if (!returnTo) {
    router.push({ name: 'app-shell' })
    return
  }
  const target = router.resolve(returnTo)
  router.push({ path: target.path, query: target.query })
}

// `returnTo` 를 그대로 딸려 보낸다. 카드 관리에서 뒤로 누르면 마이페이지로 돌아오는데,
// 그때도 원래 온 곳을 잃지 않아야 기존 동작과 같다.
function goToCardManagement() {
  router.push({ name: 'card-management', query: { returnTo: route.query.returnTo } })
}

// TODO: 백엔드에 /logout 이 없다. 지금은 클라이언트 토큰만 비우므로
// 서버가 발급한 refreshToken 쿠키는 살아 있다 (Max-Age 14일).
// 엔드포인트가 생기면 서버에도 알려 쿠키까지 만료시킨다.
function logout() {
  authStore.logout()
  router.push({ name: 'login' })
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
