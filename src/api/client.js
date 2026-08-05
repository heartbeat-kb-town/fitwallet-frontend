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
// 대신 새로고침하면 날아간다. 백엔드에 /reissue 가 생기면 앱 부팅 시 복구한다.
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

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  // refreshToken HttpOnly 쿠키를 주고받으려면 반드시 켜야 한다.
  // 끄면 Set-Cookie 자체가 저장되지 않는다.
  withCredentials: true,
})

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
  (res) => res.data?.data,
  (error) => {
    const status = error.response?.status
    const envelope = error.response?.data
    const isBusiness401 = BUSINESS_401_CODES.includes(envelope?.code)

    // 세션이 끊긴 401 은 인터셉터가 전담한다. 화면에서 따로 처리하지 않는다.
    // 비즈니스 401 은 건드리지 않는다 (위 BUSINESS_401_CODES 참고).
    //
    // 코드를 모르는 401 — 응답 봉투가 아예 없는 경우 — 은 세션 만료로 본다.
    // 판단이 안 될 때는 로그인으로 보내는 쪽이 안전하다.
    //
    // TODO: 백엔드에 /reissue 가 생기면 401 → 재발급 → 원요청 재시도로 교체한다.
    //       지금은 재발급 시도 없이 토큰만 비운다.
    // TODO: 로그인 화면으로 보내는 것은 views 이관 후에 붙인다.
    //       지금은 App.vue 의 수동 스위처가 화면을 쥐고 있어 라우터로 보내도 화면이 바뀌지 않는다.
    if (status === 401 && !isBusiness401) {
      clearAccessToken()
    }

    return Promise.reject(
      new ApiError(
        envelope?.code,
        // 네트워크 오류처럼 응답 자체가 없으면 백엔드 message 도 없다.
        envelope?.message ?? error.message,
        status,
        envelope?.errors ?? [],
        // 실패 응답에도 알맹이가 실려 오는 경우가 있다 (PIN_MISMATCH 의 remainingAttempts).
        envelope?.data ?? null,
      ),
    )
  },
)

export default client
