<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Info, Menu } from 'lucide-vue-next'
import { categories } from '@/data'
import * as benefitApi from '@/api/benefitApi'
import { CARD_BENEFIT_STATUS } from '@/api/benefitApi'
import * as storeApi from '@/api/storeApi'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseLocationConsentSheet from '@/components/common/BaseLocationConsentSheet.vue'
import { useAsyncState } from '@/composables/useAsyncState'
import { CARD_RATIO, useCardImage } from '@/composables/useCardImage'
import { useToast } from '@/composables/useToast'
import { getCurrentCoordinates } from '@/utils/geolocation'
import { usePaymentStore } from '@/stores/paymentStore'
import { useLocationStore } from '@/stores/locationStore'

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
import storeNearbyIcon from '@/assets/icons/store-nearby.svg'
import benefitGiftIcon from '@/assets/icons/category-benefit.svg'
import pigPickIcon from '@/assets/icons/pig-pick.svg'
import pickBubbleIcon from '@/assets/icons/pick-bubble.svg'
import pickStorePinIcon from '@/assets/icons/pick-store-pin.svg'
import pickWonIcon from '@/assets/icons/pick-won.svg'
import iconHome from '@/assets/icons/home.svg'
import iconSearchTab from '@/assets/icons/search-tab.svg'
import iconMycard from '@/assets/icons/mycard.svg'
import iconReport from '@/assets/icons/report.svg'

const route = useRoute()
const router = useRouter()
const paymentStore = usePaymentStore()
const locationStore = useLocationStore()
const { showToast } = useToast()
const { markCardImageOrientation, cardImageStyle } = useCardImage()

// 보유 카드 목록(`cardStore`)을 여기서 쓰지 않는다. 예상 혜택 응답이 카드 id·이름·이미지를
// 함께 주므로 이 화면이 알아야 할 카드 정보는 그 응답에 다 있다.

const str = (value, fallback = '') => (typeof value === 'string' ? value : fallback)

// 무엇을 보여줄지는 URL 이 정한다 (#59). 기본값은 기존 props default 그대로다.
const request = computed(() => ({
  categoryId: str(route.query.categoryId, 'cafe'),
  title: str(
    route.query.title,
    route.query.nearby === '1' ? '내 주변 혜택 가맹점' : str(route.query.query) || '카페/디저트',
  ),
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

// 들어온 곳으로 되돌린다. 결제에서 온 경우가 #228 로 늘었다.
function goBack() {
  if (route.query.from === 'search') router.push({ name: 'search' })
  else if (route.query.from === 'payment') router.push({ name: 'payment' })
  else router.push({ name: 'home' })
}

// 돌아올 주소를 통째로 넘긴다. 화면 이름만으로는 검색 조건을 복원할 수 없다.
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
  // `report` 분기가 없으면 마지막 줄로 떨어져 홈으로 간다. 탭 이름과 라우트 이름이 다르다.
  if (target === 'report') {
    router.push({ name: 'report' })
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
/** 위치 동의 시트. 조회가 403 을 받았을 때만 뜬다. */
const showConsent = ref(false)
const pin = ref([])
// PIN 시트 안에 띄우는 인라인 메시지. 시트가 화면을 덮고 있어 토스트는 가려진다.
const pinMessage = ref('')
const shakePin = ref(false)

const category = computed(
  () => categories.find((item) => item.id === request.value.categoryId) ?? categories[0],
)
const isSearch = computed(() => Boolean(request.value.query))

/**
 * 주변 조회 모드 (#228). 결제 화면의 `최적의 카드 추천 받고 결제하기` 가 여는 모습이다.
 *
 * 카테고리도 검색어도 없이 **좌표만으로** 조회한다. 백엔드가 이미 이 모드를 지원한다 —
 * `DefaultStoreService.searchStores()` 가 "카테고리도 없는(= 좌표만 온) 요청" 을
 * 주변 조회로 받는다. 막고 있던 것은 프론트였다.
 */
const isNearby = computed(() => route.query.nearby === '1')

/** 앞에 세우는 아이콘. 주변 조회는 가게, 키워드 검색은 검색, 나머지는 카테고리 아이콘이다. */
const leadingIcon = computed(() => {
  if (isNearby.value) return storeNearbyIcon
  return isSearch.value ? storeSearchIcon : category.value.icon
})

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
 * 셋 중 하나다 — 검색어가 있으면 키워드 검색, 주변 조회 모드면 좌표만,
 * 나머지는 카테고리 주변 조회다.
 *
 * 셋 다 아니면 백엔드가 400 을 주므로 그 조합으로는 아예 부르지 않는다.
 * **주변 조회 모드는 좌표만 보내는 것이 정상이다** — 여기서 걸러내면 안 된다 (#228).
 *
 * **키워드 검색은 백엔드가 검색 기록에 남긴다.** 검색 화면의 최근 검색어가 여기서 쌓인다.
 */
async function loadStores() {
  const keyword = request.value.query?.trim()
  const categoryId = isNearby.value ? null : BACKEND_CATEGORY_IDS[category.value.id]
  if (!keyword && !categoryId && !isNearby.value) return

  // 좌표를 구하는 동안에도 기다리는 것은 마찬가지다. 로더를 그 전에 켠다.
  startSearchLoader()

  // 좌표는 필수다. 못 구하면 유틸이 시연용 기본 좌표를 준다 (실패하지 않는다).
  const { latitude, longitude } = await getCurrentCoordinates()

  try {
    if (keyword) await fetchStores({ keyword, latitude, longitude })
    else if (categoryId) await fetchStores({ categoryId, latitude, longitude })
    else await fetchStores({ latitude, longitude })
  } catch (error) {
    if (error.code === 'LOCATION_AGREEMENT_REQUIRED') {
      // 예전에는 토스트만 띄웠다. 이 화면에 동의할 수단이 없어 막다른 길이었다 (#220).
      // 기억한 값이 서버와 어긋났다는 뜻이므로 지우고 시트를 띄운다.
      locationStore.forget()
      showConsent.value = true
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
 * 카드 그림 위의 배지를 오른쪽 위로 옮기는 스타일. **순위든 사유든 전부 오른쪽이다.**
 *
 * `.pick-status` 는 `style.css` 에서 **왼쪽 위**에 붙는데, 카드 이미지의 카드명이
 * 딱 그 자리라 가려진다 (KB 이미지 기준 좌상단에 "KB 국민카드 / 청춘대로 | 톡톡").
 *
 * 종류마다 자리를 달리하면 카드를 훑을 때 배지를 두 군데서 찾게 된다. 한 줄로 세운다.
 *
 * 동결된 `style.css` 를 건드리지 않고 이 화면에서만 옮긴다.
 * Tailwind 유틸리티로는 안 된다 — `style.css` 규칙이 레이어 밖이라
 * `@layer utilities` 를 이긴다. 인라인만 확실히 덮는다.
 */
const PICK_STATUS_STYLE = { left: 'auto', right: '0', borderRadius: '0 0 0 11px' }

/**
 * 선정 기준 설명 토글. 말풍선 옆 ⓘ 를 누를 때마다 열리고 닫힌다.
 *
 * 무엇을 보고 순위를 매겼는지가 화면 어디에도 없어서, 1위가 왜 1위인지 알 방법이 없었다.
 */
const isPickInfoOpen = ref(false)

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
      /**
       * 혜택 이름 옆에 붙는 혜택 내용 (`20% 할인`).
       *
       * **금액을 보냈을 때만 붙인다.** 금액을 안 보내면 아래 `예상 혜택` 오른쪽이
       * 곧 `displayText` 라(원화로 환산할 수가 없어서), 여기 또 적으면 같은 문구가 두 번 뜬다.
       * 금액을 보내면 그 자리가 기대혜택액(원)으로 바뀌면서 혜택 내용이 갈 곳이 없어진다.
       */
      benefitDetail: expectedAmount != null ? (card.benefit?.displayText ?? null) : null,
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

/** 동의를 받았으니 막혔던 조회를 그대로 다시 돌린다. */
function onConsentAgreed() {
  showConsent.value = false
  loadStores()
}

function closePin() {
  showPin.value = false
  pendingPick.value = null
  pin.value = []
  pinMessage.value = ''
}

/**
 * 6자리를 채우면 **자동으로 검증이 나간다** (#212).
 *
 * 6자리는 그 자체로 입력 완료 신호다. `완료` 를 한 번 더 누를 이유가 없어 버튼을 뺐다.
 * 결제 화면이 먼저 이렇게 바뀌었고(#130), 같은 비밀번호를 받는 두 화면의 동작을 맞춘다.
 */
function addDigit(digit) {
  if (paymentStore.isVerifyingPin || pin.value.length >= 6) return

  pin.value.push(digit)
  if (pin.value.length === 6) confirmPin()
}

function deleteDigit() {
  // 검증이 나간 뒤에는 지울 수 없다. 예전에는 `완료` 만 disabled 라 검증 중에도
  // 자릿수를 고칠 수 있었는데, 자동 검증에서는 그게 보낸 값과 화면을 어긋나게 한다.
  if (paymentStore.isVerifyingPin) return
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
              <img :src="leadingIcon" alt="" />
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
            <img :src="leadingIcon" alt="" />
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

        <!--
          주변 조회는 거리순 상위 5건만 온다 (백엔드에 페이징이 없다). 찾는 가게가
          그 안에 없을 때 빠져나갈 길을 준다 — 매장 검색 화면으로 보낸다 (#228).
          카테고리·키워드로 들어온 목록에는 띄우지 않는다. 그쪽은 이미 좁힌 결과다.
        -->
        <div
          v-if="isNearby"
          class="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5"
        >
          <div class="min-w-0 flex-1">
            <strong class="block text-[13px] font-semibold text-ink">
              찾으시는 매장이 없으신가요?
            </strong>
            <small class="mt-0.5 block text-[11px] text-muted-deep">
              자세히 검색하려면 매장 검색 탭으로 이동하세요
            </small>
          </div>
          <button
            class="flex-none rounded-full bg-icon-bg px-3.5 py-2 text-[12px] font-semibold text-primary-dark"
            type="button"
            @click="navigateTo('search')"
          >
            이동하기
          </button>
        </div>
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

      <!--
        피그가 말을 거는 자리. 시안대로 캐릭터 + 말풍선 + ⓘ 다.
        말풍선은 꼬리까지 그려진 한 장이라 그림 위에 글자를 얹는다.
        `style.css` 가 동결이라 Tailwind 유틸리티로만 짠다.
      -->
      <div class="flex flex-none items-center gap-2 bg-white px-5 pt-4">
        <img :src="pigPickIcon" alt="" width="61" height="46" class="flex-none" />
        <span class="relative grid flex-none place-items-center">
          <img :src="pickBubbleIcon" alt="" width="200" height="38" />
          <strong class="absolute text-[13px] font-bold text-ink">
            제가 추천하는 최적의 카드입니다
          </strong>
        </span>
        <!--
          Preflight 를 빼둔 프로젝트라 버튼 기본 배경을 직접 지운다.
          안 지우면 브라우저 기본 회색 알약이 그대로 보인다.
        -->
        <button
          type="button"
          class="flex-none bg-transparent p-0 text-muted transition-colors hover:text-sub"
          :aria-expanded="isPickInfoOpen"
          aria-label="어떤 기준으로 골랐는지 보기"
          @click="isPickInfoOpen = !isPickInfoOpen"
        >
          <Info :size="15" />
        </button>
      </div>

      <!--
        선정 기준. ⓘ 를 누를 때마다 열리고 닫힌다.
        문구는 시안의 `최적의 카드 추천 로직 설명` 그대로다.
        **세 문단으로 끊는다** — 무엇을 보고 골랐나 / 적립은 어떻게 견주나 / 무엇이 빠졌나 다.
        붙여 놓으면 셋이 한 덩어리로 보여서, 목록에 안 뜨는 카드가 왜 없는지가 끝에 묻힌다.
      -->
      <Transition name="expand">
        <div
          v-if="isPickInfoOpen"
          class="mx-5 mt-2 flex-none rounded-xl bg-icon-bg px-3 py-2.5 text-[12px] leading-relaxed text-sub"
        >
          <p class="m-0">
            이 가맹점에 적용되는 혜택인지, 지난달 사용액과 이번 결제 금액이 조건을 채우는지, 남은
            혜택 한도가 있는지를 고려해서 선정했어요.
          </p>
          <p class="mt-2 mb-0">적립은 포인트를 원으로 환산해 할인과 같은 기준으로 비교합니다.</p>
          <p class="mt-2 mb-0">
            이 가맹점 대상이 아니거나, 지난달 사용액·결제 금액 조건에 못 미치거나, 혜택 한도를 모두
            사용한 혜택은 선정에서 제외되었어요.
          </p>
        </div>
      </Transition>

      <!--
        가맹점과 결제 예정 금액을 한 줄에 둔다. 둘 다 "이 추천이 무엇을 전제로 하는가" 라서다.
        가게 이름이 길면 그쪽이 잘리고 금액은 남는다(`shrink-0`) — 금액이 잘리면 액수를 오해한다.
        금액 화면에서 "아니요" 를 고른 경로에서는 아예 숨긴다. 0원으로 적으면 "0원짜리 결제" 로 읽힌다.
      -->
      <div class="flex flex-none items-center gap-2 bg-white px-5 py-4 text-[13px]">
        <img :src="pickStorePinIcon" alt="" width="15" height="15" class="flex-none" />
        <strong class="min-w-0 truncate font-bold text-ink">{{ selectedStore.storeName }}</strong>
        <template v-if="requestedAmount">
          <img :src="pickWonIcon" alt="" width="15" height="15" class="ml-auto flex-none" />
          <span class="flex-none text-sub">
            결제 예정 금액 <b class="font-bold text-ink">{{ won(Number(requestedAmount)) }}</b>
          </span>
        </template>
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
            <!--
              배지는 **하나만** 붙고 자리는 **오른쪽 위 한 곳**이다 (`PICK_STATUS_STYLE`).
              순위를 아는 카드는 받을 수 있다는 뜻이라 "추천" 을 덧붙일 이유가 없다.
              종류마다 자리를 달리하면 카드를 훑을 때 배지를 두 군데서 찾게 된다.
            -->
            <span v-if="pick.rank" class="pick-status" :style="PICK_STATUS_STYLE">
              {{ pick.rank }}위
            </span>
            <span v-else class="pick-status" :class="pick.status" :style="PICK_STATUS_STYLE">
              {{ pick.statusLabel }}
            </span>
            <!-- 카드 이미지가 있으면 카드 앞면에 이름이 이미 찍혀 있다. 글자를 겹쳐 쓰지 않는다. -->
            <span v-if="!pick.cardImageUrl" class="pick-card-copy">
              <small>{{ pick.issuer }}</small>
              <strong>{{ pick.name }}</strong>
            </span>
          </button>

          <div class="pick-card-info">
            <!--
              혜택 이름과 혜택 내용을 한 줄에. 이름이 길면 이름이 잘리고 내용은 남긴다
              (`20% 할인` 이 잘리면 얼마를 받는지가 사라진다).
            -->
            <div v-if="pick.status === 'recommended'" class="pick-benefit">
              <img :src="benefitGiftIcon" alt="" />
              <strong class="min-w-0 truncate">{{ pick.benefit }}</strong>
              <span v-if="pick.benefitDetail" class="ml-auto flex-none font-bold">
                {{ pick.benefitDetail }}
              </span>
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
      <button type="button" @click="navigateTo('search')">
        <img :src="iconSearchTab" alt="" width="22" height="22" /><span>매장 검색</span>
      </button>
      <button type="button" @click="navigateTo('home')">
        <img :src="iconHome" alt="" width="22" height="22" /><span>결제</span>
      </button>
      <!-- 두 버튼에 핸들러가 없어 이 화면에서 나가는 길이 뒤로가기뿐이었다 (#196). -->
      <button type="button" @click="navigateTo('mycard')">
        <img :src="iconMycard" alt="" width="22" height="22" /><span>카드 내역</span>
      </button>
      <button type="button" @click="navigateTo('report')">
        <img :src="iconReport" alt="" width="22" height="22" /><span>혜택</span>
      </button>
    </nav>

    <Transition name="fade">
      <BaseLocationConsentSheet
        v-if="showConsent"
        :subject="request.title"
        @agreed="onConsentAgreed"
        @close="showConsent = false"
      />
    </Transition>

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
          <!--
            `완료` 버튼을 뺐다 (#212). 6자리를 채우면 자동으로 검증이 나간다.
            칸은 남긴다 — 3×4 격자라 없애면 `0` 이 가운데에서 밀린다.
          -->
          <span class="payment-pin-confirm grid place-items-center" aria-live="polite">
            {{ paymentStore.isVerifyingPin ? '확인 중' : '' }}
          </span>
        </div>
      </section>
    </div>
  </section>
</template>
