import { computed } from 'vue'
import { defineStore } from 'pinia'

import * as userApi from '@/api/userApi'
import { setAccessToken, clearAccessToken, getAccessToken } from '@/api/client'
import { useAsyncState } from '@/composables/useAsyncState'

export const useAuthStore = defineStore('auth', () => {
  // 토큰 자체는 client.js 의 모듈 변수에 있다. 여기로 복사해두지 않는다.
  // 두 군데에 두면 로그아웃할 때 한쪽만 지우는 실수가 난다.
  const {
    data: loginResult,
    isLoading,
    error,
    execute: runLogin,
  } = useAsyncState(userApi.postLogin)

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
   * 로그아웃.
   *
   * TODO(#42): 백엔드에 /logout 이 없다. 엔드포인트가 생기면 서버에 알려
   * refreshToken 쿠키까지 만료시켜야 한다. 지금은 클라이언트 토큰만 비운다.
   * 즉 서버의 refreshToken 은 살아 있다.
   */
  function logout() {
    clearAccessToken()
    loginResult.value = null
  }

  return { isLoggedIn, isLoading, error, login, logout }
})
