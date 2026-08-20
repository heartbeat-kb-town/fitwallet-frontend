/**
 * 카테고리별 대표 사진.
 *
 * ⚠️ **이건 그 가게의 사진이 아니다. 카테고리를 대표하는 스톡 사진이다.**
 * `블루보틀 강남` 에 붙는 것은 블루보틀 사진이 아니라 "카페 사진"이다.
 *
 * 백엔드에 가게 사진이 없어서 이렇게 둔다. 확인한 사실:
 * - `store` 테이블에 이미지 컬럼이 없다 (`brand_id` · `kakao_place_id` 만 있다)
 * - `brand.brand_image_url` 은 컬럼만 있고 59개 브랜드 전부 NULL 이다
 * - 매장 244개 중 브랜드가 연결된 것은 49개(20%)뿐이다
 * - `findFrequentPlaces` 는 `store_id` · `store_name` · `address` · `category_name` 만 준다
 *
 * **백엔드가 사진을 주기 시작하면 이 파일은 지운다.** 카테고리 사진은 그때까지의 대역이다.
 *
 * 카테고리 이름은 백엔드 `category` 테이블과 정확히 같아야 한다
 * (카페/디저트 · 편의점/마트 · 쇼핑 · 푸드 · 병원 · 주유).
 *
 * 사진은 Unsplash 다 (상업적 사용 가능, 출처 표기 불필요). 앞의 넷은 예전 목데이터가 쓰던
 * 것과 같은 사진이라 피그마 시안에 그려진 것과 일치한다.
 */

// 600×320 으로 잘라 받는다. 카드 이미지 칸이 그보다 작아서 원본을 받을 이유가 없다.
const CROP = '?crop=entropy&cs=tinysrgb&fit=crop&w=600&h=320'

const PHOTO_IDS = {
  '카페/디저트': 'photo-1716808681381-52cf8055b02d',
  푸드: 'photo-1667329829058-ac191ba4a905',
  '편의점/마트': 'photo-1758570764602-d57bc2922dea',
  쇼핑: 'photo-1567958451986-2de427a4a0be',
  병원: 'photo-1519494026892-80bbd2d6fd0d',
  주유: 'photo-1545262810-77515befe149',
}

export const CATEGORY_PHOTOS = Object.fromEntries(
  Object.entries(PHOTO_IDS).map(([name, id]) => [name, `https://images.unsplash.com/${id}${CROP}`]),
)
