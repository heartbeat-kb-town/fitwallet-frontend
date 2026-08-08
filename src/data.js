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

// 자주 찾는 장소는 `GET /api/user/frequent-places` 로 옮겼다 (#114).
// 여기 있던 블루보틀·파이브가이즈는 누구에게나 똑같이 뜨던 가짜였다. 되살리지 않는다.

// 통신 전용 아이콘은 아직 없어서 임시로 payment 아이콘을 사용 중 (피그마에서 뽑으면 교체)
export const benefitIcons = {
  카페: iconCafe,
  외식: iconFood,
  마트: iconMart,
  쇼핑: iconShopping,
  교통: iconTransport,
  통신: iconPayment,
}
