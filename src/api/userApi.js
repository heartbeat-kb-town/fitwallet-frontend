import client from './client'

/**
 * 로그인.
 *
 * 성공하면 봉투를 벗긴 `{ accessToken }` 이 나온다.
 * 실패는 인터셉터가 ApiError 로 감싸서 던진다.
 *   - 401 INVALID_CREDENTIALS : 아이디·비밀번호 불일치. 세션 만료가 아니다
 *   - 400 INVALID_INPUT_VALUE : 필드 누락. error.errors 에 필드별 사유가 있다
 *
 * 토큰을 client 에 심는 것은 여기서 하지 않는다. authStore 가 한다.
 * api 함수는 응답을 그대로 내보내는 데까지만 책임진다.
 */
export const postLogin = ({ loginId, password }) =>
  client.post('/user/login', { loginId, password })

/**
 * 자주 찾는 장소.
 *
 * 최근 **1개월** 결제 내역을 가게별로 묶어 횟수 내림차순 **상위 3건**을 준다
 * (백엔드 `UserMapper.xml` 의 `findFrequentPlaces`). 정렬도 개수도 백엔드가 정한다 —
 * 화면에서 다시 자르거나 정렬하지 않는다.
 *
 * 한 건은 `{ storeId, storeName, address, categoryName }` 이다.
 * **가게 사진과 `categoryId` 는 응답에 없다.** 화면이 `categoryName` 으로 로컬 카테고리를 찾는다.
 *
 * 로그인이 필요하고, 결제 내역이 없으면 빈 배열이 온다.
 */
export const getFrequentPlaces = () => client.get('/user/frequent-places')

/**
 * 회원가입.
 *
 * TODO(#42): 백엔드 미완성. 스펙에 성공 응답과 에러 코드가 비어 있어
 * (summary 가 메서드 이름 그대로이고 description·required·example 이 없다)
 * 호출부를 아직 만들지 않았다. 백엔드가 확정되면 별도 이슈로 연동한다.
 *
 * 필드는 OpenAPI 스펙의 SignUpRequest 기준이다.
 */
export const postSignup = ({ loginId, password, passwordConfirm, name, phone, marketingAgreed }) =>
  client.post('/user/signup', {
    loginId,
    password,
    passwordConfirm,
    name,
    phone,
    marketingAgreed,
  })
