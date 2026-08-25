<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, Info, X } from 'lucide-vue-next'
import pigPickCard from '@/assets/icons/pig-pickcard.svg'
import iconHome from '@/assets/icons/home.svg'
import iconSearchTab from '@/assets/icons/search-tab.svg'
import iconMycard from '@/assets/icons/mycard.svg'
import iconReport from '@/assets/icons/report.svg'
import { usePaymentStore } from '@/stores/paymentStore'

/**
 * 결제 금액 입력 (#144).
 *
 * 가맹점을 고른 뒤 피그의 PICK 으로 가기 전에 결제 예정 금액을 물어본다.
 * 백엔드 `GET /benefit/expected` 의 `amount` 가 선택 파라미터라, 금액을 주면
 * 할인율·적립을 금액 기준으로 환산한 기대혜택액이 함께 온다. 안 주면 계산하지 않는다.
 *
 * 피그마의 `결제 금액 입력1` 과 `결제 금액 입력2` 는 **한 화면의 두 상태**다.
 * 2번은 1번에서 `예` 를 누른 모습이고 머리·일러스트·문구가 전부 같다.
 * 그래서 라우트를 둘로 나누지 않고 `wantsAmount` 하나로 가른다.
 */
const route = useRoute()
const router = useRouter()
const paymentStore = usePaymentStore()

const str = (value, fallback = '') => (typeof value === 'string' ? value : fallback)

// 어느 가맹점인지는 URL 이 정한다. 이 화면은 목록을 다시 부르지 않는다.
const storeId = computed(() => str(route.query.storeId))
const storeName = computed(() => str(route.query.store))

/**
 * 금액을 넣은 뒤 **PICK 을 그릴 주소.**
 *
 * 검색 조건(카테고리·검색어)이 통째로 들어 있어야 같은 목록 위에서 PICK 이 뜬다.
 * 없으면 가맹점 화면 기본값으로 떨어진다.
 *
 * ⚠️ 이름과 달리 "뒤로 가기 주소" 가 아니다. `goToPick` 이 여기에
 * `store` · `storeId` · `amount` 를 실어 보내고 `MerchantFlowView` 가 그 쿼리로 PICK 을
 * 복원한다. 뒤로 갈 곳은 아래 `backTo` 가 따로 정한다.
 */
const returnTo = computed(() => str(route.query.returnTo))

/**
 * 뒤로 갈 주소. **들어온 화면으로 돌려보낸다.**
 *
 * 가맹점 목록에서 가게를 골라 들어왔으면 그 목록으로 돌아가는 것이 맞지만, 홈의
 * `자주 찾는 장소` 에서 들어왔으면 홈으로 돌아가야 한다 (#194). 앞으로 갈 곳(`returnTo`)과
 * 뒤로 갈 곳이 늘 같지는 않아서 값을 따로 받는다.
 *
 * 없으면 예전처럼 `returnTo` 로 떨어진다 — 가맹점 화면에서 들어오는 기존 경로는
 * 이 값을 보내지 않고, 그때는 두 곳이 같아서 문제가 없다.
 */
const backTo = computed(() => str(route.query.backTo) || returnTo.value)

/**
 * 예 / 아니요 버튼의 테두리·배경.
 *
 * Tailwind 유틸리티로는 안 된다 — `style.css` 의 `button { border: 0 }` 이 레이어 밖이라
 * `@layer utilities` 를 이긴다. 같은 이유로 이 화면의 다른 곳(`PICK_STATUS_STYLE` 등)도
 * 인라인으로 덮고 있다. 색은 하드코딩하지 않고 `@theme` 토큰을 그대로 읽는다.
 */
const CHOICE_STYLE = {
  border: '1px solid var(--color-line)',
  background: 'transparent',
}
const CHOICE_SELECTED_STYLE = {
  border: '1px solid var(--color-primary)',
  background: 'var(--color-primary)',
}

/**
 * 금액 입력창. 같은 이유로 테두리를 인라인으로 준다.
 *
 * `input` 은 `style.css` 가 테두리를 지우지 않아 **브라우저 기본 테두리가 그대로 남는다**
 * (Preflight 를 빼둔 탓이다). 바깥 칸이 이미 테두리를 그리므로 안쪽은 지운다.
 */
const AMOUNT_FIELD_STYLE = { border: '1px solid var(--color-primary)' }
const AMOUNT_INPUT_STYLE = { border: 0, outline: 'none', background: 'transparent' }

/** 추천 받으러 가기. 배경이 UA 기본 회색으로 남지 않도록 함께 인라인으로 준다. */
const SUBMIT_STYLE = { border: 0, background: 'var(--color-primary)' }

const wantsAmount = ref(false)
const amount = ref('')

/** 숫자만 남긴다. 백엔드가 숫자 문자열을 기대하고, 0 이하면 400 을 준다. */
function onAmountInput(event) {
  amount.value = event.target.value.replace(/\D/g, '')
}

const canSubmit = computed(() => Number(amount.value) > 0)

/**
 * PICK 으로 넘어간다.
 *
 * `MerchantFlowView` 가 `store` · `storeId` 쿼리를 보고 PICK 을 복원한다
 * (QR 결제에서 돌아올 때 쓰던 경로와 같다). `amount` 는 있을 때만 싣는다 —
 * 빈 값을 실으면 "금액을 안 물어본 것" 과 구분이 안 된다.
 */
function goToPick(withAmount) {
  const base = returnTo.value
    ? router.resolve(returnTo.value)
    : router.resolve({ name: 'merchants' })

  router.replace({
    path: base.path,
    query: {
      ...base.query,
      store: storeName.value,
      storeId: storeId.value,
      ...(withAmount ? { amount: amount.value } : {}),
    },
  })
}

/** 들어온 화면으로 돌아간다. 금액을 묻기 전 상태이므로 `store` 를 싣지 않는다. */
function goBack() {
  if (backTo.value) router.replace(backTo.value)
  else router.replace({ name: 'merchants' })
}

function openMyPage() {
  router.push({ name: 'my-page', query: { returnTo: route.fullPath } })
}

function navigateTo(target) {
  // 검색 칸은 홈 화면(검색창·카테고리)을 연다. 라벨만 바뀌었고 가는 곳은 예전 그대로다.
  if (target === 'search') {
    router.push({ name: 'home' })
    return
  }
  // 홈 칸은 결제 화면을 연다. 들어가면 카드 선택부터 시작한다 (#66).
  if (target === 'home') {
    paymentStore.reset()
    router.push({ name: 'payment' })
    return
  }
  if (target === 'mycard') {
    router.push({ name: 'my-card' })
    return
  }
  router.push({ name: 'home' })
}
</script>

<template>
  <section class="merchant-flow">
    <header class="pick-header">
      <button type="button" aria-label="가맹점 목록으로" @click="goBack()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <h1>피그의 PICK</h1>
      <button type="button" aria-label="마이페이지" @click="openMyPage()">
        <Menu :size="22" />
      </button>
    </header>

    <div class="min-h-0 flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-24 pt-10">
      <img :src="pigPickCard" alt="" class="mx-auto h-24 w-auto" />

      <div class="text-center">
        <h2 class="text-[19px] font-bold text-ink">결제금액을 입력하세요</h2>
        <p class="mt-1.5 text-[13px] text-sub">
          <template v-if="storeName">{{ storeName }}에서 </template>결제할 금액이 있으신가요?
        </p>
      </div>

      <p class="flex gap-2 rounded-xl bg-icon-bg px-4 py-3 text-[12px] leading-[1.6] text-sub">
        <Info :size="15" class="mt-0.5 shrink-0 text-primary-dark" />
        <span>
          결제 금액을 입력하면 할인율과 적립 혜택을 금액 기준으로 계산해 더 정확한 카드를 추천해
          드려요. 금액 없이도 추천은 받을 수 있어요.
        </span>
      </p>

      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          class="rounded-xl py-3.5 !text-[15px] !font-bold text-ink"
          :style="wantsAmount ? CHOICE_SELECTED_STYLE : CHOICE_STYLE"
          @click="wantsAmount = true"
        >
          예
        </button>
        <button
          type="button"
          class="rounded-xl py-3.5 !text-[15px] !font-bold text-ink"
          :style="CHOICE_STYLE"
          @click="goToPick(false)"
        >
          아니요
        </button>
      </div>

      <!-- `예` 를 눌렀을 때만 열린다. 피그마의 `결제 금액 입력2` 가 이 상태다. -->
      <template v-if="wantsAmount">
        <div
          class="flex items-center gap-2 rounded-xl bg-white px-4 py-3.5"
          :style="AMOUNT_FIELD_STYLE"
        >
          <span class="shrink-0 text-[15px] text-muted">₩</span>
          <input
            :value="amount"
            class="min-w-0 flex-1 text-[15px] font-bold text-ink"
            :style="AMOUNT_INPUT_STYLE"
            type="text"
            inputmode="numeric"
            placeholder="결제할 금액"
            aria-label="결제 예정 금액"
            @input="onAmountInput"
          />
          <button
            v-if="amount"
            type="button"
            class="shrink-0 bg-transparent text-sub"
            aria-label="금액 지우기"
            @click="amount = ''"
          >
            <X :size="16" />
          </button>
        </div>

        <button
          type="button"
          class="rounded-xl py-4 !text-[15px] !font-bold text-ink disabled:opacity-40"
          :style="SUBMIT_STYLE"
          :disabled="!canSubmit"
          @click="goToPick(true)"
        >
          추천 받으러 가기
        </button>
      </template>
    </div>

    <nav class="bottom-nav merchant-bottom-nav">
      <button type="button" @click="navigateTo('search')">
        <img :src="iconSearchTab" alt="" width="22" height="22" /><span>매장 검색</span>
      </button>
      <button type="button" @click="navigateTo('home')">
        <img :src="iconHome" alt="" width="22" height="22" /><span>결제</span>
      </button>
      <button type="button" @click="navigateTo('mycard')">
        <img :src="iconMycard" alt="" width="22" height="22" /><span>카드 내역</span>
      </button>
      <button type="button" @click="router.push({ name: 'report' })">
        <img :src="iconReport" alt="" width="22" height="22" /><span>혜택</span>
      </button>
    </nav>
  </section>
</template>
