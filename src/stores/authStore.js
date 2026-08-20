import { computed } from 'vue'
import { defineStore } from 'pinia'

import * as userApi from '@/api/userApi'
import { setAccessToken, clearAccessToken, getAccessToken } from '@/api/client'
import { useAsyncState } from '@/composables/useAsyncState'
import { useLocationStore } from '@/stores/locationStore'

/**
 * 가입은 됐는데 뒤이은 자동 로그인이 실패했다.
 *
 * 가입 실패와 **반드시 구분해야 한다.** 계정은 이미 만들어진 상태라
 * 화면이 "다시 가입하세요" 로 안내하면 사용자가 아이디 중복에 부딪힌다.
 * 로그인 화면으로 보내는 것이 맞다.
 *
 * `cause` 에는 로그인 단계에서 받은 원래 ApiError 가 담긴다.
 */
export class AutoLoginError extends Error {
  constructor(cause) {
    super('가입 후 자동 로그인에 실패했다.')
    this.name = 'AutoLoginError'
    this.cause = cause
  }
}

export const useAuthStore = defineStore('auth', () => {
  // 토큰 자체는 client.js 의 모듈 변수에 있다. 여기로 복사해두지 않는다.
  // 두 군데에 두면 로그아웃할 때 한쪽만 지우는 실수가 난다.
  const {
    data: loginResult,
    isLoading,
    error,
    execute: runLogin,
  } = useAsyncState(userApi.postLogin)

  const {
    isLoading: isSignupLoading,
    error: signupError,
    execute: runSignup,
  } = useAsyncState(userApi.postSignup)

  const isLoggedIn = computed(() => Boolean(getAccessToken()))

  /**
   * 로그인.
   *
   * 실패하면 ApiError 를 그대로 다시 던진다. 화면이 받아서 처리한다.
   *   - 401 INVALID_CREDENTIALS -> 토스트에 백엔드 message 그대로
   *   - 400 INVALID_INPUT_VALUE -> error.reasonFor('loginId') 를 입력창 아래에
   */
  async function login(credentials) {
    const result = await runLogin(credentials)
    setAccessToken(result.accessToken)
    return result
  }

  /**
   * 회원가입.
   *
   * 가입 응답에는 토큰이 없다. 그런데 바로 다음 단계인 결제 PIN 등록은 인증을 요구하므로,
   * 같은 자격증명으로 로그인까지 이어서 토큰을 확보한다.
   * 이 두 번째 호출을 화면이 직접 하게 두지 않는다 — 화면마다 빠뜨리는 곳이 생긴다.
   *
   * 가입 실패는 ApiError 를 그대로 던진다 (400 INVALID_INPUT_VALUE / PASSWORD_MISMATCH,
   * 409 DUPLICATE_LOGIN_ID). 로그인 단계에서만 실패하면 AutoLoginError 로 감싸서 던진다.
   */
  async function signup(form) {
    await runSignup(form)

    try {
      return await login({ loginId: form.loginId, password: form.password })
    } catch (cause) {
      throw new AutoLoginError(cause)
    }
  }

  /**
   * 로그아웃.
   *
   * TODO(#42): 백엔드에 /logout 이 없다. 엔드포인트가 생기면 서버에 알려
   * refreshToken 쿠키까지 만료시켜야 한다. 지금은 클라이언트 토큰만 비운다.
   * 즉 서버의 refreshToken 은 살아 있다.
   */
  function logout() {
    clearAccessToken()
    loginResult.value = null
    // 위치 동의는 계정마다 다르다. 지우지 않으면 다음 사람이 시트를 못 보고 403 에 부딪힌다.
    // (locationStore 는 authStore 를 참조하지 않는다 — 한 방향이라 순환이 아니다.)
    useLocationStore().forget()
  }

  return { isLoggedIn, isLoading, error, isSignupLoading, signupError, login, signup, logout }
})
