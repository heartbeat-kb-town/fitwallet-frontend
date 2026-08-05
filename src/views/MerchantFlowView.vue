<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import { categories } from '@/data'
import * as storeApi from '@/api/storeApi'
import { useAsyncState } from '@/composables/useAsyncState'
import { useToast } from '@/composables/useToast'
import { getCurrentCoordinates } from '@/utils/geolocation'
import { useCardStore } from '@/stores/cardStore'
import { usePaymentStore } from '@/stores/paymentStore'

/**
 * 화면 카테고리 id → 백엔드 `category.category_id`.
 *
 * 화면은 문자열, 백엔드는 숫자를 쓰고 **순서도 다르다** (푸드가 4, 편의점/마트가 2).
 * 인덱스로 유추하면 조용히 엉뚱한 업종을 조회하므로 표를 그대로 옮긴다.
 */
const BACKEND_CATEGORY_IDS = {
  cafe: 1,
  mart: 2,
  shopping: 3,
  food: 4,
  hospital: 5,
  gas: 6,
}
import storeSearchIcon from '@/assets/icons/category-store.svg'
import benefitGiftIcon from '@/assets/icons/category-benefit.svg'
import iconHome from '@/assets/icons/home.svg'
import iconPayment from '@/assets/icons/payment.svg'
import iconMycard from '@/assets/icons/mycard.svg'
import iconReport from '@/assets/icons/report.svg'

const route = useRoute()
const router = useRouter()
const cardStore = useCardStore()
const paymentStore = usePaymentStore()
const { showToast } = useToast()

onMounted(() => cardStore.ensureCards())

const str = (value, fallback = '') => (typeof value === 'string' ? value : fallback)

// 무엇을 보여줄지는 URL 이 정한다 (#59). 기본값은 기존 props default 그대로다.
const request = computed(() => ({
  categoryId: str(route.query.categoryId, 'cafe'),
  title: str(route.query.title, str(route.query.query) || '카페/디저트'),
  query: str(route.query.query),
}))

// 결제에서 뒤로 왔을 때 그 가게 화면으로 복원하기 위한 값 (기존 merchantReturnStore)
const initialStoreName = computed(() => str(route.query.store))

// 검색에서 들어왔으면 뒤로가기가 검색으로 간다. 아니면 홈(셸 기본 화면).
function goBack() {
  if (route.query.from === 'search') router.push({ name: 'search' })
  else router.push({ name: 'home' })
}

// 돌아올 주소를 통째로 넘긴다. 화면 이름만으로는 검색 조건을 복원할 수 없다.
function openMyPage() {
  router.push({ name: 'my-page', query: { returnTo: route.fullPath } })
}

function navigateTo(target) {
  if (target === 'payment') {
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

// 셸의 startRecommendedPayment() 가 하던 일. #66 에서 paymentStore 로 옮겼다.
//
// PIN 검증까지 끝난 뒤에 부른다. 결제 화면이 `paymentStore.pinAuthId` 로 QR 을 만든다.
function payWith({ userCardId, store }) {
  paymentStore.startFromMerchant({
    cardId: userCardId,
    merchantName: store,
    returnTo: route.fullPath,
  })
  router.push({ name: 'payment' })
}

const selectedStore = ref(null)
const showPin = ref(false)
const pendingPick = ref(null)
const pin = ref([])
// PIN 시트 안에 띄우는 인라인 메시지. 시트가 화면을 덮고 있어 토스트는 가려진다.
const pinMessage = ref('')
const shakePin = ref(false)

const category = computed(
  () => categories.find((item) => item.id === request.value.categoryId) ?? categories[0],
)
const isSearch = computed(() => Boolean(request.value.query))

const {
  data: searchResult,
  isLoading: isStoresLoading,
  execute: fetchStores,
} = useAsyncState(storeApi.getStoreSearch)

// 거리순 상위 5건 고정이다. 백엔드에 페이징이 없다.
const stores = computed(() => searchResult.value?.stores ?? [])

/**
 * 가맹점을 조회한다.
 *
 * 검색어가 있으면 키워드 검색, 없으면 카테고리 주변 조회다.
 * 둘 다 비면 백엔드가 400 을 주므로 그 조합으로는 아예 부르지 않는다.
 *
 * **키워드 검색은 백엔드가 검색 기록에 남긴다.** 검색 화면의 최근 검색어가 여기서 쌓인다.
 */
async function loadStores() {
  const keyword = request.value.query?.trim()
  const categoryId = BACKEND_CATEGORY_IDS[category.value.id]
  if (!keyword && !categoryId) return

  // 좌표는 필수다. 못 구하면 유틸이 시연용 기본 좌표를 준다 (실패하지 않는다).
  const { latitude, longitude } = await getCurrentCoordinates()

  try {
    await fetchStores(
      keyword ? { keyword, latitude, longitude } : { categoryId, latitude, longitude },
    )
  } catch (error) {
    if (error.code === 'LOCATION_AGREEMENT_REQUIRED') {
      showToast('위치 정보 이용에 동의해 주세요')
      return
    }
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
  }
}

// 검색어나 카테고리가 바뀌면 다시 조회한다. 주소로 바로 들어와도 여기서 한 번 돈다.
watch(request, loadStores, { immediate: true })

// QR 결제에서 뒤로 돌아온 경우, 결제했던 가게의 피그의 PICK 화면을 다시 보여준다.
// 목록이 API 로 오므로 도착한 뒤에 맞춘다.
watch(stores, (list) => {
  if (!initialStoreName.value || selectedStore.value) return
  selectedStore.value = list.find((store) => store.storeName === initialStoreName.value) ?? null
})

const cardPicks = [
  {
    cardIndex: 0,
    issuer: '신한카드',
    name: 'Deep Dream',
    status: 'recommended',
    statusLabel: '추천',
    benefit: '혜택 이름',
    expected: '5000원 할인',
    gradient: 'linear-gradient(135deg,#6ba8d4 0%,#4a86b8 60%,#2e6491 100%)',
    text: '#fff',
    sub: 'rgba(255,255,255,.72)',
  },
  {
    cardIndex: 1,
    issuer: '국민카드',
    name: '똑똑O',
    status: 'recommended',
    statusLabel: '추천',
    benefit: 'KB 국민 청춘 혜택',
    expected: '10% 할인',
    gradient: 'linear-gradient(135deg,#3d3428 0%,#5c4e3a 50%,#3d3428 100%)',
    text: '#fff',
    sub: 'rgba(255,255,255,.65)',
  },
  {
    cardIndex: 2,
    issuer: '현대카드',
    name: 'ZERO',
    status: 'none',
    statusLabel: '혜택 없음',
    reason: '이 결제에는 적용되는 혜택이 없어요.',
    expected: '0원',
    gradient: 'linear-gradient(135deg,#e8e4de 0%,#d8d2c8 100%)',
    text: '#3a3530',
    sub: '#8a8480',
  },
  {
    cardIndex: 3,
    issuer: '우리카드',
    name: 'DA@카드의정석',
    status: 'disabled',
    statusLabel: '조건 불가',
    reason: '전월 실적 미충족',
    detail: '전월실적 조건이 부족해서 혜택을 받을 수 없어요.',
    expected: '0원',
    gradient: 'linear-gradient(135deg,#2c2820 0%,#453d30 50%,#2c2820 100%)',
    text: '#e8c96a',
    sub: 'rgba(232,201,106,.72)',
  },
]

function formatDistance(distance) {
  return distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`
}

function chooseCard(pick) {
  pendingPick.value = pick
  pin.value = []
  pinMessage.value = ''
  showPin.value = true
}

function closePin() {
  showPin.value = false
  pendingPick.value = null
  pin.value = []
  pinMessage.value = ''
}

function addDigit(digit) {
  if (pin.value.length < 6) pin.value.push(digit)
}

function deleteDigit() {
  pin.value.pop()
}

function shakePinDots() {
  shakePin.value = false
  requestAnimationFrame(() => {
    shakePin.value = true
    window.setTimeout(() => {
      shakePin.value = false
    }, 460)
  })
}

/**
 * 결제 비밀번호를 검증하고 결제 화면으로 넘긴다.
 *
 * QR 은 여기서 만들지 않는다. 결제 화면이 `pinAuthId` 로 만든다 —
 * 이 화면에서 만들면 사용자가 넘어가는 사이에 180초 만료가 흐르기 시작한다.
 */
async function confirmPin() {
  if (pin.value.length !== 6) {
    shakePinDots()
    return
  }
  const userCardId = cardStore.cards[pendingPick.value.cardIndex]?.id
  if (!userCardId || paymentStore.isVerifyingPin) return

  pinMessage.value = ''
  try {
    await paymentStore.verifyPin({ userCardId, paymentPin: pin.value.join('') })
    showPin.value = false
    payWith({ userCardId, store: selectedStore.value.storeName })
  } catch (error) {
    if (error.code === 'PIN_MISMATCH') {
      // 세션이 끊긴 게 아니다. 이 화면에서 다시 받는다 (#79).
      const remaining = error.data?.remainingAttempts
      pinMessage.value =
        remaining > 0 ? `${error.message} (${remaining}번 남음)` : '비밀번호를 5번 틀렸어요.'
      pin.value = []
      shakePinDots()
      return
    }
    showToast('일시적인 오류가 발생했어요')
    pin.value = []
  }
}
</script>

<template>
  <section class="merchant-flow">
    <template v-if="!selectedStore">
      <header class="merchant-header">
        <div class="merchant-title-row">
          <button
            class="merchant-header-button"
            type="button"
            aria-label="뒤로가기"
            @click="goBack()"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div class="merchant-heading">
            <span class="merchant-leading-icon">
              <img :src="isSearch ? storeSearchIcon : category.icon" alt="" />
            </span>
            <h1>{{ request.title }}</h1>
          </div>
          <button
            class="merchant-header-button"
            type="button"
            aria-label="마이페이지"
            @click="openMyPage()"
          >
            <Menu :size="22" />
          </button>
        </div>
        <p class="merchant-sort">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          현재 위치 기준 · 거리순
        </p>
      </header>

      <div class="merchant-divider"></div>
      <p v-if="isStoresLoading" class="py-8 text-center text-[13px] text-sub">
        주변 가맹점을 찾고 있어요
      </p>
      <p v-else-if="!stores.length" class="py-8 text-center text-[13px] text-sub">
        근처에 조건에 맞는 가맹점이 없어요
      </p>
      <div class="merchant-list">
        <button
          v-for="store in stores"
          :key="store.storeId"
          class="merchant-card"
          type="button"
          @click="selectedStore = store"
        >
          <span class="merchant-store-icon">
            <img :src="isSearch ? storeSearchIcon : category.icon" alt="" />
          </span>
          <span class="merchant-store-info">
            <strong>{{ store.storeName }}</strong>
            <small>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {{ store.address }}
            </small>
          </span>
          <span class="merchant-distance">{{ formatDistance(store.distanceMeters) }}</span>
        </button>
      </div>
    </template>

    <template v-else>
      <header class="pick-header">
        <button type="button" aria-label="가맹점 목록으로" @click="selectedStore = null">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <h1>피그의 PICK</h1>
        <button type="button" aria-label="마이페이지" @click="openMyPage()">
          <Menu :size="22" />
        </button>
      </header>

      <div class="pick-store-name">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <strong>{{ selectedStore.storeName }}</strong>
      </div>

      <div class="pick-list">
        <article v-for="pick in cardPicks" :key="pick.name" class="pick-card-wrap">
          <button
            class="pick-card-visual"
            type="button"
            :style="{ background: pick.gradient, color: pick.text }"
            @click="chooseCard(pick)"
          >
            <span class="pick-status" :class="pick.status">{{ pick.statusLabel }}</span>
            <span class="pick-card-copy">
              <small :style="{ color: pick.sub }">{{ pick.issuer }}</small>
              <strong>{{ pick.name }}</strong>
            </span>
            <span class="pick-chip" :style="{ borderColor: pick.sub }"></span>
          </button>

          <div class="pick-card-info">
            <div v-if="pick.status === 'recommended'" class="pick-benefit">
              <img :src="benefitGiftIcon" alt="" />
              <strong>{{ pick.benefit }}</strong>
            </div>
            <p v-else-if="pick.status === 'none'" class="pick-no-benefit">
              <span>혜택없음</span>{{ pick.reason }}
            </p>
            <template v-else>
              <p class="pick-ineligible"><span>주의</span>{{ pick.reason }}</p>
              <p class="pick-warning">{{ pick.detail }}</p>
            </template>

            <div class="pick-expected">
              <span>예상 혜택</span>
              <strong :class="pick.status">{{ pick.expected }}</strong>
            </div>
          </div>
        </article>

        <div class="pick-notice">
          <span>✓</span>
          <p>
            추천 카드는 현재 카드 혜택 정보와 전월 실적 기준으로 제공됩니다.<br />
            실제 결제 시 혜택 적용 기준에 따라 변동될 수 있습니다.
          </p>
        </div>
      </div>
    </template>

    <nav class="bottom-nav merchant-bottom-nav">
      <button type="button" @click="navigateTo('home')">
        <img :src="iconHome" alt="" width="22" height="22" /><span>홈</span>
      </button>
      <button type="button" @click="navigateTo('payment')">
        <img :src="iconPayment" alt="" width="22" height="22" /><span>결제</span>
      </button>
      <button type="button">
        <img :src="iconMycard" alt="" width="22" height="22" /><span>내 카드</span>
      </button>
      <button type="button">
        <img :src="iconReport" alt="" width="22" height="22" /><span>리포트</span>
      </button>
    </nav>

    <div v-if="showPin" class="payment-flow-layer">
      <button
        class="payment-pin-scrim"
        type="button"
        aria-label="결제 취소"
        @click="closePin"
      ></button>
      <button class="payment-flow-close" type="button" aria-label="닫기" @click="closePin">
        ×
      </button>

      <section class="payment-pin-sheet" @click.stop>
        <span class="payment-sheet-handle"></span>
        <div class="payment-pin-title">
          <h2>결제 비밀번호 6자리를 입력해 주세요</h2>
          <p>보안을 위해 비밀번호를 노출하지 마세요</p>
        </div>
        <div class="payment-pin-dots" :class="{ shake: shakePin }" aria-label="비밀번호 입력 상태">
          <span v-for="index in 6" :key="index" :class="{ filled: index <= pin.length }"></span>
        </div>

        <!-- 검증 실패는 토스트로 띄우지 않는다. 시트가 화면을 덮고 있어 가려진다. -->
        <p v-if="pinMessage" class="px-6 text-center text-[13px] text-danger" role="alert">
          {{ pinMessage }}
        </p>

        <div class="payment-pin-pad">
          <button v-for="digit in 9" :key="digit" type="button" @click="addDigit(digit)">
            {{ digit }}
          </button>
          <button type="button" aria-label="한 글자 지우기" @click="deleteDigit">
            <svg width="27" height="21" viewBox="0 0 28 22" fill="none" aria-hidden="true">
              <path
                d="M10 1H26C26.55 1 27 1.45 27 2V20C27 20.55 26.55 21 26 21H10L1 11L10 1Z"
                stroke="currentColor"
                stroke-width="1.8"
              />
              <path
                d="M17 7L13 11M13 11L17 15M13 11H21"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button type="button" @click="addDigit(0)">0</button>
          <button
            class="payment-pin-confirm"
            type="button"
            :disabled="paymentStore.isVerifyingPin"
            @click="confirmPin"
          >
            {{ paymentStore.isVerifyingPin ? '확인 중' : '완료' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
