<script setup>
import { ref } from 'vue'
import LoginScreen from './components/LoginScreen.vue'
import SignUpScreen from './components/SignUpScreen.vue'
import PinPad from './components/PinPad.vue'
import SignUpComplete from './components/SignUpComplete.vue'
import AssetConnectScreen from './components/AssetConnectScreen.vue'
import HomeScreen from './components/HomeScreen.vue'

const screen = ref('login')
const registeredPin = ref('')
const confirmPin = ref('')

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
        title="결제 비밀번호 6자리를 등록해주세요"
        subtitle="보안을 위해 비밀번호를 노출하지 마세요"
        @complete="finishPinRegistration"
      />

      <PinPad
        v-else-if="screen === 'pin-confirm'"
        title="결제 비밀번호 6자리를 확인해주세요"
        subtitle="보안을 위해 비밀번호를 노출하지 마세요"
        @complete="finishPinConfirmation"
      />

      <SignUpComplete
        v-else-if="screen === 'complete'"
        @connect="screen = 'asset-connect'"
        @skip="screen = 'home'"
      />

      <AssetConnectScreen
        v-else-if="screen === 'asset-connect'"
        @back="screen = 'complete'"
        @done="screen = 'home'"
      />

      <HomeScreen v-else-if="screen === 'home'" />
    </section>
  </main>
</template>
