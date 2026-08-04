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
// startRecommendedPayment 가 가맹점에서 받은 인덱스로 원본 목록을 참조한다.
// 정렬된 목록이 아니라 원본이다 — 기존 동작이라 그대로 둔다.
import { DEFAULT_CARDS } from '@/cardData'

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
const merchantEntry = ref('home')
const merchantRequest = ref({ categoryId: 'cafe', title: '카페/디저트', query: '' })
const paymentCardId = ref('')
const paymentStore = ref('')
const paymentStartPhase = ref('cards')
const merchantReturnStore = ref('')
</script>

<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HomeScreen from '@/components/HomeScreen.vue'
import PaymentScreen from '@/components/PaymentScreen.vue'
import MyCardScreen from '@/components/MyCardScreen.vue'
import ReportScreen from '@/components/ReportScreen.vue'
import MerchantFlow from '@/components/Merchantflow.vue'
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

// 검색 화면(이관 완료 #59)에서 들어오면 검색 조건이 query 에 실려 온다.
// 홈에서 들어올 때는 openMerchants() 가 직접 채운다.
if (screen.value === 'merchants' && typeof route.query.query === 'string') {
  merchantEntry.value = route.query.from === 'search' ? 'search' : 'home'
  merchantRequest.value = {
    categoryId: typeof route.query.categoryId === 'string' ? route.query.categoryId : 'cafe',
    title: typeof route.query.title === 'string' ? route.query.title : route.query.query,
    query: route.query.query,
  }
  merchantReturnStore.value = ''
}

function openSearch() {
  router.push({ name: 'search' })
}

// 가맹점에서 뒤로: 검색으로 들어왔으면 검색 화면(라우트)으로, 아니면 셸 안의 홈으로.
function backFromMerchants() {
  if (merchantEntry.value === 'search') openSearch()
  else screen.value = 'home'
}

// 마이페이지는 이관 완료(#52). 돌아올 화면은 `from` query 로 넘긴다.
// (셸 안의 화면 전환은 히스토리를 만들지 않아 router.back() 을 아직 쓸 수 없다)
function openMyPage(from) {
  router.push({ name: 'my-page', query: { from } })
}

function openReport(cardId = '') {
  reportCardId.value = cardId
  screen.value = 'report'
}

function openMerchants(request, from = 'home') {
  merchantEntry.value = from
  merchantRequest.value = {
    categoryId: request?.categoryId ?? 'cafe',
    title: request?.title ?? request?.query ?? '가맹점',
    query: request?.query ?? '',
  }
  // 새로 들어오는 가맹점 화면은 가게 목록부터 보여줍니다.
  merchantReturnStore.value = ''
  screen.value = 'merchants'
}

function returnToMerchant() {
  // QR 결제에서 뒤로가기 → 결제했던 가게의 피그의 PICK 화면으로 복원합니다.
  merchantReturnStore.value = paymentStore.value
  screen.value = 'merchants'
}

function startRecommendedPayment({ cardIndex, store }) {
  paymentCardId.value = DEFAULT_CARDS[cardIndex]?.id ?? ''
  paymentStore.value = store
  // 가맹점에서 비밀번호까지 입력했으므로 결제 화면은 QR 단계부터 시작합니다.
  paymentStartPhase.value = 'qr'
  screen.value = 'payment'
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
  <MerchantFlow
    v-if="screen === 'merchants'"
    :request="merchantRequest"
    :initial-store-name="merchantReturnStore"
    @back="backFromMerchants"
    @mypage="openMyPage('merchants')"
    @pay="startRecommendedPayment"
    @navigate="navigateTo"
  />

  <PaymentScreen
    v-else-if="screen === 'payment'"
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
    @merchants="openMerchants($event, 'home')"
  />
</template>
