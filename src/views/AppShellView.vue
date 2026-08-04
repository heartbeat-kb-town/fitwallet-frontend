<script>
/**
 * 이관용 임시 셸 (#39).
 *
 * 아직 `src/views/` 로 옮기지 않은 화면들을 담아두는 곳이다.
 * 원래 `App.vue` 에 있던 수동 스위처를 그대로 옮겨왔다.
 *
 * 화면을 하나 이관할 때마다 여기서 한 장씩 빠져나간다.
 * 마지막 화면이 나가면 **이 파일과 셸 라우트를 통째로 삭제한다.**
 *
 * 새 코드는 여기에 추가하지 않는다. 여기는 줄어들기만 하는 파일이다.
 */
import { ref } from 'vue'

/**
 * 화면 간에 공유하는 상태는 **모듈 스코프**에 둔다. setup 안이 아니다.
 *
 * 원래 이 값들은 `App.vue` 에 있어서 앱이 떠 있는 내내 살아 있었다.
 * 지금은 셸이 라우트라, 이관된 화면(`/my-page` 등)으로 나갔다 오면 컴포넌트가
 * 언마운트됐다가 새로 마운트된다. setup 안에 두면 그때마다 초기화된다.
 *
 * 그러면 이런 게 깨진다:
 *   - 카드 순서를 바꾸고 카드관리를 나가면 순서가 기본값으로 되돌아감
 *   - 가맹점 → 결제(QR) → 마이페이지 → 뒤로 가면 결제가 카드선택부터 다시 시작
 *
 * 각 화면이 이관되면서 자기 상태를 제대로 된 store 로 가져간다.
 * 마지막 화면이 나가면 이 블록도 파일과 함께 사라진다.
 */
const reportCardId = ref('')
</script>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import ReportScreen from '@/components/ReportScreen.vue'
import { usePaymentStore } from '@/stores/paymentStore'

const route = useRoute()
const router = useRouter()
const paymentStore = usePaymentStore()

// 이관 중에만 쓰는 진입점. 라우팅된 화면이 셸 안의 특정 화면으로 들어올 때 쓴다.
// 이건 마운트마다 새로 읽어야 하므로 위와 달리 setup 안에 둔다.
// AppShellView 를 삭제할 때 함께 사라진다.
const screen = ref(typeof route.query.screen === 'string' ? route.query.screen : 'home')

// 셸에 남은 화면(리포트)이 아니면 홈으로 보낸다.
// `/app` 라우트의 beforeEnter 는 같은 라우트 안에서 query 만 바뀔 때는 실행되지 않아서,
// 여기서 한 번 더 막는다. (셸이 삭제되면 함께 사라진다)
if (screen.value !== 'report') {
  router.replace({ name: 'home' })
}

// 홈(이관 완료 #64)이 혜택 카드에서 리포트를 열 때 실어 보낸 값.
if (screen.value === 'report') {
  reportCardId.value = typeof route.query.cardId === 'string' ? route.query.cardId : ''
}

function goHome() {
  router.push({ name: 'home' })
}

// 마이페이지는 이관 완료(#52). 돌아올 **주소**를 통째로 넘긴다 (#61).
// (셸 안의 화면 전환은 히스토리를 만들지 않아 router.back() 을 아직 쓸 수 없다)
function openMyPage(screenName) {
  router.push({
    name: 'my-page',
    query: {
      returnTo: router.resolve({ name: 'app-shell', query: { screen: screenName } }).fullPath,
    },
  })
}

// 결제 탭으로 들어가면 카드 선택부터 시작한다 (기존 초기화 동작).
function openPayment() {
  paymentStore.reset()
  router.push({ name: 'payment' })
}

// 리포트 화면의 하단 탭. 이제 전부 라우트다.
function navigateTo(nextScreen) {
  if (nextScreen === 'payment') return openPayment()
  if (nextScreen === 'mycard') return router.push({ name: 'my-card' })
  goHome()
}
</script>

<template>
  <ReportScreen
    v-if="screen === 'report'"
    :key="`report-${reportCardId}`"
    :initial-card-id="reportCardId"
    @navigate="navigateTo"
    @mypage="openMyPage('report')"
  />
</template>
