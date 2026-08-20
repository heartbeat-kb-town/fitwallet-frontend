<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import * as cardApi from '@/api/cardApi'
import { useToast } from '@/composables/useToast'
import { useCardStore } from '@/stores/cardStore'

const router = useRouter()
const cardStore = useCardStore()
const { showToast } = useToast()

const agreed = ref(false)
const isConnecting = ref(false)

/**
 * 한 칸(`signup-complete`)이 아니라 회원가입까지 되돌린다.
 *
 * 가입 완료 화면은 자산 연결로 넘어가는 징검다리라, 거기로 돌아가도 할 수 있는 게
 * 자산 연결뿐이다.
 *
 * ⚠️ 여기 오는 시점에는 **가입이 끝나고 로그인까지 된 상태**다. 그래서 이 버튼은
 * 로그인한 사용자를 회원가입 화면에 데려다 놓는다. 로그인 상태에서 `signup` 진입을
 * 막을지는 별도로 본다 (#210).
 */
function goBack() {
  router.push({ name: 'signup' })
}

/**
 * 마이데이터 자산 연동.
 *
 * **연동에 성공하고 카드를 다시 받아온 뒤에 홈으로 넘어간다.** 먼저 넘어가면
 * 카드가 아직 없는 빈 홈을 한 번 보여주게 된다.
 *
 * 예전에는 서버를 부르지 않고 홈으로 넘어가기만 했다. 그래서 신규 가입자는
 * 카드가 하나도 없는 채로 시작했다 (#119).
 */
async function connect() {
  if (!agreed.value || isConnecting.value) return

  isConnecting.value = true

  try {
    await cardApi.postMyDataCards()

    // ensureCards() 가 아니라 fetchCards() 다. ensureCards 는 이미 카드가 있으면
    // 건너뛰는데, 여기서는 방금 늘어난 카드를 받아와야 한다.
    await cardStore.fetchCards()
    await cardStore.ensureCardImages()
  } catch (error) {
    // 화면에 머문다. 홈으로 보내면 왜 카드가 없는지 알 수 없다.
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
    return
  } finally {
    isConnecting.value = false
  }

  router.push({ name: 'home' })
}
</script>

<template>
  <div class="screen asset-screen">
    <header class="flow-header centered-title">
      <button type="button" aria-label="회원가입으로 돌아가기" @click="goBack()">
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
      <!--
        두 약관이 모두 [필수] 다. 마이데이터는 금융 데이터를 가져오는 동작이라
        동의 없이 요청을 보내면 안 된다.
      -->
      <button
        class="primary-button disabled:cursor-not-allowed disabled:opacity-45"
        type="button"
        :disabled="!agreed || isConnecting"
        @click="connect()"
      >
        {{ isConnecting ? '연결 중…' : '연결하고 시작하기' }}
      </button>
    </footer>
  </div>
</template>
