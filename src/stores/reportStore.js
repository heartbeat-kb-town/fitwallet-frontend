import { defineStore } from 'pinia'
import * as reportApi from '@/api/reportApi'
import { useAsyncState } from '@/composables/useAsyncState'

/** 결제가 한 건도 없는 달의 응답. `data` 초기값이자 실패했을 때의 바닥값이다. */
const EMPTY_SUMMARY = {
  totalReceivedBenefit: 0,
  totalMissedBenefit: 0,
  categories: [],
  recommendations: [],
}

/**
 * 응답을 화면이 그대로 쓸 수 있는 모양으로 다듬는다.
 *
 * 백엔드 금액은 전부 `BigDecimal` 이다. 결제가 없는 달도 0 으로 오지만,
 * 여기서 한 번 `Number` 로 눌러 두면 화면이 `toLocaleString` 앞에서 방어할 필요가 없다.
 *
 * **정렬하지 않는다.** `categories` 는 매퍼가 혜택 내림차순 상위 5개로,
 * `recommendations` 는 서비스가 예상 혜택 내림차순 상위 2건으로 이미 잘라서 준다.
 * 여기서 다시 정렬하면 정렬 기준이 두 곳에 생긴다.
 */
function toSummary(response) {
  if (!response) return EMPTY_SUMMARY

  return {
    totalReceivedBenefit: Number(response.totalReceivedBenefit) || 0,
    totalMissedBenefit: Number(response.totalMissedBenefit) || 0,
    categories: (response.categories ?? []).map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      benefitAmount: Number(category.benefitAmount) || 0,
      spendAmount: Number(category.spendAmount) || 0,
    })),
    recommendations: (response.recommendations ?? []).map((card) => ({
      cardProductId: card.cardProductId,
      cardName: card.cardName,
      cardImageUrl: card.cardImageUrl,
      expectedBenefit: Number(card.expectedBenefit) || 0,
      description: card.description,
    })),
  }
}

const loadSummary = async (yearMonth) => toSummary(await reportApi.getBenefitSummary(yearMonth))

/**
 * 월간 혜택 리포트.
 *
 * 지금은 리포트 화면 하나만 보지만, 서버 데이터이므로 store 에 둔다 (CLAUDE.md "상태 관리").
 * 어느 달을 보고 있는지는 화면 안에서만 쓰는 상태라 화면의 `ref` 가 들고 있고,
 * 이 store 는 "요청받은 달의 요약" 만 책임진다.
 */
export const useReportStore = defineStore('report', () => {
  const {
    data: summary,
    isLoading,
    error,
    execute: fetchSummary,
  } = useAsyncState(loadSummary, EMPTY_SUMMARY)

  return { summary, isLoading, error, fetchSummary }
})
