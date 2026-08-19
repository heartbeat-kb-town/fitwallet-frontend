<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Menu,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Info,
  Smartphone,
  CreditCard,
} from 'lucide-vue-next'
import iconHome from '@/assets/icons/home.svg'
import iconPayment from '@/assets/icons/payment.svg'
import iconMycard from '@/assets/icons/mycard.svg'
import iconReportActive from '@/assets/icons/report-selected.svg'
import iconFood from '@/assets/icons/category-food.svg'
import iconCafe from '@/assets/icons/category-cafe.svg'
import iconMart from '@/assets/icons/category-mart.svg'
import iconShopping from '@/assets/icons/category-shopping.svg'
import iconRefuel from '@/assets/icons/category-refuel.svg'
import iconTransport from '@/assets/icons/potentialbenefit-transportation.svg'
// 포인트 적립임을 알리는 Ⓟ 배지. 원화 금액과 한눈에 갈리게 숫자 앞에 붙인다.
import iconPointBadge from '@/assets/icons/point-badge.svg'
// 놓친 혜택 히어로에 걸터앉는 픽피. 우는 얼굴은 `pig-cry` 와 같고 앞발이 더 붙어 있다.
import pigCryPeek from '@/assets/icons/pig-cry-peek.svg'
/**
 * 받은 혜택 카드의 웃는 픽피.
 *
 * `pig-peek`(홈 헤더용, 앞발 없음) 대신 **앞발이 그려진 에셋**을 쓴다. `pig-cry-peek` 과
 * 같은 자세라 두 카드가 위아래로 붙었을 때 한 쌍으로 읽힌다.
 *
 * 두 에셋은 캔버스 비율이 다르다 (54×56 대 406×465). **몸통이 캔버스에서 차지하는 비율이
 * 달라서**(54/56 대 424/465) 같은 `width` 를 주면 앞발까지 포함한 전체 높이는 다르지만
 * 몸통은 같은 크기로 그려진다. 그래서 두 카드 모두 `w-[62px]` 하나로 맞춘다.
 */
import pigSmilePeek from '@/assets/icons/pig-smile-peek.svg'

import BaseSpinner from '@/components/common/BaseSpinner.vue'
import CardBenefitStatusSection from '@/components/card/CardBenefitStatusSection.vue'
import { useCardImage } from '@/composables/useCardImage'
import { useToast } from '@/composables/useToast'
import { useCardStore } from '@/stores/cardStore'
import { usePaymentStore } from '@/stores/paymentStore'
import { useReportStore } from '@/stores/reportStore'

const route = useRoute()
const router = useRouter()
const cardStore = useCardStore()
const paymentStore = usePaymentStore()
const reportStore = useReportStore()
const { showToast } = useToast()
const { markCardImageOrientation, cardImageStyle } = useCardImage()

// 어느 카드의 상세를 볼지는 URL 이 정한다 (#59). 없으면 전체 리포트.
const initialCardId = typeof route.query.cardId === 'string' ? route.query.cardId : ''

// 돌아올 주소를 통째로 넘긴다 (#61).
function openMyPage() {
  router.push({ name: 'my-page', query: { returnTo: route.fullPath } })
}

// 하단 탭. 이제 전부 라우트다.
function navigate(target) {
  if (target === 'payment') {
    // 결제 탭으로 들어가면 카드 선택부터 시작한다 (#66).
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

const page = ref(initialCardId ? 'received' : 'main')
// 백엔드 LossType enum 이름을 그대로 쓴다 (LOSS_TYPES 주석 참고).
const missedTab = ref('APP_UNUSED')
const expanded = ref(new Set())
const selectedCard = ref(0)

/** 받은 혜택 설명을 펼쳤나. 이 화면 안에서만 쓰는 상태라 store 로 올리지 않는다. */
const isBenefitInfoOpen = ref(false)
const toast = ref('')
let toastTimer

// 원 단위로 반올림한다. 백엔드 금액은 BigDecimal 이라 소수가 섞여 온다
// (카드 추천의 expectedBenefit 이 지출액 × 할인율이라 501,969.6 처럼 나온다).
function won(value) {
  return `${Math.round(Number(value)).toLocaleString('ko-KR')}원`
}

/* ─── 조회 기간 ──────────────────────────────────────────────────────────── */

// 기준은 오늘이다. 예전에는 3월이 하드코딩돼 있었고 버튼을 눌러도 숫자만 바뀌었다.
const today = new Date()

/**
 * 조회 기간. **두 카드가 각자의 달을 본다.**
 *
 * 월 선택기가 카드 안에 있으므로 하나를 돌리면 그 카드만 바뀌는 것이 자연스럽다.
 * 받은 혜택은 6월을 보면서 놓친 혜택은 7월을 보는 식으로 겹쳐 볼 수 있다.
 *
 * 상세 화면에는 월 선택기가 없다. 받은 혜택 상세는 `receivedCursor` 를,
 * 놓친 혜택 상세는 `missedCursor` 를 따라간다 — 들어온 카드의 달을 그대로 잇는다.
 */
const receivedCursor = ref({ year: today.getFullYear(), month: today.getMonth() + 1 })
const missedCursor = ref({ year: today.getFullYear(), month: today.getMonth() + 1 })

// 백엔드가 DATE_FORMAT(paid_at, '%Y-%m') 과 문자열로 비교한다.
// `2026-8` 처럼 0 을 빼면 에러 없이 조용히 0건이 되므로 두 자리로 맞춘다.
function toYearMonth({ year, month }) {
  return `${year}-${String(month).padStart(2, '0')}`
}

const receivedYearMonth = computed(() => toYearMonth(receivedCursor.value))
const missedYearMonth = computed(() => toYearMonth(missedCursor.value))

// 미래 달에는 결제가 있을 수 없다. 이번 달이면 다음 달 버튼을 잠근다.
function isThisMonth({ year, month }) {
  return year === today.getFullYear() && month === today.getMonth() + 1
}

const isReceivedCurrentMonth = computed(() => isThisMonth(receivedCursor.value))
const isMissedCurrentMonth = computed(() => isThisMonth(missedCursor.value))

/** 달을 옮긴다. 1월 ↔ 12월 을 넘길 때 연도까지 같이 움직여야 해서 Date 에 맡긴다. */
function shiftMonth(cursor, delta) {
  if (delta > 0 && isThisMonth(cursor.value)) return
  const shifted = new Date(cursor.value.year, cursor.value.month - 1 + delta, 1)
  cursor.value = { year: shifted.getFullYear(), month: shifted.getMonth() + 1 }
}

// 템플릿에서는 ref 가 벗겨져 넘어가므로 카드마다 함수를 따로 둔다.
const shiftReceivedMonth = (delta) => shiftMonth(receivedCursor, delta)
const shiftMissedMonth = (delta) => shiftMonth(missedCursor, delta)

/* ─── 리포트 요약 (API) ──────────────────────────────────────────────────── */

const summary = computed(() => reportStore.summary)

/**
 * 요약을 한 번이라도 받아 봤나.
 *
 * **전체 스피너는 처음 들어왔을 때만 쓴다.** 월을 바꿀 때마다 본문을 스피너로 갈아치우면
 * 스크롤 영역의 내용이 통째로 사라져 **높이가 0 이 되고, 스크롤이 맨 위로 튄다.**
 * 아래쪽 놓친 혜택 카드에서 월을 넘기면 화면이 리포트 꼭대기로 올라가 버렸다.
 *
 * 두 번째부터는 내용을 그대로 둔 채 숫자만 갈린다. 조회 중이라는 것은 `aria-busy` 로 알린다.
 */
const hasLoadedSummary = ref(false)

/** 이미 내용이 떠 있는 상태에서 다시 조회 중인가. 스피너 대신 이걸로 표시한다. */
const isRefreshing = computed(() => reportStore.isLoading && hasLoadedSummary.value)

/**
 * 요약은 **받은 혜택의 달**을 따라간다.
 *
 * 이 응답에서 실제로 쓰는 것은 `totalReceivedBenefit` 과 카드 추천뿐이다.
 * 놓친 혜택 총액도 들어 있지만 쓰지 않는다 — 그 카드는 자기 달의
 * `/report/benefit/missed` 응답을 쓴다(`totalMissed` 주석 참고).
 */
async function loadSummary() {
  try {
    await reportStore.fetchSummary(receivedYearMonth.value)
    hasLoadedSummary.value = true
  } catch (error) {
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
  }
}

// 달이 바뀌면 다시 조회한다. 화면에 들어올 때도 여기서 한 번 돈다.
watch(receivedYearMonth, loadSummary, { immediate: true })

/* ─── 받은 혜택 카드 (할인·포인트 분리) ─────────────────────────────────── */

/**
 * 받은 혜택을 할인과 포인트로 나눈 값.
 *
 * **요약 API 에 이 분리가 없어서** 보유 카드마다 상세를 불러 합산한다
 * (`reportStore.fetchReceivedSplit` 주석 참고). 카드가 5장이면 요청이 5개 나간다.
 */
const receivedSplit = computed(() => reportStore.receivedSplit)

/** 카드 목록이 온 뒤에야 부를 수 있다. 목록이 비면 부를 것이 없으니 그냥 둔다. */
const userCardIds = computed(() => cardStore.cards.map((card) => card.id))

async function loadReceivedSplit() {
  if (!userCardIds.value.length) return
  try {
    await reportStore.fetchReceivedSplit(userCardIds.value, receivedYearMonth.value)
  } catch (error) {
    // 두 줄이 0 으로 남을 뿐 총액은 요약이 들고 있다. 화면 전체를 막지 않는다.
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
  }
}

// 달이 바뀌거나 카드 목록이 도착하면 다시 합산한다.
watch([receivedYearMonth, userCardIds], loadReceivedSplit, { immediate: true })

/** 카드 추천. 이것도 서비스가 예상 혜택 내림차순 상위 2건으로 잘라서 준다. */
const recommendations = computed(() => summary.value.recommendations)

/**
 * 추천 카드 그림 칸(`.recommendation-visual`)의 비율. style.css 의 96×64 를 그대로 옮겼다.
 * 세로 이미지를 눕힐 때 쓰는 값이라 칸의 비율이지 카드의 비율이 아니다.
 */
const RECOMMENDATION_VISUAL_RATIO = 96 / 64

/** 세로 카드 이미지를 눕히는 처리는 `useCardImage` 가 한다 (#97). */
function recommendationImageStyle(card) {
  return cardImageStyle(card.cardImageUrl, RECOMMENDATION_VISUAL_RATIO)
}

/**
 * 추천 카드의 키워드.
 *
 * **카드 상품에 키워드 컬럼이 없다.** 백엔드 스키마의 `keyword` 는 검색 기록용이고
 * 카드와 무관하다. 대신 추천 응답의 `description` 이 이미 키워드를 이어 붙인 한 줄이라
 * 그것을 도로 조각낸다 — 없는 것을 지어내지 않고 오는 값만 쓴다.
 *
 * 백엔드가 만드는 모양은 이렇다 (`DefaultBenefitReportService.buildDescription`):
 *
 *     {카테고리} {N% 할인|N% 적립|N원 할인|N포인트 적립}
 *     [, 전월 실적 N원 이상]
 *     [, 월 최대 N원|N포인트|N회 한도]
 *
 * ⚠️ **쉼표만으로 자르면 안 된다.** 금액을 `%,d` 로 찍어서 `전월 실적 300,000원 이상`
 * 처럼 천 단위 쉼표가 섞여 있고, 그 쉼표 뒤에는 공백이 없다. 조각 사이 구분자만
 * `, `(쉼표+공백)이므로 그것으로 자른다. 카테고리명에는 쉼표가 없다(`카페/디저트` 처럼
 * 슬래시를 쓴다).
 */
function recommendationKeywords(description) {
  return String(description ?? '')
    .split(', ')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

/* ─── 받은 혜택 상세 (API) ──────────────────────────────────────────────── */

/**
 * 캐러셀에 세울 카드. **보유 카드는 `cardStore` 하나에서만 나온다** (#76).
 * 이 화면이 자체 배열을 두지 않는다.
 */
const receivedCards = computed(() => cardStore.cards)

/** 지금 보고 있는 카드 한 장의 상세. 카드나 월이 바뀔 때마다 다시 받는다. */
const cardDetail = computed(() => reportStore.cardDetail)

/**
 * 카드 그림 칸(`.received-card-visual`)의 비율. `style.css` 의 85.6/53.98 을 그대로 옮겼다.
 * 세로 이미지를 눕힐 때 쓰는 값이라 칸의 비율이지 카드의 비율이 아니다.
 */
const RECEIVED_VISUAL_RATIO = 85.6 / 53.98

/**
 * 카드 그림 칸을 이미지에 맞게 손본다. `style.css` 가 동결이라 인라인으로 덮는다.
 *
 * - `position: relative` 가 **반드시 필요하다.** `cardImageStyle` 이 `position: absolute` 를
 *   주므로, 칸이 기준이 아니면 이미지가 화면 전체로 퍼진다.
 * - `padding` 은 카드명을 적으려고 24px 가 잡혀 있다. 두면 이미지가 안쪽으로 밀려 모서리에
 *   배경이 비친다.
 */
const RECEIVED_VISUAL_IMAGE_STYLE = {
  position: 'relative',
  padding: '0',
  overflow: 'hidden',
}

function receivedImageStyle(card) {
  return cardImageStyle(card?.cardImageUrl, RECEIVED_VISUAL_RATIO)
}

/**
 * 이 화면의 금액 표기는 `₩12,500` 이다. 리포트 메인의 `12,500원` 과 다르다 —
 * 피그마 `받은 혜택 리포트` 가 원화 기호를 쓰고, 옆에 붙는 포인트(`4,000P`)와
 * 단위가 한눈에 갈려야 하기 때문이다.
 */
function currency(value) {
  return `₩${Math.round(Number(value)).toLocaleString('ko-KR')}`
}

function points(value) {
  return `${Math.round(Number(value)).toLocaleString('ko-KR')}P`
}

/**
 * 리포트 메인 포인트 칸의 숫자.
 *
 * 여기서는 **뒤에 `P` 를 붙이지 않는다.** 앞에 Ⓟ 배지가 붙어 단위가 이미 드러나고,
 * 디자인도 배지 + 숫자다. 상세 화면의 `points()` 는 배지 없이 쓰이는 자리라 그대로 둔다.
 */
function pointNumber(value) {
  return Math.round(Number(value)).toLocaleString('ko-KR')
}

/** `2026-07-15T21:16:30` → `07.15`. 줄이 좁아 연도는 적지 않는다. */
function transactionDate(approvedAt) {
  const [date = ''] = String(approvedAt ?? '').split('T')
  const [, month = '', day = ''] = date.split('-')
  return month && day ? `${month}.${day}` : ''
}

/** 포인트 적립인가. 단위를 지어내지 않고 백엔드 `BenefitType` 으로 가른다. */
function isPointBenefit(item) {
  return item.benefitType === 'ACCUMULATE'
}

/**
 * 거래 한 건의 혜택 설명. `7% 할인` · `3% 포인트 적립` 처럼 만든다.
 *
 * **`benefitRate` 는 정액(FIXED) 혜택이면 null 이다.** 0 으로 눌러 `0% 할인` 으로 적으면
 * 혜택을 못 받은 것처럼 보이므로, 그때는 비율을 빼고 종류만 적는다.
 */
function benefitKindLabel(item) {
  const kind = isPointBenefit(item) ? '포인트 적립' : '할인'
  return item.benefitRate == null ? kind : `${item.benefitRate}% ${kind}`
}

/**
 * 카테고리 줄의 오른쪽 숫자.
 *
 * 원화와 포인트를 **합치지 않는다.** 단위가 다르다. 둘 다 받은 카테고리는 두 줄로 적는다.
 */
function categoryAmounts(category) {
  const amounts = []
  if (category.discountAmount)
    amounts.push({ isPoint: false, label: currency(category.discountAmount) })
  if (category.pointAmount) amounts.push({ isPoint: true, label: points(category.pointAmount) })
  // 매퍼가 혜택 받은 결제만 주므로 보통 하나는 찬다. 비면 0 원으로 둔다.
  return amounts.length ? amounts : [{ isPoint: false, label: currency(0) }]
}

/**
 * 카테고리명 → 아이콘.
 *
 * 백엔드가 카테고리 이미지 URL 을 주지 않는 응답이라 이름으로 찾는다.
 * 모르는 카테고리는 빈 원으로 두고 아이콘을 지어내지 않는다 (`MyCardView` 와 같은 방침).
 */
const CATEGORY_ICONS = {
  '카페/디저트': iconCafe,
  '편의점/마트': iconMart,
  쇼핑: iconShopping,
  푸드: iconFood,
  주유: iconRefuel,
  교통: iconTransport,
  외식: iconFood,
  마트: iconMart,
  카페: iconCafe,
}

function categoryIcon(categoryName) {
  return CATEGORY_ICONS[categoryName] ?? ''
}

/** 지금 고른 카드. 목록이 아직 안 왔으면 없다. */
const currentUserCardId = computed(() => receivedCards.value[selectedCard.value]?.id ?? '')

async function loadCardDetail() {
  const userCardId = currentUserCardId.value
  if (!userCardId) return
  try {
    await reportStore.fetchCardDetail(userCardId, receivedYearMonth.value)
  } catch (error) {
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
  }
}

// 카드를 바꾸거나 달을 옮기면 다시 받는다. 상세를 열어둔 채 달을 바꿔도 따라오고,
// 목록이 도착해 카드가 처음 정해지는 순간에도 여기서 돈다.
watch([currentUserCardId, receivedYearMonth], loadCardDetail, { immediate: true })

/* ─── 놓친 혜택 상세 (API) ──────────────────────────────────────────────── */

/**
 * 손실 유형 탭. 값이 그대로 백엔드 `LossType` enum 이름이다.
 *
 * 예전에는 `'app'` / `'card'` 였는데 요청 파라미터로 옮기는 자리에서 한 번 더 번역해야 했다.
 * 어휘를 하나로 두면 그 매핑 표가 필요 없다. 백엔드는 이 문자열 그대로만 받는다 —
 * 소문자로 보내면 enum 변환에 실패해 400 이다.
 */
const LOSS_TYPES = {
  APP_UNUSED: {
    label: '앱 미사용 손실',
    info: '앱을 사용하지 않아 놓친 혜택이에요. 앱을 통해 결제했다면 받을 수 있었던 혜택이에요. 다음부터는 앱에서 최적 카드를 확인한 후 결제해 보세요.',
  },
  CARD_MISMATCH: {
    label: '카드 선택 손실',
    info: '다른 카드를 선택해서 놓친 혜택이에요. 앱을 이용했지만 더 나은 혜택 카드를 선택하지 않아 놓쳤어요. 결제 전 추천 카드를 꼭 확인해 보세요.',
  },
}

const missedDetail = computed(() => reportStore.missedDetail)

/**
 * 히어로 바탕색.
 *
 * 기존 금색 그라데이션(`#ffcc00 → #ffe999`)을 걷어내고 옅은 크림 단색으로 둔다.
 * 그라데이션 위에 무엇을 얹어도 금색으로 물들어 바꾼 티가 나지 않았다.
 *
 * **값을 적지 않고 토큰을 참조한다**(`--color-icon-bg` = `#fff8e5`).
 * 인라인 style 이라 유틸리티 클래스를 못 쓰지만 `var()` 는 그대로 해석된다.
 *
 * 글씨 대비는 넉넉하다 — `style.css` 의 라벨 `#7a4800` 이 7.2:1,
 * 총액 `#3a2200` 이 14.2:1 이라 색을 덮을 필요가 없다.
 */
const MISSED_HERO_BACKGROUND = 'var(--color-icon-bg)'

/**
 * "카드 선택 손실" 칸에 걸터앉은 픽피.
 *
 * 이 그림은 앞발이 아래쪽에 따로 그려져 있어서, 무언가의 **윗변에 걸친** 모습으로
 * 쓰라고 만들어진 에셋이다. 그래서 아래 칸 위에 얹는다.
 *
 * 위치는 `.missed-hero` 의 `style.css` 값에서 계산했다.
 *   패딩 20 + 라벨 14 + h2(마진 4 + 34 + 15) = 87 → 아래 칸의 윗변
 *   히어로 높이 ≈ 166 이므로 아래에서 79px 지점이다
 * `bottom: 69px` 은 그 윗변보다 10px 아래, 즉 칸에 **10px 걸치게** 한다.
 * 위가 아니라 아래를 기준으로 잡아야 칸 높이가 흔들려도 걸친 정도가 유지된다.
 *
 * `zIndex` 가 글씨(`relative`)보다 위다. 뒤에 두면 앞발이 칸 밑으로 숨어
 * "얹은" 것이 아니라 잘린 것처럼 보인다. 10px 은 칸의 위쪽 패딩(11px) 안이라
 * 글자를 가리지 않는다.
 *
 * 장식이므로 `aria-hidden` 이고, 칸을 넘치는 만큼은 `overflow: hidden` 이 잘라낸다.
 */
const MISSED_HERO_PIG_STYLE = {
  position: 'absolute',
  bottom: '69px',
  right: '36px',
  width: '77px', // 원본 406×465 비율 유지
  height: '88px',
  zIndex: 2,
}

/** 안내 문구는 서버가 주지 않는다. 손실 유형을 설명하는 고정 카피라 화면이 들고 있다. */
const missedInfo = computed(() => LOSS_TYPES[missedTab.value]?.info ?? '')

async function loadMissedDetail() {
  try {
    await reportStore.fetchMissedDetail(missedYearMonth.value, missedTab.value)
  } catch (error) {
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
  }
}

// 탭을 바꾸거나 달을 옮기면 다시 받는다.
//
// **메인에서도 부른다.** 놓친 혜택 카드의 `앱 미사용 손실` · `카드 선택 손실` 두 줄이
// 이 응답에만 있다(요약 API 는 총액 하나뿐). 두 값은 `lossType` 과 무관하게 늘 같아서
// 메인에서는 지금 탭 값 그대로 한 번만 부르면 된다.
watch(
  [missedTab, missedYearMonth, page],
  () => {
    if (page.value === 'received') return
    loadMissedDetail()
  },
  { immediate: true },
)

/**
 * 가맹점 이름.
 *
 * **자주 비어 있다.** 백엔드 매퍼가 `brand.brand_name` 을 LEFT JOIN 으로 읽는데
 * 시드 가맹점 244곳 중 195곳에 `brand_id` 가 없다. `store.store_name` 은 NOT NULL 로
 * 있는데도 매퍼가 읽지 않는다 (`CardBenefitMapper` 도 같다).
 *
 * 빈 줄로 두면 결제 내역 한 줄이 통째로 비어 보이므로 모른다고 적는다.
 * 카테고리명 같은 걸 대신 넣지 않는다 — 가게 이름인 척하게 된다.
 */
function storeLabel(storeName) {
  return storeName || '가맹점 정보 없음'
}

/**
 * "더 나았을 카드" 줄에 붙는 혜택 설명.
 *
 * `discountRate` 는 `alternative_discount_amount / amount` 의 반올림이라 null 이 될 수 있다.
 * 0% 로 눌러 적으면 대안 카드가 아무 이득이 없었던 것처럼 보이므로 그때는 비율을 뺀다.
 */
function missedRateLabel(item) {
  return item.discountRate == null ? '더 유리' : `${item.discountRate}% 할인`
}

/**
 * 받은 혜택 총액. **`receivedSplit` 의 두 값을 더해 만들지 않는다.**
 * 합계가 일치하는 것은 확인했지만, 더해서 쓰면 총액의 근거가 두 곳이 된다.
 */
const totalBenefit = computed(() => summary.value.totalReceivedBenefit)

/**
 * 놓친 혜택 총액. **요약이 아니라 놓친 혜택 상세 응답에서 가져온다.**
 *
 * 두 응답이 같은 값을 주므로 예전에는 먼저 오는 요약 것을 썼다. 하지만 두 카드가 각자
 * 다른 달을 보게 되면서 요약은 **받은 혜택의 달**을 따라가게 됐다. 요약 것을 그대로 두면
 * 놓친 혜택 카드가 6월을 가리키면서 7월 총액을 적는다.
 *
 * `/report/benefit/missed` 는 이 카드의 두 손실 금액 때문에 어차피 부르고 있어서
 * 요청이 늘지 않는다.
 */
const totalMissed = computed(() => missedDetail.value.totalMissedBenefit)

/** 카드 안 월 선택기에 적는 문구. 헤더에 있던 `7월` 과 달리 연도까지 적는다. */
const receivedMonthLabel = computed(
  () => `${receivedCursor.value.year}년 ${receivedCursor.value.month}월`,
)
const missedMonthLabel = computed(
  () => `${missedCursor.value.year}년 ${missedCursor.value.month}월`,
)

function toggle(id) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

function openPage(nextPage) {
  page.value = nextPage
  expanded.value = new Set()
}

function backToMain() {
  openPage('main')
}

/**
 * 혜택 현황 시트의 `받은 혜택 리포트 보기` 로 넘어온 카드.
 *
 * 홈에 있을 때는 라우터로 리포트를 열었지만 이제는 이미 리포트 안이다. 같은 화면의
 * 받은 혜택 상세로 갈아타고, 그 카드를 캐러셀에서 골라 둔다.
 */
function openCardReport(cardId) {
  const index = receivedCards.value.findIndex((card) => card.id === cardId)
  if (index >= 0) selectedCard.value = index
  openPage('received')
}

function selectCard(index) {
  if (index < 0 || index >= receivedCards.value.length) return
  selectedCard.value = index
  // 카드를 바꾸면 펼쳐둔 카테고리는 다른 카드의 것이다. 접어둔다.
  expanded.value = new Set()
}

function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 2000)
}

function selectMissedTab(tab) {
  if (missedTab.value === tab) return
  missedTab.value = tab
  // 펼쳐둔 카테고리는 반대쪽 탭의 것이다. 카테고리 구성이 탭마다 달라 접어둔다.
  expanded.value = new Set()
}

onMounted(() => {
  // 보유 카드가 없으면 캐러셀도 상세도 그릴 수 없다. 다른 화면과 같은 store 라 대개 이미 차 있다.
  cardStore.ensureCardsWithImages()
})

/**
 * URL 이 카드를 지정했으면 그 카드를 펼친다 (#59).
 *
 * 목록이 API 로 오므로 **도착한 뒤에** 맞춘다. `onMounted` 에서 한 번 찾으면 그때는 빈 배열이라
 * 언제나 0번 카드가 열린다.
 */
watch(
  receivedCards,
  (list) => {
    if (!initialCardId || !list.length) return
    // 쿼리는 언제나 문자열이고 `card.id` 는 백엔드가 준 숫자다. `===` 로 대면 늘 어긋나
    // 0번 카드가 열린다 (목데이터 시절에는 양쪽 다 문자열이라 드러나지 않았다).
    const index = list.findIndex((card) => String(card.id) === initialCardId)
    if (index >= 0) selectedCard.value = index
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearTimeout(toastTimer)
})
</script>

<template>
  <section class="report-screen">
    <header class="report-header" :class="{ detail: page !== 'main' }">
      <button
        v-if="page !== 'main'"
        class="report-back"
        type="button"
        aria-label="뒤로가기"
        @click="backToMain"
      >
        <ChevronLeft :size="25" />
      </button>
      <!--
        메인 제목은 `혜택` 이다. 월 선택기가 헤더에서 각 혜택 카드 안으로 내려갔다.

        `!ml-5` 는 아래 패널의 제목과 줄을 맞추려는 것이다. 헤더의 왼쪽 패딩은 16px 인데
        `받은 혜택` 은 `.report-scroll` 16px 과 `.report-panel` 20px 을 더한 36px 에서
        시작해서, 그냥 두면 제목만 왼쪽으로 튀어나와 보인다.

        `!` 가 필요하다. `.report-header h1 { margin: 0 }` 이 특이도(0,1,1)로 유틸리티(0,1,0)를
        이겨서, 그냥 `ml-5` 만 주면 클래스는 붙는데 `margin-left` 가 0 으로 남는다.

        **상세 화면에는 주지 않는다.** 거기서는 `.report-header.detail h1` 이
        `left: 50%` + `translateX(-50%)` 로 가운데 정렬이라 마진을 주면 그만큼 밀린다.
      -->
      <h1 :class="{ '!ml-5': page === 'main' }">
        {{
          page === 'main' ? '혜택' : page === 'received' ? '받은 혜택 리포트' : '놓친 혜택 리포트'
        }}
      </h1>
      <button class="report-menu" type="button" aria-label="마이페이지 열기" @click="openMyPage()">
        <Menu :size="23" />
      </button>
    </header>

    <div v-if="page === 'main'" class="report-scroll">
      <!-- 처음 들어왔을 때만이다. 월을 바꿀 때도 띄우면 스크롤이 튄다 (hasLoadedSummary 주석). -->
      <div
        v-if="reportStore.isLoading && !hasLoadedSummary"
        class="flex justify-center py-24 text-sub"
      >
        <BaseSpinner size="lg" label="리포트를 불러오는 중" />
      </div>

      <!-- 실패했으면 직전 달 숫자를 그대로 두지 않는다. useAsyncState 는 성공했을 때만
           data 를 갈아끼우므로, 이 분기가 없으면 헤더는 8월인데 내용은 7월인 화면이 된다.
           조회가 실패한 걸 사용자가 알 방법이 없어진다. -->
      <div
        v-else-if="reportStore.error"
        class="flex flex-col items-center gap-4 py-24 text-center text-sm text-sub"
      >
        <p>리포트를 불러오지 못했어요</p>
        <button
          type="button"
          class="rounded-lg bg-icon-bg px-4 py-2 text-xs font-bold text-ink"
          @click="loadSummary"
        >
          다시 시도
        </button>
      </div>

      <!--
        다시 조회하는 동안에도 내용을 그대로 둔다. 스피너로 갈아치우면 스크롤이 튄다.

        **화면을 옅게 만들지 않는다.** 이 값은 요약(받은 혜택 쪽) 조회만 반영하는데
        본문에는 놓친 혜택 카드와 카드 혜택 현황도 있어서, 통째로 흐려지면 상관없는 곳까지
        조회 중인 것처럼 보인다. 보조 기술에는 `aria-busy` 로 알린다.
      -->
      <div v-else :aria-busy="isRefreshing">
        <!--
          받은 혜택 · 놓친 혜택.

          두 카드는 윗줄 색(노랑/빨강)과 세부 두 줄만 다르고 골격이 같다. 컴포넌트로 묶지 않은
          이유는 다른 곳에서 재사용하지 않고, 묶으면 슬롯이 네 개(제목·월·총액·세부 두 줄)라
          오히려 읽기 어려워지기 때문이다. 두 도메인 이상에서 쓰이게 되면 그때 `report/` 로 뺀다.
        -->
        <section class="report-panel">
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-1.5">
              <h2>받은 혜택</h2>
              <button
                type="button"
                class="flex shrink-0 items-center bg-transparent text-muted"
                :aria-expanded="isBenefitInfoOpen"
                aria-label="받은 혜택 설명"
                @click="isBenefitInfoOpen = !isBenefitInfoOpen"
              >
                <Info :size="15" />
              </button>
            </div>
            <button
              type="button"
              class="flex shrink-0 items-center gap-0.5 bg-transparent !text-[13px] !font-bold text-primary-dark"
              @click="openPage('received')"
            >
              세부 내역 보기 <ChevronRight :size="14" />
            </button>
          </div>

          <!--
            받은 혜택이 캐시백과 포인트를 합친 값이라는 사실은 숫자만 봐서는 드러나지 않는다.
            늘 띄워두면 카드를 밀어내므로 물어본 사람에게만 보여준다.
          -->
          <p
            v-if="isBenefitInfoOpen"
            class="mt-2.5 rounded-xl bg-icon-bg px-3.5 py-2.5 text-[12px] leading-[1.7] text-sub"
          >
            캐시백·포인트를 원화로 환산해 더한 금액입니다. 세부 내역에서 각각 나눠 볼 수 있습니다.
          </p>

          <!--
            세부 두 값은 아래 줄이 아니라 **칸 두 개**다 (피그마 `node-id=1478-664`).
            총액과 나란히 두면 셋 다 같은 무게로 읽혀 무엇이 합계인지 드러나지 않는다.
          -->
          <div class="mt-3 overflow-hidden rounded-2xl border border-line">
            <!-- 카드 성격을 색으로 먼저 알린다. 받은 혜택은 primary. -->
            <div class="h-2.5 bg-primary"></div>
            <div class="relative px-5 pt-4 pb-5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[13px] text-sub">총 받은 혜택</span>
                <!--
                  Preflight 를 빼둔 프로젝트라 `bg-transparent` 를 직접 준다.
                  안 주면 브라우저 기본 버튼 배경(회색 알약)이 화살표 뒤에 그대로 보인다.
                -->
                <div class="flex shrink-0 items-center gap-1 text-muted-deep">
                  <button
                    type="button"
                    aria-label="받은 혜택 이전 달"
                    class="flex bg-transparent p-0"
                    @click="shiftReceivedMonth(-1)"
                  >
                    <ChevronLeft :size="16" />
                  </button>
                  <strong class="text-[13px] font-bold text-sub">{{ receivedMonthLabel }}</strong>
                  <!-- 미래 달에는 결제가 있을 수 없다. 이번 달이면 잠근다. -->
                  <button
                    type="button"
                    aria-label="받은 혜택 다음 달"
                    :disabled="isReceivedCurrentMonth"
                    class="flex bg-transparent p-0 disabled:opacity-30"
                    @click="shiftReceivedMonth(1)"
                  >
                    <ChevronRight :size="16" />
                  </button>
                </div>
              </div>

              <!-- 금액 표기는 `₩` 다. 아래 두 칸과 같은 단위 기호를 써야 한 눈에 붙어 읽힌다. -->
              <strong class="mt-0.5 block text-[28px] leading-tight font-bold text-ink">
                {{ currency(totalBenefit) }}
              </strong>
              <div class="relative mt-3 flex gap-3">
                <!--
                  장식이라 스크린리더가 읽지 않는다. 앞발이 따로 그려진 에셋이라 **칸의 윗변에
                  걸터앉은** 모습으로 쓰라고 만들어졌다.

                  그래서 총액이 아니라 **이 칸 줄을 기준으로** 앉힌다. `bottom: calc(100% - 12px)`
                  는 그림의 아랫변을 줄의 윗변보다 12px 아래에 두라는 뜻이다.
                  카드 위에서부터 거리를 재면 총액 자릿수가 바뀔 때마다 걸친 정도가 달라진다.

                  `50px` 이다. 62px 일 때는 그림 윗변이 월 표시를 파고들었다 —
                  받은 혜택은 3px, 놓친 혜택은 10px 겹쳤다(실측). 줄이면 아랫변 기준이라
                  윗변이 그만큼 내려와 간격이 생긴다.

                  칸보다 위에 그려야(`z-[1]`) 앞발이 칸 밑으로 숨지 않는다.
                -->
                <img
                  :src="pigSmilePeek"
                  alt=""
                  aria-hidden="true"
                  class="pointer-events-none absolute right-4 bottom-[calc(100%-12px)] z-[1] w-[50px]"
                />

                <div class="min-w-0 flex-1 rounded-xl bg-icon-bg px-3.5 py-3">
                  <span class="block text-[12px] text-sub">총 할인 금액</span>
                  <strong class="mt-1.5 block text-[20px] leading-tight font-bold text-received">
                    {{ currency(receivedSplit.totalDiscount) }}
                  </strong>
                </div>
                <div class="min-w-0 flex-1 rounded-xl bg-icon-bg px-3.5 py-3">
                  <span class="block text-[12px] text-sub">총 포인트</span>
                  <!-- 포인트는 원이 아니다. 배지를 붙여 왼쪽 원화 칸과 단위가 갈리게 한다. -->
                  <strong
                    class="mt-1.5 flex items-center gap-1 text-[20px] leading-tight font-bold text-primary-dark"
                  >
                    <img :src="iconPointBadge" alt="" class="size-[18px] shrink-0" />
                    {{ pointNumber(receivedSplit.totalPoint) }}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="report-panel">
          <div class="flex items-center justify-between gap-2">
            <h2>놓친 혜택</h2>
            <button
              type="button"
              class="flex shrink-0 items-center gap-0.5 bg-transparent !text-[13px] !font-bold text-primary-dark"
              @click="openPage('missed')"
            >
              세부 내역 보기 <ChevronRight :size="14" />
            </button>
          </div>

          <!-- 받은 혜택 카드와 같은 골격이다 (피그마 `node-id=1478-708`). 윗줄 색과 두 칸만 다르다. -->
          <div class="mt-3 overflow-hidden rounded-2xl border border-line">
            <div class="h-2.5 bg-danger"></div>
            <div class="relative px-5 pt-4 pb-5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[13px] text-sub">총 놓친 혜택</span>
                <!-- 받은 혜택 카드와 별개의 달을 본다. 이 선택기는 이 카드만 움직인다. -->
                <div class="flex shrink-0 items-center gap-1 text-muted-deep">
                  <button
                    type="button"
                    aria-label="놓친 혜택 이전 달"
                    class="flex bg-transparent p-0"
                    @click="shiftMissedMonth(-1)"
                  >
                    <ChevronLeft :size="16" />
                  </button>
                  <strong class="text-[13px] font-bold text-sub">{{ missedMonthLabel }}</strong>
                  <button
                    type="button"
                    aria-label="놓친 혜택 다음 달"
                    :disabled="isMissedCurrentMonth"
                    class="flex bg-transparent p-0 disabled:opacity-30"
                    @click="shiftMissedMonth(1)"
                  >
                    <ChevronRight :size="16" />
                  </button>
                </div>
              </div>

              <strong class="mt-0.5 block text-[28px] leading-tight font-bold text-ink">
                {{ currency(totalMissed) }}
              </strong>
              <!--
                이 두 값은 요약 API 에 없다. `/report/benefit/missed` 가 주는 값이고
                `lossType` 과 무관하게 늘 같다 (reportApi 주석 참고).

                라벨 앞 아이콘은 두 손실의 성격을 구분한다 — 앱을 안 써서 놓친 것과
                카드를 잘못 골라 놓친 것이다. 글자만으로는 나란히 놓였을 때 잘 안 갈린다.
              -->
              <div class="relative mt-3 flex gap-3">
                <!--
                  받은 혜택 카드와 같은 방식으로 칸의 윗변에 걸터앉힌다 (위 주석 참고).
                  폭도 `50px` 로 같다 — 몸통이 같은 크기로 그려진다.

                  ⚠️ **아래로 미는 값만 다르다(12px → 15px).** 이 에셋은 캔버스 아래쪽에
                  앞발이 차지하는 투명 여백이 훨씬 크다(41/465 = 8.8%, 웃는 픽피는 2/56 = 3.6%).
                  같은 값을 주면 몸통이 칸에 덜 걸쳐 혼자 떠 보인다. 이 크기에서 여백 차이가
                  약 3px 이라 그만큼 더 민다.
                -->
                <img
                  :src="pigCryPeek"
                  alt=""
                  aria-hidden="true"
                  class="pointer-events-none absolute right-4 bottom-[calc(100%-15px)] z-[1] w-[50px]"
                />

                <div class="min-w-0 flex-1 rounded-xl bg-danger-bg px-3.5 py-3">
                  <span class="flex items-center gap-1 text-[12px] text-sub">
                    <Smartphone :size="14" class="shrink-0" />
                    앱 미사용 손실
                  </span>
                  <strong class="mt-1.5 block text-[20px] leading-tight font-bold text-danger">
                    {{ currency(missedDetail.appUnusedAmount) }}
                  </strong>
                </div>
                <div class="min-w-0 flex-1 rounded-xl bg-danger-bg px-3.5 py-3">
                  <span class="flex items-center gap-1 text-[12px] text-sub">
                    <CreditCard :size="14" class="shrink-0" />
                    카드 선택 손실
                  </span>
                  <strong class="mt-1.5 block text-[20px] leading-tight font-bold text-danger">
                    {{ currency(missedDetail.cardMismatchAmount) }}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!--
          카드 혜택 현황. 홈에 있던 섹션을 통째로 옮겨왔다. 혜택을 보는 자리를 리포트 한 곳으로 모은다.
          시트에서 `받은 혜택 리포트 보기` 를 누르면 라우터를 타지 않고 이 화면의 상세로 갈아탄다.
        -->
        <CardBenefitStatusSection @open-card-report="openCardReport" />

        <section class="report-panel recommendation-panel">
          <h2>카드 추천</h2>
          <p>내 소비 패턴과 혜택 비중에 따라 추천해 드려요</p>
          <article
            v-for="card in recommendations"
            :key="card.cardProductId"
            class="recommendation-card"
          >
            <div class="recommendation-visual">
              <img
                v-if="card.cardImageUrl"
                :src="card.cardImageUrl"
                alt=""
                :style="recommendationImageStyle(card)"
                @load="markCardImageOrientation"
              />
              <!-- 이미지가 없을 때만 원래의 장식용 점 두 개를 남긴다. -->
              <template v-else><span></span><i></i></template>
            </div>
            <div class="recommendation-copy">
              <!--
                `!` 가 필요하다. `.recommendation-copy > strong { font-size: 13px }` 가
                특이도(0,1,1)로 유틸리티(0,1,0)를 이긴다. 아래 칩들도 같은 이유다.
              -->
              <strong class="!text-[15px]">{{ card.cardName }}</strong>

              <!--
                예상 혜택은 **카드명 바로 밑**이다. 이 카드를 고를 이유라 이름 다음에 와야 한다.

                `block w-fit` 이 필요하다. `strong` 도 이 `span` 도 인라인이라 그냥 두면
                카드명과 한 줄에 붙어 버린다. 예전에는 `div` 로 감싸서 줄이 나뉘었는데,
                그 `div` 는 `.recommendation-copy div span` 규칙(옅은 칩 모양)을 끌고 와서
                유틸리티를 `!` 로 덮어야 했다. 감싸지 않으면 그 규칙이 아예 걸리지 않는다.

                바탕은 키워드와 같은 옅은 크림이고 **테두리만 primary** 다. 꽉 채운 노랑은
                이 작은 칸에서 너무 진했다. 글자는 `text-ink` 라 크림 위에서 대비가 넉넉하다
                (`text-primary-dark` 는 크림 바탕에서 2:1 밖에 안 나온다).
              -->
              <span
                class="mt-3 block w-fit rounded-md border border-primary bg-icon-bg px-2 py-0.5 text-[11px] font-bold text-ink"
              >
                예상 혜택 {{ won(card.expectedBenefit) }}
              </span>
            </div>

            <!--
              키워드. 예전에는 같은 내용이 `<p>` 한 줄(`카페/디저트 5% 할인, 전월 실적 …`)
              이었는데, 조각내 나열하면 어떤 조건이 붙는 카드인지 훑어보기 쉽다.
              문장을 지우고 옮긴 것이라 같은 내용이 두 번 나오지 않는다.

              카드 그림 아래, **`신청하기` 버튼과 같은 줄**에 둔다.

              흐름에 두면 그리드에 줄이 하나 더 생겨 카드가 그만큼(약 36px) 길어진다.
              그런데 버튼이 `position: absolute` 로 떠 있고 `.recommendation-card` 가
              이미 `padding-bottom: 46px` 로 그 자리를 비워 두고 있어서, 그 빈 띠를 같이
              쓰면 **카드를 늘리지 않고** 한 줄을 더 놓을 수 있다.

              `bottom`·높이는 버튼과 같은 값이라 세로 가운데가 맞는다. 오른쪽은 버튼
              너비만큼 비워 둬야 칩이 버튼 밑으로 기어들지 않는다.

              칩 모양은 `.recommendation-copy div span` 안에서만 먹는 규칙이라 여기서는
              유틸리티로 다시 짠다. 색은 토큰만 쓴다(테두리는 `#ede8dc` 대신 `border-line`,
              육안으로 구분되지 않는다).
            -->
            <div
              v-if="recommendationKeywords(card.description).length"
              class="absolute right-[92px] bottom-[10px] left-0 flex min-h-[34px] flex-wrap items-center gap-1"
            >
              <span
                v-for="keyword in recommendationKeywords(card.description)"
                :key="keyword"
                class="rounded-md border border-line bg-icon-bg px-[7px] py-0.5 text-[10px] text-sub"
              >
                {{ keyword }}
              </span>
            </div>
            <button type="button" @click="notify('카드 신청 페이지는 준비 중이에요.')">
              신청하기
            </button>
          </article>
          <div v-if="!recommendations.length" class="py-4 text-xs text-sub">
            지금은 추천할 카드가 없어요. 이 달의 결제가 쌓이면 다시 추천해 드려요.
          </div>
        </section>
      </div>
    </div>

    <div v-else-if="page === 'received'" class="report-scroll report-detail-scroll">
      <div class="received-card-wrap">
        <!--
          카드 그림은 실제 카드 이미지다 (#97). 세로 이미지(현대)를 눕히는 처리는
          `useCardImage` 하나에 있고, 이 화면은 칸의 비율만 넘긴다.
        -->
        <article class="received-card-visual" :style="RECEIVED_VISUAL_IMAGE_STYLE">
          <img
            v-if="cardDetail.cardImageUrl"
            :src="cardDetail.cardImageUrl"
            alt=""
            :style="receivedImageStyle(cardDetail)"
            @load="markCardImageOrientation"
          />
          <!-- 이미지를 못 받은 카드는 이름과 뒷자리로 대신한다. 그림을 지어내지 않는다. -->
          <template v-else>
            <strong>{{ cardDetail.cardName }}</strong>
            <span>{{ cardDetail.maskedCardNumber }}</span>
          </template>
        </article>
        <div v-if="receivedCards.length > 1" class="received-card-controls">
          <button
            type="button"
            aria-label="이전 카드"
            :disabled="selectedCard === 0"
            @click="selectCard(selectedCard - 1)"
          >
            <ChevronLeft :size="16" />
          </button>
          <span
            v-for="(_, index) in receivedCards"
            :key="index"
            :class="{ active: index === selectedCard }"
            @click="selectCard(index)"
          ></span>
          <button
            type="button"
            aria-label="다음 카드"
            :disabled="selectedCard === receivedCards.length - 1"
            @click="selectCard(selectedCard + 1)"
          >
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>

      <!--
        총액이 셋이다. 할인(원화)과 포인트는 단위가 달라 합칠 수 없어 나란히 두고,
        사용 금액은 성격이 달라 아래 줄을 통째로 쓴다. `.received-total` 이 2열 그리드다.
      -->
      <div class="received-total">
        <div>
          <span>총 할인 금액</span><strong>{{ currency(cardDetail.totalDiscount) }}</strong>
        </div>
        <div>
          <span>총 포인트</span
          ><strong class="text-primary-dark">{{ points(cardDetail.totalPoint) }}</strong>
        </div>
        <div class="col-span-2 !flex-row items-center justify-between border-t border-line">
          <span>총 사용 금액</span><strong>{{ currency(cardDetail.totalSpend) }}</strong>
        </div>
      </div>

      <section class="report-category-section">
        <h2>카테고리별 전체 혜택</h2>

        <div v-if="reportStore.isCardDetailLoading" class="flex justify-center py-16 text-sub">
          <BaseSpinner size="lg" label="카드 혜택을 불러오는 중" />
        </div>

        <p v-else-if="!cardDetail.categories.length" class="py-10 text-center text-[13px] text-sub">
          이 달에는 이 카드로 받은 혜택이 없어요
        </p>

        <article
          v-for="category in cardDetail.categories"
          :key="category.categoryId"
          class="report-category-card"
        >
          <button class="report-category-head" type="button" @click="toggle(category.categoryId)">
            <span class="report-category-icon">
              <img
                v-if="categoryIcon(category.categoryName)"
                :src="categoryIcon(category.categoryName)"
                alt=""
              />
            </span>
            <span class="report-category-name"
              ><strong>{{ category.categoryName }}</strong
              ><small>{{ category.usageCount }}건 이용</small></span
            >
            <!-- 원화와 포인트를 둘 다 받은 카테고리는 두 줄로 적는다. 단위가 달라 못 합친다. -->
            <span class="ml-auto flex flex-col items-end gap-0.5">
              <b
                v-for="amount in categoryAmounts(category)"
                :key="amount.label"
                class="received !ml-0 flex items-center gap-1 text-[15px]"
                :class="{ 'text-primary-dark': amount.isPoint }"
              >
                <img v-if="amount.isPoint" :src="iconPointBadge" alt="" width="15" height="15" />
                {{ amount.label }}
              </b>
            </span>
            <ChevronUp v-if="expanded.has(category.categoryId)" :size="17" />
            <ChevronDown v-else :size="17" />
          </button>
          <Transition name="report-expand">
            <div v-if="expanded.has(category.categoryId)" class="report-transactions">
              <div
                v-for="(item, index) in category.transactions"
                :key="`${item.approvedAt}-${item.storeName}-${index}`"
              >
                <span>{{ transactionDate(item.approvedAt) }}</span>
                <p>
                  <strong>{{ item.storeName ?? '가맹점 미확인' }}</strong
                  ><small class="flex items-center gap-1">
                    <img
                      v-if="isPointBenefit(item)"
                      :src="iconPointBadge"
                      alt=""
                      width="14"
                      height="14"
                    />
                    <b :class="{ 'text-primary-dark': isPointBenefit(item) }">{{
                      benefitKindLabel(item)
                    }}</b>
                    · 결제 {{ currency(item.paidAmount) }}</small
                  >
                </p>
                <em :class="{ 'text-primary-dark': isPointBenefit(item) }"
                  >+{{
                    isPointBenefit(item) ? points(item.benefitAmount) : currency(item.benefitAmount)
                  }}</em
                >
              </div>
            </div>
          </Transition>
        </article>
      </section>
    </div>

    <div v-else class="report-scroll report-detail-scroll">
      <!-- 히어로 세 숫자는 탭과 무관하게 늘 같다. 백엔드가 두 손실을 항상 함께 준다.
           배경의 카드 그림은 장식이라 스크린리더에서 뺀다. `style.css` 가 동결이라
           position·overflow 는 인라인으로 얹는다 (받은 혜택 카드 칸과 같은 방식). -->
      <section
        class="missed-hero"
        :style="{ position: 'relative', overflow: 'hidden', background: MISSED_HERO_BACKGROUND }"
      >
        <img :src="pigCryPeek" alt="" aria-hidden="true" :style="MISSED_HERO_PIG_STYLE" />
        <p class="relative">이번 달 총 놓친 혜택</p>
        <h2 class="relative">{{ currency(missedDetail.totalMissedBenefit) }}</h2>
        <div class="relative">
          <span
            ><small>▣ 앱 미사용</small
            ><strong>{{ currency(missedDetail.appUnusedAmount) }}</strong></span
          >
          <span
            ><small>▰ 카드 선택 손실</small
            ><strong>{{ currency(missedDetail.cardMismatchAmount) }}</strong></span
          >
        </div>
      </section>

      <div class="missed-tabs">
        <button
          v-for="(lossType, key) in LOSS_TYPES"
          :key="key"
          type="button"
          :class="{ active: missedTab === key }"
          @click="selectMissedTab(key)"
        >
          {{ lossType.label }}
        </button>
      </div>

      <p class="missed-info">ⓘ {{ missedInfo }}</p>

      <section class="report-category-section missed-section">
        <h2>카테고리별 상세</h2>

        <BaseSpinner v-if="reportStore.isMissedDetailLoading" />

        <!-- 그 달에 그 손실이 없으면 빈 배열이 온다. 실제로 흔하다 -->
        <p v-else-if="!missedDetail.categories.length" class="missed-info">
          이 달에는 {{ LOSS_TYPES[missedTab]?.label }}이 없어요.
        </p>

        <template v-else>
          <article
            v-for="category in missedDetail.categories"
            :key="category.categoryId"
            class="report-category-card"
          >
            <button class="report-category-head" type="button" @click="toggle(category.categoryId)">
              <span class="report-category-icon">
                <img
                  v-if="categoryIcon(category.categoryName)"
                  :src="categoryIcon(category.categoryName)"
                  alt=""
                />
              </span>
              <span class="report-category-name"
                ><strong>{{ category.categoryName }}</strong
                ><small>{{ category.missedCount }}건 미적용</small></span
              >
              <b class="missed">{{ currency(category.missedAmount) }}</b>
              <ChevronUp v-if="expanded.has(category.categoryId)" :size="17" />
              <ChevronDown v-else :size="17" />
            </button>
            <Transition name="report-expand">
              <div
                v-if="expanded.has(category.categoryId)"
                class="report-transactions missed-transactions"
              >
                <div
                  v-for="(item, index) in category.transactions"
                  :key="`${item.approvedAt}-${index}`"
                >
                  <span>{{ transactionDate(item.approvedAt) }}</span>
                  <p>
                    <strong>{{ storeLabel(item.storeName) }}</strong>
                    <small>{{ item.usedCardName }} · 결제 {{ won(item.paidAmount) }}</small>
                    <small
                      ><b>혜택 카드</b> {{ item.alternativeCardName }} ·
                      {{ missedRateLabel(item) }}</small
                    >
                  </p>
                  <em>{{ currency(item.diffAmount) }}</em>
                </div>
              </div>
            </Transition>
          </article>
        </template>
      </section>
    </div>

    <nav class="bottom-nav report-bottom-nav">
      <button type="button" @click="navigate('home')">
        <img :src="iconHome" alt="" /><span>홈</span>
      </button>
      <button type="button" @click="navigate('payment')">
        <img :src="iconPayment" alt="" /><span>결제</span>
      </button>
      <button type="button" @click="navigate('mycard')">
        <img :src="iconMycard" alt="" /><span>카드 내역</span>
      </button>
      <button class="active" type="button">
        <img :src="iconReportActive" alt="" /><span>혜택</span>
      </button>
    </nav>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </section>
</template>
