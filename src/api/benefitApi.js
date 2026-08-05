import client from './client'

/**
 * 혜택 도메인 API.
 *
 * 가맹점 하나를 기준으로 보유 카드 **전부**를 판정한다.
 * 피그의 PICK 목록이 이 응답 하나로 그려진다.
 */

/**
 * 가맹점별 예상 혜택.
 *
 * @param storeId 가맹점 ID. **문자열로 보낸다.**
 *   백엔드가 "누락" 과 "숫자가 아님" 을 하나의 코드(`STORE_ID_REQUIRED`)로 응답하려고
 *   `String` 으로 받는다. 숫자로 보내도 쿼리 문자열이라 동작은 같지만,
 *   계약이 문자열이므로 여기서 맞춰 둔다.
 *
 * @returns `{ store, hasCard, cards }`
 *   - `cards` 는 `AVAILABLE` → `CONDITION_NOT_MET` → `NO_BENEFIT` 순으로 **정렬돼 온다.**
 *     화면이 다시 정렬하지 않는다
 *   - `hasCard` 가 false 면 `cards` 는 빈 배열이다. 빈 상태 화면은 이 값으로 분기한다
 *     (카드가 없어도 200 이고 `store` 는 채워진다)
 *
 *   - 400 STORE_ID_REQUIRED : storeId 가 없거나 숫자가 아니다
 *   - 404 STORE_NOT_FOUND : 없는 가맹점
 */
export const getExpectedBenefits = (storeId) =>
  client.get('/benefit/expected', { params: { storeId: String(storeId) } })

/** 카드 한 장의 판정 결과. 화면 분기의 기준이라 문자열을 흩어놓지 않는다. */
export const CARD_BENEFIT_STATUS = {
  /** 조건을 만족하는 혜택이 있고 한도도 남아 있다. */
  AVAILABLE: 'AVAILABLE',
  /** 걸리는 혜택은 있으나 전월실적 미달이거나 한도가 소진됐다. */
  CONDITION_NOT_MET: 'CONDITION_NOT_MET',
  /** 이 가맹점에 걸리는 혜택이 아예 없다. */
  NO_BENEFIT: 'NO_BENEFIT',
}
