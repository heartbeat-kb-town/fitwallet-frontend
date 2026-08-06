/**
 * 카드 표시 메타 — 백엔드가 주지 않는 것을 프론트에서 메꾼다.
 *
 * `GET /api/user-cards`(`CardListResponse`)에는 **카드사명과 카드 이미지가 없다.**
 * `card_product.card_image_url` 컬럼은 DB 에 있고 시드에도 값이 들어 있는데
 * DTO 와 `CardMapper.xml` 의 `cardListColumns` 양쪽에서 빠졌다.
 * 같은 도메인의 `transactions` · `usage` 쪽 resultMap 에는 둘 다 있으니 목록에서만 누락이다.
 *
 * **카드 그림은 더 이상 여기서 만들지 않는다 (#97).** 카드별 요약이 `cardImageUrl` 을 주므로
 * `cardStore.ensureCardImages` 가 실제 이미지를 받아온다. 스프라이트를 잘라 쓰던 방식은
 * 카드 4종을 돌려 써서 실제 카드와 그림이 아예 달랐다.
 *
 * TODO(#76): 백엔드가 목록 응답에 `cardCompanyName` 을 실어주면 아래 카드사명 추출도
 *            필요 없어지고 이 파일은 통째로 사라진다. 그때까지만 쓰는 임시 보정이다.
 */

/**
 * `card_name` 앞에 붙는 카드사 표기 → 화면에 쓸 카드사명.
 *
 * 시드의 카드사는 신한카드 · KB국민카드 · 현대카드 3곳인데
 * `card_name` 은 `'KB국민 청춘대로 톡톡카드'` 처럼 `issuer` 테이블과 표기가 조금 다르다.
 * 긴 접두어를 먼저 검사해야 `'KB국민카드'` 가 `'KB국민'` 에 잘려 걸리지 않는다.
 */
const ISSUER_PREFIXES = [
  ['신한카드', '신한카드'],
  ['KB국민카드', 'KB국민카드'],
  ['KB국민', 'KB국민카드'],
  ['현대카드', '현대카드'],
]

/**
 * `'신한카드 Deep Dream'` → `{ issuer: '신한카드', name: 'Deep Dream' }`
 *
 * 아는 접두어가 없으면 카드사를 비우고 이름을 통째로 쓴다.
 * 화면은 `{{ issuer }} {{ name }}` 으로 이어 붙이므로 빈 카드사도 그대로 그려진다.
 */
export function splitCardName(cardName = '') {
  const matched = ISSUER_PREFIXES.find(([prefix]) => cardName.startsWith(prefix))
  if (!matched) return { issuer: '', name: cardName }

  const [prefix, issuer] = matched
  return { issuer, name: cardName.slice(prefix.length).trim() }
}
