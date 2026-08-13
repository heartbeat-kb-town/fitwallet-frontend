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

/** 카드를 아직 못 받았을 때 그릴 바닥값. `v-for` 가 터지지 않게 배열을 비워 둔다. */
const EMPTY_CARD_DETAIL = {
  cardName: '',
  cardImageUrl: null,
  maskedCardNumber: '',
  totalDiscount: 0,
  totalPoint: 0,
  totalSpend: 0,
  categories: [],
}

/**
 * 카드별 받은 혜택 상세를 화면이 쓸 모양으로 다듬는다 (#152).
 *
 * **원화와 포인트를 합치지 않는다.** 단위가 달라 더할 수 없는 값이고,
 * 백엔드가 굳이 나눠서 주는 이유가 그것이다.
 *
 * `benefitRate` 만 `Number` 로 누르지 않고 null 을 지킨다 — 정액(FIXED) 혜택은 % 가 없는데
 * 0 으로 바꾸면 "0% 할인" 이 되어 혜택을 못 받은 것처럼 보인다.
 */
function toCardDetail(response) {
  if (!response) return EMPTY_CARD_DETAIL

  return {
    cardName: response.cardName ?? '',
    cardImageUrl: response.cardImageUrl ?? null,
    maskedCardNumber: response.maskedCardNumber ?? '',
    totalDiscount: Number(response.totalDiscount) || 0,
    totalPoint: Number(response.totalPoint) || 0,
    totalSpend: Number(response.totalSpend) || 0,
    categories: (response.categories ?? []).map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      usageCount: Number(category.usageCount) || 0,
      discountAmount: Number(category.discountAmount) || 0,
      pointAmount: Number(category.pointAmount) || 0,
      transactions: (category.transactions ?? []).map((item) => ({
        approvedAt: item.approvedAt,
        storeName: item.storeName,
        benefitType: item.benefitType,
        benefitRate: item.benefitRate == null ? null : Number(item.benefitRate),
        paidAmount: Number(item.paidAmount) || 0,
        benefitAmount: Number(item.benefitAmount) || 0,
      })),
    })),
  }
}

const loadCardDetail = async (userCardId, yearMonth) =>
  toCardDetail(await reportApi.getReceivedCardBenefit(userCardId, yearMonth))

/** 놓친 혜택이 없는 달의 바닥값. `categories` 는 `v-for` 가 도는 자리라 배열을 비워 둔다. */
const EMPTY_MISSED = {
  totalMissedBenefit: 0,
  appUnusedAmount: 0,
  cardMismatchAmount: 0,
  lossType: '',
  categories: [],
}

/**
 * 손실 유형별 놓친 혜택 상세를 화면이 쓸 모양으로 다듬는다 (backend #201).
 *
 * **정렬하지 않는다.** 카테고리는 매퍼의 `ORDER BY c.category_id`, 거래는 `pt.paid_at DESC`
 * 순서 그대로다. 여기서 다시 정렬하면 기준이 두 곳에 생긴다.
 *
 * `storeName` 과 `discountRate` 는 **null 을 지운다.** 둘 다 실제로 null 이 자주 오고,
 * 각각 "가맹점을 모른다" 와 "할인율을 모른다" 를 뜻한다. 빈 문자열이나 0 으로 눌러 두면
 * 화면이 "이름 없는 가게" 나 "0% 할인" 으로 그려 사실과 달라진다.
 */
function toMissedDetail(response) {
  if (!response) return EMPTY_MISSED

  return {
    totalMissedBenefit: Number(response.totalMissedBenefit) || 0,
    appUnusedAmount: Number(response.appUnusedAmount) || 0,
    cardMismatchAmount: Number(response.cardMismatchAmount) || 0,
    lossType: response.lossType ?? '',
    categories: (response.categories ?? []).map((category) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      missedCount: Number(category.missedCount) || 0,
      missedAmount: Number(category.missedAmount) || 0,
      transactions: (category.transactions ?? []).map((item) => ({
        approvedAt: item.approvedAt,
        storeName: item.storeName ?? null,
        usedCardName: item.usedCardName ?? '',
        alternativeCardName: item.alternativeCardName ?? '',
        paidAmount: Number(item.paidAmount) || 0,
        discountRate: item.discountRate == null ? null : Number(item.discountRate),
        diffAmount: Number(item.diffAmount) || 0,
      })),
    })),
  }
}

const loadMissedDetail = async (yearMonth, lossType) =>
  toMissedDetail(await reportApi.getMissedBenefitDetail(yearMonth, lossType))

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

  // 카드별 받은 혜택 상세. 요약과 조회 시점이 달라(카드를 고를 때마다) 상태를 따로 둔다.
  const {
    data: cardDetail,
    isLoading: isCardDetailLoading,
    error: cardDetailError,
    execute: fetchCardDetail,
  } = useAsyncState(loadCardDetail, EMPTY_CARD_DETAIL)

  // 놓친 혜택 상세. 손실 유형 탭을 바꿀 때마다 다시 받으므로 이것도 상태를 따로 둔다.
  const {
    data: missedDetail,
    isLoading: isMissedDetailLoading,
    error: missedDetailError,
    execute: fetchMissedDetail,
  } = useAsyncState(loadMissedDetail, EMPTY_MISSED)

  return {
    summary,
    isLoading,
    error,
    fetchSummary,
    cardDetail,
    isCardDetailLoading,
    cardDetailError,
    fetchCardDetail,
    missedDetail,
    isMissedDetailLoading,
    missedDetailError,
    fetchMissedDetail,
  }
})
