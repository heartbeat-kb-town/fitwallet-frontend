import axios from 'axios'
import { ref } from 'vue'

/**
 * 백엔드 봉투에서 벗겨낸 에러.
 *
 * 인터셉터가 실패 응답을 전부 이걸로 감싸서 reject 한다.
 * 화면은 code·message·status 만 보고 분기하면 되고 axios 형태를 알 필요가 없다.
 *
 * errors 는 검증 실패(400 INVALID_INPUT_VALUE)일 때만 채워지는 필드별 사유다.
 *   [{ field: 'loginId', reason: '아이디는 필수입니다.' }, ...]
 * 검증 실패는 토스트가 아니라 해당 입력창 아래 인라인 메시지로 보여준다.
 * 어느 입력창이 문제인지 알려주지 못하면 사용자가 고칠 수 없다.
 *
 * data 는 실패 응답에도 봉투에 실려 오는 알맹이다. 대부분 null 이지만
 * 화면이 꼭 알아야 하는 값이 여기 담겨 오는 경우가 있다.
 *   PIN_MISMATCH → { remainingAttempts: 4 }  (5회 넘게 틀리면 잠긴다)
 * 버리면 "몇 번 남았는지" 를 사용자에게 알려줄 방법이 없다.
 */
export class ApiError extends Error {
  constructor(code, message, status, errors = [], data = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.errors = errors
    this.data = data
  }

  /** 검증 실패 시 특정 입력창에 붙일 메시지를 꺼낸다. */
  reasonFor(field) {
    return this.errors.find((e) => e.field === field)?.reason
  }
}

/** axios 실패를 봉투에서 벗겨 ApiError 로 옮긴다. */
function toApiError(error) {
  const envelope = error.response?.data

  return new ApiError(
    envelope?.code,
    // 네트워크 오류처럼 응답 자체가 없으면 백엔드 message 도 없다.
    envelope?.message ?? error.message,
    error.response?.status,
    envelope?.errors ?? [],
    // 실패 응답에도 알맹이가 실려 오는 경우가 있다 (PIN_MISMATCH 의 remainingAttempts).
    envelope?.data ?? null,
  )
}

// 401 이라고 다 세션 만료가 아니다. 백엔드가 주는 401 은 셋이고 그중 하나만 세션 끊김이다.
//
//   UNAUTHORIZED        (common)  진짜 세션 끊김        → 인터셉터가 토큰을 비운다
//   INVALID_CREDENTIALS (user)    아이디·비밀번호 불일치 → 화면이 사용자에게 보여준다
//   PIN_MISMATCH        (payment) 결제 비밀번호 불일치   → 화면이 사용자에게 보여준다
//
// 경로 목록이 아니라 **코드**로 가른다. 경로로 가르면 비즈니스 401 을 주는 엔드포인트가
// 늘 때마다 목록에 넣는 것을 잊고, 그 화면에서 사용자가 조용히 로그아웃된다.
// 실제로 결제 PIN 이 그렇게 새어 나갔다 (#79).
const BUSINESS_401_CODES = ['INVALID_CREDENTIALS', 'PIN_MISMATCH']

// access token 은 메모리에만 둔다. localStorage / sessionStorage 에 절대 넣지 않는다.
// refresh 를 HttpOnly 쿠키로 감싼 설계라, access 를 스토리지에 두면 XSS 방어가 무의미해진다.
// 새로고침하면 날아가지만, 부팅 시 reissueAccessToken() 이 쿠키로 복구한다 (main.js).
//
// 평범한 모듈 변수가 아니라 ref 다. store 가 isLoggedIn 같은 computed 로 이걸 보는데,
// 일반 변수면 값이 바뀌어도 computed 가 다시 계산되지 않는다.
// 토큰의 유일한 보관처를 여기 하나로 두기 위해 store 로 복사하지 않고 여기를 반응형으로 만든다.
const accessToken = ref(null)

export const setAccessToken = (token) => {
  accessToken.value = token
}

export const clearAccessToken = () => {
  accessToken.value = null
}

export const getAccessToken = () => accessToken.value

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const client = axios.create({
  baseURL: BASE_URL,
  // refreshToken HttpOnly 쿠키를 주고받으려면 반드시 켜야 한다.
  // 끄면 Set-Cookie 자체가 저장되지 않는다.
  withCredentials: true,
})

/**
 * 재발급 전용 인스턴스.
 *
 * **재발급을 client 로 부르면 안 된다.** 재발급이 401 일 때 아래 응답 인터셉터가 그것을
 * 다시 물어 재발급을 또 부르고, 그게 다시 401 이 되는 무한 루프가 된다.
 *
 * Authorization 헤더도 붙지 않는다. 만료된 access token 을 실어 보낼 이유가 없고
 * 백엔드는 refreshToken 쿠키만 본다.
 */
const reissueClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

// 진행 중인 재발급. 동시에 여러 요청이 401 을 받아도 재발급은 한 번만 한다.
let reissueInFlight = null

/**
 * refreshToken 쿠키로 access token 을 다시 받아 심는다.
 *
 * 401 을 받은 요청들이 각자 재발급을 부르면, refresh token 을 회전시키는 구현에서
 * 뒤늦게 도착한 쪽이 이미 무효가 된 토큰으로 실패한다. 그래서 한 번만 부르고 결과를 나눠 쓴다.
 *
 * 실패는 그대로 던진다. 부르는 쪽이 "복구 불가" 로 판단해 토큰을 비운다.
 * 로그인한 적이 없어 쿠키가 아예 없는 경우도 여기로 온다 — 정상적인 실패다.
 */
export function reissueAccessToken() {
  reissueInFlight ??= reissueClient
    .post('/user/reissue')
    .then((res) => {
      const token = res.data?.data?.accessToken
      if (!token) {
        throw new ApiError('INVALID_RESPONSE', '재발급 응답에 토큰이 없습니다.', res.status)
      }
      setAccessToken(token)
      return token
    })
    .finally(() => {
      reissueInFlight = null
    })

  return reissueInFlight
}

client.interceptors.request.use((config) => {
  if (accessToken.value) {
    config.headers.Authorization = `Bearer ${accessToken.value}`
  }
  return config
})

client.interceptors.response.use(
  // 봉투 { success, code, message, data } 를 여기서 한 번만 벗긴다.
  // api/*Api.js 의 반환값은 항상 data 알맹이다.
  // 화면과 store 에 res.data.data 가 등장하면 잘못 짠 것이다.
  (res) => {
    // 봉투가 아닌 200 응답을 걸러낸다.
    //
    // 프록시가 잘못 걸려 정적 파일 서버가 index.html 을 200 으로 돌려주면
    // res.data 는 HTML 문자열이고 res.data?.data 는 조용히 undefined 가 된다.
    // 그대로 두면 에러 한 번 없이 빈 화면이 뜨고, 원인을 찾을 단서도 남지 않는다.
    // 배포 환경에서 실제로 이렇게 실패했다 (#62).
    if (!res.data || typeof res.data !== 'object' || !('success' in res.data)) {
      throw new ApiError('INVALID_RESPONSE', '서버 응답 형식이 올바르지 않습니다.', res.status)
    }
    return res.data.data
  },
  async (error) => {
    const status = error.response?.status
    const envelope = error.response?.data
    const isBusiness401 = BUSINESS_401_CODES.includes(envelope?.code)
    const original = error.config

    // 세션이 끊긴 401 은 인터셉터가 전담한다. 화면에서 따로 처리하지 않는다.
    // 비즈니스 401 은 건드리지 않는다 (위 BUSINESS_401_CODES 참고).
    //
    // 코드를 모르는 401 — 응답 봉투가 아예 없는 경우 — 은 세션 만료로 본다.
    // 판단이 안 될 때는 로그인으로 보내는 쪽이 안전하다.
    //
    // TODO: 로그인 화면으로 보내는 것은 별도 이슈다. client.js 가 라우터를 import 하면
    //       라우터가 다시 client.js 의 getAccessToken 을 import 해 순환이 생긴다.
    if (status === 401 && !isBusiness401) {
      // 재시도는 요청당 한 번만 한다. 재발급 직후에도 401 이면 만료가 아니라 권한 문제이고,
      // 그때 또 재발급하면 같은 401 을 무한히 돈다.
      if (original && !original._retriedAfterReissue) {
        original._retriedAfterReissue = true

        try {
          await reissueAccessToken()
        } catch {
          // 재발급까지 실패했으면 진짜 세션 만료다.
          clearAccessToken()
          return Promise.reject(toApiError(error))
        }

        // 재요청 결과를 그대로 내보낸다. 이 인터셉터를 다시 타므로 봉투는 벗겨져 나가고,
        // 실패하더라도 그쪽 에러가 사용자가 알아야 할 진짜 이유다.
        return client(original)
      }

      clearAccessToken()
    }

    return Promise.reject(toApiError(error))
  },
)

export default client
