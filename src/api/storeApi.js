import client from './client'

/**
 * 가맹점 도메인 API.
 *
 * 검색어는 프론트가 기록하지 않는다. `getStoreSearch` 로 키워드 검색을 하면
 * 백엔드가 `search_history` 에 남기고, `getStoreKeywords` 가 그걸 읽어 온다.
 * 화면이 최근 검색어 목록을 따로 들고 있으면 서버와 어긋난다.
 */

/**
 * 가맹점 조회. 거리순 상위 **최대 5건** 고정이라 페이징이 없다.
 *
 * @param params `{ keyword, categoryId, latitude, longitude, radiusMeters }`
 *   - `keyword` 나 `categoryId` 중 하나는 반드시 있어야 한다
 *   - `latitude` · `longitude` 는 **필수**다. 거리 계산·정렬의 기준이다
 *   - `radiusMeters` 는 최대 3000. 키워드 검색에서 생략하면 전국,
 *     카테고리만 보낼 때 생략하면 3km 가 적용된다
 * @returns `{ keyword, categoryId, radiusMeters, stores }`
 *   `stores` 가 비어 있는 것은 에러가 아니라 "근처에 없다" 는 뜻이다.
 *
 *   - 400 KEYWORD_OR_CATEGORY_REQUIRED : 둘 다 비었다
 *   - 400 COORDINATE_PAIR_REQUIRED · INVALID_COORDINATE : 좌표 문제
 *   - 400 CATEGORY_NOT_FOUND : 없는 카테고리
 *   - 400 RADIUS_EXCEEDED · INVALID_RADIUS : 반경 문제
 *   - 403 LOCATION_AGREEMENT_REQUIRED : 위치 정보 이용에 동의하지 않았다
 */
export const getStoreSearch = (params) => client.get('/store/search', { params })

/**
 * 최근·인기 검색어.
 *
 * @returns `{ recent, popular }`
 *   - `recent` — 최신순 최대 5개. 각 항목의 `searchHistoryId` 로 개별 삭제한다
 *   - `popular` — `{ periodDays: 7, keywords: [{ rank, keyword, searchCount }] }`
 *   둘 다 독립적으로 비어 있을 수 있다 (신규 가입자는 `recent` 가 빈다).
 */
export const getStoreKeywords = () => client.get('/store/keywords')

/**
 * 최근 검색어 한 건 삭제.
 *
 *   - 404 SEARCH_HISTORY_NOT_FOUND : 이미 지워졌다. 목록만 다시 받으면 된다
 */
export const deleteRecentKeyword = (searchHistoryId) =>
  client.delete(`/store/keywords/recent/${searchHistoryId}`)

/** 최근 검색어 전체 삭제. */
export const deleteRecentKeywords = () => client.delete('/store/keywords/recent')
