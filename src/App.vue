<script setup>
import { ref } from 'vue'
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
import MerchantFlow from './components/Merchantflow.vue'

const screen = ref('login')
const previousScreen = ref('home')
const registeredPin = ref('')
const confirmPin = ref('')
const reportCardId = ref('')
const merchantEntry = ref('home')
const merchantRequest = ref({ categoryId: 'cafe', title: '카페/디저트', query: '' })
const paymentCardIndex = ref(0)
const paymentStore = ref('')

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
  screen.value = 'merchants'
}

function startRecommendedPayment({ cardIndex, store }) {
  paymentCardIndex.value = cardIndex
  paymentStore.value = store
  screen.value = 'payment'
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
        @navigate="screen = $event"
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
        @back="screen = merchantEntry"
        @mypage="openMyPage('merchants')"
        @pay="startRecommendedPayment"
        @navigate="screen = $event"
      />

      <PaymentScreen
        v-else-if="screen === 'payment'"
        :initial-card-index="paymentCardIndex"
        :merchant-name="paymentStore"
        @home="screen = 'home'"
        @mypage="openMyPage('payment')"
        @report="openReport()"
        @mycard="screen = 'mycard'"
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

      <MyPage v-else-if="screen === 'mypage'" @back="screen = previousScreen" />
    </section>
  </main>
</template>
