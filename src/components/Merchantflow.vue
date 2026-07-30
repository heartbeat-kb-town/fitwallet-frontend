<script setup>
import { computed, ref } from 'vue'
import { Menu } from 'lucide-vue-next'
import { categories } from '../data'
import storeSearchIcon from '../assets/icons/category-store.svg'
import benefitGiftIcon from '../assets/icons/category-benefit.svg'
import iconHome from '../assets/icons/home.svg'
import iconPayment from '../assets/icons/payment.svg'
import iconMycard from '../assets/icons/mycard.svg'
import iconReport from '../assets/icons/report.svg'

const props = defineProps({
  request: {
    type: Object,
    default: () => ({ categoryId: 'cafe', title: '카페/디저트', query: '' }),
  },
})

const emit = defineEmits(['back', 'mypage', 'pay', 'navigate'])
const selectedStore = ref(null)

const storesByCategory = {
  cafe: [
    { name: '블루보틀 강남점', address: '강남구 테헤란로 521', distance: 48 },
    { name: '스타벅스 강남역사거리점', address: '강남구 강남대로 396', distance: 91 },
    { name: '파스쿠찌 역삼점', address: '강남구 테헤란로 50', distance: 140 },
    { name: '투썸플레이스 강남역점', address: '강남구 강남대로 310', distance: 210 },
    { name: '이디야 선릉역점', address: '강남구 선릉로 420', distance: 330 },
  ],
  food: [
    { name: '파이브가이즈 강남점', address: '강남구 강남대로 438', distance: 62 },
    { name: '교촌치킨 역삼점', address: '강남구 테헤란로 110', distance: 88 },
    { name: '한솥도시락 역삼역점', address: '강남구 역삼로 160', distance: 155 },
    { name: '맥도날드 강남역점', address: '강남구 강남대로 364', distance: 220 },
    { name: '김밥천국 선릉점', address: '강남구 선릉로 402', distance: 310, hours: '24시간' },
  ],
  mart: [
    { name: 'CU 강남역1호점', address: '강남구 강남대로 396', distance: 52 },
    { name: 'GS25 역삼점', address: '강남구 테헤란로 50', distance: 75 },
    { name: 'GS25 역삼2호점', address: '강남구 테헤란로 50', distance: 98 },
    { name: '이마트24 선릉점', address: '강남구 선릉로 438', distance: 125 },
    { name: '이마트24 선릉2호점', address: '강남구 선릉로 438', distance: 340, hours: '24시간' },
  ],
  shopping: [
    { name: '올리브영 강남역점', address: '강남구 강남대로 354', distance: 77 },
    { name: '유니클로 강남점', address: '강남구 강남대로 390', distance: 110 },
    { name: '자라 강남점', address: '강남구 강남대로 434', distance: 185 },
    { name: '현대백화점 무역센터점', address: '강남구 테헤란로 517', distance: 320 },
    { name: '갤러리아 명품관', address: '강남구 압구정로 343', distance: 540 },
  ],
  hospital: [
    { name: '강남역 연세의원', address: '강남구 강남대로 382', distance: 130 },
    { name: '이오치과 역삼점', address: '강남구 역삼로 168', distance: 195 },
    { name: 'GC녹십자의원 강남점', address: '강남구 테헤란로 416', distance: 240 },
    { name: '365의원 선릉점', address: '강남구 선릉로 430', distance: 350, hours: '09:00 - 21:00' },
    { name: '강남세브란스병원', address: '강남구 언주로 211', distance: 620 },
  ],
  gas: [
    { name: 'GS칼텍스 강남주유소', address: '강남구 강남대로 602', distance: 480 },
    { name: 'SK에너지 역삼주유소', address: '강남구 역삼로 201', distance: 720 },
    { name: '현대오일뱅크 선릉점', address: '강남구 선릉로 510', distance: 890, hours: '24시간' },
    { name: 'S-OIL 테헤란주유소', address: '강남구 테헤란로 600', distance: 1050 },
  ],
}

const starbucksStores = [
  { name: '스타벅스 강남역점', address: '강남구 강남대로 396', distance: 52 },
  { name: '스타벅스 강남R점', address: '강남구 강남대로 390', distance: 86 },
  { name: '스타벅스 강남역신분당역사점', address: '강남구 강남대로 396', distance: 120 },
  { name: '스타벅스 역삼아레나빌딩점', address: '강남구 언주로 425', distance: 190 },
  { name: '스타벅스 강남대로점', address: '강남구 강남대로 464', distance: 280 },
]

const category = computed(
  () => categories.find((item) => item.id === props.request.categoryId) ?? categories[0],
)
const isSearch = computed(() => Boolean(props.request.query))
const stores = computed(() => {
  const query = (props.request.query ?? '').replace(/\s/g, '').toLowerCase()
  if (query.includes('스타벅스')) return starbucksStores

  const allStores = Object.values(storesByCategory).flat()
  const matches = query
    ? allStores.filter((store) => store.name.replace(/\s/g, '').toLowerCase().includes(query))
    : (storesByCategory[category.value.id] ?? [])
  return matches.length ? matches : (storesByCategory[category.value.id] ?? [])
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
  emit('pay', { cardIndex: pick.cardIndex, store: selectedStore.value.name })
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
            @click="emit('back')"
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
            @click="emit('mypage')"
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
      <div class="merchant-list">
        <button
          v-for="store in stores"
          :key="store.name"
          class="merchant-card"
          type="button"
          @click="selectedStore = store"
        >
          <span class="merchant-store-icon">
            <img :src="isSearch ? storeSearchIcon : category.icon" alt="" />
          </span>
          <span class="merchant-store-info">
            <strong>{{ store.name }}</strong>
            <small>
              <template v-if="store.hours">{{ store.hours }} · </template>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {{ store.address }}
            </small>
          </span>
          <span class="merchant-distance">{{ formatDistance(store.distance) }}</span>
        </button>
      </div>
    </template>

    <template v-else>
      <header class="pick-header">
        <button type="button" aria-label="가맹점 목록으로" @click="selectedStore = null">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <h1>피그의 PICK</h1>
        <button type="button" aria-label="마이페이지" @click="emit('mypage')">
          <Menu :size="22" />
        </button>
      </header>

      <div class="pick-store-name">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <strong>{{ selectedStore.name }}</strong>
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
      <button type="button" @click="emit('navigate', 'home')">
        <img :src="iconHome" alt="" width="22" height="22" /><span>홈</span>
      </button>
      <button type="button" @click="emit('navigate', 'payment')">
        <img :src="iconPayment" alt="" width="22" height="22" /><span>결제</span>
      </button>
      <button type="button">
        <img :src="iconMycard" alt="" width="22" height="22" /><span>내 카드</span>
      </button>
      <button type="button">
        <img :src="iconReport" alt="" width="22" height="22" /><span>리포트</span>
      </button>
    </nav>
  </section>
</template>
