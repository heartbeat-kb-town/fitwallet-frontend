import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as cardApi from '@/api/cardApi'
import { useAsyncState } from '@/composables/useAsyncState'
import { splitCardName } from '@/cardData'

/**
 * 백엔드 `CardListResponse` 한 건을 화면이 쓰는 모양으로 옮긴다.
 *
 * 봉투는 인터셉터가 이미 벗겼으므로 여기 오는 건 알맹이다.
 * 신용/체크에 따라 채워지는 금액 필드가 갈린다 (`CardType.java` 주석):
 *   CREDIT → creditLimit · scheduledPaymentAmount
 *   DEBIT  → bankName · balance
 *
 */
function toCard(response) {
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

  /**
   * 카드 이미지 URL. `user_card_id` → URL.
   *
   * TODO(#76): 목록 응답(`CardListResponse`)에 `cardImageUrl` 이 없다. `card_product.card_image_url`
   *   컬럼은 DB 에 있고 시드에도 값이 다 들어 있는데 DTO 와 `cardListColumns` 양쪽에서 빠졌다.
   *   카드별 요약(`/card/{id}/summary`)은 주므로 카드 수만큼 더 부른다.
   *   백엔드가 목록에 실어주면 이 ref 와 `ensureCardImages` 는 통째로 사라진다.
   */
  const imageUrls = ref({})

  const cards = computed(() => {
    const list = (fetched.value ?? []).map((card) => ({
      ...card,
      // 아직 안 받았거나 카드 상품에 이미지가 없으면 null 이다. 화면이 v-if 로 분기한다.
      cardImageUrl: imageUrls.value[card.id] ?? null,
    }))
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

  /**
   * 아직 모르는 카드의 이미지 URL 을 채운다.
   *
   * 카드 한 장에 요청 하나다. 목록 응답에 이미지가 없어서 생긴 비용이라
   * 백엔드가 실어주면 사라진다 (위 `imageUrls` 주석 참고).
   *
   * **실패해도 던지지 않는다.** 이미지는 못 받아도 카드 목록은 이미 떠 있고,
   * 그림 한 장 때문에 화면 전체를 에러로 만들 이유가 없다. 못 받은 카드는 `null` 로 남는다.
   */
  async function ensureCardImages() {
    const targets = (fetched.value ?? []).filter((card) => !(card.id in imageUrls.value))
    if (!targets.length) return

    const loaded = await Promise.all(
      targets.map((card) =>
        cardApi
          .getUserCard(card.id)
          .then((summary) => [card.id, summary.card?.cardImageUrl ?? null])
          .catch(() => null),
      ),
    )

    // 한 번에 갈아끼운다. 카드마다 대입하면 computed 가 카드 수만큼 다시 돈다.
    const next = { ...imageUrls.value }
    for (const entry of loaded) {
      if (entry) next[entry[0]] = entry[1]
    }
    imageUrls.value = next
  }

  /** 목록과 이미지를 한 번에. 화면은 보통 이것만 부르면 된다. */
  async function ensureCardsWithImages() {
    await ensureCards()
    await ensureCardImages()
  }

  function reorder(nextOrder) {
    order.value = [...nextOrder]
  }

  function setPrimary(cardId) {
    reorder([cardId, ...cards.value.map((card) => card.id).filter((id) => id !== cardId)])
  }

  return {
    order,
    cards,
    isLoading,
    error,
    fetchCards,
    ensureCards,
    ensureCardImages,
    ensureCardsWithImages,
    reorder,
    setPrimary,
  }
})
