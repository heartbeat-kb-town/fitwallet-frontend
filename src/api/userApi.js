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
 * 위치 정보 이용 동의 상태 변경.
 *
 * **화면에서 동의를 받는 것만으로는 부족하다.** 가맹점 조회(`/store/search`)가
 * `users.is_location_agreed` 를 직접 보고 막는다 (403 `LOCATION_AGREEMENT_REQUIRED`).
 * 서버에 저장하지 않으면 동의를 눌러도 목록이 뜨지 않는다.
 *
 * 같은 값을 여러 번 보내도 되는 멱등한 요청이다. 성공 응답의 알맹이는 비어 있다.
 * 로그인이 필요하다.
 */
export const patchLocationAgreement = ({ agreed }) =>
  client.patch('/user/location-agreement', { agreed })

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
 * **성공 응답에 토큰이 없다** (백엔드가 `Void` 를 준다).
 * 바로 다음 단계인 결제 PIN 등록은 인증을 요구하므로, 가입만으로는 이어갈 수 없다.
 * 가입 직후 로그인까지 태우는 것은 `authStore.signup()` 이 한다.
 *
 * 실패는 인터셉터가 ApiError 로 감싸서 던진다.
 *   - 400 INVALID_INPUT_VALUE : 필드 누락·형식 오류. error.errors 에 필드별 사유가 있다
 *   - 400 PASSWORD_MISMATCH   : 비밀번호와 비밀번호 확인 불일치
 *   - 409 DUPLICATE_LOGIN_ID  : 이미 사용 중인 아이디
 *
 * 필드는 백엔드 `SignUpRequest` 기준이다. `phone` 과 `passwordConfirm` 은 필수고,
 * `password` 는 8자 이상이어야 한다.
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

/**
 * 결제 PIN 등록.
 *
 * **로그인이 필요하다** (백엔드가 `@LoginUserId` 로 사용자를 찾는다).
 * 토큰 없이 부르면 401 이고, 그 401 은 인터셉터가 세션 만료로 처리한다.
 *
 * `pin` 과 `pinConfirm` 은 둘 다 숫자 6자리 문자열이며 백엔드도 일치를 검사한다.
 * 성공 응답의 알맹이는 비어 있다.
 *
 *   - 400 INVALID_INPUT_VALUE  : 6자리 숫자가 아니다
 *   - 400 PIN_CONFIRM_MISMATCH : 두 값이 다르다
 */
export const postPaymentPin = ({ pin, pinConfirm }) =>
  client.post('/user/payment-pin', { pin, pinConfirm })
