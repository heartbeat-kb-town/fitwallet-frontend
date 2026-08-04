import axios from 'axios'

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
 */
export class ApiError extends Error {
  constructor(code, message, status, errors = []) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.errors = errors
  }

  /** 검증 실패 시 특정 입력창에 붙일 메시지를 꺼낸다. */
  reasonFor(field) {
    return this.errors.find((e) => e.field === field)?.reason
  }
}

// 인증이 필요 없는 엔드포인트. 여기서 나온 401 은 세션 만료가 아니라
// "아이디/비밀번호가 틀렸다"는 비즈니스 에러다 (code: INVALID_CREDENTIALS).
// 토큰을 비우거나 로그인으로 보내면 안 되고, 화면이 그대로 사용자에게 보여줘야 한다.
const PUBLIC_PATHS = ['/user/login', '/user/signup']

// access token 은 메모리에만 둔다. localStorage / sessionStorage 에 절대 넣지 않는다.
// refresh 를 HttpOnly 쿠키로 감싼 설계라, access 를 스토리지에 두면 XSS 방어가 무의미해진다.
// 대신 새로고침하면 날아간다. 백엔드에 /reissue 가 생기면 앱 부팅 시 복구한다.
let accessToken = null

export const setAccessToken = (token) => {
  accessToken = token
}

export const clearAccessToken = () => {
  accessToken = null
}

export const getAccessToken = () => accessToken

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  // refreshToken HttpOnly 쿠키를 주고받으려면 반드시 켜야 한다.
  // 끄면 Set-Cookie 자체가 저장되지 않는다.
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
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
    const isPublic = PUBLIC_PATHS.some((path) => error.config?.url?.startsWith(path))

    // 세션이 끊긴 401 은 인터셉터가 전담한다. 화면에서 따로 처리하지 않는다.
    // 로그인·회원가입에서 나온 401 은 여기 해당하지 않는다 (위 PUBLIC_PATHS 참고).
    //
    // TODO: 백엔드에 /reissue 가 생기면 401 → 재발급 → 원요청 재시도로 교체한다.
    //       지금은 재발급 시도 없이 토큰만 비운다.
    // TODO: 로그인 화면으로 보내는 것은 views 이관 후에 붙인다.
    //       지금은 App.vue 의 수동 스위처가 화면을 쥐고 있어 라우터로 보내도 화면이 바뀌지 않는다.
    if (status === 401 && !isPublic) {
      clearAccessToken()
    }

    return Promise.reject(
      new ApiError(
        envelope?.code,
        // 네트워크 오류처럼 응답 자체가 없으면 백엔드 message 도 없다.
        envelope?.message ?? error.message,
        status,
        envelope?.errors ?? [],
      ),
    )
  },
)

export default client
