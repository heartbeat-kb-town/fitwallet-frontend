import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 회원가입 흐름에서 화면 간에 넘기는 값.
 *
 * PIN 은 라우트 params/query 로 넘기지 않는다.
 * `/pin/confirm?pin=123456` 은 브라우저 히스토리·`Referer` 헤더·서버 액세스 로그에 남는다.
 * (access token 을 `localStorage` 에 두지 않는 것과 같은 이유 — CLAUDE.md "인증" 참고)
 */
export const useSignupStore = defineStore('signup', () => {
  const registeredPin = ref('')

  function setRegisteredPin(pin) {
    registeredPin.value = pin
  }

  function reset() {
    registeredPin.value = ''
  }

  return { registeredPin, setRegisteredPin, reset }
})
