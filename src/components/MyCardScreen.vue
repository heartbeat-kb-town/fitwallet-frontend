<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Menu } from 'lucide-vue-next'
import iconHome from '../assets/icons/home.svg'
import iconPayment from '../assets/icons/payment.svg'
import iconMycardActive from '../assets/icons/mycard-selected.svg'
import iconReport from '../assets/icons/report.svg'
import iconCafe from '../assets/icons/category-cafe.svg'
import iconFood from '../assets/icons/category-food.svg'
import iconMart from '../assets/icons/category-mart.svg'
import iconShopping from '../assets/icons/category-shopping.svg'
import iconHospital from '../assets/icons/category-hospital.svg'
import iconRefuel from '../assets/icons/category-refuel.svg'
import iconTransport from '../assets/icons/potentialbenefit-transportation.svg'
import iconTelecom from '../assets/icons/category-telecom.svg'
import iconAll from '../assets/icons/category-all.svg'
import cardSheet from '../assets/cards/payment-card-sheet.png'
import pigFace from '../assets/icons/pig-face.svg'

const emit = defineEmits(['home', 'payment', 'mypage', 'report'])

const months = ['2024.01', '2023.12', '2023.11']
const cards = [
  {
    id: 'deep-dream',
    issuer: '신한카드',
    name: 'Deep Dream',
    last4: '3428',
    cropY: 208,
    type: 'credit',
    amountLabel: '결제 예정 금액',
    amount: 320000,
    performance: 180000,
    tiers: [0, 300000, 600000, 900000],
    noRequirement: true,
    benefitRanges: ['실적 조건 없음'],
    benefits: [['전 가맹점 0.5% 캐시백', '대중교통 5% 할인', '스타벅스 10% 할인']],
  },
  {
    id: 'toktok-o',
    issuer: 'KB국민카드',
    name: '톡톡O',
    last4: '6231',
    cropY: 609,
    type: 'check',
    amountLabel: '잔액',
    amount: 1250000,
    account: '국민 123-45-6789',
    performance: 520000,
    tiers: [0, 500000, 1000000, 1500000],
    benefitRanges: [
      '0원 이상 ~ 50만원 미만',
      '50만원 이상 ~ 100만원 미만',
      '100만원 이상 ~ 150만원 미만',
      '150만원 이상',
    ],
    benefits: [
      ['전 가맹점 0.5% 캐시백'],
      ['전 가맹점 1.0% 캐시백', 'CU 5% 할인'],
      ['전 가맹점 1.5% 캐시백', '스타벅스 10% 할인'],
      ['전 가맹점 2.0% 캐시백', '모든 카페 15% 할인'],
    ],
  },
  {
    id: 'zero',
    issuer: '현대카드',
    name: 'ZERO Edition2',
    last4: '5509',
    cropY: 1022,
    type: 'credit',
    amountLabel: '결제 예정 금액',
    amount: 1240000,
    performance: 500000,
    tiers: [0, 1000000, 2000000, 3000000],
    benefitRanges: [
      '0원 이상 ~ 100만원 미만',
      '100만원 이상 ~ 200만원 미만',
      '200만원 이상 ~ 300만원 미만',
      '300만원 이상',
    ],
    benefits: [
      ['국내외 전 가맹점 1.0% 적립'],
      ['전 가맹점 1.2% 적립', '주유 리터당 50원 할인'],
      ['전 가맹점 1.5% 적립', '항공 마일리지 2배 적립'],
      ['전 가맹점 2.0% 적립', '해외 결제 수수료 면제'],
    ],
  },
  {
    id: 'da',
    issuer: '신한카드',
    name: 'DA@카드의정석',
    last4: '1847',
    cropY: 1443,
    type: 'credit',
    amountLabel: '결제 예정 금액',
    amount: 87500,
    performance: 750000,
    tiers: [0, 500000],
    singleTier: true,
    benefitRanges: ['50만원 이상'],
    benefits: [['친환경 가맹점 3% 적립', '대중교통 5% 할인', '해외 결제 수수료 면제']],
  },
]

const transactionSets = {
  'deep-dream': {
    2024.01: [
      {
        cat: 'transport',
        merchant: '서울 지하철',
        date: '2024.01.24',
        time: '08:10',
        detail: '교통',
        amount: 1400,
      },
      {
        cat: 'shopping',
        merchant: '교보문고',
        date: '2024.01.22',
        time: '14:30',
        detail: '일시불',
        amount: 18000,
      },
      {
        cat: 'telecom',
        merchant: 'KT 통신요금',
        date: '2024.01.21',
        time: '10:00',
        detail: '공과금납부',
        amount: 35000,
        note: true,
      },
      {
        cat: 'cafe',
        merchant: '폴바셋 강남점',
        date: '2024.01.20',
        time: '11:00',
        detail: '카페',
        amount: 6800,
      },
    ],
    2023.12: [
      {
        cat: 'food',
        merchant: '맥도날드',
        date: '2023.12.29',
        time: '12:30',
        detail: '푸드',
        amount: 8500,
      },
      {
        cat: 'transport',
        merchant: 'T머니',
        date: '2023.12.28',
        time: '08:05',
        detail: '교통',
        amount: 5000,
      },
    ],
    2023.11: [
      {
        cat: 'cafe',
        merchant: '메가커피',
        date: '2023.11.30',
        time: '09:20',
        detail: '카페',
        amount: 2500,
      },
      {
        cat: 'shopping',
        merchant: '알라딘',
        date: '2023.11.28',
        time: '15:10',
        detail: '일시불',
        amount: 12000,
      },
    ],
  },
  'toktok-o': {
    2024.01: [
      {
        cat: 'cafe',
        merchant: '스타벅스 강남점',
        date: '2024.01.24',
        time: '09:15',
        detail: '카페/디저트',
        amount: 4500,
      },
      {
        cat: 'mart',
        merchant: 'CU 편의점',
        date: '2024.01.24',
        time: '14:30',
        detail: '편의점/마트',
        amount: 2800,
      },
      {
        cat: 'food',
        merchant: '본죽 역삼점',
        date: '2024.01.22',
        time: '12:05',
        detail: '푸드',
        amount: 12000,
      },
      {
        cat: 'transport',
        merchant: '서울 지하철',
        date: '2024.01.21',
        time: '08:22',
        detail: '교통',
        amount: 1400,
      },
      {
        cat: 'shopping',
        merchant: '다이소',
        date: '2024.01.19',
        time: '16:40',
        detail: '쇼핑',
        amount: 8500,
      },
    ],
    2023.12: [
      {
        cat: 'shopping',
        merchant: '쿠팡',
        date: '2023.12.28',
        time: '11:15',
        detail: '쇼핑',
        amount: 32900,
      },
      {
        cat: 'cafe',
        merchant: '이디야커피',
        date: '2023.12.26',
        time: '10:00',
        detail: '카페/디저트',
        amount: 3800,
      },
      {
        cat: 'mart',
        merchant: '이마트24',
        date: '2023.12.25',
        time: '20:10',
        detail: '편의점/마트',
        amount: 5400,
      },
    ],
    2023.11: [
      {
        cat: 'medical',
        merchant: '서울내과의원',
        date: '2023.11.30',
        time: '14:00',
        detail: '병원',
        amount: 15000,
        note: true,
      },
      {
        cat: 'cafe',
        merchant: '투썸플레이스',
        date: '2023.11.28',
        time: '11:30',
        detail: '카페/디저트',
        amount: 5500,
      },
      {
        cat: 'transport',
        merchant: '카카오T',
        date: '2023.11.27',
        time: '22:10',
        detail: '교통',
        amount: 9200,
      },
    ],
  },
  zero: {
    2024.01: [
      {
        cat: 'cafe',
        merchant: '스타벅스 강남점',
        date: '2024.01.24',
        time: '08:42',
        detail: '일시불',
        amount: 5800,
      },
      {
        cat: 'shopping',
        merchant: '쿠팡',
        date: '2024.01.23',
        time: '11:15',
        detail: '일시불',
        amount: 32900,
      },
      {
        cat: 'all',
        merchant: '한국전력',
        date: '2024.01.22',
        time: '14:30',
        detail: '공과금',
        amount: 45200,
        note: true,
      },
      {
        cat: 'mart',
        merchant: '이마트 역삼점',
        date: '2024.01.21',
        time: '19:23',
        detail: '일시불',
        amount: 68500,
      },
      {
        cat: 'transport',
        merchant: '카카오T',
        date: '2024.01.21',
        time: '09:14',
        detail: '교통',
        amount: 3200,
      },
    ],
    2023.12: [
      {
        cat: 'gas',
        merchant: 'GS칼텍스 주유소',
        date: '2023.12.30',
        time: '15:00',
        detail: '주유',
        amount: 65000,
      },
      {
        cat: 'shopping',
        merchant: '올리브영',
        date: '2023.12.28',
        time: '17:20',
        detail: '일시불',
        amount: 32500,
      },
      {
        cat: 'food',
        merchant: '교촌치킨',
        date: '2023.12.27',
        time: '19:45',
        detail: '일시불',
        amount: 21000,
      },
    ],
    2023.11: [
      {
        cat: 'gas',
        merchant: 'SK 주유소',
        date: '2023.11.29',
        time: '09:00',
        detail: '주유',
        amount: 58000,
      },
      {
        cat: 'mart',
        merchant: '홈플러스',
        date: '2023.11.27',
        time: '18:30',
        detail: '일시불',
        amount: 43500,
      },
    ],
  },
  da: {
    2024.01: [
      {
        cat: 'medical',
        merchant: '헬스장 월정액',
        date: '2024.01.23',
        time: '00:00',
        detail: '일시불',
        amount: 70000,
      },
      {
        cat: 'mart',
        merchant: '이마트24',
        date: '2024.01.23',
        time: '20:10',
        detail: '편의점',
        amount: 9500,
      },
      {
        cat: 'all',
        merchant: '한국가스공사',
        date: '2024.01.20',
        time: '09:00',
        detail: '공과금납부',
        amount: 28000,
        note: true,
      },
      {
        cat: 'shopping',
        merchant: 'CGV 영화관',
        date: '2024.01.19',
        time: '18:30',
        detail: '일시불',
        amount: 13000,
      },
    ],
    2023.12: [
      {
        cat: 'medical',
        merchant: '헬스장 월정액',
        date: '2023.12.20',
        time: '00:00',
        detail: '일시불',
        amount: 70000,
      },
      {
        cat: 'food',
        merchant: '버거킹',
        date: '2023.12.20',
        time: '13:15',
        detail: '푸드',
        amount: 9900,
      },
    ],
    2023.11: [
      {
        cat: 'medical',
        merchant: '헬스장 월정액',
        date: '2023.11.15',
        time: '00:00',
        detail: '일시불',
        amount: 70000,
      },
      {
        cat: 'shopping',
        merchant: '유니클로',
        date: '2023.11.15',
        time: '16:00',
        detail: '쇼핑',
        amount: 49900,
      },
    ],
  },
}

const categoryImages = {
  cafe: iconCafe,
  food: iconFood,
  mart: iconMart,
  shopping: iconShopping,
  medical: iconHospital,
  gas: iconRefuel,
  transport: iconTransport,
  telecom: iconTelecom,
  all: iconAll,
}

const activeIndex = ref(0)
const view = ref('main')
const monthIndex = ref(0)
const selectedTier = ref(0)
const touchStartX = ref(0)

const activeCard = computed(() => cards[activeIndex.value])
const transactions = computed(
  () => transactionSets[activeCard.value.id]?.[months[monthIndex.value]] ?? [],
)
const recentTransactions = computed(
  () => transactionSets[activeCard.value.id]?.[months[0]]?.slice(0, 3) ?? [],
)
const groupedTransactions = computed(() => {
  const groups = []
  transactions.value.forEach((transaction) => {
    const last = groups.at(-1)
    if (last?.date === transaction.date) last.items.push(transaction)
    else groups.push({ date: transaction.date, items: [transaction] })
  })
  return groups
})
const totalAmount = computed(() =>
  transactions.value.reduce((sum, transaction) => sum + transaction.amount, 0),
)
const currentTier = computed(() => {
  let result = 0
  activeCard.value.tiers.forEach((tier, index) => {
    if (activeCard.value.performance >= tier) result = index
  })
  return result
})
const nextTier = computed(
  () =>
    activeCard.value.tiers.find((tier) => tier > activeCard.value.performance) ??
    activeCard.value.tiers.at(-1),
)
const remaining = computed(() => Math.max(0, nextTier.value - activeCard.value.performance))
const progress = computed(() =>
  Math.min(
    100,
    Math.round((activeCard.value.performance / Math.max(1, activeCard.value.tiers.at(-1))) * 100),
  ),
)
const shownBenefits = computed(() => {
  if (activeCard.value.noRequirement || activeCard.value.singleTier) {
    return activeCard.value.benefits[0]
  }
  return activeCard.value.benefits[selectedTier.value]
})

function won(value) {
  return `${Math.abs(value).toLocaleString('ko-KR')}원`
}

function selectCard(index) {
  if (index < 0 || index >= cards.length) return
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
  if (view.value === 'transactions-from-performance') view.value = 'performance'
  else view.value = 'main'
}

function moveMonth(direction) {
  monthIndex.value = Math.max(0, Math.min(months.length - 1, monthIndex.value + direction))
}

function cardImageStyle(card, compact = false) {
  const scale = compact ? 0.23 : 0.92
  return {
    top: `${-card.cropY * scale}px`,
    width: compact ? '101px' : '404px',
    left: compact ? '-10px' : '-38px',
  }
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
        <button class="icon-button" type="button" aria-label="메뉴 열기" @click="emit('mypage')">
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
                    <img :src="cardSheet" alt="" draggable="false" :style="cardImageStyle(card)" />
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

          <div class="mycard-amount-row">
            <div>
              <span>{{ activeCard.amountLabel }}</span>
              <strong>{{ won(activeCard.amount) }}</strong>
              <small v-if="activeCard.account">{{ activeCard.account }}</small>
            </div>
            <button type="button" @click="openView('transactions')">상세 보기</button>
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
            <div
              v-for="transaction in recentTransactions"
              :key="`${transaction.date}-${transaction.merchant}`"
              class="mycard-recent-row"
            >
              <div
                class="mycard-category-icon"
                :class="{ empty: !categoryImages[transaction.cat] }"
              >
                <img
                  v-if="categoryImages[transaction.cat]"
                  :src="categoryImages[transaction.cat]"
                  :class="{ wide: transaction.cat === 'telecom' || transaction.cat === 'all' }"
                  alt=""
                />
              </div>
              <div class="mycard-transaction-copy">
                <strong>{{ transaction.merchant }}</strong>
                <span>{{ transaction.date }}</span>
              </div>
              <b>- {{ won(transaction.amount) }}</b>
            </div>
          </section>

          <section class="mycard-panel performance-preview">
            <div class="mycard-panel-title">
              <h2>이용 실적</h2>
              <button type="button" @click="openView('performance')">
                자세히 <ChevronRight :size="14" />
              </button>
            </div>

            <template v-if="activeCard.noRequirement">
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
                  <strong>{{ won(activeCard.performance) }}</strong>
                  <small v-if="!activeCard.singleTier">
                    다음 {{ currentTier + 1 }}구간까지 <b>{{ won(remaining) }}</b> 남음
                  </small>
                </div>
                <em>{{ activeCard.singleTier ? '실적 달성' : `${currentTier}구간 달성` }}</em>
              </div>
              <div class="mycard-progress-wrap">
                <div class="mycard-progress">
                  <span :style="{ width: `${progress}%` }">
                    <i><img :src="pigFace" alt="" /></i>
                  </span>
                </div>
                <div class="mycard-tier-labels">
                  <span v-for="(tier, index) in activeCard.tiers" :key="tier">
                    {{ index === 0 ? '0' : `${tier / 10000}만` }}
                  </span>
                </div>
              </div>
              <div v-if="activeCard.singleTier" class="mycard-achievement">
                <strong>전월 실적 달성!</strong>
                <span>다음 달 혜택이 모두 적용될 예정이에요.</span>
              </div>
            </template>
          </section>
        </div>
      </div>

      <nav class="bottom-nav">
        <button type="button" @click="emit('home')">
          <img :src="iconHome" alt="" width="22" height="22" /><span>홈</span>
        </button>
        <button type="button" @click="emit('payment')">
          <img :src="iconPayment" alt="" width="22" height="22" /><span>결제</span>
        </button>
        <button class="active" type="button">
          <img :src="iconMycardActive" alt="" width="22" height="22" /><span>내 카드</span>
        </button>
        <button type="button" @click="emit('report')">
          <img :src="iconReport" alt="" width="22" height="22" /><span>리포트</span>
        </button>
      </nav>
    </template>

    <template v-else-if="view === 'performance'">
      <header class="mycard-sub-header">
        <button type="button" aria-label="뒤로가기" @click="back">
          <ChevronLeft :size="22" />
        </button>
        <h1>이용 실적·혜택</h1>
        <button type="button" aria-label="메뉴 열기" @click="emit('mypage')">
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
                    <img :src="cardSheet" alt="" :style="cardImageStyle(card)" />
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
                :disabled="monthIndex === months.length - 1"
                @click="moveMonth(1)"
              >
                <ChevronLeft :size="16" />
              </button>
              <strong>{{ months[monthIndex].replace('.', '년 ') }}월</strong>
              <button type="button" :disabled="monthIndex === 0" @click="moveMonth(-1)">
                <ChevronRight :size="16" />
              </button>
            </div>

            <template v-if="activeCard.noRequirement">
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
                <strong>{{ won(activeCard.performance) }} <ChevronRight :size="15" /></strong>
              </button>
              <div class="mycard-progress-wrap detail">
                <div class="mycard-progress">
                  <span :style="{ width: `${progress}%` }"
                    ><i><img :src="pigFace" alt="" /></i
                  ></span>
                </div>
                <div class="mycard-tier-labels">
                  <span v-for="(_, index) in activeCard.tiers" :key="index">{{ index }}구간</span>
                </div>
              </div>
              <div class="mycard-achievement">
                <strong>{{
                  activeCard.singleTier ? '전월 실적 달성!' : `${currentTier}구간 실적 달성!`
                }}</strong>
                <span v-if="activeCard.singleTier">다음 달 혜택이 모두 적용될 예정이에요.</span>
                <span v-else
                  >{{ won(remaining) }} 추가 이용 시 다음 {{ currentTier + 1 }}구간 혜택 적용</span
                >
              </div>
            </template>
            <p class="mycard-notice">
              ※ 실적 인정 금액은 전표 접수 시간에 따라 바뀔 수 있으며, 할인된 등록 혜택은 이용
              실적에서 제외될 수 있습니다.
            </p>
          </section>

          <section class="mycard-panel benefit-tier-panel">
            <h2>
              {{
                activeCard.noRequirement || activeCard.singleTier ? '혜택 내용' : '구간별 혜택 내용'
              }}
            </h2>
            <div
              v-if="!activeCard.noRequirement && !activeCard.singleTier"
              class="mycard-tier-buttons"
            >
              <button
                v-for="(_, index) in activeCard.tiers"
                :key="index"
                type="button"
                :class="{ active: selectedTier === index }"
                @click="selectedTier = index"
              >
                {{ index }}
              </button>
            </div>
            <p
              v-if="!activeCard.noRequirement && !activeCard.singleTier"
              class="mycard-benefit-range"
            >
              ({{ activeCard.benefitRanges[selectedTier] }})
            </p>
            <ul>
              <li v-for="benefit in shownBenefits" :key="benefit">
                <i></i><span>{{ benefit }}</span>
              </li>
            </ul>
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
        <button type="button" aria-label="메뉴 열기" @click="emit('mypage')">
          <Menu :size="22" />
        </button>
      </header>
      <div class="mycard-transaction-scroll">
        <section class="mycard-transaction-summary">
          <div class="mycard-compact-card">
            <img :src="cardSheet" alt="" :style="cardImageStyle(activeCard, true)" />
          </div>
          <div class="mycard-summary-copy">
            <strong>{{ activeCard.issuer }} {{ activeCard.name }}</strong>
            <span>****{{ activeCard.last4 }}</span>
            <div class="mycard-mini-dots">
              <i
                v-for="(_, index) in months"
                :key="index"
                :class="{ active: index === monthIndex }"
              ></i>
            </div>
          </div>
          <div class="mycard-month-selector compact">
            <button
              type="button"
              :disabled="monthIndex === months.length - 1"
              @click="moveMonth(1)"
            >
              <ChevronLeft :size="14" />
            </button>
            <strong>{{ months[monthIndex] }}</strong>
            <button type="button" :disabled="monthIndex === 0" @click="moveMonth(-1)">
              <ChevronRight :size="14" />
            </button>
          </div>
          <div class="mycard-total">
            <span>{{ activeCard.type === 'credit' ? '결제 예정 금액' : '이번 달 사용 금액' }}</span>
            <strong>{{ won(totalAmount) }}</strong>
          </div>
        </section>

        <section v-for="group in groupedTransactions" :key="group.date" class="mycard-date-group">
          <h2>{{ dateLabel(group.date) }}</h2>
          <div>
            <article
              v-for="transaction in group.items"
              :key="`${transaction.time}-${transaction.merchant}`"
            >
              <div
                class="mycard-category-icon large"
                :class="{ empty: !categoryImages[transaction.cat] }"
              >
                <img
                  v-if="categoryImages[transaction.cat]"
                  :src="categoryImages[transaction.cat]"
                  :class="{ wide: transaction.cat === 'telecom' || transaction.cat === 'all' }"
                  alt=""
                />
              </div>
              <div class="mycard-transaction-copy">
                <strong>{{ transaction.merchant }}</strong>
                <span>{{ transaction.time }} · {{ transaction.detail }}</span>
                <em v-if="transaction.note">실적 미인정 건</em>
              </div>
              <b>{{ won(transaction.amount) }}</b>
            </article>
          </div>
        </section>
        <p class="mycard-history-notice">최근 3개월 내역을 제공합니다.</p>
      </div>
    </template>
  </section>
</template>
