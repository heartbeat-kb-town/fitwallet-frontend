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

// 통신 전용 아이콘은 아직 없어서 임시로 payment 아이콘을 사용 중 (피그마에서 뽑으면 교체)
export const benefitIcons = {
  카페: iconCafe,
  외식: iconFood,
  마트: iconMart,
  쇼핑: iconShopping,
  교통: iconTransport,
  통신: iconPayment,
}
