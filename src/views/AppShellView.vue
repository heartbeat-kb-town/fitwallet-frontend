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
const paymentCardId = ref('')
const paymentStore = ref('')
const paymentStartPhase = ref('cards')
const paymentReturnTo = ref('')
</script>

<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeScreen from '@/components/HomeScreen.vue'
import PaymentScreen from '@/components/PaymentScreen.vue'
import MyCardScreen from '@/components/MyCardScreen.vue'
import ReportScreen from '@/components/ReportScreen.vue'
import { useCardStore } from '@/stores/cardStore'

const route = useRoute()
const router = useRouter()
const cardStore = useCardStore()

// 카드 순서가 바뀌면 결제 화면에 미리 골라둔 카드가 무효가 된다.
// 원래 셸의 reorderCards()/setPrimaryCard() 가 갖고 있던 부수효과인데,
// cardStore 는 결제 도메인을 모르므로 여기서 잇는다.
// 결제 화면이 이관되면 그쪽 store 로 옮겨간다.
watch(
  () => cardStore.order,
  () => {
    paymentCardId.value = ''
  },
)

// 이관 중에만 쓰는 진입점. 라우팅된 화면이 셸 안의 특정 화면으로 들어올 때 쓴다.
// 이건 마운트마다 새로 읽어야 하므로 위와 달리 setup 안에 둔다.
// AppShellView 를 삭제할 때 함께 사라진다.
const screen = ref(typeof route.query.screen === 'string' ? route.query.screen : 'home')

const str = (value, fallback = '') => (typeof value === 'string' ? value : fallback)

// 가맹점 화면(이관 완료 #61)이 결제로 넘길 때 실어 보낸 값들.
// 원래 셸의 startRecommendedPayment() 가 ref 에 채우던 것이다.
if (screen.value === 'payment' && str(route.query.phase)) {
  paymentCardId.value = str(route.query.cardId)
  paymentStore.value = str(route.query.store)
  paymentStartPhase.value = str(route.query.phase, 'cards')
  paymentReturnTo.value = str(route.query.returnTo)
}

function openSearch() {
  router.push({ name: 'search' })
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

function openReport(cardId = '') {
  reportCardId.value = cardId
  screen.value = 'report'
}

// 홈의 카테고리 타일에서 가맹점 화면(라우트)으로.
function openMerchants(request) {
  router.push({
    name: 'merchants',
    query: {
      categoryId: request?.categoryId ?? 'cafe',
      title: request?.title ?? request?.query ?? '가맹점',
      query: request?.query ?? '',
    },
  })
}

// QR 결제에서 뒤로가기 → 결제했던 가게의 피그의 PICK 화면으로 복원합니다.
// 가맹점이 넘겨준 주소에 가게 이름만 얹어 되돌아간다.
function returnToMerchant() {
  const target = router.resolve(paymentReturnTo.value || { name: 'merchants' })
  router.push({ path: target.path, query: { ...target.query, store: paymentStore.value } })
}

function navigateTo(nextScreen) {
  if (nextScreen === 'payment') {
    paymentCardId.value = ''
    paymentStore.value = ''
    paymentStartPhase.value = 'cards'
  }
  screen.value = nextScreen
}
</script>

<template>
  <PaymentScreen
    v-if="screen === 'payment'"
    :cards="cardStore.cards"
    :initial-card-id="paymentCardId"
    :merchant-name="paymentStore"
    :start-phase="paymentStartPhase"
    @home="screen = 'home'"
    @mypage="openMyPage('payment')"
    @report="openReport()"
    @mycard="screen = 'mycard'"
    @merchant-back="returnToMerchant"
  />

  <MyCardScreen
    v-else-if="screen === 'mycard'"
    @home="screen = 'home'"
    @payment="screen = 'payment'"
    @mypage="openMyPage('mycard')"
    @report="openReport()"
  />

  <ReportScreen
    v-else-if="screen === 'report'"
    :key="`report-${reportCardId}`"
    :initial-card-id="reportCardId"
    @navigate="screen = $event"
    @mypage="openMyPage('report')"
  />

  <HomeScreen
    v-else
    @search="openSearch"
    @mypage="openMyPage('home')"
    @navigate="navigateTo"
    @report="openReport"
    @merchants="openMerchants"
  />
</template>
