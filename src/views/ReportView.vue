<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Minus } from 'lucide-vue-next'
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

import BaseSpinner from '@/components/common/BaseSpinner.vue'
import { useCardImage } from '@/composables/useCardImage'
import { useToast } from '@/composables/useToast'
import { usePaymentStore } from '@/stores/paymentStore'
import { useReportStore } from '@/stores/reportStore'

const route = useRoute()
const router = useRouter()
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
const missedTab = ref('app')
const expanded = ref(new Set())
const selectedCard = ref(0)
const missedCount = ref(0)
const toast = ref('')
let animationFrame = 0
let toastTimer

// 원 단위로 반올림한다. 백엔드 금액은 BigDecimal 이라 소수가 섞여 온다
// (카드 추천의 expectedBenefit 이 지출액 × 할인율이라 501,969.6 처럼 나온다).
function won(value) {
  return `${Math.round(Number(value)).toLocaleString('ko-KR')}원`
}

/* ─── 조회 기간 ──────────────────────────────────────────────────────────── */

// 기준은 오늘이다. 예전에는 3월이 하드코딩돼 있었고 버튼을 눌러도 숫자만 바뀌었다.
const today = new Date()
const cursor = ref({ year: today.getFullYear(), month: today.getMonth() + 1 })

// 백엔드가 DATE_FORMAT(paid_at, '%Y-%m') 과 문자열로 비교한다.
// `2026-8` 처럼 0 을 빼면 에러 없이 조용히 0건이 되므로 두 자리로 맞춘다.
const yearMonth = computed(
  () => `${cursor.value.year}-${String(cursor.value.month).padStart(2, '0')}`,
)

// 미래 달에는 결제가 있을 수 없다. 이번 달에서 다음 달 버튼을 잠근다.
const isCurrentMonth = computed(
  () => cursor.value.year === today.getFullYear() && cursor.value.month === today.getMonth() + 1,
)

/** 달을 옮긴다. 1월 ↔ 12월 을 넘길 때 연도까지 같이 움직여야 해서 Date 에 맡긴다. */
function shiftMonth(delta) {
  if (delta > 0 && isCurrentMonth.value) return
  const shifted = new Date(cursor.value.year, cursor.value.month - 1 + delta, 1)
  cursor.value = { year: shifted.getFullYear(), month: shifted.getMonth() + 1 }
}

/* ─── 리포트 요약 (API) ──────────────────────────────────────────────────── */

const summary = computed(() => reportStore.summary)

async function loadSummary() {
  try {
    await reportStore.fetchSummary(yearMonth.value)
  } catch (error) {
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
  }
}

// 달이 바뀌면 다시 조회한다. 화면에 들어올 때도 여기서 한 번 돈다.
watch(yearMonth, loadSummary, { immediate: true })

/**
 * 도넛 조각 색.
 *
 * 색상 하드코딩 대신 `@theme` 토큰을 쓴다. 도넛은 인라인 style 의 conic-gradient 라
 * `var()` 가 그대로 해석된다. 카테고리는 최대 5개(매퍼 LIMIT 5)라 색도 5개면 된다.
 */
const CHART_COLORS = [
  'var(--color-primary)',
  'var(--color-primary-dark)',
  'var(--color-muted)',
  'var(--color-muted-soft)',
  'var(--color-muted-softer)',
]

const chartData = computed(() =>
  summary.value.categories.map((category, index) => ({
    id: category.categoryId,
    name: category.categoryName,
    value: category.benefitAmount,
    color: CHART_COLORS[index % CHART_COLORS.length],
  })),
)

/**
 * 도넛 비율의 분모. 가운데 찍히는 "총 혜택" 과 분모가 다르다.
 *
 * 백엔드가 카테고리를 **상위 5개만** 주므로 6번째부터의 혜택은 조각에 없다.
 * `totalReceivedBenefit` 으로 나누면 그만큼 링이 안 닫혀 빈 부채꼴이 생긴다.
 * 조각의 합으로 나눠 링을 채우고, 가운데 숫자는 진짜 총액을 보여준다.
 */
const slicesTotal = computed(() => chartData.value.reduce((sum, item) => sum + item.value, 0))

const chartBackground = computed(() => {
  // 이번 달 혜택이 0원이면 나눌 수가 없다. 빈 링으로 둔다.
  if (!slicesTotal.value) return 'var(--color-muted-softer)'

  let current = 0
  const stops = chartData.value.map((item) => {
    const start = current
    current += (item.value / slicesTotal.value) * 100
    return `${item.color} ${start}% ${current}%`
  })
  return `conic-gradient(${stops.join(', ')})`
})

/**
 * 카테고리 랭킹.
 *
 * **다시 정렬하지 않는다.** 매퍼가 `benefitAmount DESC LIMIT 5` 로 정렬해서 준다.
 */
const rankings = computed(() =>
  summary.value.categories.map((category) => ({
    id: category.categoryId,
    name: category.categoryName,
    benefit: won(category.benefitAmount),
    spend: won(category.spendAmount),
  })),
)

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

/* ─── 받은 혜택 상세 · 놓친 혜택 상세 (목데이터) ─────────────────────────── */

// TODO(mock): 백엔드 미구현. 카드별 상세는 응답 DTO(CardBenefitDetailResponse)만 추가돼 있고
// (backend#116) 컨트롤러·서비스·매퍼가 없다. 엔드포인트가 생기면 reportApi 에 함수를 추가한다.
const receivedCards = [
  {
    id: 'kb',
    name: 'KB Gold & More',
    last4: '1234',
    gradient: 'linear-gradient(135deg, #ffcc00 0%, #ffb300 60%, #e69a00 100%)',
    color: '#3a2200',
    subColor: '#7a5900',
    totalBenefit: 12500,
    totalSpend: 950000,
    categories: [
      {
        id: 'food',
        name: '외식',
        icon: iconFood,
        count: 24,
        amount: 12000,
        items: [
          {
            date: '07.15',
            merchant: '배달의민족',
            benefit: '7% 할인',
            payment: 32000,
            amount: 2240,
          },
          {
            date: '07.11',
            merchant: '스시조 강남점',
            benefit: '7% 할인',
            payment: 65000,
            amount: 4550,
          },
          { date: '07.08', merchant: '맥도날드', benefit: '7% 할인', payment: 12500, amount: 875 },
          { date: '07.03', merchant: '교촌치킨', benefit: '7% 할인', payment: 21000, amount: 1470 },
        ],
      },
      {
        id: 'mart',
        name: '마트',
        icon: iconMart,
        count: 8,
        amount: 6500,
        items: [
          {
            date: '07.20',
            merchant: '이마트 역삼점',
            benefit: '5% 할인',
            payment: 58000,
            amount: 2900,
          },
          { date: '07.12', merchant: '홈플러스', benefit: '5% 할인', payment: 43000, amount: 2150 },
          { date: '07.06', merchant: 'GS25', benefit: '5% 할인', payment: 9000, amount: 450 },
        ],
      },
      {
        id: 'cafe',
        name: '카페',
        icon: iconCafe,
        count: 15,
        amount: 4000,
        items: [
          { date: '07.18', merchant: '스타벅스', benefit: '10% 할인', payment: 6500, amount: 650 },
          { date: '07.14', merchant: '블루보틀', benefit: '10% 할인', payment: 8500, amount: 850 },
          { date: '07.09', merchant: '폴바셋', benefit: '10% 할인', payment: 7200, amount: 720 },
        ],
      },
      {
        id: 'transport',
        name: '교통',
        icon: iconTransport,
        count: 12,
        amount: 2000,
        items: [
          {
            date: '07.19',
            merchant: '서울지하철',
            benefit: '교통 할인',
            payment: 1400,
            amount: 500,
          },
          {
            date: '07.10',
            merchant: '카카오T택시',
            benefit: '교통 할인',
            payment: 12000,
            amount: 800,
          },
          { date: '07.04', merchant: '광역버스', benefit: '교통 할인', payment: 2800, amount: 700 },
        ],
      },
    ],
  },
  {
    id: 'shinhan',
    name: '신한 Deep Dream',
    last4: '5678',
    gradient: 'linear-gradient(135deg, #1e5fbb 0%, #0d47a1 60%, #082474 100%)',
    color: '#fff',
    subColor: 'rgba(255,255,255,.72)',
    totalBenefit: 8200,
    totalSpend: 620000,
    categories: [
      {
        id: 'cafe',
        name: '카페',
        icon: iconCafe,
        count: 10,
        amount: 3500,
        items: [
          { date: '07.21', merchant: '스타벅스', benefit: '10% 할인', payment: 6500, amount: 650 },
          {
            date: '07.16',
            merchant: '투썸플레이스',
            benefit: '10% 할인',
            payment: 7800,
            amount: 780,
          },
          { date: '07.11', merchant: '이디야', benefit: '10% 할인', payment: 4500, amount: 450 },
        ],
      },
      {
        id: 'shopping',
        name: '쇼핑',
        icon: iconShopping,
        count: 5,
        amount: 2800,
        items: [
          { date: '07.19', merchant: '무신사', benefit: '5% 할인', payment: 79000, amount: 3950 },
          { date: '07.07', merchant: '올리브영', benefit: '5% 할인', payment: 38000, amount: 1900 },
        ],
      },
      {
        id: 'food',
        name: '외식',
        icon: iconFood,
        count: 6,
        amount: 1900,
        items: [
          { date: '07.13', merchant: '굽네치킨', benefit: '3% 할인', payment: 22000, amount: 660 },
          { date: '07.05', merchant: 'CU편의점', benefit: '3% 할인', payment: 8500, amount: 255 },
        ],
      },
    ],
  },
  {
    id: 'hyundai',
    name: '현대카드 ZERO',
    last4: '9012',
    gradient: 'linear-gradient(135deg, #37474f 0%, #263238 60%, #1a1a2e 100%)',
    color: '#fff',
    subColor: 'rgba(255,255,255,.68)',
    totalBenefit: 5800,
    totalSpend: 430000,
    categories: [
      {
        id: 'shopping',
        name: '쇼핑',
        icon: iconShopping,
        count: 7,
        amount: 3200,
        items: [
          { date: '07.22', merchant: '쿠팡', benefit: '6% 할인', payment: 52000, amount: 3120 },
          { date: '07.14', merchant: 'G마켓', benefit: '6% 할인', payment: 35000, amount: 2100 },
        ],
      },
      {
        id: 'transport',
        name: '교통',
        icon: iconTransport,
        count: 9,
        amount: 1500,
        items: [
          { date: '07.17', merchant: '카카오T', benefit: '5% 할인', payment: 15000, amount: 750 },
          { date: '07.09', merchant: '서울버스', benefit: '5% 할인', payment: 1500, amount: 75 },
        ],
      },
      {
        id: 'telecom',
        name: '통신',
        icon: '',
        count: 1,
        amount: 1100,
        items: [
          {
            date: '07.01',
            merchant: 'SKT 월정액',
            benefit: '2% 할인',
            payment: 55000,
            amount: 1100,
          },
        ],
      },
    ],
  },
]

// TODO(mock): 백엔드 미구현. 요약 API 는 놓친 혜택을 `totalMissedBenefit` **총액 하나**로만 준다.
// "앱 미사용 / 카드 선택 손실" 분해와 거래 목록의 출처가 없다.
// 총액만 실연동하면 이 화면 안에서 총액 ≠ 항목 합이 되므로 아래 hero 숫자까지 통째로 목데이터다.
const missedData = {
  app: {
    info: '앱을 사용하지 않아 놓친 혜택이에요. 앱을 통해 결제했다면 받을 수 있었던 혜택이에요. 다음부터는 앱에서 최적 카드를 확인한 후 결제해 보세요.',
    categories: [
      {
        id: 'food',
        name: '외식',
        icon: iconFood,
        count: 2,
        amount: 6790,
        items: [
          {
            date: '07.15',
            merchant: '배달의민족',
            usedCard: '카카오뱅크',
            benefitCard: 'KB Gold & More',
            benefit: '7% 할인',
            payment: 32000,
            amount: 2240,
          },
          {
            date: '07.11',
            merchant: '스시조 강남점',
            usedCard: '카카오뱅크',
            benefitCard: 'KB Gold & More',
            benefit: '7% 할인',
            payment: 65000,
            amount: 4550,
          },
        ],
      },
      {
        id: 'fuel',
        name: '교통/주유',
        icon: iconRefuel,
        count: 1,
        amount: 3900,
        items: [
          {
            date: '07.18',
            merchant: 'GS칼텍스',
            usedCard: '신한카드',
            benefitCard: '현대 오일뱅크카드',
            benefit: '7.5% 할인',
            payment: 52000,
            amount: 3900,
          },
        ],
      },
      {
        id: 'cafe',
        name: '카페',
        icon: iconCafe,
        count: 3,
        amount: 1665,
        items: [
          {
            date: '07.13',
            merchant: '스타벅스',
            usedCard: '카카오뱅크',
            benefitCard: '카페 라이프 카드',
            benefit: '10% 할인',
            payment: 6500,
            amount: 650,
          },
          {
            date: '07.09',
            merchant: '블루보틀 강남',
            usedCard: '카카오뱅크',
            benefitCard: '카페 라이프 카드',
            benefit: '10% 할인',
            payment: 8500,
            amount: 850,
          },
          {
            date: '07.03',
            merchant: '폴바셋',
            usedCard: '카카오뱅크',
            benefitCard: '카페 라이프 카드',
            benefit: '10% 할인',
            payment: 1650,
            amount: 165,
          },
        ],
      },
      {
        id: 'shopping',
        name: '쇼핑',
        icon: iconShopping,
        count: 1,
        amount: 1957,
        items: [
          {
            date: '07.07',
            merchant: '올리브영',
            usedCard: 'KB국민카드',
            benefitCard: '삼성 쇼핑카드',
            benefit: '5% 할인',
            payment: 39000,
            amount: 1957,
          },
        ],
      },
    ],
  },
  card: {
    info: '다른 카드를 선택해서 놓친 혜택이에요. 앱을 이용했지만 더 나은 혜택 카드를 선택하지 않아 놓쳤어요. 결제 전 추천 카드를 꼭 확인해 보세요.',
    categories: [
      {
        id: 'food',
        name: '외식',
        icon: iconFood,
        count: 2,
        amount: 6790,
        items: [
          {
            date: '07.15',
            merchant: '배달의민족',
            usedCard: '카카오뱅크',
            benefitCard: 'KB Gold & More',
            benefit: '7% 할인',
            payment: 32000,
            amount: 2240,
          },
          {
            date: '07.11',
            merchant: '스시조 강남점',
            usedCard: '카카오뱅크',
            benefitCard: 'KB Gold & More',
            benefit: '7% 할인',
            payment: 65000,
            amount: 4550,
          },
        ],
      },
      {
        id: 'shopping',
        name: '쇼핑',
        icon: iconShopping,
        count: 1,
        amount: 4740,
        items: [
          {
            date: '07.20',
            merchant: '무신사',
            usedCard: '노스뱅크',
            benefitCard: '현대카드 ZERO',
            benefit: '6% 할인',
            payment: 79000,
            amount: 4740,
          },
        ],
      },
      {
        id: 'fuel',
        name: '교통/주유',
        icon: iconRefuel,
        count: 2,
        amount: 4320,
        items: [
          {
            date: '07.14',
            merchant: 'SK주유소',
            usedCard: '신한카드',
            benefitCard: '현대 오일뱅크카드',
            benefit: '7.5% 할인',
            payment: 48000,
            amount: 3600,
          },
          {
            date: '07.06',
            merchant: '서울버스 정기권',
            usedCard: '카카오페이',
            benefitCard: '신한 Deep Dream',
            benefit: '7.5% 할인',
            payment: 9600,
            amount: 720,
          },
        ],
      },
      {
        id: 'cafe',
        name: '카페',
        icon: iconCafe,
        count: 2,
        amount: 4469,
        items: [
          {
            date: '07.17',
            merchant: '이디야커피',
            usedCard: '체크카드',
            benefitCard: '카페 라이프 카드',
            benefit: '10% 할인',
            payment: 5500,
            amount: 550,
          },
          {
            date: '07.02',
            merchant: '투썸플레이스',
            usedCard: '체크카드',
            benefitCard: '카페 라이프 카드',
            benefit: '10% 할인',
            payment: 39190,
            amount: 3919,
          },
        ],
      },
    ],
  },
}

const currentCard = computed(() => receivedCards[selectedCard.value])
const currentMissed = computed(() => missedData[missedTab.value])

// 도넛 가운데 숫자. 조각의 합(slicesTotal)이 아니라 진짜 총액이다.
const totalBenefit = computed(() => summary.value.totalReceivedBenefit)

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

function selectCard(index) {
  if (index < 0 || index >= receivedCards.length) return
  selectedCard.value = index
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
  missedTab.value = tab
  expanded.value = new Set(['food'])
}

/**
 * 놓친 혜택 총액을 0 부터 굴린다. 목표값은 부를 때마다 응답에서 다시 읽는다.
 *
 * 받은 혜택 총액은 도넛 가운데(`totalBenefit`)가 그대로 보여준다. 예전에는 요약 카드
 * 두 장이 각각 굴렸는데, 피그마 구성에서 그 두 장이 빠지면서 놓친 혜택만 남았다.
 */
function animateCounts() {
  cancelAnimationFrame(animationFrame)

  const missedTarget = summary.value.totalMissedBenefit
  const start = performance.now()
  const duration = 900
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    missedCount.value = Math.round(missedTarget * eased)
    if (progress < 1) animationFrame = requestAnimationFrame(tick)
  }
  animationFrame = requestAnimationFrame(tick)
}

// 응답이 도착할 때마다 다시 굴린다. 달을 바꿔도 새 숫자로 이어진다.
// 요약이 오기 전에 미리 굴리면 0 에서 0 으로 굴렀다가 값이 튀어 들어온다.
watch(summary, animateCounts)

onMounted(() => {
  if (initialCardId) {
    const index = receivedCards.findIndex((card) => card.id === initialCardId)
    selectedCard.value = index >= 0 ? index : 0
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
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
      <h1>
        {{
          page === 'main'
            ? '혜택 리포트'
            : page === 'received'
              ? '받은 혜택 리포트'
              : '놓친 혜택 리포트'
        }}
      </h1>
      <div v-if="page === 'main'" class="report-month">
        <button type="button" aria-label="이전 달" @click="shiftMonth(-1)">
          <ChevronLeft :size="17" />
        </button>
        <strong>{{ cursor.month }}월</strong>
        <!-- 미래 달에는 결제가 있을 수 없다. 이번 달이면 잠근다. -->
        <button
          type="button"
          aria-label="다음 달"
          :disabled="isCurrentMonth"
          @click="shiftMonth(1)"
        >
          <ChevronRight :size="17" />
        </button>
      </div>
      <button class="report-menu" type="button" aria-label="마이페이지 열기" @click="openMyPage()">
        <Menu :size="23" />
      </button>
    </header>

    <div v-if="page === 'main'" class="report-scroll">
      <div v-if="reportStore.isLoading" class="flex justify-center py-24 text-sub">
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

      <template v-else>
        <section class="report-panel">
          <div class="flex items-center justify-between gap-2">
            <h2>카테고리별 받은 혜택</h2>
            <button
              type="button"
              class="flex shrink-0 items-center gap-0.5 bg-transparent !text-[13px] !font-bold text-primary-dark"
              @click="openPage('received')"
            >
              자세히보기 <ChevronRight :size="14" />
            </button>
          </div>
          <div class="report-donut-wrap">
            <div class="report-donut" :style="{ background: chartBackground }">
              <div>
                <span>총 혜택</span>
                <strong>{{ won(totalBenefit) }}</strong>
              </div>
            </div>
            <div class="report-legend">
              <span v-for="item in chartData.slice(0, 3)" :key="item.id">
                <i :style="{ background: item.color }"></i>{{ item.name }}
              </span>
            </div>
          </div>
          <div v-if="rankings.length" class="report-ranking">
            <div v-for="(item, index) in rankings" :key="item.id" :class="{ first: index === 0 }">
              <span class="rank">{{ index + 1 }}</span>
              <strong>{{ item.name }}</strong>
              <p>
                <b>{{ item.benefit }}</b
                ><small>지출 {{ item.spend }}</small>
              </p>
            </div>
          </div>
          <div v-else class="py-6 text-center text-xs text-sub">이 달에는 받은 혜택이 없어요</div>
        </section>

        <!-- 놓친 혜택은 요약 API 가 총액 하나만 준다. 분해와 거래 목록은 상세 화면이 맡는다. -->
        <section class="report-panel">
          <div class="flex items-center justify-between gap-2">
            <h2 class="!text-[15px]">이번 달 놓친 혜택</h2>
            <button
              type="button"
              class="flex shrink-0 items-center gap-0.5 bg-transparent !text-[13px] !font-bold text-primary-dark"
              @click="openPage('missed')"
            >
              자세히보기 <ChevronRight :size="14" />
            </button>
          </div>
          <div class="mt-3 flex items-center gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-icon-bg">
              <Minus :size="18" :stroke-width="4" class="text-primary-dark" />
            </span>
            <strong class="text-[26px] font-bold text-ink">{{ won(missedCount) }}</strong>
          </div>
        </section>

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
              <strong>{{ card.cardName }}</strong>
              <p>{{ card.description }}</p>
              <div>
                <span>예상 혜택 {{ won(card.expectedBenefit) }}</span>
              </div>
            </div>
            <button type="button" @click="notify('카드 신청 페이지는 준비 중이에요.')">
              신청하기
            </button>
          </article>
          <div v-if="!recommendations.length" class="py-4 text-xs text-sub">
            지금은 추천할 카드가 없어요. 이 달의 결제가 쌓이면 다시 추천해 드려요.
          </div>
        </section>
      </template>
    </div>

    <div v-else-if="page === 'received'" class="report-scroll report-detail-scroll">
      <div class="received-card-wrap">
        <article
          class="received-card-visual"
          :style="{ background: currentCard.gradient, color: currentCard.color }"
        >
          <strong>{{ currentCard.name }}</strong>
          <span :style="{ color: currentCard.subColor }">**** {{ currentCard.last4 }}</span>
        </article>
        <div class="received-card-controls">
          <button
            type="button"
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
            :disabled="selectedCard === receivedCards.length - 1"
            @click="selectCard(selectedCard + 1)"
          >
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>

      <div class="received-total">
        <div>
          <span>총 할인 금액</span><strong>{{ won(currentCard.totalBenefit) }}</strong>
        </div>
        <div>
          <span>총 사용 금액</span><strong>{{ won(currentCard.totalSpend) }}</strong>
        </div>
      </div>

      <section class="report-category-section">
        <h2>카테고리별 전체 혜택</h2>
        <article
          v-for="category in currentCard.categories"
          :key="category.id"
          class="report-category-card"
        >
          <button class="report-category-head" type="button" @click="toggle(category.id)">
            <span class="report-category-icon">
              <img v-if="category.icon" :src="category.icon" alt="" />
            </span>
            <span class="report-category-name"
              ><strong>{{ category.name }}</strong
              ><small>{{ category.count }}건 이용</small></span
            >
            <b class="received">+{{ won(category.amount) }}</b>
            <ChevronUp v-if="expanded.has(category.id)" :size="17" />
            <ChevronDown v-else :size="17" />
          </button>
          <Transition name="report-expand">
            <div v-if="expanded.has(category.id)" class="report-transactions">
              <div v-for="item in category.items" :key="`${item.date}-${item.merchant}`">
                <span>{{ item.date }}</span>
                <p>
                  <strong>{{ item.merchant }}</strong
                  ><small
                    ><b>{{ item.benefit }}</b> · 결제 {{ won(item.payment) }}</small
                  >
                </p>
                <em>+{{ won(item.amount) }}</em>
              </div>
            </div>
          </Transition>
        </article>
      </section>
    </div>

    <div v-else class="report-scroll report-detail-scroll">
      <section class="missed-hero">
        <p>이번 달 총 놓친 혜택</p>
        <h2>₩36,451</h2>
        <div>
          <span><small>▣ 앱 미사용</small><strong>₩16,132</strong></span>
          <span><small>▰ 카드 선택 손실</small><strong>₩20,319</strong></span>
        </div>
      </section>

      <div class="missed-tabs">
        <button
          type="button"
          :class="{ active: missedTab === 'app' }"
          @click="selectMissedTab('app')"
        >
          앱 미사용 손실
        </button>
        <button
          type="button"
          :class="{ active: missedTab === 'card' }"
          @click="selectMissedTab('card')"
        >
          카드 선택 손실
        </button>
      </div>

      <p class="missed-info">ⓘ {{ currentMissed.info }}</p>

      <section class="report-category-section missed-section">
        <h2>카테고리별 상세</h2>
        <article
          v-for="category in currentMissed.categories"
          :key="category.id"
          class="report-category-card"
        >
          <button class="report-category-head" type="button" @click="toggle(category.id)">
            <span class="report-category-icon">
              <img v-if="category.icon" :src="category.icon" alt="" />
            </span>
            <span class="report-category-name"
              ><strong>{{ category.name }}</strong
              ><small>{{ category.count }}건 미적용</small></span
            >
            <b class="missed">₩{{ category.amount.toLocaleString('ko-KR') }}</b>
            <ChevronUp v-if="expanded.has(category.id)" :size="17" />
            <ChevronDown v-else :size="17" />
          </button>
          <Transition name="report-expand">
            <div v-if="expanded.has(category.id)" class="report-transactions missed-transactions">
              <div v-for="item in category.items" :key="`${item.date}-${item.merchant}`">
                <span>{{ item.date }}</span>
                <p>
                  <strong>{{ item.merchant }}</strong>
                  <small>{{ item.usedCard }} · 결제 {{ won(item.payment) }}</small>
                  <small><b>혜택 카드</b> {{ item.benefitCard }} · {{ item.benefit }}</small>
                </p>
                <em>₩{{ item.amount.toLocaleString('ko-KR') }}</em>
              </div>
            </div>
          </Transition>
        </article>
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
        <img :src="iconMycard" alt="" /><span>내 카드</span>
      </button>
      <button class="active" type="button">
        <img :src="iconReportActive" alt="" /><span>리포트</span>
      </button>
    </nav>

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </section>
</template>
