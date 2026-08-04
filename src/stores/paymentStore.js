import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useCardStore } from '@/stores/cardStore'

/**
 * 결제 화면에 들고 들어가는 진입 맥락.
 *
 * 가맹점(피그의 PICK)이 쓰고 결제가 읽는다. URL 이 아니라 store 인 이유:
 * "결제 진행 중"이라는 사실은 링크로 공유할 값이 아니고,
 * 아래 무효화 규칙처럼 **반응형 연결**이 필요하기 때문이다. (#59 판단 기준 참고)
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
  }

  return { cardId, merchantName, startPhase, returnTo, startFromMerchant, reset }
})
