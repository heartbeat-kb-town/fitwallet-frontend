<script setup>
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

defineEmits(['back', 'done'])
const agreed = ref(false)
</script>

<template>
  <div class="screen asset-screen">
    <header class="flow-header centered-title">
      <button type="button" aria-label="가입 완료로 돌아가기" @click="$emit('back')">
        <AppIcon name="back" :size="22" />
      </button>
      <h1>금융 자산 연결하기</h1>
      <span></span>
    </header>

    <div class="asset-content">
      <img src="/pickpig-login.svg" alt="픽피" />
      <h2>더 똑똑한 소비의 시작<br />금융 자산을 연결해 보세요</h2>
      <p>내 모든 카드 혜택과 소비 리포트를<br />한눈에 확인할 수 있습니다.</p>

      <div class="asset-types">
        <div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              stroke="#E6A800"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polyline
              points="9 22 9 12 15 12 15 22"
              stroke="#E6A800"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>은행</span>
        </div>
        <div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="4" width="22" height="16" rx="2" stroke="#E6A800" stroke-width="1.8" />
            <line x1="1" y1="10" x2="23" y2="10" stroke="#E6A800" stroke-width="1.8" />
          </svg>
          <span>카드</span>
        </div>
      </div>

      <section class="asset-terms">
        <button type="button" :class="{ agreed }" @click="agreed = !agreed">
          <span class="checkbox" :class="{ checked: agreed }">
            <svg v-if="agreed" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="#1A1A1A"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <b>전체 약관에 동의합니다</b>
        </button>
        <div class="terms-divider"></div>
        <div
          v-for="term in ['[필수] 개인정보 수집 및 이용 동의', '[필수] 마이데이터 서비스 이용약관']"
          :key="term"
          class="asset-term-row"
        >
          <span>{{ term }}</span>
          <AppIcon name="chevron" :size="14" />
        </div>
      </section>
    </div>

    <footer class="asset-footer">
      <button class="primary-button" type="button" @click="$emit('done')">연결하고 시작하기</button>
    </footer>
  </div>
</template>
