import client from './client'

/**
 * 카드 도메인 API.
 *
 * 경로는 백엔드 `CardController` 기준이다. 클래스 레벨이 `/api` 만 잡고 메서드마다
 * 전체 경로를 적고 있어서, 명세 안에서 `/card` 와 `/user-cards` 가 섞여 있다.
 * 여기 적힌 경로가 백엔드 그대로다 — 규칙성이 없어 보여도 고치지 않는다.
 *
 * ⚠️ `cardId` 는 `card_product_id` 가 아니라 **`user_card_id`** 다.
 *    카드 상품(신한 Deep Dream)이 아니라 사용자가 들고 있는 카드 한 장을 가리킨다.
 *    백엔드 컨트롤러 주석이 명세의 표기 혼선을 직접 짚어두고 있다.
 */

/**
 * 보유 카드 목록.
 *
 * 봉투를 벗긴 `CardListResponse[]` 가 나온다. 정렬은 `displayOrder` 오름차순이다.
 *
 * 화면이 쓰는 모양과 다르므로 store 가 정규화한다. api 함수는 백엔드 응답을
 * 그대로 내보내는 데까지만 책임진다.
 */
export const getUserCards = () => client.get('/user-cards')

/**
 * 보유 카드 한 장의 요약.
 *
 * 목록 한 건(`CardListResponse`)과 **다른 모양**이다. `CardSummaryResponse` 가 나오고
 * `card` · `amount` · `usage` · `transactions` 로 나뉜다.
 *
 * `card` 에는 목록 응답에 없는 **`cardImageUrl` 과 `issuerName` 이 들어 있다.**
 * 목록에서만 두 필드가 빠져 있어서, 카드 그림이 필요한 화면은 이걸 한 번 더 부른다
 * (`cardStore.ensureCardImages`). 백엔드가 목록에 실어주면 그럴 필요가 없어진다.
 */
export const getUserCard = (cardId) => client.get(`/card/${cardId}/summary`)

/**
 * 카드별 세부 결제 내역. 커서 방식이다.
 *
 * @param params `{ yearMonth, cursor, size }` — 전부 선택.
 *   `yearMonth` 를 생략하면 현재 월이고, 현재 월 포함 최근 3개월만 조회할 수 있다.
 */
export const getCardTransactions = (cardId, params) =>
  client.get(`/card/${cardId}/transactions`, { params })

/**
 * 카드 이용 실적 상세와 카드상품 단위 통합 혜택 구간.
 *
 * 실적 조건이 없는 카드는 `tiers` 가 빈 배열이고 혜택이 `defaultBenefits` 로 온다.
 *
 * @param params `{ yearMonth }` — 선택. 규칙은 `getCardTransactions` 와 같다.
 */
export const getCardUsage = (cardId, params) => client.get(`/card/${cardId}/usage`, { params })

/**
 * 카드별 월간 혜택 현황.
 *
 * 이용 실적(`getCardUsage`)이 "얼마 썼나" 라면 이쪽은 "무엇으로 얼마 받았고 한도가 얼마 남았나" 다.
 * **둘은 겹치지 않는다.** 실적 진행률(`tierProgressRate`)과 구간 정보는 여기 없으므로
 * 실적 진행바가 필요한 화면은 `getCardUsage` 를 계속 함께 부른다.
 *
 * KST 이번 달 1일부터 **오늘 00:00 직전까지** 집계한다. 오늘 결제는 안 잡히고,
 * 그래서 `asOfDate` 가 오늘이 아니라 전날이다.
 *
 * @returns `{ card, yearMonth, asOfDate, monthlySummary, performance, categoryBenefits,
 *   brandBenefits, sharedLimitGroups }`
 *
 *   - `categoryBenefits` · `brandBenefits` 는 **백엔드가 소진된 혜택을 배열 하단으로 정렬해서 준다.**
 *     화면이 다시 정렬하지 않는다. 적용 가능한 월 한도 혜택이 없으면 둘 다 빈 배열이다
 *   - `valueLabel` · `receivedBenefitLabel` · `perTransactionLimitLabel` · `limitLabel` 은
 *     **표시용 문자열이 그대로 온다.** 화면에서 숫자를 다시 포맷하지 않는다
 *   - `itemLimitStatus` 는 `AVAILABLE` / `LIMIT_EXHAUSTED` 다. 한 혜택에 월 한도가 여럿 걸릴 수
 *     있어서(`monthlyLimits`), 그중 하나라도 소진되면 `LIMIT_EXHAUSTED` 가 된다
 *   - `monthlySummary.potentialBenefitRate` 는 전체 한도 대비 **남은** 혜택 비율이다.
 *     쓴 비율이 아니다. 전체 한도가 없거나 0 이면 null 이라 화면에서 분기한다
 *   - 금액은 `BigDecimal` 이라 JSON 숫자로 온다
 *
 *   ### 통합 한도 — `sharedLimitGroups` (backend#216)
 *
 *   여러 혜택이 **월 한도 하나를 나눠 쓰는** 묶음이다. 그런 혜택이 없으면 빈 배열이다.
 *
 *   - ⚠️ **`categoryBenefits` · `brandBenefits` 에는 그룹에 든 혜택이 그대로 남아 있다.**
 *     낱개로도 그리려면 **`limitGroupId` 가 null 인 것만** 골라야 한다. 안 거르면 같은 혜택이
 *     두 번 뜨고, 나눠 쓰는 한도가 혜택 수만큼 곱해져 읽힌다
 *   - `sharedMonthlyLimit` 은 그룹이 함께 쓰는 한도 한 줄이다. `usedValue` 는 **그룹 합계**고
 *     `remainingValue` 는 거기서 남은 몫이다. `monthlyLimits[].shared` 가 true 면 그 한도가 이것이다
 *   - `usageBreakdown` 은 그 사용량을 **대상(카테고리·브랜드) 단위로 쪼갠 것**이다.
 *     합계가 `sharedMonthlyLimit.usedValue` 와 맞도록 백엔드가 검증하고 어긋나면 500 을 낸다.
 *     `unattributed: true` 인 항목은 대상으로 귀속되지 않은 몫이라 `targetName` 이 null 이다
 *   - `benefitServices[].targets[].sharedLimitUsedValue` 는 그 대상이 공동 한도를 깎은 양이다.
 *     `receivedBenefitValue`(실제로 받은 혜택)와 **다를 수 있다** — 적립은 포인트로 받고
 *     한도는 원으로 깎는 식이라 단위부터 갈린다
 *   - `benefitServices[].displayQualifier` 는 같은 카테고리를 덮는 혜택이 둘일 때의 구분자다
 *     (마트 주중 / 마트 주말). 없으면 null
 *   - `categories` 는 그룹이 걸쳐 있는 DB 카테고리다. **브랜드 혜택의 업종명도 여기서만 나온다** —
 *     `brandBenefits` 항목에는 카테고리 정보가 아예 없다
 *
 *   - 404 CARD_NOT_FOUND : 내 카드가 아니거나 없는 카드
 *   - 500 INVALID_CARD_MONTHLY_BENEFIT_DATA : 카드 혜택 데이터가 깨져 있다
 */
export const getCardMonthlyBenefit = (cardId) => client.get(`/card/${cardId}/benefit`)

/**
 * 카드에 걸린 이벤트.
 *
 * 카드 상품 전용(`CARD_PRODUCT`)과 카드사 전체(`ISSUER`) 가 함께 온다.
 * 카드사 이벤트는 그 카드사 카드를 여러 장 갖고 있으면 카드마다 중복해서 보이는데,
 * 백엔드가 카드 단위로 주는 구조라 정상이다.
 *
 * `daysRemaining` 은 **백엔드가 계산해서 준다.** 화면에서 날짜를 다시 빼지 않는다.
 * `detailUrl` 은 카드사 페이지로 나가는 **외부 링크**다. `detailAvailable` 로 노출을 가른다.
 *
 * @returns `{ card, eventCount, events[] }` — 이벤트가 없으면 `events` 가 빈 배열이다.
 *
 *   - 404 CARD_NOT_FOUND : 내 카드가 아니거나 없는 카드
 */
export const getCardEvents = (cardId) => client.get(`/card/${cardId}/event`)

/**
 * 카드 등록.
 *
 * @param payload `{ cardProductId, first4, last4, expiryDate }`
 *   `first4` · `last4` 는 숫자 4자리 문자열, `expiryDate` 는 미래 날짜여야 한다.
 *   어기면 400 `INVALID_INPUT_VALUE` 와 함께 필드별 사유가 온다 (`ApiError.reasonFor`).
 */
export const postCard = (payload) => client.post('/card', payload)

/**
 * 마이데이터 연동. 아직 등록되지 않은 보유 카드와 최근 거래내역을 한 번에 가져온다.
 *
 * 새로 등록할 카드가 하나도 없어도 오류가 아니라 성공이다. 응답 `data` 는 없다.
 */
export const postMyDataCards = () => client.post('/cards/mydata')
