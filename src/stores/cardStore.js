import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as cardApi from '@/api/cardApi'
import { useAsyncState } from '@/composables/useAsyncState'
import { splitCardName, spriteOffsetAt } from '@/cardData'

/**
 * 백엔드 `CardListResponse` 한 건을 화면이 쓰는 모양으로 옮긴다.
 *
 * 봉투는 인터셉터가 이미 벗겼으므로 여기 오는 건 알맹이다.
 * 신용/체크에 따라 채워지는 금액 필드가 갈린다 (`CardType.java` 주석):
 *   CREDIT → creditLimit · scheduledPaymentAmount
 *   DEBIT  → bankName · balance
 *
 * @param index 서버가 준 목록에서의 자리. 카드 그림을 고르는 데만 쓴다.
 */
function toCard(response, index) {
  const isCredit = response.cardType === 'CREDIT'
  const { issuer, name } = splitCardName(response.cardName)

  return {
    // 화면과 paymentStore 가 카드를 가리키는 키. card_product_id 가 아니라 user_card_id 다.
    id: response.userCardId,
    cardProductId: response.cardProductId,
    issuer,
    name,
    type: isCredit ? 'credit' : 'check',
    last4: response.maskedRearNumber,
    cropY: spriteOffsetAt(index),

    // 카드 앞면에 큼직하게 뜨는 금액. 신용은 갚을 돈, 체크는 남은 돈이라 라벨이 다르다.
    amountLabel: isCredit ? '결제 예정 금액' : '잔액',
    amount: Number(isCredit ? response.scheduledPaymentAmount : response.balance) || 0,
    // 체크카드만 결제 계좌를 함께 보여준다. 신용이면 null 이라 화면에서 v-if 로 빠진다.
    account: response.bankName,
  }
}

const loadUserCards = async () => (await cardApi.getUserCards()).map(toCard)

/**
 * 사용자의 카드와 결제 순서.
 *
 * 카드관리(쓰기) · 결제(읽기) · 내카드(읽기) · 가맹점(읽기) 네 화면이 공유한다.
 * 이 store 가 보유 카드의 **유일한 출처**다. 화면이 자체 배열을 두면 안 된다 (#70).
 */
export const useCardStore = defineStore('card', () => {
  const { data: fetched, isLoading, error, execute: fetchCards } = useAsyncState(loadUserCards, [])

  /**
   * 사용자가 바꾼 순서. 비어 있으면 서버가 준 `displayOrder` 순서를 그대로 쓴다.
   *
   * 서버 응답이 도착한 것만으로는 **바뀌지 않아야 한다.** `paymentStore` 가 이걸 watch 해서
   * "순서가 바뀌면 미리 골라둔 카드는 무효" 를 걸어놨는데, 목록을 처음 받아올 때 같이 흔들리면
   * 가맹점에서 고르고 넘어온 카드가 결제 화면에서 풀린다.
   *
   * TODO(#76): 백엔드에 순서 변경 API 가 없어서 메모리에만 남는다. 새로고침하면 초기화된다.
   */
  const order = ref([])

  const cards = computed(() => {
    const list = fetched.value ?? []
    if (!order.value.length) return list

    const byId = new Map(list.map((card) => [card.id, card]))
    const ordered = order.value.map((id) => byId.get(id)).filter(Boolean)
    // 순서를 정한 뒤에 늘어난 카드(마이데이터 연동 등)는 뒤에 붙인다.
    const rest = list.filter((card) => !order.value.includes(card.id))
    return [...ordered, ...rest]
  })

  /**
   * 목록을 아직 안 받았으면 받아온다.
   *
   * 네 화면이 같은 store 를 보므로 화면마다 부르면 같은 요청이 겹친다.
   * 실패는 `error` 에 담기고 화면이 그걸 보고 표시하므로 여기서 다시 던지지 않는다.
   */
  async function ensureCards() {
    if (cards.value.length || isLoading.value) return
    await fetchCards().catch(() => {})
  }

  function reorder(nextOrder) {
    order.value = [...nextOrder]
  }

  function setPrimary(cardId) {
    reorder([cardId, ...cards.value.map((card) => card.id).filter((id) => id !== cardId)])
  }

  return { order, cards, isLoading, error, fetchCards, ensureCards, reorder, setPrimary }
})
