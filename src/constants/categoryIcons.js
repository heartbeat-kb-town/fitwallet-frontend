import iconCafe from '@/assets/icons/category-cafe.svg'
import iconFood from '@/assets/icons/category-food.svg'
import iconMart from '@/assets/icons/category-mart.svg'
import iconShopping from '@/assets/icons/category-shopping.svg'
import iconHospital from '@/assets/icons/category-hospital.svg'
import iconRefuel from '@/assets/icons/category-refuel.svg'
import iconTransport from '@/assets/icons/potentialbenefit-transportation.svg'
import iconTelecom from '@/assets/icons/category-telecom.svg'
import iconAll from '@/assets/icons/category-all.svg'

/**
 * 카테고리명 → 화면 아이콘.
 *
 * 백엔드가 카테고리 이미지 URL 을 시드에서 전부 null 로 두고 있어 이름으로 찾는다.
 * URL 이 오는 화면은 그걸 먼저 쓰고 없을 때만 여기로 떨어진다 (`MyCardView`).
 *
 * ⚠️ **`benefitCategoryIcons.js` 와 다른 표다.** 저쪽은 `"일반 할인 - 편의점"` 처럼
 * 제각각인 **혜택 이름**에서 업종을 키워드로 짐작하고, 못 찾으면 일반 혜택 아이콘으로
 * 떨어진다. 이 표는 `category` 마스터의 **카테고리명**을 정확히 맞춰 찾는다.
 *
 * 카테고리 마스터는 7개다 — 카페/디저트 · 편의점/마트 · 쇼핑 · 푸드 · 병원 · 주유 · 기타.
 * 나머지 키(`교통` · `통신` · `전체` · `외식` · `마트` · `카페`)는 마스터에 없지만,
 * 목데이터 시절 이름이거나 화면이 만든 이름이라 두 화면 중 한쪽이 아직 넘길 수 있어 남겨 둔다.
 *
 * **`기타` 는 일부러 넣지 않았다.** 업종을 가리키지 않는 이름이라 어떤 그림을 붙여도
 * 지어내는 것이 된다. 아래 방침대로 빈 원으로 둔다.
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
  외식: iconFood,
  마트: iconMart,
  카페: iconCafe,
}

/**
 * 모르는 카테고리는 **빈 문자열**을 준다.
 *
 * 화면은 이 값을 `v-if` 로 받아 빈 원으로 둔다. 대신 쓸 그림을 고르지 않는다 —
 * 엉뚱한 업종 아이콘이 붙으면 사용자가 그 카테고리를 잘못 읽는다.
 */
export function categoryIcon(categoryName) {
  return CATEGORY_ICONS[categoryName] ?? ''
}
