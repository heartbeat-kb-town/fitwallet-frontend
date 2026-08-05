import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import * as paymentApi from '@/api/paymentApi'
import { useAsyncState } from '@/composables/useAsyncState'
import { useCardStore } from '@/stores/cardStore'

/**
 * 결제 화면에 들고 들어가는 진입 맥락과, 결제 개시에 필요한 두 번의 호출.
 *
 * 가맹점(피그의 PICK)이 쓰고 결제가 읽는다. URL 이 아니라 store 인 이유:
 * "결제 진행 중"이라는 사실은 링크로 공유할 값이 아니고,
 * 아래 무효화 규칙처럼 **반응형 연결**이 필요하기 때문이다. (#59 판단 기준 참고)
 *
 * PIN 검증이 여기 있는 이유: 결제 탭과 가맹점 두 화면이 각자 PIN 패드를 갖고 있는데
 * 검증 규칙은 하나여야 한다. 화면에 두면 두 벌이 된다.
 *
 * 메모리에만 있으므로 새로고침하면 카드 선택 단계부터 시작한다.
 */
export const usePaymentStore = defineStore('payment', () => {
  const cardId = ref('')
  const merchantName = ref('')
  const startPhase = ref('cards')
  const returnTo = ref('')

  // 카드 순서가 바뀌면 미리 골라둔 카드는 무효다.
  // #56 에서 cardStore 에 넣지 않고 셸이 임시로 잇던 부수효과를 여기로 옮겼다.
  // cardStore 를 읽기만 하므로 순환 참조가 아니다.
  watch(
    () => useCardStore().order,
    () => {
      cardId.value = ''
    },
  )

  /**
   * PIN 검증으로 받은 인증 표. QR 을 만들 때 한 번 내고 소모된다(백엔드가 used 로 찍는다).
   * TTL 180초라 오래 들고 있으면 QR 생성에서 PIN_AUTH_ID_INVALID 가 난다.
   *
   * 가맹점에서 PIN 을 입력하고 결제 화면으로 넘어가는 경로가 있어서
   * 화면 하나 안에 두지 못하고 여기에 둔다.
   */
  const pinAuthId = ref('')

  const {
    isLoading: isVerifyingPin,
    error: pinError,
    execute: runPinVerify,
  } = useAsyncState(paymentApi.postPinVerify)

  const {
    data: qrSession,
    isLoading: isCreatingQr,
    error: qrError,
    execute: runCreateQr,
  } = useAsyncState(paymentApi.postQr)

  /**
   * 결제 비밀번호 검증. 성공하면 `pinAuthId` 를 채운다.
   *
   * 실패는 그대로 던진다. 남은 시도 횟수(`error.data.remainingAttempts`)를 어떻게 보여줄지는
   * 화면마다 다르고, 여기서 삼키면 화면이 성공으로 오해한다.
   */
  async function verifyPin({ userCardId, paymentPin }) {
    const { pinAuthId: issued } = await runPinVerify({ userCardId, paymentPin })
    pinAuthId.value = issued
    return issued
  }

  /**
   * QR 세션 생성. 검증에서 받은 `pinAuthId` 를 소모한다.
   *
   * @returns `{ qrToken, status, expiresIn }`
   */
  async function createQr(userCardId) {
    const session = await runCreateQr({ userCardId, pinAuthId: pinAuthId.value })
    // 백엔드가 used 로 찍었으니 이 표는 더 못 쓴다. 남겨두면 다음 결제에서 재사용하려다 400 이 난다.
    pinAuthId.value = ''
    return session
  }

  // 가맹점에서 카드를 고르고 비밀번호까지 입력한 경우 — QR 단계부터 시작한다.
  function startFromMerchant(payload) {
    cardId.value = payload.cardId ?? ''
    merchantName.value = payload.merchantName ?? ''
    startPhase.value = 'qr'
    returnTo.value = payload.returnTo ?? ''
  }

  // 하단 결제 탭으로 들어온 경우 — 카드 선택부터 시작한다.
  function reset() {
    cardId.value = ''
    merchantName.value = ''
    startPhase.value = 'cards'
    returnTo.value = ''
    pinAuthId.value = ''
  }

  return {
    cardId,
    merchantName,
    startPhase,
    returnTo,
    pinAuthId,
    qrSession,
    isVerifyingPin,
    isCreatingQr,
    pinError,
    qrError,
    verifyPin,
    createQr,
    startFromMerchant,
    reset,
  }
})
