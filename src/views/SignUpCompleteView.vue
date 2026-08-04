<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// 내 자산 연결 화면은 아직 셸에 있다 (#39 로 순차 이관 중).
// AssetConnectView 가 생기면 이 줄이 name: 'asset-connect' 로 바뀐다.
function goToAssetConnect() {
  router.push({ name: 'app-shell', query: { screen: 'asset-connect' } })
}
</script>

<template>
  <div class="screen complete-screen">
    <img src="/pickpig-login.svg" alt="픽피" />
    <h1>가입이 완료되었습니다!</h1>
    <p>픽피와 함께 나에게 맞는<br />카드 혜택을 누려보세요</p>
    <button class="primary-button" type="button" @click="goToAssetConnect()">
      내 자산 연결하기
    </button>
  </div>
</template>
