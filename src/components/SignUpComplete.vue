<script setup>
defineEmits(['connect'])
</script>

<template>
  <div class="screen complete-screen">
    <img src="/pickpig-login.svg" alt="픽피" />
    <h1>가입이 완료되었습니다!</h1>
    <p>픽피와 함께 나에게 맞는<br />카드 혜택을 누려보세요</p>
    <button class="primary-button" type="button" @click="$emit('connect')">내 자산 연결하기</button>
  </div>
</template>
