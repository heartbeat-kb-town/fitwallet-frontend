<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Menu } from 'lucide-vue-next'
import iconHome from '@/assets/icons/home.svg'
import iconSearchTab from '@/assets/icons/search-tab.svg'
import iconMycardActive from '@/assets/icons/mycard-selected.svg'
import iconReport from '@/assets/icons/report.svg'
import iconCafe from '@/assets/icons/category-cafe.svg'
import iconFood from '@/assets/icons/category-food.svg'
import iconMart from '@/assets/icons/category-mart.svg'
import iconShopping from '@/assets/icons/category-shopping.svg'
import iconHospital from '@/assets/icons/category-hospital.svg'
import iconRefuel from '@/assets/icons/category-refuel.svg'
import iconTransport from '@/assets/icons/potentialbenefit-transportation.svg'
import iconTelecom from '@/assets/icons/category-telecom.svg'
import iconAll from '@/assets/icons/category-all.svg'
import pigFace from '@/assets/icons/pig-face.svg'

import * as cardApi from '@/api/cardApi'
import { useAsyncState } from '@/composables/useAsyncState'
import { useCardImage } from '@/composables/useCardImage'
import { useToast } from '@/composables/useToast'
import { useCardStore } from '@/stores/cardStore'
import { usePaymentStore } from '@/stores/paymentStore'

const route = useRoute()
const router = useRouter()
const cardStore = useCardStore()
const paymentStore = usePaymentStore()

const { markCardImageOrientation, cardImageStyle: fitCardImage } = useCardImage()
const { showToast } = useToast()

// 카드 그림 칸은 두 크기다. 세로 이미지를 눕힐 때 각 칸의 비율이 필요하다.
const CARD_PHOTO_RATIO = 322 / 203 //  .mycard-card-photo
const COMPACT_PHOTO_RATIO = 80 / 50 //  .mycard-compact-card

onMounted(async () => {
  await cardStore.ensureCardsWithImages()
  // 목록이 있어야 카드별로 부를 수 있다. 실패해도 화면은 그대로 뜬다 (store 주석 참고).
  cardStore.ensureLastUsedAt()
})

// 홈 칸은 결제 화면을 연다 (#198). 들어가면 카드 선택부터 시작한다 (#66).
function goHome() {
  paymentStore.reset()
  router.push({ name: 'payment' })
}

// 검색 칸은 홈 화면(검색창·카테고리)을 연다. 라벨만 바뀌었고 가는 곳은 예전 그대로다.
function openSearch() {
  router.push({ name: 'home' })
}

// 돌아올 주소를 통째로 넘긴다 (#61).
function openMyPage() {
  router.push({ name: 'my-page', query: { returnTo: route.fullPath } })
}

function openReport() {
  router.push({ name: 'report' })
}

/**
 * 목록을 아직 못 받았을 때 쓰는 빈 카드.
 *
 * 이 화면은 카드 한 장을 통째로 펼쳐 보여주는 구조라 `activeCard` 가 없으면
 * 템플릿 곳곳에서 터진다. 값을 지어내지 않고 빈 문자열과 0 으로 둔다.
 */
const EMPTY_CARD = {
  id: '',
  issuer: '',
  name: '',
  last4: '',
  type: 'credit',
  amountLabel: '결제 예정 금액',
  amount: 0,
  account: '',
  cardImageUrl: null,
}

/**
 * 카테고리명 → 화면 아이콘.
 *
 * 백엔드가 `categoryImageUrl` 을 함께 주지만 시드에서는 전부 null 이다.
 * URL 이 오면 그걸 쓰고, 없으면 이름으로 로컬 아이콘을 찾는다.
 * 모르는 카테고리는 빈 원으로 두고 이름을 지어내지 않는다.
 */
const CATEGORY_ICONS = {
  '카페/디저트': iconCafe,
  '편의점/마트': iconMart,
  쇼핑: iconShopping,
  푸드: iconFood,
  병원: iconHospital,
  주유: iconRefuel,
  교통: iconTransport,
  통신: iconTelecom,
  전체: iconAll,
}

const activeIndex = ref(0)
const view = ref('main')
const monthIndex = ref(0)
const selectedTier = ref(0)
const touchStartX = ref(0)

/**
 * 조회할 수 있는 월. 최신이 앞이다 (`['2026-08', '2026-07', '2026-06', ...]`).
 *
 * 백엔드가 응답에 실어 주므로 화면이 정하지 않는다. 첫 조회는 `yearMonth` 없이 보내고
 * (백엔드가 현재 월을 쓴다) 그때 받은 목록으로 월 선택기를 채운다.
 *
 * **개수가 정해져 있지 않다.** 백엔드는 이번 달부터 그 카드의 최초 거래 월까지 거래가 없는
 * 달까지 포함해 전부 내려준다 (`CardMonthlyPeriodResolver.createAvailableYearMonths`).
 * 예전에는 3개월로 잘려 있어서 화면에 "최근 3개월" 안내가 붙어 있었다.
 */
const months = ref([])

const {
  data: usage,
  isLoading: isUsageLoading,
  execute: fetchUsage,
} = useAsyncState(cardApi.getCardUsage)

const {
  data: transactionDetail,
  isLoading: isTransactionsLoading,
  execute: fetchTransactions,
} = useAsyncState(cardApi.getCardTransactions)

/**
 * 이어붙인 결제 내역 (#87).
 *
 * 백엔드가 커서 방식이라 한 번에 한 묶음만 온다. `transactionDetail` 은 **마지막 묶음**만
 * 들고 있으므로 화면이 따로 쌓는다. 여기 담기는 것은 백엔드 원본(`content` 한 건)이고
 * 화면용 변환은 `transactions` computed 가 한다.
 */
const loadedTransactions = ref([])
const nextCursor = ref(null)
const hasNextTransactions = ref(false)

/**
 * 다음 묶음 조회. 첫 조회와 **다른 `useAsyncState`** 를 쓴다.
 *
 * 같은 것을 재사용하면 이어붙이는 동안 `isTransactionsLoading` 이 켜져서
 * 목록이 통째로 "불러오는 중이에요" 로 바뀐다. 이미 본 내역이 사라지면 안 된다.
 */
const { isLoading: isLoadingMore, execute: fetchMoreTransactions } = useAsyncState(
  cardApi.getCardTransactions,
)

/**
 * 묶음 하나를 반영한다.
 *
 * @param detail 응답 알맹이. 조회에 실패했으면 null 이 온다.
 * @param append true 면 뒤에 잇고, false 면 갈아끼운다.
 *   **월이나 카드를 바꾸면 반드시 false 다.** 안 그러면 지난달 내역이 섞인다.
 */
function applyTransactionPage(detail, { append }) {
  const page = detail?.transactions
  const content = page?.content ?? []

  loadedTransactions.value = append ? [...loadedTransactions.value, ...content] : content
  hasNextTransactions.value = Boolean(page?.hasNext)
  // 마지막 묶음이면 백엔드가 null 을 준다.
  nextCursor.value = page?.nextCursor ?? null
}

/**
 * 이 화면의 카드 순서는 **최근에 쓴 순**이다 (#176).
 *
 * store 가 주는 순서는 `displayOrder`(또는 카드관리에서 바꾼 순서)라 "요즘 쓰는 카드" 와
 * 관계가 없다. 이 화면이 보여주는 것(이용 실적·최근 이용 내역)은 방금 쓴 카드일수록
 * 궁금한 정보라, 여기서만 다시 세운다.
 *
 * **`cardStore.cards` 자체는 건드리지 않는다.** 그 배열은 결제·가맹점 화면도 함께 보고,
 * `paymentStore` 가 순서 변경을 watch 해서 미리 골라둔 카드를 무효로 만든다.
 * 여기서 정렬을 store 에 밀어 넣으면 가맹점에서 고르고 넘어온 카드가 결제 화면에서 풀린다.
 *
 * 마지막 사용 시각을 모르는 카드(이번 달 결제가 없거나 조회 실패)는 뒤로 보낸다.
 * `sort` 는 안정 정렬이라 그 카드들끼리는 원래 순서가 그대로 남는다.
 */
const cards = computed(() => {
  const lastUsedAt = cardStore.lastUsedAt

  return [...cardStore.cards].sort((a, b) => {
    // ISO 문자열이라 문자열 비교로 시각 순서가 나온다 (store 주석 참고).
    const left = lastUsedAt[a.id] ?? ''
    const right = lastUsedAt[b.id] ?? ''
    if (left === right) return 0
    return left < right ? 1 : -1
  })
})

/**
 * 사용자가 직접 카드를 넘겼는지. 넘긴 뒤에는 화면이 자리를 다시 옮기지 않는다.
 *
 * 마지막 사용 시각은 카드마다 따로 받아오느라 **화면이 뜬 뒤에 늦게 도착하고**,
 * 도착하는 순간 위 정렬이 다시 돌아 목록이 통째로 재배치된다.
 * 그때 자리(index)를 그대로 두면 보던 카드가 다른 카드로 바뀐다.
 */
const hasPickedCard = ref(false)

/**
 * 목록이 바뀔 때 보던 카드를 놓치지 않는다.
 *
 * - 사용자가 고르기 전이면 맨 앞(= 가장 최근에 쓴 카드)을 편다
 * - 고른 뒤라면 **그 카드가 옮겨간 자리**를 찾아 따라간다
 * - 카드가 사라졌으면(해지 등) 맨 앞으로 돌아간다
 */
watch(cards, (list, previous) => {
  if (!hasPickedCard.value) {
    activeIndex.value = 0
    return
  }

  const pickedId = previous?.[activeIndex.value]?.id
  const moved = pickedId ? list.findIndex((card) => card.id === pickedId) : -1
  activeIndex.value = moved >= 0 ? moved : 0
})

/** 펼쳐 놓은 카드 한 장. 목록이 아직 안 왔으면 빈 카드로 그린다. */
const activeCard = computed(() => ({
  ...EMPTY_CARD,
  ...(cards.value[activeIndex.value] ?? {}),
}))

/**
 * 펼친 카드의 선택 월 실적과 결제 내역을 받아온다.
 *
 * 실적과 내역을 함께 부르는 이유: 메인 화면이 둘 다 보여준다.
 * 실패는 각 호출의 `error` 에 담기고 화면은 빈 상태로 그린다 —
 * 하나가 실패해도 나머지는 보여주는 편이 낫다.
 */
async function loadCardDetail() {
  const cardId = activeCard.value.id
  if (!cardId) return

  // 목록을 받기 전이면 yearMonth 를 생략한다. 백엔드가 현재 월로 채우고
  // availableYearMonths 를 함께 내려준다.
  const yearMonth = months.value[monthIndex.value]
  const params = yearMonth ? { yearMonth } : undefined

  const [, detail] = await Promise.all([
    fetchUsage(cardId, params).catch(() => null),
    fetchTransactions(cardId, params).catch(() => null),
  ])

  // 첫 묶음이므로 갈아끼운다. 실패해서 detail 이 null 이어도 비우는 게 맞다 —
  // 카드나 월이 바뀐 상황이라 이전 목록을 그대로 두면 다른 달 내역을 보여주게 된다.
  applyTransactionPage(detail, { append: false })

  const available = usage.value?.availableYearMonths ?? transactionDetail.value?.availableYearMonths
  if (available?.length) months.value = available
}

/**
 * 다음 묶음을 이어붙인다.
 *
 * 커서는 **요청의 카드·연월과 일치해야 한다.** 어긋나면 백엔드가
 * `400 INVALID_TRANSACTION_CURSOR` 를 준다. 그래서 지금 화면이 보고 있는 값으로 다시 만든다.
 */
async function loadMoreTransactions() {
  if (!hasNextTransactions.value || !nextCursor.value) return
  // 첫 조회가 도는 중이면 그 결과가 목록을 갈아끼울 참이라 지금 잇는 것은 의미가 없다.
  if (isLoadingMore.value || isTransactionsLoading.value) return

  const cardId = activeCard.value.id
  const yearMonth = months.value[monthIndex.value]
  if (!cardId) return

  try {
    const detail = await fetchMoreTransactions(cardId, { yearMonth, cursor: nextCursor.value })
    applyTransactionPage(detail, { append: true })
  } catch (error) {
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
  }
}

/**
 * 카드를 바꾸면 그 카드의 실적·내역을 다시 받는다. 월 선택과 구간 선택도 처음으로 돌린다.
 *
 * **`immediate` 가 반드시 필요하다.** `cardStore` 는 목록을 캐시하므로(`ensureCards`),
 * 다른 화면이 먼저 받아둔 뒤 이 화면에 들어오면 `activeCard.id` 가 setup 시점에 이미
 * 채워져 있다. 그러면 값이 "변하지" 않아 watcher 가 안 돌고 첫 진입이 빈 화면이 된다.
 * 목록을 여기서 처음 받는 경로에서는 `'' → id` 로 바뀌어 우연히 동작했다 (#140).
 *
 * 첫 실행에서 목록이 아직 없으면 `cardId` 가 빈 문자열이라 아래 가드에 걸려 그냥 나가고,
 * 목록이 도착할 때 다시 돈다.
 */
watch(
  () => activeCard.value.id,
  (cardId) => {
    if (!cardId) return
    monthIndex.value = 0
    selectedTier.value = 0
    loadCardDetail()
  },
  { immediate: true },
)

watch(monthIndex, loadCardDetail)

// ── 이용 실적 ──────────────────────────────────────────────────────────
// tierType 이 화면 분기의 기준이다. 예전에는 목데이터의 noRequirement / singleTier
// 플래그를 봤는데, 백엔드가 같은 뜻을 열거형 하나로 준다.
const hasNoRequirement = computed(() => usage.value?.tierType === 'NO_REQUIREMENT')
const isSingleTier = computed(() => usage.value?.tierType === 'SINGLE_TIER')

/**
 * 실적을 채웠는지. 백엔드가 판단해서 준다.
 *
 * 예전에는 "기준이 하나뿐인 카드 = 달성" 으로 그렸는데 그건 사실이 아니다.
 * 기준이 하나여도 못 채울 수 있다 (실측: 89,800원 / 기준 300,000원).
 */
const isAchieved = computed(() => usage.value?.performanceStatus === 'ACHIEVED')

const performance = computed(() => Number(usage.value?.usageSummary?.recognizedAmount ?? 0))
const currentTier = computed(() => usage.value?.currentTier?.tierOrder ?? 0)
const remaining = computed(() => Number(usage.value?.amountUntilNextTier ?? 0))
const progress = computed(() => Number(usage.value?.tierProgressRate ?? 0))
const tiers = computed(() => usage.value?.tiers ?? [])

const achievementTitle = computed(() => {
  if (isSingleTier.value) return isAchieved.value ? '전월 실적 달성!' : '실적이 조금 부족해요'
  // 구간이 여럿인데 아직 첫 구간도 못 넘었다. **"0구간 실적 달성!" 은 달성한 것이 없다는 뜻**이라
  // 축하하는 문구가 될 수 없다. 기준이 하나인 카드가 못 채웠을 때와 같은 말을 쓴다.
  if (currentTier.value === 0) return '실적이 조금 부족해요'
  return `${currentTier.value}구간 실적 달성!`
})

const achievementDescription = computed(() => {
  // 다음 구간이 없으면 더 올라갈 곳이 없다. 채웠는지에 따라 문구가 갈린다.
  if (!usage.value?.nextTier) {
    return isAchieved.value ? '다음 달 혜택이 모두 적용될 예정이에요.' : '최고 구간이에요.'
  }
  return `${won(remaining.value)} 추가 이용 시 다음 ${usage.value.nextTier.tierName} 혜택 적용`
})

/**
 * 혜택을 꺼낼 구간.
 *
 * 실적 조건이 없으면 구간이 아니라 `defaultBenefits` 에 담겨 온다.
 * 기준이 하나뿐이면(SINGLE_TIER) 화면에 구간 버튼을 안 띄우므로,
 * 사용자가 실적을 채웠을 때 받는 혜택 — 즉 마지막 구간 — 을 보여준다.
 */
const shownBenefits = computed(() => {
  const list = hasNoRequirement.value
    ? (usage.value?.defaultBenefits ?? [])
    : ((isSingleTier.value ? tiers.value.at(-1) : tiers.value[selectedTier.value])?.benefits ?? [])

  // "스타벅스 환급할인 20%" 처럼 이름과 값을 붙인다. valueLabel 은 백엔드가 만들어 준다
  // (정액 주유 혜택의 리터당 단위 같은 것까지 반영돼 있어 화면이 다시 계산하지 않는다).
  return list.map((benefit) => [benefit.benefitName, benefit.valueLabel].filter(Boolean).join(' '))
})

/**
 * 실적 바에서 `index` 번째 구간이 놓이는 가로 위치(%).
 *
 * **금액 비례가 아니라 순번 등분이다.** 백엔드가 내려주는 `tierProgressRate` 자체가
 * 구간 사이를 같은 너비로 나눠 계산하기 때문이다
 * (`CardUsageTierStateCalculator.calculateProgressRate` — `currentIndex/intervalCount` 기준).
 * 여기서 금액으로 위치를 잡으면 눈금과 돼지 얼굴이 서로 다른 좌표계에 놓여 어긋난다.
 */
function tierPercent(index) {
  const intervals = tiers.value.length - 1
  return intervals > 0 ? (index / intervals) * 100 : 0
}

/**
 * 구간 점의 자리.
 *
 * **아래 구간 라벨과 같은 규칙이다**(`tierLabelStyle`). 점과 라벨이 세로로 맞아야
 * 어느 점이 어느 구간인지 읽힌다. 양 끝은 % 로 두면 원의 절반이 밖으로 나가므로
 * 끝에 붙이고, 가운데만 중앙 정렬한다.
 *
 * 세로 가운데 맞춤(`translateY`)을 여기서 함께 준다 — 인라인 `transform` 이
 * 유틸리티(`-translate-y-1/2`)를 덮어써서 둘로 나누면 한쪽이 죽는다.
 *
 * 예전 눈금은 픽셀 격자에 맞추려고 바 너비를 재고 `ResizeObserver` 까지 달았는데,
 * 그건 **굵기가 있는 선**이라 소수점 좌표에서 번졌기 때문이다. 점은 번질 굵기가 없어
 * % 좌표로 충분하다 — 그 장치를 통째로 걷어냈다.
 */
function tierDotStyle(index) {
  if (index === 0) return { top: '50%', left: '0', transform: 'translateY(-50%)' }
  if (index === tiers.value.length - 1) {
    return { top: '50%', right: '0', transform: 'translateY(-50%)' }
  }
  return {
    top: '50%',
    left: `${tierPercent(index)}%`,
    transform: 'translate(-50%, -50%)',
  }
}

/**
 * 구간 라벨 위치. 가운데 라벨만 눈금에 맞춰 중앙 정렬하고,
 * 양 끝은 바 밖으로 삐져나가지 않게 끝에 붙인다.
 */
function tierLabelStyle(index) {
  if (index === 0) return { left: '0' }
  if (index === tiers.value.length - 1) return { right: '0' }
  return { left: `${tierPercent(index)}%`, transform: 'translateX(-50%)' }
}

/** 구간 버튼 아래 표시할 금액 범위. 최고 구간은 위쪽이 열려 있다. */
function tierRangeLabel(tier) {
  if (!tier) return ''
  const min = won(Number(tier.minimumAmount ?? 0))
  if (tier.maximumAmount == null) return `${min} 이상`
  return `${min} 이상 ~ ${won(Number(tier.maximumAmount))} 미만`
}

// ── 결제 내역 ──────────────────────────────────────────────────────────
/** 백엔드 결제 내역 한 건을 화면이 쓰는 모양으로 옮긴다. */
function toTransaction(item) {
  // paidAt 은 ISO-8601 (2026-07-21T21:16:30). 화면은 날짜와 시각을 따로 쓴다.
  const [date = '', time = ''] = String(item.paidAt ?? '').split('T')
  return {
    id: item.transactionId,
    // 가맹점을 특정하지 못한 거래는 storeName·categoryName 이 null 로 온다.
    merchant: item.storeName ?? '가맹점 미확인',
    date: date.replaceAll('-', '.'),
    time: time.slice(0, 5),
    detail: item.categoryName ?? '',
    amount: Number(item.paymentAmount ?? 0),
    categoryName: item.categoryName,
    categoryImageUrl: item.categoryImageUrl,
    // 실적 미인정일 때만 배지를 띄운다.
    isExcluded: item.performanceIncluded === false,
    // 승인취소 (#218). 매퍼가 performance_included 를
    // `is_eligible = 1 AND transaction_status = 'APPROVED'` 로 계산해서
    // **취소 건은 예외 없이 isExcluded 도 true 다.** 화면에서 취소를 먼저 본다.
    isCanceled: item.transactionStatus === 'CANCELED',
  }
}

// 마지막 묶음이 아니라 지금까지 이어붙인 전부다 (#87).
const transactions = computed(() => loadedTransactions.value.map(toTransaction))
const recentTransactions = computed(() => transactions.value.slice(0, 3))

const groupedTransactions = computed(() => {
  const groups = []
  transactions.value.forEach((transaction) => {
    const last = groups.at(-1)
    if (last?.date === transaction.date) last.items.push(transaction)
    else groups.push({ date: transaction.date, items: [transaction] })
  })
  return groups
})

/* ─── 무한 스크롤 (#87) ──────────────────────────────────────────────────── */

const transactionScroll = ref(null)
const loadMoreAnchor = ref(null)
let loadMoreObserver = null

/**
 * 목록 끝이 보이면 다음 묶음을 부른다.
 *
 * **`root` 를 반드시 넘긴다.** 이 화면은 창이 아니라 `.mycard-transaction-scroll` 안에서
 * 스크롤된다. root 를 비우면 뷰포트를 기준으로 삼아, 컨테이너 안에서 아무리 내려도
 * 감지되지 않는다.
 *
 * 앵커는 `hasNext` 일 때만 그려지므로, 마지막 묶음까지 받으면 사라지고 관찰도 끊긴다.
 */
watch([transactionScroll, loadMoreAnchor], ([root, anchor]) => {
  loadMoreObserver?.disconnect()
  loadMoreObserver = null
  if (!root || !anchor) return

  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreTransactions()
    },
    // 끝에 닿기 전에 미리 부른다. 다 내린 뒤 기다리면 끊겨 보인다.
    { root, rootMargin: '160px' },
  )
  loadMoreObserver.observe(anchor)
})

onBeforeUnmount(() => loadMoreObserver?.disconnect())

/**
 * 화면 상단 금액. 목록을 더해서 만들지 않는다.
 *
 * 현재 월 신용카드는 전날까지 반영된 저장 금액이라 이번 묶음의 합계와 다르다.
 * 커서 방식이라 애초에 화면에 전부 있지도 않다.
 */
const totalAmount = computed(() => Number(transactionDetail.value?.paymentSummary?.amount ?? 0))

function categoryIcon(transaction) {
  return transaction.categoryImageUrl || CATEGORY_ICONS[transaction.categoryName] || ''
}

/** '2026-08' → '2026.08'. 백엔드는 yyyy-MM 으로 주고 화면은 점으로 쓴다. */
const monthLabel = computed(() => (months.value[monthIndex.value] ?? '').replace('-', '.'))
const monthTitle = computed(() => {
  const [year, month] = (months.value[monthIndex.value] ?? '').split('-')
  return year ? `${year}년 ${month}월` : ''
})

function won(value) {
  return `${Math.abs(value).toLocaleString('ko-KR')}원`
}

function selectCard(index) {
  if (index < 0 || index >= cards.value.length) return
  // 사용자가 고른 자리는 늦게 도착한 응답이 덮지 않는다 (`hasPickedCard` 주석 참고).
  hasPickedCard.value = true
  activeIndex.value = index
  selectedTier.value = 0
}

function onTouchStart(event) {
  touchStartX.value = event.touches[0].clientX
}

function onTouchEnd(event) {
  const distance = event.changedTouches[0].clientX - touchStartX.value
  if (distance < -50) selectCard(activeIndex.value + 1)
  if (distance > 50) selectCard(activeIndex.value - 1)
}

function openView(nextView) {
  monthIndex.value = 0
  view.value = nextView
}

function back() {
  if (view.value === 'transactions-from-performance') {
    view.value = 'performance'
    return
  }
  // 메인은 언제나 이번 달을 보여준다. 하위 화면에서 지난달을 보다 나왔는데
  // "최근 이용 내역" 이 그 달로 남아 있으면 어느 달인지 알 수 없다.
  monthIndex.value = 0
  view.value = 'main'
}

function moveMonth(direction) {
  monthIndex.value = Math.max(0, Math.min(months.value.length - 1, monthIndex.value + direction))
}

/** 카드 그림 스타일. 칸 크기가 둘이라 어느 칸인지에 따라 비율을 바꿔 넘긴다. */
function cardImageStyle(card, compact = false) {
  return fitCardImage(card.cardImageUrl, compact ? COMPACT_PHOTO_RATIO : CARD_PHOTO_RATIO)
}

function dateLabel(date) {
  const [year, month, day] = date.split('.').map(Number)
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][
    new Date(year, month - 1, day).getDay()
  ]
  return `${month}월 ${day}일 (${weekday})`
}
</script>

<template>
  <section class="mycard-screen">
    <template v-if="view === 'main'">
      <header class="mycard-header">
        <h1>내 카드</h1>
        <button class="icon-button" type="button" aria-label="메뉴 열기" @click="openMyPage()">
          <Menu :size="23" />
        </button>
      </header>

      <div class="mycard-main-scroll">
        <section class="mycard-hero">
          <div class="mycard-slider" @touchstart="onTouchStart" @touchend="onTouchEnd">
            <button
              class="mycard-arrow left"
              type="button"
              :disabled="activeIndex === 0"
              @click="selectCard(activeIndex - 1)"
            >
              <ChevronLeft :size="17" />
            </button>
            <div class="mycard-card-window">
              <div
                class="mycard-card-track"
                :style="{ transform: `translateX(-${activeIndex * 100}%)` }"
              >
                <div v-for="card in cards" :key="card.id" class="mycard-card-slide">
                  <div class="mycard-card-photo">
                    <img
                      v-if="card.cardImageUrl"
                      :src="card.cardImageUrl"
                      alt=""
                      draggable="false"
                      :style="cardImageStyle(card)"
                      @load="markCardImageOrientation"
                    />
                  </div>
                </div>
              </div>
            </div>
            <button
              class="mycard-arrow right"
              type="button"
              :disabled="activeIndex === cards.length - 1"
              @click="selectCard(activeIndex + 1)"
            >
              <ChevronRight :size="17" />
            </button>
          </div>

          <!--
            금액 옆에 있던 `상세 보기` 를 뺐다 (#204). 아래 `최근 이용 내역` 의 `자세히` 와
            **같은 화면**(`openView('transactions')`)으로 가는 버튼이라, 한 화면에서 같은 곳으로
            가는 길이 둘이었다.
          -->
          <div class="mycard-amount-row">
            <div>
              <span>{{ activeCard.amountLabel }}</span>
              <strong>{{ won(activeCard.amount) }}</strong>
              <small v-if="activeCard.account">{{ activeCard.account }}</small>
            </div>
          </div>

          <div class="mycard-dots">
            <button
              v-for="(_, index) in cards"
              :key="index"
              type="button"
              :class="{ active: index === activeIndex }"
              @click="selectCard(index)"
            ></button>
          </div>
        </section>

        <div class="mycard-panels">
          <section class="mycard-panel">
            <div class="mycard-panel-title">
              <h2>최근 이용 내역</h2>
              <button type="button" @click="openView('transactions')">
                자세히 <ChevronRight :size="14" />
              </button>
            </div>
            <p v-if="isTransactionsLoading" class="px-1 py-4 text-center text-[13px] text-sub">
              불러오는 중이에요
            </p>
            <p
              v-else-if="!recentTransactions.length"
              class="px-1 py-4 text-center text-[13px] text-sub"
            >
              이번 달 이용 내역이 없어요
            </p>
            <div
              v-for="transaction in recentTransactions"
              :key="transaction.id"
              class="mycard-recent-row"
            >
              <div class="mycard-category-icon" :class="{ empty: !categoryIcon(transaction) }">
                <img v-if="categoryIcon(transaction)" :src="categoryIcon(transaction)" alt="" />
              </div>
              <div class="mycard-transaction-copy">
                <strong>{{ transaction.merchant }}</strong>
                <!-- 상세와 같은 toTransaction() 을 쓰므로 취소 표시도 같이 간다 (#218). -->
                <span
                  >{{ transaction.date
                  }}<template v-if="transaction.isCanceled">
                    · <i class="not-italic text-danger">승인취소</i></template
                  ></span
                >
              </div>
              <b :class="{ 'text-muted-deeper line-through': transaction.isCanceled }">{{
                won(transaction.amount)
              }}</b>
            </div>
          </section>

          <section class="mycard-panel performance-preview">
            <div class="mycard-panel-title">
              <h2>이용 실적</h2>
              <button type="button" @click="openView('performance')">
                자세히 <ChevronRight :size="14" />
              </button>
            </div>

            <p v-if="isUsageLoading" class="px-1 py-4 text-center text-[13px] text-sub">
              불러오는 중이에요
            </p>
            <template v-else-if="hasNoRequirement">
              <h3>전월 실적 조건 없음</h3>
              <div class="mycard-achievement">
                <strong>실적을 채우지 않아도 카드 혜택을 받을 수 있어요!</strong>
                <span>사용금액과 관계없이 혜택이 적용돼요.</span>
              </div>
            </template>
            <template v-else>
              <div class="mycard-performance-summary">
                <div>
                  <span>이번 달 실적</span>
                  <strong>{{ won(performance) }}</strong>
                  <small v-if="!isSingleTier && usage?.nextTier">
                    다음 {{ usage.nextTier.tierName }}까지 <b>{{ won(remaining) }}</b> 남음
                  </small>
                </div>
                <em>{{
                  isSingleTier
                    ? isAchieved
                      ? '실적 달성'
                      : '실적 미달'
                    : `${currentTier}구간 달성`
                }}</em>
              </div>
              <div class="mycard-progress-wrap">
                <div class="mycard-progress">
                  <span :style="{ width: `${progress}%` }">
                    <i><img :src="pigFace" alt="" /></i>
                  </span>
                </div>
                <div class="mycard-tier-labels">
                  <span v-for="tier in tiers" :key="tier.tierOrder">
                    {{
                      Number(tier.minimumAmount) === 0
                        ? '0'
                        : `${Math.round(Number(tier.minimumAmount) / 10000)}만`
                    }}
                  </span>
                </div>
              </div>
              <div v-if="isSingleTier" class="mycard-achievement">
                <strong>{{ achievementTitle }}</strong>
                <span>{{ achievementDescription }}</span>
              </div>
            </template>
          </section>
        </div>
      </div>

      <nav class="bottom-nav">
        <button type="button" @click="openSearch()">
          <img :src="iconSearchTab" alt="" width="22" height="22" /><span>매장 검색</span>
        </button>
        <button type="button" @click="goHome()">
          <img :src="iconHome" alt="" width="22" height="22" /><span>홈</span>
        </button>
        <button class="active" type="button">
          <img :src="iconMycardActive" alt="" width="22" height="22" /><span>카드 내역</span>
        </button>
        <button type="button" @click="openReport()">
          <img :src="iconReport" alt="" width="22" height="22" /><span>혜택</span>
        </button>
      </nav>
    </template>

    <template v-else-if="view === 'performance'">
      <header class="mycard-sub-header">
        <button type="button" aria-label="뒤로가기" @click="back">
          <ChevronLeft :size="22" />
        </button>
        <h1>이용 실적·혜택</h1>
        <button type="button" aria-label="메뉴 열기" @click="openMyPage()">
          <Menu :size="22" />
        </button>
      </header>
      <div class="mycard-sub-scroll">
        <section class="mycard-performance-card">
          <div class="mycard-slider">
            <button
              class="mycard-arrow left"
              type="button"
              :disabled="activeIndex === 0"
              @click="selectCard(activeIndex - 1)"
            >
              <ChevronLeft :size="17" />
            </button>
            <div class="mycard-card-window">
              <div
                class="mycard-card-track"
                :style="{ transform: `translateX(-${activeIndex * 100}%)` }"
              >
                <div v-for="card in cards" :key="card.id" class="mycard-card-slide">
                  <div class="mycard-card-photo">
                    <img
                      v-if="card.cardImageUrl"
                      :src="card.cardImageUrl"
                      alt=""
                      :style="cardImageStyle(card)"
                      @load="markCardImageOrientation"
                    />
                  </div>
                </div>
              </div>
            </div>
            <button
              class="mycard-arrow right"
              type="button"
              :disabled="activeIndex === cards.length - 1"
              @click="selectCard(activeIndex + 1)"
            >
              <ChevronRight :size="17" />
            </button>
          </div>
          <h2>{{ activeCard.issuer }} {{ activeCard.name }}</h2>
          <span>{{ activeCard.issuer }}</span>
          <div class="mycard-dots">
            <button
              v-for="(_, index) in cards"
              :key="index"
              type="button"
              :class="{ active: index === activeIndex }"
              @click="selectCard(index)"
            ></button>
          </div>
        </section>

        <div class="mycard-panels performance-panels">
          <section class="mycard-panel">
            <div class="mycard-month-selector">
              <button
                type="button"
                :disabled="monthIndex >= months.length - 1"
                @click="moveMonth(1)"
              >
                <ChevronLeft :size="16" />
              </button>
              <strong>{{ monthTitle }}</strong>
              <button type="button" :disabled="monthIndex === 0" @click="moveMonth(-1)">
                <ChevronRight :size="16" />
              </button>
            </div>

            <p v-if="isUsageLoading" class="px-1 py-4 text-center text-[13px] text-sub">
              불러오는 중이에요
            </p>
            <template v-else-if="hasNoRequirement">
              <h3>전월 실적 조건 없음</h3>
              <div class="mycard-achievement">
                <strong>실적을 채우지 않아도 카드 혜택을 받을 수 있어요!</strong>
                <span>사용금액과 관계없이 혜택이 적용돼요.</span>
              </div>
            </template>
            <template v-else>
              <button
                class="mycard-performance-link"
                type="button"
                @click="view = 'transactions-from-performance'"
              >
                <span>실적 인정 금액</span>
                <strong>{{ won(performance) }} <ChevronRight :size="15" /></strong>
              </button>
              <div class="mycard-progress-wrap detail">
                <!--
                  구간마다 점 하나씩이다 (#204). 예전에는 한 줄짜리 바에 노란 채움과 경계
                  눈금을 그렸는데, **이 값은 금액 비례가 아니라 구간 순번 등분**이라
                  (`tierPercent` 주석) 연속된 막대가 금액이 차오르는 것처럼 잘못 읽혔다.

                  높이는 픽피 원(32px)이 정한다. 점은 그 안에서 세로 가운데에 놓인다.
                -->
                <!--
                  바는 그대로다 — 채운 만큼 노랑, 나머지는 회색 트랙(`.mycard-progress`).
                  **바뀐 것은 구간 표시다** (#204). 예전에는 검은 작대기를 그었는데
                  피그마(`node-id=161-1365`)의 원으로 바꿨다.
                -->
                <div class="relative">
                  <div class="mycard-progress">
                    <span :style="{ width: `${progress}%` }"
                      ><i class="z-10"
                        ><!--
                          픽피가 원 안에서 오른쪽으로 치우쳐 보인다. **상자는 이미 정중앙이다** —
                          `pig-face.svg` 안에 든 512×512 PNG 에서 **그림 자체가** 캔버스 중심보다
                          오른쪽에 그려져 있다. 알파 경계를 재 보니 가로로 +3.5% 였다.
                          `object-position` 은 안 통한다 — 정사각 그림이 정사각 칸을 꽉 채워
                          움직일 여백이 없다. 그래서 그림을 그만큼 되민다.
                        --><img
                          :src="pigFace"
                          alt=""
                          class="size-full -translate-x-[3.5%] object-contain" /></i
                    ></span>
                  </div>

                  <!--
                    아직 못 간 구간에만 원을 찍는다. 지나온 구간은 노란 채움이 이미 덮고 있어서
                    원을 겹쳐 놓으면 채움 위에 자국만 남는다.

                    흰 테두리는 피그마 원(10.4px, 안쪽 2.08px)을 따른 것이다 — `box-sizing`
                    이 border-box 라 테두리가 안쪽으로 들어가 바깥 지름이 그대로 유지된다.
                    회색 트랙 위에서 이 흰 테두리가 원을 트랙과 갈라 준다.
                  -->
                  <span
                    v-for="(tier, index) in tiers"
                    v-show="index > currentTier"
                    :key="tier.tierOrder"
                    class="absolute size-[10px] rounded-full border-2 border-white bg-muted"
                    :style="tierDotStyle(index)"
                  ></span>
                </div>
                <!-- 라벨은 바에 붙이고(12px) 아래를 넉넉히 띄운다(16px). 12px 은 돼지 얼굴이
                     바 아래로 내려오는 11px 을 겨우 비키는 값이라 더 줄이면 겹친다. -->
                <div class="relative mt-3 mb-4 h-[15px]">
                  <span
                    v-for="(tier, index) in tiers"
                    :key="tier.tierOrder"
                    class="absolute text-[11px] leading-[15px] whitespace-nowrap text-muted-deep"
                    :style="tierLabelStyle(index)"
                    >{{ tier.tierName }}</span
                  >
                </div>
              </div>
              <div class="mycard-achievement">
                <strong>{{ achievementTitle }}</strong>
                <span>{{ achievementDescription }}</span>
              </div>
            </template>
            <p class="mycard-notice">
              ※ 실적 인정 금액은 전표 접수 시간에 따라 바뀔 수 있으며, 할인된 등록 혜택은 이용
              실적에서 제외될 수 있습니다.
            </p>
            <p class="mycard-notice">※ 거래가 있는 달부터 이번 달까지 볼 수 있습니다.</p>
          </section>

          <section class="mycard-panel benefit-tier-panel">
            <h2>
              {{ hasNoRequirement || isSingleTier ? '혜택 내용' : '구간별 혜택 내용' }}
            </h2>
            <div v-if="!hasNoRequirement && !isSingleTier" class="mycard-tier-buttons">
              <button
                v-for="(tier, index) in tiers"
                :key="tier.tierOrder"
                type="button"
                :class="{ active: selectedTier === index }"
                @click="selectedTier = index"
              >
                {{ tier.tierOrder }}
              </button>
            </div>
            <p v-if="!hasNoRequirement && !isSingleTier" class="mycard-benefit-range">
              ({{ tierRangeLabel(tiers[selectedTier]) }})
            </p>
            <ul>
              <li v-for="benefit in shownBenefits" :key="benefit">
                <i></i><span>{{ benefit }}</span>
              </li>
            </ul>
            <p
              v-if="!isUsageLoading && !shownBenefits.length"
              class="px-1 py-3 text-center text-[13px] text-sub"
            >
              이 구간에 적용되는 혜택이 없어요
            </p>
          </section>
        </div>
      </div>
    </template>

    <template v-else>
      <header class="mycard-sub-header">
        <button type="button" aria-label="뒤로가기" @click="back">
          <ChevronLeft :size="22" />
        </button>
        <h1>카드별 세부 결제 내역</h1>
        <button type="button" aria-label="메뉴 열기" @click="openMyPage()">
          <Menu :size="22" />
        </button>
      </header>
      <div ref="transactionScroll" class="mycard-transaction-scroll">
        <section class="mycard-transaction-summary">
          <div class="mycard-compact-card">
            <img
              v-if="activeCard.cardImageUrl"
              :src="activeCard.cardImageUrl"
              alt=""
              :style="cardImageStyle(activeCard, true)"
              @load="markCardImageOrientation"
            />
          </div>
          <div class="mycard-summary-copy">
            <strong>{{ activeCard.issuer }} {{ activeCard.name }}</strong>
            <span>****{{ activeCard.last4 }}</span>
            <!--
              월 표시 점을 뺐다 (#216). 바로 옆 월 선택기가 `2026.07` 로 같은 것을 말하고,
              점 개수가 availableYearMonths 길이라 월이 늘수록 카드 번호 밑을 채웠다.
            -->
          </div>
          <div class="mycard-month-selector compact">
            <button type="button" :disabled="monthIndex >= months.length - 1" @click="moveMonth(1)">
              <ChevronLeft :size="14" />
            </button>
            <strong>{{ monthLabel }}</strong>
            <button type="button" :disabled="monthIndex === 0" @click="moveMonth(-1)">
              <ChevronRight :size="14" />
            </button>
          </div>
          <div class="mycard-total">
            <span>{{ activeCard.type === 'credit' ? '결제 예정 금액' : '이번 달 사용 금액' }}</span>
            <strong>{{ won(totalAmount) }}</strong>
          </div>
        </section>

        <!--
          조회 범위 안내. **목록 위에 둔다** (#137). 예전에는 목록 맨 아래에 있었는데,
          "왜 더 예전 게 없지" 를 궁금해하는 시점은 목록을 다 읽은 뒤가 아니라 읽기 시작할 때다.
          내역이 많으면 끝까지 내려야 보여서 사실상 안 보였다.

          목록 끝 표시가 아니라 이 화면이 무엇을 보여주는지에 대한 안내라서,
          불러오는 중이든 내역이 없든 조건 없이 보여준다.
        -->
        <p class="mycard-history-notice">거래가 있는 달부터 이번 달까지 제공합니다.</p>

        <p v-if="isTransactionsLoading" class="py-6 text-center text-[13px] text-sub">
          불러오는 중이에요
        </p>
        <p v-else-if="!groupedTransactions.length" class="py-6 text-center text-[13px] text-sub">
          이 달에는 이용 내역이 없어요
        </p>

        <section v-for="group in groupedTransactions" :key="group.date" class="mycard-date-group">
          <h2>{{ dateLabel(group.date) }}</h2>
          <div>
            <article v-for="transaction in group.items" :key="transaction.id">
              <div
                class="mycard-category-icon large"
                :class="{ empty: !categoryIcon(transaction) }"
              >
                <img v-if="categoryIcon(transaction)" :src="categoryIcon(transaction)" alt="" />
              </div>
              <div class="mycard-transaction-copy">
                <strong>{{ transaction.merchant }}</strong>
                <!--
                  `승인취소` 를 span 안에 넣되 태그는 i 다. `.mycard-transaction-copy span` 이
                  후손 선택자라 중첩 span 까지 #b0a89e 로 칠하는데, style.css 는 레이어 밖이라
                  Tailwind 로 못 이긴다. i 는 그 선택자에 안 걸린다.
                -->
                <span
                  >{{ transaction.time
                  }}<template v-if="transaction.detail"> · {{ transaction.detail }}</template
                  ><template v-if="transaction.isCanceled">
                    · <i class="not-italic text-danger">승인취소</i></template
                  ></span
                >
                <!-- 취소 건은 늘 실적 미인정이다. 배지를 같이 띄우면 항상 두 개가 뜬다. -->
                <em v-if="transaction.isExcluded && !transaction.isCanceled">실적 미인정 건</em>
              </div>
              <b :class="{ 'text-muted-deeper line-through': transaction.isCanceled }">{{
                won(transaction.amount)
              }}</b>
            </article>
          </div>
        </section>
        <!-- 목록 끝. 보이면 다음 묶음을 부른다.
             IntersectionObserver 가 안 먹는 상황에도 손으로 더 볼 수 있게 버튼으로 둔다. -->
        <button
          v-if="hasNextTransactions"
          ref="loadMoreAnchor"
          type="button"
          class="w-full py-4 text-center text-[13px] text-sub"
          :disabled="isLoadingMore"
          @click="loadMoreTransactions"
        >
          {{ isLoadingMore ? '더 불러오는 중이에요' : '더 보기' }}
        </button>
      </div>
    </template>
  </section>
</template>
