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
