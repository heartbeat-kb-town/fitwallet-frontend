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

  /**
   * 결제 예정 금액. **빈 문자열이면 "안 정했다" 는 뜻이다** (0 과 구분한다).
   *
   * `PickAmountView`(`결제금액을 입력하세요`)가 받은 금액이 가맹점 화면을 거쳐
   * `startFromMerchant` 로 들어온다. **금액을 받는 화면은 그것 하나다** — 결제 화면에
   * 입력칸을 따로 두지 않는다.
   *
   * 이 값이 `POST /payment/qr` 로 나가야 결제 내역에 실제 금액이 남는다 (backend#322).
   * 비어 있으면 안 싣고, 백엔드가 목값으로 떨어진다 — 결제 탭에서 바로 QR 을 띄우는 경로가
   * 그렇다. 그 경로는 금액을 알 길이 없다.
   *
   * ⚠️ **매장 QR 스캔(MPM)은 이 값을 쓰지 않는다.** 그쪽 금액은 매장 QR 이 싣고 오는 것이라
   * `scanStoreQr` 가 인자로 따로 받는다. 사용자가 고쳐 칠 값이 아니다.
   */
  const amount = ref('')

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
   * PIN 검증으로 받은 인증 표.
   *
   * **백엔드가 이 표를 소모하는 시점은 결제 완료다** (backend#185).
   * 예전에는 QR 생성·매장 QR 스캔 순간에 `used` 로 찍혀서, CPM QR 을 띄운 것만으로 표가
   * 사라지고 스캔으로 갈아탈 때 PIN 을 한 번 더 받아야 했다. 지금은 두 결제수단을 오가도
   * 같은 표를 계속 쓴다. 그래서 **화면 전환마다 비우지 않는다** — 비우면 재입력이 되살아난다.
   *
   * TTL 180초라 오래 들고 있으면 PIN_AUTH_ID_INVALID 가 난다.
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

  const { isLoading: isScanningStoreQr, execute: runScanStoreQr } = useAsyncState(
    paymentApi.postQrScan,
  )

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
   * QR 세션 생성. 인증표를 함께 낸다.
   *
   * **여기서 표를 비우지 않는다.** 백엔드가 이 시점에 `used` 로 찍지 않기 때문이다
   * (backend#185). 비우면 스캔으로 갈아탈 때 PIN 재입력이 되살아난다.
   *
   * 금액은 인자로 받지 않고 `amount` 를 읽는다. `QR Code` 탭으로 되돌아오면 세션을 새로
   * 만드는데(`startQrCodeFlow`), 인자로 받으면 그 자리에서 금액을 다시 구해 와야 한다.
   *
   * @returns `{ qrToken, status, expiresIn }`
   */
  async function createQr(userCardId) {
    return runCreateQr({ userCardId, pinAuthId: pinAuthId.value, amount: amount.value })
  }

  /**
   * 매장 QR 스캔(MPM). `createQr` 과 **같은 인증표를 낸다.**
   *
   * `users.pin_auth_id` 가 컬럼 하나라 사용자당 표는 여전히 하나뿐이지만,
   * 소모 시점이 결제 완료로 옮겨져서 CPM 으로 QR 을 이미 만들었어도 그대로 쓸 수 있다.
   *
   * @returns `{ paymentId, storeId, storeName, amount }`
   */
  async function scanStoreQr({ storeQrToken, userCardId, amount }) {
    return runScanStoreQr({
      storeQrToken,
      pinAuthId: pinAuthId.value,
      userCardId,
      amount,
    })
  }

  /**
   * 결제가 끝났다. 표를 버린다.
   *
   * 백엔드가 결제 완료 시점에 `used` 로 찍으므로(backend#185) 이 표는 더 못 쓴다.
   * 남겨두면 다음 결제에서 재사용하려다 `PIN_AUTH_ID_INVALID` 가 난다.
   */
  function clearPinAuth() {
    pinAuthId.value = ''
  }

  // 가맹점에서 카드를 고르고 비밀번호까지 입력한 경우 — QR 단계부터 시작한다.
  //
  // `amount` 는 `PickAmountView` 에서 받은 금액이다. 그 화면에서 `아니요` 를 골랐으면
  // 비어 있고, 그때는 QR 요청에 싣지 않는다.
  function startFromMerchant(payload) {
    cardId.value = payload.cardId ?? ''
    merchantName.value = payload.merchantName ?? ''
    startPhase.value = 'qr'
    returnTo.value = payload.returnTo ?? ''
    amount.value = payload.amount ?? ''
  }

  // 하단 결제 탭으로 들어온 경우 — 카드 선택부터 시작한다.
  function reset() {
    cardId.value = ''
    merchantName.value = ''
    startPhase.value = 'cards'
    returnTo.value = ''
    amount.value = ''
    pinAuthId.value = ''
  }

  return {
    cardId,
    merchantName,
    startPhase,
    returnTo,
    amount,
    pinAuthId,
    qrSession,
    isVerifyingPin,
    isCreatingQr,
    isScanningStoreQr,
    pinError,
    qrError,
    verifyPin,
    createQr,
    scanStoreQr,
    clearPinAuth,
    startFromMerchant,
    reset,
  }
})
