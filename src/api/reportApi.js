import client from './client'

/**
 * 리포트 도메인 API.
 *
 * 백엔드 `BenefitReportController` · `CardBenefitController` · `MissedBenefitController` 기준이다.
 * 셋 다 실제 엔드포인트가 있다. 이 파일에 목데이터는 없다.
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
 *   - `recommendations` 는
 *     `[{ cardProductId, cardName, cardImageUrl, detailUrl, expectedBenefit, description }]` 이고
 *     서비스가 예상 혜택 내림차순 상위 2건으로 잘라서 준다. 이것도 다시 정렬하지 않는다.
 *     `detailUrl` 은 카드사 상품 페이지 주소이며 아직 등록되지 않은 카드는 null 이다.
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

/**
 * 손실 유형별 놓친 혜택 상세 (backend #201).
 *
 * @param yearMonth `YYYY-MM`. 위 둘과 같은 이유로 두 자리로 맞춰 보낸다.
 * @param lossType `APP_UNUSED` | `CARD_MISMATCH`. 백엔드 `LossType` enum 의 이름 그대로다.
 *   소문자나 다른 문자열을 보내면 enum 변환에 실패해 400 이다.
 *
 *   - `APP_UNUSED` — 앱으로 결제하지 않아(`is_used_app = 0`) 놓친 건
 *   - `CARD_MISMATCH` — 앱은 썼지만(`is_used_app = 1`) 더 나은 카드를 고르지 않아 놓친 건
 *
 *   둘 다 **"더 좋은 카드가 있었던 건"(`better_user_card_id IS NOT NULL`)만** 대상이다.
 *
 * @returns `{ totalMissedBenefit, appUnusedAmount, cardMismatchAmount, lossType, categories }`
 *
 *   ⚠️ **`categories` 만 `lossType` 을 탄다.** 상단 세 금액은 탭과 무관하게 늘 같은 값이다
 *   (`totalMissedBenefit` = 두 손실의 합). 탭을 바꿔도 히어로 숫자가 안 바뀌는 게 정상이다.
 *
 *   - `categories` 는 `[{ categoryId, categoryName, missedCount, missedAmount, transactions }]`.
 *     **정렬을 화면에서 하지 않는다** — 매퍼가 `ORDER BY c.category_id, pt.paid_at DESC` 로 주고
 *     서비스가 그 순서대로 묶는다. 해당 손실이 없는 달은 빈 배열이다.
 *   - `transactions[]` 는 `{ approvedAt, storeName, usedCardName, paidAmount,
 *     alternativeCardName, discountRate, diffAmount }`.
 *     `usedCardName` 은 실제 결제한 카드, `alternativeCardName` 은 더 유리했던 카드다.
 *     `diffAmount` 가 그 건에서 놓친 금액(`missed_amount`)이다.
 *
 *   ⚠️ **`storeName` 은 자주 null 이다.** 매퍼가 `brand.brand_name` 을 LEFT JOIN 으로 읽는데
 *   시드 가맹점 244곳 중 195곳에 `brand_id` 가 없다. `store.store_name` 은 NOT NULL 로 존재하지만
 *   매퍼가 그걸 읽지 않는다. 화면에서 대체 문구를 준비해야 한다.
 *   (`CardBenefitMapper` 도 같은 방식이라 받은 혜택 상세도 같은 상태다.)
 *
 *   ⚠️ **`discountRate` 도 null 일 수 있다.** `alternative_discount_amount / amount * 100` 의
 *   반올림이라 분자가 없거나 결제금액이 0 이면 null 이 된다. 0% 로 눌러 적지 않는다.
 */
export const getMissedBenefitDetail = (yearMonth, lossType) =>
  client.get('/report/benefit/missed', { params: { yearMonth, lossType } })
