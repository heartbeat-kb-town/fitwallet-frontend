import { ref } from 'vue'
import { defineStore } from 'pinia'

import * as userApi from '@/api/userApi'

/**
 * 동의 여부를 새로고침 뒤에도 기억하기 위한 열쇠.
 *
 * **토큰이 아니다.** access token 을 localStorage 에 두지 않는 규칙은 그대로다 —
 * 이건 "시트를 또 띄울지" 를 정하는 값이라 새어 나가도 잃을 게 없다.
 */
const STORAGE_KEY = 'fitwallet.locationAgreed'

/** 사파리 비공개 모드처럼 localStorage 접근 자체가 던지는 환경이 있다. 못 쓰면 그냥 잊는다. */
function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeStored(agreed) {
  try {
    if (agreed) window.localStorage.setItem(STORAGE_KEY, 'true')
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 저장을 못 해도 이번 세션 동안은 ref 가 기억한다. 다음 방문에 한 번 더 물을 뿐이다.
  }
}

/**
 * 위치 정보 이용 동의.
 *
 * **진짜 상태는 서버에 있다** (`users.is_location_agreed`). 그런데 그 값을 읽는 길이 없다 —
 * `GET /user/me` 는 생겼지만 `name` 만 준다(`UserInfoResponse`). 그래서 여기 기억해 두고,
 * 서버가 403 을 주면 그때 지워서 스스로 맞춰 나간다(`forget`).
 *
 * 이 구조 덕분에 저장값이 서버와 어긋나도(다른 계정으로 로그인 등) 막다른 길이 되지 않는다.
 * 백엔드가 `is_location_agreed` 를 내려주면 `readStored()` 를 그 값으로 갈아끼우면 된다.
 */
export const useLocationStore = defineStore('location', () => {
  const isAgreed = ref(readStored())
  const isSaving = ref(false)

  /**
   * 동의를 서버에 저장한다.
   *
   * **저장하고 나서 넘어가야 한다.** 가맹점 조회가 `users.is_location_agreed` 를 보고
   * 403 으로 막으므로(`DefaultStoreService.searchStores`), 먼저 넘어가면 빈 화면이 된다.
   *
   * 실패는 그대로 던진다. 부르는 쪽이 시트를 열어 둔 채 토스트를 띄운다 —
   * 시트를 닫으면 사용자가 다시 동의할 방법이 없다.
   */
  async function agree() {
    if (isSaving.value) return

    isSaving.value = true
    try {
      await userApi.patchLocationAgreement({ agreed: true })
    } finally {
      isSaving.value = false
    }

    isAgreed.value = true
    writeStored(true)
  }

  /** 서버가 403 을 줬거나 로그아웃했다. 기억한 값이 틀렸으므로 지운다. */
  function forget() {
    isAgreed.value = false
    writeStored(false)
  }

  return { isAgreed, isSaving, agree, forget }
})
