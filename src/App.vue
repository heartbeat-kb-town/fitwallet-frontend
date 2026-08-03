<script setup>
import { computed, ref } from 'vue'
import LoginScreen from './components/LoginScreen.vue'
import SignUpScreen from './components/SignUpScreen.vue'
import PinPad from './components/PinPad.vue'
import SignUpComplete from './components/SignUpComplete.vue'
import AssetConnectScreen from './components/AssetConnectScreen.vue'
import HomeScreen from './components/HomeScreen.vue'
import SearchScreen from './components/SearchScreen.vue'
import MyPage from './components/MyPage.vue'
import PaymentScreen from './components/PaymentScreen.vue'
import MyCardScreen from './components/MyCardScreen.vue'
import ReportScreen from './components/ReportScreen.vue'
import MerchantFlow from './components/MerchantFlow.vue'
import CardManagement from './components/CardManagement.vue'
import { DEFAULT_CARDS } from './cardData'

const screen = ref('login')
const previousScreen = ref('home')
const registeredPin = ref('')
const confirmPin = ref('')
const reportCardId = ref('')
const merchantEntry = ref('home')
const merchantRequest = ref({ categoryId: 'cafe', title: '카페/디저트', query: '' })
const cardOrder = ref(DEFAULT_CARDS.map((card) => card.id))
const paymentCardId = ref('')
const paymentStore = ref('')
const paymentStartPhase = ref('cards')
const merchantReturnStore = ref('')
const orderedCards = computed(() =>
  cardOrder.value.map((id) => DEFAULT_CARDS.find((card) => card.id === id)).filter(Boolean),
)

function startPinRegistration() {
  registeredPin.value = ''
  confirmPin.value = ''
  screen.value = 'pin-register'
}

function finishPinRegistration(pin) {
  registeredPin.value = pin
  screen.value = 'pin-confirm'
}

function finishPinConfirmation(pin) {
  confirmPin.value = pin
  // TODO: registeredPin과 confirmPin이 다르면 다시 입력받는 로직을 나중에 추가하면 좋아요
  screen.value = 'complete'
}

function openMyPage(from) {
  previousScreen.value = from
  screen.value = 'mypage'
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

function openCardManagement() {
  screen.value = 'card-management'
}

function reorderCards(nextOrder) {
  cardOrder.value = [...nextOrder]
  paymentCardId.value = ''
}

function setPrimaryCard(cardId) {
  cardOrder.value = [cardId, ...cardOrder.value.filter((id) => id !== cardId)]
  paymentCardId.value = ''
}
</script>

<template>
  <main class="stage">
    <section class="phone">
      <LoginScreen v-if="screen === 'login'" @signup="screen = 'signup'" @login="screen = 'home'" />

      <SignUpScreen
        v-else-if="screen === 'signup'"
        @back="screen = 'login'"
        @submit="startPinRegistration"
      />

      <PinPad
        v-else-if="screen === 'pin-register'"
        key="pin-register"
        title="결제 비밀번호 6자리를 등록해주세요"
        subtitle="보안을 위해 비밀번호를 노출하지 마세요"
        @complete="finishPinRegistration"
      />

      <PinPad
        v-else-if="screen === 'pin-confirm'"
        key="pin-confirm"
        title="결제 비밀번호 6자리를 확인해주세요"
        subtitle="보안을 위해 비밀번호를 노출하지 마세요"
        @complete="finishPinConfirmation"
      />

      <SignUpComplete v-else-if="screen === 'complete'" @connect="screen = 'asset-connect'" />

      <AssetConnectScreen
        v-else-if="screen === 'asset-connect'"
        @back="screen = 'complete'"
        @done="screen = 'home'"
      />

      <HomeScreen
        v-else-if="screen === 'home'"
        @search="screen = 'search'"
        @mypage="openMyPage('home')"
        @navigate="navigateTo"
        @report="openReport"
        @merchants="openMerchants($event, 'home')"
      />

      <SearchScreen
        v-else-if="screen === 'search'"
        @back="screen = 'home'"
        @search="openMerchants($event, 'search')"
      />

      <MerchantFlow
        v-else-if="screen === 'merchants'"
        :request="merchantRequest"
        :initial-store-name="merchantReturnStore"
        @back="screen = merchantEntry"
        @mypage="openMyPage('merchants')"
        @pay="startRecommendedPayment"
        @navigate="navigateTo"
      />

      <PaymentScreen
        v-else-if="screen === 'payment'"
        :cards="orderedCards"
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

      <MyPage
        v-else-if="screen === 'mypage'"
        @back="screen = previousScreen"
        @manage-cards="openCardManagement"
      />

      <CardManagement
        v-else-if="screen === 'card-management'"
        :cards="orderedCards"
        @back="screen = 'mypage'"
        @reorder="reorderCards"
        @primary="setPrimaryCard"
      />
    </section>
  </main>
</template>
