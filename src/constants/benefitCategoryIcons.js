import iconCafe from '@/assets/icons/category-cafe.svg'
import iconFood from '@/assets/icons/category-food.svg'
import iconMart from '@/assets/icons/category-mart.svg'
import iconShopping from '@/assets/icons/category-shopping.svg'
import iconRefuel from '@/assets/icons/category-refuel.svg'
import iconHospital from '@/assets/icons/category-hospital.svg'
import iconTransport from '@/assets/icons/potentialbenefit-transportation.svg'
import iconTelecom from '@/assets/icons/category-telecom.svg'
import iconStore from '@/assets/icons/category-store.svg'
import iconBenefit from '@/assets/icons/category-benefit.svg'

/**
 * 혜택 이름에서 업종 아이콘을 고른다.
 *
 * 통합 한도 그룹의 혜택 머리글에 붙는 그림이다. 이름이 `"일반 할인 - 편의점"` ·
 * `"오늘도 적립 - 푸드"` · `"아웃백·VIPS 환급할인"` 처럼 제각각이라 정확히 일치시킬 수 없다.
 * **키워드를 앞에서부터 찾아 처음 걸리는 것을 쓴다.**
 *
 * ⚠️ **순서가 규칙이다.** 한 이름에 업종이 둘 이상 들어 있는 경우가 흔해서
 * (`편의점/마트`, `편의점/커피`, `외식/커피/편의점/약국`) 먼저 적힌 쪽이 이긴다.
 * 새 키워드는 아무 데나 넣지 말고 어느 것을 이겨야 하는지 보고 자리를 정한다.
 *
 * 백엔드에 업종 아이콘이 생기면(`categoryImageUrl`) 이 표는 없앤다. 지금은
 * 브랜드 범위 혜택에 카테고리 정보가 아예 오지 않아 이름으로 고르는 수밖에 없다.
 */
const ICON_KEYWORDS = [
  [['편의점', '마트', '슈퍼', '할인점', '잡화', '다이소'], iconMart],
  [['카페', '커피', '제과', '베이커리', '빵집', '스타벅스'], iconCafe],
  [
    ['푸드', '음식', '외식', '식음료', '배달', '버거', '패스트푸드', '아웃백', 'VIPS', '요식'],
    iconFood,
  ],
  [['주유', '충전'], iconRefuel],
  [['병원', '약국'], iconHospital],
  [['쇼핑', '온라인몰', '백화점', '패션', '뷰티', '올리브영'], iconShopping],
  [['교통', '대중교통'], iconTransport],
  [['통신'], iconTelecom],
  [['가맹점', '스토어'], iconStore],
]

/** 못 찾으면 일반 혜택 아이콘을 쓴다. 이름이 업종을 안 담은 혜택이 있다(`Daily 할인`). */
export function benefitCategoryIcon(name) {
  if (!name) return iconBenefit

  return (
    ICON_KEYWORDS.find(([keywords]) => keywords.some((keyword) => name.includes(keyword)))?.[1] ??
    iconBenefit
  )
}
