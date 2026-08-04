import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { DEFAULT_CARDS } from '@/cardData'

/**
 * 사용자의 카드와 결제 순서.
 *
 * 카드관리(쓰기) · 결제(읽기) · 내카드(읽기) 세 화면이 공유한다.
 *
 * TODO(mock): 지금은 `cardData.js` 목데이터를 그대로 읽는 클라이언트 상태다.
 *             `GET /api/user-cards` 연동(#27)이 붙으면 `useAsyncState` 로 감싼다.
 */
export const useCardStore = defineStore('card', () => {
  const order = ref(DEFAULT_CARDS.map((card) => card.id))

  const cards = computed(() =>
    order.value.map((id) => DEFAULT_CARDS.find((card) => card.id === id)).filter(Boolean),
  )

  function reorder(nextOrder) {
    order.value = [...nextOrder]
  }

  function setPrimary(cardId) {
    order.value = [cardId, ...order.value.filter((id) => id !== cardId)]
  }

  return { order, cards, reorder, setPrimary }
})
