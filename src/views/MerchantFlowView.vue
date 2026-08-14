<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import { categories } from '@/data'
import * as benefitApi from '@/api/benefitApi'
import { CARD_BENEFIT_STATUS } from '@/api/benefitApi'
import * as storeApi from '@/api/storeApi'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import { useAsyncState } from '@/composables/useAsyncState'
import { CARD_RATIO, useCardImage } from '@/composables/useCardImage'
import { useToast } from '@/composables/useToast'
import { getCurrentCoordinates } from '@/utils/geolocation'
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
const paymentStore = usePaymentStore()
const { showToast } = useToast()
const { markCardImageOrientation, cardImageStyle } = useCardImage()

// 보유 카드 목록(`cardStore`)을 여기서 쓰지 않는다. 예상 혜택 응답이 카드 id·이름·이미지를
// 함께 주므로 이 화면이 알아야 할 카드 정보는 그 응답에 다 있다.

const str = (value, fallback = '') => (typeof value === 'string' ? value : fallback)

// 무엇을 보여줄지는 URL 이 정한다 (#59). 기본값은 기존 props default 그대로다.
const request = computed(() => ({
  categoryId: str(route.query.categoryId, 'cafe'),
  title: str(route.query.title, str(route.query.query) || '카페/디저트'),
  query: str(route.query.query),
}))

// 결제에서 뒤로 왔을 때 그 가게 화면으로 복원하기 위한 값 (기존 merchantReturnStore)
const initialStoreName = computed(() => str(route.query.store))

/**
 * 금액 입력 화면(#144)에서 넘어온 값.
 *
 * `storeId` 가 함께 오면 목록을 기다리지 않고 바로 PICK 을 그린다. 금액을 묻는 화면을
 * 거치면서 이 화면이 다시 마운트되는데, 목록 조회가 끝날 때까지 PICK 을 못 그리면
 * 가맹점을 고른 뒤 "찾는 중" 로더를 한 번 더 보게 된다.
 *
 * `amount` 는 없을 수도 있다 — 금액 입력 화면에서 `아니요` 를 고른 경우다.
 * 그때는 `getExpectedBenefits` 가 쿼리에서 통째로 뺀다.
 */
const initialStoreId = computed(() => str(route.query.storeId))
const requestedAmount = computed(() => str(route.query.amount))

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

// 금액 입력 화면에서 돌아왔으면 쿼리만으로 PICK 을 복원한다. PICK 이 쓰는 값은
// `storeId` 와 `storeName` 둘뿐이라 목록의 원본 객체를 기다릴 이유가 없다.
const selectedStore = ref(
  initialStoreId.value && initialStoreName.value
    ? { storeId: initialStoreId.value, storeName: initialStoreName.value }
    : null,
)
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

// 로딩 표시는 `isLoading` 이 아니라 아래 `isSearching` 이 맡는다 (최소 노출 시간 때문).
const { data: searchResult, execute: fetchStores } = useAsyncState(storeApi.getStoreSearch)

// 거리순 상위 5건 고정이다. 백엔드에 페이징이 없다.
const stores = computed(() => searchResult.value?.stores ?? [])

/**
 * 목록을 채우는 동안 화면 가운데에 띄우는 로더.
 *
 * `isStoresLoading` 을 그대로 쓰지 않는 이유는 **응답이 너무 빨라서**다. 시드가 광진구
 * 일대뿐이고 상위 5건 고정이라 조회가 순식간에 끝나는데, 그러면 안내가 한 프레임 깜빡이고
 * 목록이 튀어나와 화면이 덜컥거린다. 최소 시간을 두면 "찾는 중 → 결과" 로 읽힌다.
 *
 * 응답이 더 오래 걸리면 그만큼 더 보여준다. 최소치이지 고정 지연이 아니다.
 */
const SEARCH_LOADER_MIN_MS = 1000
const isSearching = ref(false)
let searchLoaderTimer
let searchStartedAt = 0

function startSearchLoader() {
  window.clearTimeout(searchLoaderTimer)
  searchStartedAt = Date.now()
  isSearching.value = true
}

function endSearchLoader() {
  const remaining = SEARCH_LOADER_MIN_MS - (Date.now() - searchStartedAt)
  window.clearTimeout(searchLoaderTimer)
  searchLoaderTimer = window.setTimeout(
    () => {
      isSearching.value = false
    },
    Math.max(0, remaining),
  )
}

// 로더가 남은 시간을 세는 도중에 화면을 떠날 수 있다.
onBeforeUnmount(() => window.clearTimeout(searchLoaderTimer))

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

  // 좌표를 구하는 동안에도 기다리는 것은 마찬가지다. 로더를 그 전에 켠다.
  startSearchLoader()

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
  } finally {
    endSearchLoader()
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

const {
  data: expectedBenefits,
  isLoading: isPicksLoading,
  execute: fetchExpectedBenefits,
} = useAsyncState(benefitApi.getExpectedBenefits)

/**
 * 상태 배지를 오른쪽 위로 옮기는 스타일.
 *
 * `.pick-status` 는 `style.css` 에서 **왼쪽 위**에 붙는데, 카드 이미지의 카드명이
 * 딱 그 자리라 가려진다 (KB 이미지 기준 좌상단에 "KB 국민카드 / 청춘대로 | 톡톡").
 *
 * 동결된 `style.css` 를 건드리지 않고 이 화면에서만 옮긴다.
 * Tailwind 유틸리티로는 안 된다 — `style.css` 규칙이 레이어 밖이라
 * `@layer utilities` 를 이긴다. 인라인만 확실히 덮는다.
 */
const PICK_STATUS_STYLE = { left: 'auto', right: '0', borderRadius: '0 0 0 11px' }

/**
 * 카드 그림 칸의 비율. 실제 카드 비율(약 1.58)에 맞춘다.
 *
 * `style.css` 의 `.pick-card-visual` 은 `aspect-ratio: 1.79/1` 인데 카드사 이미지는
 * KB 1.58 · 신한 1.59 다. 칸이 더 넓어서 `cover` 로 채우면 **위아래가 잘린다.**
 * 어느 쪽을 기준으로 잡아도 뭔가는 잘려나갔다.
 *   - 위 기준: 신한 카드 왼쪽 세로 로고("ShinhanCard")의 아래쪽 글자가 잘린다
 *   - 가운데:  KB 카드 좌상단 카드명이 깎인다
 *
 * 칸을 카드 비율로 맞추면 가로 카드는 **잘림도 여백도 없이** 딱 맞는다.
 * 동결된 `style.css` 를 건드리지 않으려고 인라인으로 덮는다.
 */
const PICK_VISUAL_STYLE = { aspectRatio: `${CARD_RATIO} / 1` }

/**
 * 카드 그림을 칸에 어떻게 앉힐지.
 *
 * 세로 카드(현대카드는 CDN 이미지가 전부 604×956 이다)는 **눕힌다.**
 * 가로 칸에 세로 이미지를 그냥 채우면 위쪽 35% 만 남아 어느 카드인지 알 수 없고,
 * 여백을 두면 화면이 비어 보인다. 실물 세로 카드를 가로로 든 모습과 같으니
 * 돌려서 채우는 게 맞다 — 신한 카드도 로고가 세로로 쓰여 있어 같은 관례다.
 *
 * 판별과 계산은 `useCardImage` 가 한다 (#97). 위에서 칸을 카드 비율로 맞춰놨으므로
 * 기본값(`CARD_RATIO`)을 그대로 쓴다.
 */
function pickImageStyle(pick) {
  return cardImageStyle(pick.cardImageUrl)
}

// 화면이 쓰던 세 갈래가 백엔드 판정과 그대로 대응된다.
const PICK_VIEW = {
  [CARD_BENEFIT_STATUS.AVAILABLE]: { className: 'recommended', label: '추천' },
  [CARD_BENEFIT_STATUS.CONDITION_NOT_MET]: { className: 'disabled', label: '조건 불가' },
  [CARD_BENEFIT_STATUS.NO_BENEFIT]: { className: 'none', label: '혜택 없음' },
}

/** 원 단위 표기. 기대혜택액은 `BigDecimal` 이라 소수가 섞여 올 수 있다. */
function won(value) {
  return `${Math.round(Number(value)).toLocaleString('ko-KR')}원`
}

/**
 * 피그의 PICK 목록.
 *
 * **다시 정렬하지 않는다.** 백엔드가 AVAILABLE → CONDITION_NOT_MET → NO_BENEFIT
 * 순으로 이미 정렬해 준다. 금액을 보냈으면 그 안에서 기대혜택액 내림차순으로 한 번 더
 * 정렬해서 준다. 화면이 또 정렬하면 그 기준이 두 곳에 생긴다.
 */
const cardPicks = computed(() =>
  (expectedBenefits.value?.cards ?? []).map((card) => {
    const view = PICK_VIEW[card.status] ?? PICK_VIEW[CARD_BENEFIT_STATUS.NO_BENEFIT]
    const isAvailable = card.status === CARD_BENEFIT_STATUS.AVAILABLE

    // 결제 예정 금액을 보냈을 때만 채워진다. 안 보냈으면 null 이다.
    const expectedAmount = card.benefit?.expectedAmount

    return {
      // 결제로 넘길 때 이 id 를 그대로 쓴다. 추천 목록의 자리와 보유 카드의 자리는 다르다.
      userCardId: card.userCardId,
      issuer: card.cardCompanyName,
      name: card.cardName,
      cardImageUrl: card.cardImageUrl,
      status: view.className,
      statusLabel: view.label,
      benefit: card.benefit?.benefitName,
      // 안내 문구는 서버가 사유마다 다르게 만들어 준다. 화면이 지어내지 않는다.
      reason: card.reason?.message,
      /**
       * 이득 순위. **`AVAILABLE` 일 때만 숫자고 나머지는 null 이다.**
       * 금액을 안 보냈으면 `AVAILABLE` 이어도 null 이다 — 무엇이 더 이득인지 잴 수 없어서다.
       * 동점은 같은 순위를 주고 다음을 건너뛴다 (`1, 1, 3`).
       */
      rank: card.rank ?? null,
      /**
       * 받을 수 있을 때만 보여준다. 한도가 소진된 혜택은 `benefit` 이 와도 0원이다.
       *
       * **금액을 보냈으면 기대혜택액(원)을, 아니면 혜택 설명("20% 할인")을 쓴다.**
       * 가맹점만 고르고 금액을 건너뛴 경로가 있어서 둘 다 대비해야 한다.
       *
       * ⚠️ **`expectedAmount` 를 화면에서 계산하지 않는다.** 건당 캡과 결제금액 상한이
       * 이미 반영된 값이라 `결제금액 × 할인율` 과 다르다 — 30,000원에 "20% 할인" 인데
       * 4,000원이 온다(6,000원이 아니다). 직접 곱하면 사용자에게 못 받을 금액을 약속하게 된다.
       */
      expected: isAvailable
        ? expectedAmount != null
          ? won(expectedAmount)
          : (card.benefit?.displayText ?? '0원')
        : '0원',
    }
  }),
)

/** 보유 카드가 아예 없는 경우. 카드가 없어도 200 이라 이 값으로 갈라야 한다. */
const hasNoCard = computed(() => expectedBenefits.value?.hasCard === false)

// 가맹점을 고르면 그 가맹점 기준으로 보유 카드를 판정받는다. 가맹점을 바꾸면 다시 받는다.
// 쿼리로 복원된 경우에도 그려지자마자 판정을 받아야 하므로 immediate 다.
watch(
  selectedStore,
  async (store) => {
    if (!store) return
    try {
      await fetchExpectedBenefits(store.storeId, requestedAmount.value)
    } catch (error) {
      showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
    }
  },
  { immediate: true },
)

/**
 * 가맹점을 고르면 금액을 먼저 묻는다 (#144).
 *
 * 돌아올 주소를 통째로 넘긴다 — 화면 이름만으로는 카테고리·검색어를 복원할 수 없다.
 */
function selectStore(store) {
  router.push({
    name: 'pick-amount',
    query: {
      storeId: String(store.storeId),
      store: store.storeName,
      returnTo: route.fullPath,
    },
  })
}

/**
 * PICK 에서 목록으로 돌아간다.
 *
 * `selectedStore` 만 비우면 안 된다. 쿼리에 `store` 가 남아 있으면 아래 `watch(stores)`
 * 가 곧바로 다시 채워 PICK 으로 되튕긴다. 복원용 쿼리를 걷어내고 목록 주소로 바꾼다.
 */
function backToList() {
  selectedStore.value = null
  const { store, storeId, amount, ...rest } = route.query
  void store
  void storeId
  void amount
  router.replace({ path: route.path, query: rest })
}

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
  // 추천 응답이 카드 id 를 그대로 준다. 예전에는 추천 목록의 자리를 보유 카드 목록의
  // 자리로 가정해 넘겼는데(#76 의 TODO), 두 목록은 정렬 기준이 달라 어긋날 수 있었다.
  const userCardId = pendingPick.value?.userCardId
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
      <!--
        `.merchant-flow` 가 flex column 이라 `flex-1` 로 남은 높이를 통째로 받는다.
        그래야 목록이 있을 자리 한가운데에 놓인다.
      -->
      <div
        v-if="isSearching"
        class="flex flex-1 flex-col items-center justify-center gap-3 text-sub"
      >
        <BaseSpinner size="lg" label="주변 가맹점을 찾는 중" />
        <p class="text-[13px]">주변 가맹점을 찾고 있어요</p>
      </div>

      <p v-else-if="!stores.length" class="py-8 text-center text-[13px] text-sub">
        근처에 조건에 맞는 가맹점이 없어요
      </p>
      <div v-else class="merchant-list">
        <button
          v-for="store in stores"
          :key="store.storeId"
          class="merchant-card"
          type="button"
          @click="selectStore(store)"
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
        <button type="button" aria-label="가맹점 목록으로" @click="backToList()">
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
        <p v-if="isPicksLoading" class="py-8 text-center text-[13px] text-sub">
          피그가 카드를 고르는 중이에요
        </p>
        <p v-else-if="hasNoCard" class="py-8 text-center text-[13px] text-sub">
          보유한 카드가 없어요. 카드를 먼저 등록해 주세요
        </p>

        <article v-for="pick in cardPicks" :key="pick.userCardId" class="pick-card-wrap">
          <button
            class="pick-card-visual bg-ink text-white"
            type="button"
            :style="PICK_VISUAL_STYLE"
            @click="chooseCard(pick)"
          >
            <!-- 배지보다 먼저 놓아야 배지가 그림 위에 올라온다. -->
            <img
              v-if="pick.cardImageUrl"
              :src="pick.cardImageUrl"
              alt=""
              :style="pickImageStyle(pick)"
              @load="markCardImageOrientation"
            />
            <span class="pick-status" :class="pick.status" :style="PICK_STATUS_STYLE">
              {{ pick.statusLabel }}
            </span>
            <!--
              이득 순위. 금액을 보냈고 받을 수 있는 카드에만 붙는다.
              상태 배지를 오른쪽으로 옮겨(PICK_STATUS_STYLE) 비워둔 왼쪽 위 자리를 쓴다.
              `style.css` 는 동결이라 새 클래스 대신 Tailwind 유틸리티로 짠다.
            -->
            <span
              v-if="pick.rank"
              class="absolute top-0 left-0 rounded-br-[11px] bg-primary px-3.5 py-2 text-[12px] font-extrabold text-ink"
            >
              {{ pick.rank }}위
            </span>
            <!-- 카드 이미지가 있으면 카드 앞면에 이름이 이미 찍혀 있다. 글자를 겹쳐 쓰지 않는다. -->
            <span v-if="!pick.cardImageUrl" class="pick-card-copy">
              <small>{{ pick.issuer }}</small>
              <strong>{{ pick.name }}</strong>
            </span>
          </button>

          <div class="pick-card-info">
            <div v-if="pick.status === 'recommended'" class="pick-benefit">
              <img :src="benefitGiftIcon" alt="" />
              <strong>{{ pick.benefit }}</strong>
            </div>
            <p v-else-if="pick.status === 'none'" class="pick-no-benefit">
              <span>혜택없음</span>{{ pick.reason }}
            </p>
            <p v-else class="pick-ineligible"><span>주의</span>{{ pick.reason }}</p>

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
