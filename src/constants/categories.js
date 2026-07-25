import { Coffee, Fuel, Plus, ShoppingBag, ShoppingCart, Utensils } from 'lucide-vue-next'

/**
 * 카테고리 목록. 홈 화면 카테고리 아이콘 · 가맹점 리스트(/category/:type) 상단바가
 * 여기 값을 그대로 쓴다.
 *
 * 새 카테고리를 추가하려면 이 객체에 한 줄만 추가하면 된다. 라우터·컴포넌트는 건드릴 필요 없음.
 * key 는 라우트 경로의 :type 파라미터와 정확히 같아야 한다 (예: /category/cafe → key 'cafe').
 */
export const CATEGORIES = {
  cafe: { title: '카페/디저트', icon: Coffee },
  food: { title: '푸드', icon: Utensils },
  mart: { title: '편의점/마트', icon: ShoppingCart },
  shopping: { title: '쇼핑', icon: ShoppingBag },
  hospital: { title: '병원', icon: Plus },
  gas: { title: '주유', icon: Fuel },
}

export function getCategory(type) {
  return CATEGORIES[type] ?? { title: '카테고리', icon: null }
}
