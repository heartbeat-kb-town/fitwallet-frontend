import client from './client'

/**
 * 리포트 도메인 API.
 *
 * 백엔드 `BenefitReportController` · `CardBenefitController` 기준이다.
 *
 * **아직 없는 것은 놓친 혜택 상세 하나다.** 응답 DTO(`MissedCategoryDetailResponse`)만
 * 추가돼 있고(backend#149) 컨트롤러·서비스·매퍼가 없다. 여기에 함수를 미리 만들어 두지 않는다.
 * 요약이 주는 것은 총액(`totalMissedBenefit`) 하나뿐이다.
 */

/**
 * 월간 혜택 요약.
 *
 * @param yearMonth `YYYY-MM`. 백엔드가 `DATE_FORMAT(paid_at, '%Y-%m')` 과 그대로 비교하므로
 *   `2026-8` 처럼 0 을 뺀 형태는 조용히 0건이 된다. 반드시 두 자리로 맞춰 보낸다.
 *
 * @returns `{ totalReceivedBenefit, totalMissedBenefit, categories, recommendations }`
 *
 *   - `categories` 는 `[{ categoryId, categoryName, benefitAmount, spendAmount }]` 이고
 *     **매퍼가 `benefitAmount DESC LIMIT 5` 로 정렬해서 준다.** 화면이 다시 정렬하지 않는다.
 *     상위 5개만 오므로 `benefitAmount` 의 합이 `totalReceivedBenefit` 보다 작을 수 있다.
 *   - `recommendations` 는 `[{ cardProductId, cardName, cardImageUrl, expectedBenefit, description }]` 이고
 *     서비스가 예상 혜택 내림차순 상위 2건으로 잘라서 준다. 이것도 다시 정렬하지 않는다.
 *     추천할 카드가 없으면(이미 다 보유했거나 이번 달 결제가 없으면) 빈 배열이다.
 *   - 금액은 전부 `BigDecimal` 이라 JSON 에서 숫자로 온다. 결제가 없는 달도 0 이지 null 이 아니다.
 *     단 `categories` · `recommendations` 는 빈 배열일 수 있다.
 */
export const getBenefitSummary = (yearMonth) =>
  client.get('/report/benefit/summary', { params: { yearMonth } })

/**
 * 카드 한 장의 받은 혜택 상세 (#152).
 *
 * @param userCardId **`user_card_id`** 다. `card_product_id` 가 아니다 —
 *   보유 카드를 가리키는 키라 `cardStore` 의 `card.id` 를 그대로 넘기면 된다.
 * @param yearMonth `YYYY-MM`. 요약과 같은 이유로 두 자리로 맞춰 보낸다.
 *
 * @returns `{ cardName, cardImageUrl, maskedCardNumber, totalDiscount, totalPoint, totalSpend, categories }`
 *
 *   **원화 할인과 포인트 적립이 나뉘어 온다.** 둘은 단위가 달라 합칠 수 없다.
 *   - `totalDiscount` 는 원(CASHBACK 합), `totalPoint` 는 포인트(ACCUMULATE 합)다.
 *   - `categories[].discountAmount` · `pointAmount` 도 같은 갈래다. 한쪽만 있는 카테고리가 흔하다.
 *   - `transactions[].benefitType` 이 `CASHBACK` 이면 `benefitAmount` 의 단위가 원,
 *     `ACCUMULATE` 면 포인트다. **화면이 단위를 지어내지 않고 이 값으로 가른다.**
 *   - `transactions[].benefitRate` 는 정률 혜택의 % 값이고, **정액(FIXED) 혜택이면 null 이다.**
 *     null 을 0% 로 그리면 할인이 없었던 것처럼 보인다.
 *
 *   혜택을 실제로 받은 결제만 온다. 매퍼가 `benefit_service` 를 INNER JOIN 하기 때문이다.
 */
export const getReceivedCardBenefit = (userCardId, yearMonth) =>
  client.get(`/report/benefit/received/cards/${userCardId}`, { params: { yearMonth } })
