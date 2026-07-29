import iconCafe from './assets/icons/category-cafe.svg'
import iconFood from './assets/icons/category-food.svg'
import iconMart from './assets/icons/category-mart.svg'
import iconShopping from './assets/icons/category-shopping.svg'
import iconHospital from './assets/icons/category-hospital.svg'
import iconRefuel from './assets/icons/category-refuel.svg'
import iconTransport from './assets/icons/potentialbenefit-transportation.svg'
import iconPayment from './assets/icons/payment.svg'

export const colors = {
  primary: '#FFCC00',
  primaryDark: '#E6A800',
  text: '#1A1A1A',
  sub: '#60584C',
  border: '#E9E4DC',
  iconBg: '#FFF8E5',
  muted: '#D4C4AB',
}

export const categories = [
  { id: 'cafe', name: '카페/디저트', icon: iconCafe },
  { id: 'food', name: '푸드', icon: iconFood },
  { id: 'mart', name: '편의점/마트', icon: iconMart },
  { id: 'shopping', name: '쇼핑', icon: iconShopping },
  { id: 'hospital', name: '병원', icon: iconHospital },
  { id: 'gas', name: '주유', icon: iconRefuel },
]

export const favoritePlaces = [
  {
    id: 'bluebottle',
    name: '블루보틀 강남',
    category: '카페/디저트',
    categoryId: 'cafe',
    isNew: true,
    img: 'https://images.unsplash.com/photo-1716808681381-52cf8055b02d?crop=entropy&cs=tinysrgb&fit=crop&w=600&h=320',
  },
  {
    id: 'fiveguys',
    name: '파이브가이즈',
    category: '푸드',
    categoryId: 'food',
    img: 'https://images.unsplash.com/photo-1667329829058-ac191ba4a905?crop=entropy&cs=tinysrgb&fit=crop&w=600&h=320',
  },
  {
    id: 'gs25',
    name: 'GS25 강남점',
    category: '편의점/마트',
    categoryId: 'mart',
    img: 'https://images.unsplash.com/photo-1758570764602-d57bc2922dea?crop=entropy&cs=tinysrgb&fit=crop&w=600&h=320',
  },
  {
    id: 'gscaltex',
    name: 'GS칼텍스 강남점',
    category: '주유소',
    categoryId: 'gas',
    img: 'https://images.unsplash.com/photo-1545262810-77515befe149?crop=entropy&cs=tinysrgb&fit=crop&w=600&h=320',
  },
]

export const cards = [
  {
    id: 'kb',
    name: 'KB Gold & More',
    issuer: 'KB국민카드',
    label: 'PREMIUM',
    mark: 'KB',
    last4: '1234',
    gradient: 'linear-gradient(135deg,#FFCC00 0%,#FFB300 60%,#E69A00 100%)',
    text: '#3A2200',
    sub: '#7A5900',
  },
  {
    id: 'shinhan',
    name: '신한 Deep Dream',
    issuer: '신한카드',
    label: 'SIGNAT.',
    mark: '신한',
    last4: '5678',
    gradient: 'linear-gradient(135deg,#1E5FBB 0%,#0D47A1 60%,#082474 100%)',
    text: '#fff',
    sub: 'rgba(255,255,255,.7)',
  },
  {
    id: 'hyundai',
    name: '현대카드 ZERO',
    issuer: '현대카드',
    label: 'ZERO',
    mark: 'H',
    last4: '9012',
    gradient: 'linear-gradient(135deg,#37474F 0%,#263238 60%,#1A1A2E 100%)',
    text: '#fff',
    sub: 'rgba(255,255,255,.65)',
  },
]

const b = (
  name,
  discount,
  perTxMax,
  monthlyLimit,
  usedAmount,
  txCount,
  txTotal,
  exhausted = false,
) => ({ name, discount, perTxMax, monthlyLimit, usedAmount, txCount, txTotal, exhausted })
const brand = (
  name,
  discount,
  perTxMax,
  monthlyLimit,
  usedAmount,
  txCount,
  txTotal,
  logoColor,
  logoInitial,
  exhausted = false,
) => ({
  ...b(name, discount, perTxMax, monthlyLimit, usedAmount, txCount, txTotal, exhausted),
  logoColor,
  logoInitial,
})

export const benefitProfiles = {
  kb: {
    tier: '전월 실적 2구간 적용 중',
    totalLimit: 39000,
    categories: [
      b('외식', '7% 할인', '건당 최대 5,000원', 20000, 12000, 24, 171000),
      b('마트', '5% 할인', '건당 최대 5,000원', 10000, 6500, 8, 130000),
      b('교통', '건당 최대 800원 할인', '건당 최대 800원', 6000, 2000, 12, 32600),
      b('카페', '10% 할인', '건당 최대 5,000원', 4000, 4000, 15, 40000, true),
    ],
    brands: [
      brand('GS25', '5% 할인', '건당 최대 2,000원', 5000, 1000, 2, 20000, '#0068B7', 'G'),
      brand('이마트', '5% 할인', '건당 최대 5,000원', 7000, 2900, 1, 58000, '#F2C400', '이'),
      brand(
        '스타벅스',
        '10% 할인',
        '건당 최대 5,000원',
        4000,
        4000,
        3,
        22200,
        '#00704A',
        'S',
        true,
      ),
    ],
    totalCount: 59,
    totalSpend: 373600,
  },
  shinhan: {
    tier: '전월 실적 조건 없이 적용 중',
    totalLimit: 24000,
    categories: [
      b('카페', '10% 할인', '건당 최대 3,000원', 5000, 3500, 10, 35000),
      b('쇼핑', '5% 할인', '건당 최대 3,000원', 5000, 2800, 5, 56000),
      b('외식', '3% 할인', '건당 최대 2,000원', 4000, 1900, 6, 63300),
    ],
    brands: [
      brand('투썸플레이스', '10% 할인', '건당 최대 2,000원', 3000, 780, 1, 7800, '#8B1E2D', 'T'),
      brand('올리브영', '5% 할인', '건당 최대 3,000원', 4000, 1900, 1, 38000, '#A4C639', 'O'),
      brand('스타벅스', '10% 할인', '건당 최대 2,000원', 2000, 650, 1, 6500, '#00704A', 'S'),
    ],
    totalCount: 21,
    totalSpend: 154300,
  },
  hyundai: {
    tier: '전월 실적 조건 없이 적용 중',
    totalLimit: 18000,
    categories: [
      b('쇼핑', '6% 할인', '건당 최대 4,000원', 5000, 3200, 7, 87000),
      b('교통', '5% 할인', '건당 최대 1,000원', 3000, 1500, 9, 27000),
      b('통신', '2% 할인', '건당 최대 2,000원', 2000, 1100, 1, 55000),
    ],
    brands: [],
    totalCount: 17,
    totalSpend: 169000,
  },
}

// 통신 전용 아이콘은 아직 없어서 임시로 payment 아이콘을 사용 중 (피그마에서 뽑으면 교체)
export const benefitIcons = {
  카페: iconCafe,
  외식: iconFood,
  마트: iconMart,
  쇼핑: iconShopping,
  교통: iconTransport,
  통신: iconPayment,
}

export const events = {
  kb: [
    {
      id: 'kb-cafe',
      category: '카페',
      title: '스타벅스 결제 시',
      condition: '월 최대 10,000원 · 최소 결제 10,000원',
      period: '2026.07.01 ~ 2026.09.30',
      benefit: '10% 할인',
      url: 'https://card.kbcard.com/BON/DVIEW/HBBMCXCRVNEC0001',
    },
    {
      id: 'kb-movie',
      category: '문화',
      title: 'CGV 영화 예매 시',
      condition: '월 2회 · 최소 결제 15,000원',
      period: '2026.07.01 ~ 2026.12.31',
      benefit: '5,000원 할인',
      url: 'https://card.kbcard.com/BON/DVIEW/HBBMCXCRVNEC0001',
    },
  ],
  shinhan: [
    {
      id: 'sh-cafe',
      category: '카페',
      title: '커피 전문점 결제 시',
      condition: '월 최대 5,000원 · 건당 1회',
      period: '2026.07.01 ~ 2026.12.31',
      benefit: '10% 할인',
      url: 'https://www.shinhancard.com/mob/MOBFM026N/MOBFM026C01.shc',
    },
    {
      id: 'sh-shop',
      category: '쇼핑',
      title: '올리브영·무신사 결제 시',
      condition: '월 최대 5,000원',
      period: '2026.07.01 ~ 2026.09.30',
      benefit: '5% 할인',
      url: 'https://www.shinhancard.com/mob/MOBFM026N/MOBFM026C01.shc',
    },
  ],
  hyundai: [
    {
      id: 'hy-shop',
      category: '쇼핑',
      title: '온라인 쇼핑 결제 시',
      condition: '월 최대 5,000원',
      period: '2026.07.01 ~ 2026.12.31',
      benefit: '6% 할인',
      url: 'https://www.hyundaicard.com/cpb/ev/CPBEV0101_01.hc',
    },
    {
      id: 'hy-mobility',
      category: '교통',
      title: '대중교통·카카오T 이용 시',
      condition: '월 최대 3,000원',
      period: '2026.07.01 ~ 2026.12.31',
      benefit: '5% 할인',
      url: 'https://www.hyundaicard.com/cpb/ev/CPBEV0101_01.hc',
    },
  ],
}
