import client from './client'

/**
 * 리포트 도메인 API.
 *
 * 백엔드 `BenefitReportController` 기준이며, 지금 구현된 엔드포인트는 요약 하나뿐이다.
 * 리포트 화면의 "받은 혜택 상세(카드별)" 와 "놓친 혜택 상세" 는 아직 백엔드가 없다.
 *   - 카드별 상세: 응답 DTO(`CardBenefitDetailResponse`)만 추가돼 있고(backend#116)
 *     컨트롤러·서비스·매퍼가 없다. 여기에 함수를 미리 만들어 두지 않는다.
 *   - 놓친 혜택 상세: 총액(`totalMissedBenefit`)만 있고 분해·거래 목록의 출처가 없다.
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
