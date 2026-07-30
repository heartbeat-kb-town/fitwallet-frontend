<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Menu, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import iconHome from '../assets/icons/home.svg'
import iconPayment from '../assets/icons/payment.svg'
import iconMycard from '../assets/icons/mycard.svg'
import iconReportActive from '../assets/icons/report-selected.svg'
import iconFood from '../assets/icons/category-food.svg'
import iconCafe from '../assets/icons/category-cafe.svg'
import iconMart from '../assets/icons/category-mart.svg'
import iconShopping from '../assets/icons/category-shopping.svg'
import iconRefuel from '../assets/icons/category-refuel.svg'
import iconTransport from '../assets/icons/potentialbenefit-transportation.svg'

const props = defineProps({
  initialCardId: { type: String, default: '' },
})

const emit = defineEmits(['navigate', 'mypage'])

const month = ref(3)
const page = ref(props.initialCardId ? 'received' : 'main')
const missedTab = ref('app')
const expanded = ref(new Set())
const selectedCard = ref(0)
const receivedCount = ref(0)
const missedCount = ref(0)
const toast = ref('')
let animationFrame = 0
let toastTimer

const chartData = [
  { name: '식비', value: 12000, color: '#ffcc00' },
  { name: '마트', value: 6500, color: '#e6a800' },
  { name: '카페', value: 4000, color: '#d4c4ab' },
  { name: '쇼핑', value: 1500, color: '#ede8e0' },
  { name: '통신', value: 500, color: '#f5f2ee' },
]

const rankings = [
  { name: '식비', benefit: '12,000원', spend: '420,000원' },
  { name: '마트', benefit: '6,500원', spend: '280,000원' },
  { name: '카페', benefit: '4,000원', spend: '120,000원' },
  { name: '쇼핑', benefit: '1,500원', spend: '80,000원' },
  { name: '통신', benefit: '500원', spend: '50,000원' },
]

const recommendations = [
  {
    name: '카페 라이프 카드',
    tags: ['카페', '생활비'],
    description: '카페 10% 할인, 전월 실적 30만원 이상, 월 최대 1.5만원 한도',
  },
  {
    name: '마트 세이브 카드',
    tags: ['마트', '장보기'],
    description: '마트·장보기 15% 할인, 전월 실적 40만원 이상, 월 최대 1.2만원 한도',
  },
]

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
const totalBenefit = computed(() => chartData.reduce((sum, item) => sum + item.value, 0))
const chartBackground = computed(() => {
  let current = 0
  const stops = chartData.map((item) => {
    const start = current
    current += (item.value / totalBenefit.value) * 100
    return `${item.color} ${start}% ${current}%`
  })
  return `conic-gradient(${stops.join(', ')})`
})

function won(value) {
  return `${Number(value).toLocaleString('ko-KR')}원`
}

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

function navigate(target) {
  emit('navigate', target)
}

function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
  }, 2000)
}

function animateCounts() {
  const start = performance.now()
  const duration = 900
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    receivedCount.value = Math.round(12500 * eased)
    missedCount.value = Math.round(36451 * eased)
    if (progress < 1) animationFrame = requestAnimationFrame(tick)
  }
  animationFrame = requestAnimationFrame(tick)
}

onMounted(() => {
  if (props.initialCardId) {
    const index = receivedCards.findIndex((card) => card.id === props.initialCardId)
    selectedCard.value = index >= 0 ? index : 0
  }
  animateCounts()
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
        <button type="button" aria-label="이전 달" @click="month = Math.max(1, month - 1)">
          <ChevronLeft :size="17" />
        </button>
        <strong>{{ month }}월</strong>
        <button type="button" aria-label="다음 달" @click="month = Math.min(12, month + 1)">
          <ChevronRight :size="17" />
        </button>
      </div>
      <button
        class="report-menu"
        type="button"
        aria-label="마이페이지 열기"
        @click="emit('mypage')"
      >
        <Menu :size="23" />
      </button>
    </header>

    <div v-if="page === 'main'" class="report-scroll">
      <div class="report-summary-grid">
        <button class="report-summary-card" type="button" @click="openPage('received')">
          <span class="report-summary-icon">🎁</span>
          <span>받은 혜택</span>
          <small>총금액</small>
          <strong class="received">{{ won(receivedCount) }}</strong>
        </button>
        <button class="report-summary-card" type="button" @click="openPage('missed')">
          <span class="report-summary-icon">↘</span>
          <span>놓친 혜택</span>
          <small>총금액</small>
          <strong class="missed">{{ won(missedCount) }}</strong>
        </button>
      </div>

      <section class="report-panel">
        <h2>카테고리별 받은 혜택</h2>
        <div class="report-donut-wrap">
          <div class="report-donut" :style="{ background: chartBackground }">
            <div>
              <span>총 혜택</span>
              <strong>{{ won(totalBenefit) }}</strong>
            </div>
          </div>
          <div class="report-legend">
            <span v-for="item in chartData.slice(0, 3)" :key="item.name">
              <i :style="{ background: item.color }"></i>{{ item.name }}
            </span>
          </div>
        </div>
        <div class="report-ranking">
          <div v-for="(item, index) in rankings" :key="item.name" :class="{ first: index === 0 }">
            <span class="rank">{{ index + 1 }}</span>
            <strong>{{ item.name }}</strong>
            <p>
              <b>{{ item.benefit }}</b
              ><small>지출 {{ item.spend }}</small>
            </p>
          </div>
        </div>
      </section>

      <section class="report-panel recommendation-panel">
        <h2>카드 추천</h2>
        <p>내 소비 패턴과 혜택 비중에 따라 추천해 드려요</p>
        <article v-for="card in recommendations" :key="card.name" class="recommendation-card">
          <div class="recommendation-visual"><span></span><i></i></div>
          <div class="recommendation-copy">
            <strong>{{ card.name }}</strong>
            <p>{{ card.description }}</p>
            <div>
              <span v-for="tag in card.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
          <button type="button" @click="notify('카드 신청 페이지는 준비 중이에요.')">
            신청하기
          </button>
        </article>
      </section>
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
          @click="
            missedTab = 'app'
            expanded = new Set(['food'])
          "
        >
          앱 미사용 손실
        </button>
        <button
          type="button"
          :class="{ active: missedTab === 'card' }"
          @click="
            missedTab = 'card'
            expanded = new Set(['food'])
          "
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
