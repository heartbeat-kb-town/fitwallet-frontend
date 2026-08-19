<script setup>
import { computed, onMounted, ref } from 'vue'
import { Info, X } from 'lucide-vue-next'
import * as cardApi from '@/api/cardApi'
import { BRAND_LOGOS } from '@/constants/brandLogos'
import { benefitCategoryIcon } from '@/constants/benefitCategoryIcons'
import { benefitUnitValue } from '@/utils/benefitUnit'
import { vDragScroll } from '@/directives/dragScroll'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import SharedLimitGroupCard from '@/components/card/SharedLimitGroupCard.vue'
import { useAsyncState } from '@/composables/useAsyncState'
import { useCardImage } from '@/composables/useCardImage'
import { useToast } from '@/composables/useToast'
import { useCardStore } from '@/stores/cardStore'

/**
 * 카드 혜택 현황.
 *
 * 홈에 있던 `카드 혜택 현황` 섹션을 통째로 옮겨온 것이다. 카드 캐러셀과 거기서 열리는
 * 두 개의 시트(혜택 현황 · 이벤트)가 한 덩어리라, 화면에서 떼어내면서 컴포넌트로 묶었다.
 * 이제 리포트 메인이 `놓친 혜택` 아래에서 쓴다.
 *
 * **리포트 이동은 화면이 정한다.** 홈에 있을 때는 `받은 혜택 리포트 보기` 가 라우터를
 * 밀었지만, 이제는 이미 리포트 안이라 같은 화면의 받은 혜택 상세로 갈아타야 한다.
 * 컴포넌트는 어느 카드인지만 알리고 무엇을 할지는 부모가 정한다.
 */
const emit = defineEmits(['open-card-report'])

const { showToast } = useToast()
const { markCardImageOrientation, cardImageStyle } = useCardImage()
const cardStore = useCardStore()

/** 보유 카드는 `cardStore` 하나에서만 나온다 (#76). */
const cards = computed(() => cardStore.cards)

const benefitCard = ref(null)

/**
 * 카드 이벤트 시트 (#125).
 *
 * 예전에는 "준비 중이에요" 토스트만 띄웠다. 백엔드에 이벤트 도메인이 없어서
 * 목데이터로 채우지 않고 자리만 남겨뒀던 것인데, 이제 API 가 생겼다.
 */
const eventCard = ref(null)

const {
  data: cardEvents,
  isLoading: isEventsLoading,
  execute: fetchCardEvents,
} = useAsyncState(cardApi.getCardEvents)

/**
 * 화면이 쓰는 모양으로 옮긴다.
 *
 * `daysRemaining` 과 기간은 백엔드가 준 값을 그대로 쓴다 — 날짜를 다시 계산하지 않는다.
 */
const events = computed(() =>
  (cardEvents.value?.events ?? []).map((event) => ({
    id: event.eventId,
    summary: event.summary,
    // 이 카드 전용인지 카드사 전체인지 구분한다. 사용자에게 의미가 다르다.
    scope: event.targetType === 'ISSUER' ? '카드사 전체' : '이 카드',
    period: `${event.startsAt} ~ ${event.endsAt}`,
    daysRemaining: event.daysRemaining,
    // detailAvailable 이 false 면 링크를 걸지 않는다. URL 이 있어도 마찬가지다.
    detailUrl: event.detailAvailable ? event.detailUrl : null,
  })),
)

/**
 * 혜택 현황 시트 전체가 이 응답 하나로 그려진다 (#121).
 *
 * 상단 요약·진행바, 카테고리별 혜택, 브랜드별 혜택이 전부 여기서 온다.
 */
const {
  data: monthlyBenefit,
  isLoading: isBenefitLoading,
  execute: fetchMonthlyBenefit,
} = useAsyncState(cardApi.getCardMonthlyBenefit)

/**
 * 카테고리·브랜드 혜택 행을 화면이 쓰는 한 가지 모양으로 맞춘다.
 *
 * **표시 문자열은 되도록 백엔드가 만들어 준 것을 쓴다.** `valueLabel` ·
 * `receivedBenefitLabel` · `perTransactionLimitLabel` 은 할인/적립과 원화/포인트가
 * 섞여 있어 화면이 단위를 다시 정하면 틀린다.
 *
 * ⚠️ **한도만 예외다.** 백엔드 `limitLabel` 은 `"3,500원 / 5,000원"` 처럼
 * **사용량 / 전체 한도** 인데, 디자인은 **남은 한도 / 전체 한도** 를 요구한다.
 * 그대로 쓰면 캡션("월별 남은 혜택 한도")과 숫자가 정반대가 된다.
 * `remainingValue` 가 함께 오므로 그걸로 다시 적는다.
 */
function toBenefitRow(item, key) {
  // 월 한도가 여럿 걸린 혜택이 있다. 대표로 첫 줄만 시트에 노출한다.
  const limit = item.monthlyLimits?.[0] ?? null

  return {
    key,
    name: item.displayName,
    imageUrl: item.categoryImageUrl ?? item.brandImageUrl ?? null,
    value: item.valueLabel,
    perTransactionLimit: item.perTransactionLimitLabel,
    remainingLabel: limit ? benefitUnitValue(limit.remainingValue, limit.limitUnit) : null,
    totalLimitLabel: limit ? benefitUnitValue(limit.limitValue, limit.limitUnit) : null,
    /**
     * 횟수 한도는 분수로 적지 않는다 (#178).
     *
     * `1회 / 3회` 는 **1 이 쓴 횟수인지 남은 횟수인지 드러나지 않는다.**
     * 금액은 진행바 옆이라 분수로 읽히지만 횟수는 그 맥락이 없어 반대로 읽기 쉽다.
     * 이 자리의 값은 남은 횟수이므로 `월 3회 중 1회 남음` 으로 풀어 쓴다.
     */
    isCountLimit: limit?.limitUnit === 'COUNT',
    received: item.receivedBenefitLabel,
    transactionCount: item.transactionCount,
    totalPaymentAmount: Number(item.totalPaymentAmount) || 0,
    exhausted: item.itemLimitStatus === 'LIMIT_EXHAUSTED',
  }
}

/**
 * 통합 한도(공동 월 한도) 그룹.
 *
 * 여러 혜택이 월 한도 하나를 나눠 쓰는 묶음이다. 카드가 그런 혜택을 갖고 있지 않으면 빈 배열이다.
 * 정렬은 백엔드가 `limitGroupId` 오름차순으로 해서 준다.
 */
const sharedLimitGroups = computed(() => monthlyBenefit.value?.sharedLimitGroups ?? [])

/**
 * 그룹에 속하지 않은 혜택만 낱개 행으로 그린다.
 *
 * ⚠️ **`categoryBenefits` · `brandBenefits` 에는 그룹에 든 혜택도 그대로 들어 있다.**
 * 거르지 않으면 같은 혜택이 그룹 카드와 낱개 행에 두 번 뜨고, 한도가 두 배로 읽힌다.
 * 판별은 `limitGroupId` 가 한다 — 그룹에 속하면 그룹 ID, 아니면 null 이다.
 *
 * 소진분을 하단으로 보내는 정렬도 백엔드가 해서 준다. 화면이 다시 정렬하지 않는다.
 */
const categoryBenefits = computed(() =>
  (monthlyBenefit.value?.categoryBenefits ?? [])
    .filter((item) => item.limitGroupId == null)
    .map((item) => toBenefitRow(item, `category-${item.benefitServiceId}-${item.categoryId}`)),
)

/**
 * 로드에 실패한 브랜드 로고. 주소가 죽으면 깨진 그림 대신 글자 한 자 아바타로 되돌린다.
 * 로고는 외부(브랜드 사이트)에서 오므로 언제든 사라질 수 있다.
 */
const brokenLogos = ref(new Set())

function markLogoBroken(key) {
  brokenLogos.value = new Set(brokenLogos.value).add(key)
}

/**
 * 브랜드 행의 그림은 로고다.
 *
 * `brandImageUrl` 이 있으면 그걸 쓰고, 없을 때만 `BRAND_LOGOS` 로 채운다
 * (시드의 브랜드 59건이 전부 NULL 이라 지금은 후자만 나온다 — 그 파일 주석 참고).
 */
const brandBenefits = computed(() =>
  (monthlyBenefit.value?.brandBenefits ?? [])
    .filter((item) => item.limitGroupId == null)
    .map((item) => {
      const key = `brand-${item.benefitServiceId}-${item.brandId}`
      const logo = item.brandImageUrl ?? BRAND_LOGOS[item.brandName] ?? null
      return { ...toBenefitRow(item, key), imageUrl: brokenLogos.value.has(key) ? null : logo }
    }),
)

/** 통합 한도 그룹도 낱개 혜택도 없는 카드. 시트 본문이 통째로 빈다. */
const hasBenefitDetail = computed(
  () =>
    sharedLimitGroups.value.length > 0 ||
    categoryBenefits.value.length > 0 ||
    brandBenefits.value.length > 0,
)

/**
 * 시트 상단 요약. **디자인의 진행바는 실적이 아니라 잠재 혜택이다.**
 *
 * 전체 한도가 없는 카드는 `potentialBenefitRate` 가 null 이라 분모를 감춘다.
 */
const benefitSummary = computed(() => {
  const summary = monthlyBenefit.value?.monthlySummary
  if (!summary) return null

  return {
    potential: Number(summary.potentialBenefitAmount) || 0,
    total: Number(summary.totalBenefitLimit) || 0,
    hasLimit: summary.potentialBenefitRate != null,
  }
})

/** 잠재 혜택 진행률. 백엔드가 계산해서 준다 — 화면에서 다시 나누지 않는다. */
const benefitProgress = computed(() =>
  Math.min(
    100,
    Math.round(Number(monthlyBenefit.value?.monthlySummary?.potentialBenefitRate) || 0),
  ),
)

/**
 * 진행바 아래 한 줄. 디자인은 "전월 실적 2구간 기준 적용 중" 이다.
 *
 * 구간명은 `performance.currentTier` 에서 오고, 실적 조건이 없는 카드는 그게 null 이라
 * 백엔드가 준 `message` 를 그대로 쓴다.
 */
const performanceLabel = computed(() => {
  const performance = monthlyBenefit.value?.performance
  if (!performance) return ''

  const tierName = performance.currentTier?.tierName
  return tierName ? `전월 실적 ${tierName} 적용 중` : performance.message
})

/** 잠재 혜택 설명 토글. 상단 ⓘ 를 누를 때마다 열리고 닫힌다. */
const isPotentialInfoOpen = ref(false)

function won(value) {
  return `${value.toLocaleString('ko-KR')}원`
}

/**
 * 혜택 현황 시트를 연다.
 *
 * `card.id` 는 이미 `userCardId` 다. `card_product_id` 가 아니다.
 */
async function openBenefit(card) {
  benefitCard.value = card
  try {
    await fetchMonthlyBenefit(card.id)
  } catch (error) {
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
    benefitCard.value = null
  }
}

async function openEvents(card) {
  eventCard.value = card
  try {
    await fetchCardEvents(card.id)
  } catch (error) {
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
    eventCard.value = null
  }
}

/** 시트를 닫고 그 카드의 받은 혜택 상세로 넘긴다. 열린 채 두면 상세가 시트에 가린다. */
function openCardReport(cardId) {
  benefitCard.value = null
  emit('open-card-report', cardId)
}

/**
 * 혜택 행의 업종 아이콘.
 *
 * `data.js` 의 `benefitIcons` 는 여섯 종뿐이라 백엔드가 주는 이름 상당수가 결제 아이콘으로
 * 떨어졌다. 표를 `constants/benefitCategoryIcons` 로 옮기고 키워드를 넓혔다.
 */
function categoryIcon(name) {
  return benefitCategoryIcon(name)
}

onMounted(() => {
  // 리포트 화면도 부르지만 멱등하다. 이 컴포넌트만 놓고도 동작해야 한다.
  cardStore.ensureCardsWithImages()
})
</script>

<template>
  <section class="report-panel">
    <h2>카드 혜택 현황</h2>
    <!--
      스크롤 영역의 패딩을 0 으로 지운다. `.horizontal-scroll` 은 홈의 전체폭 레이아웃용이라
      `padding: 0 20px 5px 0` 을 갖고 있는데, 여기서는 패널이 이미 좌우 20px 을 잡고 있다.

      ⚠️ **패딩으로 카드를 띄우려 하면 안 된다.** `scroll-snap-type: x mandatory` 가
      첫 카드의 시작변을 스크롤 영역의 시작변에 붙이느라 `scrollLeft` 를 패딩만큼 밀어버려서,
      왼쪽 패딩이 그대로 상쇄된다(실측 `scrollLeft: 20`). 카드가 제목보다 왼쪽에 붙어 보인
      원인이 이것이다. 여백은 패널 패딩에 맡기고 여기서는 0 으로 둔다.

      `.horizontal-scroll` 이 레이어 밖 규칙이라 `!` 로 덮는다.
    -->
    <div v-drag-scroll class="horizontal-scroll mt-3 !px-0 !pt-0 !pb-1.5">
      <!--
        그림자를 지운다. `.benefit-card` 의 `0 10px 24px rgba(43,35,26,.14)` 는 홈의 베이지
        배경에서 카드를 띄우려고 넣은 것인데, 흰 패널 위에서는 회색 얼룩으로 보인다.
        카드 경계는 이미 `border: 1px solid #e9e4dc` 가 잡아 준다.
      -->
      <article v-for="card in cards" :key="card.id" class="benefit-card !shadow-none">
        <div class="card-visual" :class="{ 'bg-muted-softer': !card.cardImageUrl }">
          <img
            v-if="card.cardImageUrl"
            :src="card.cardImageUrl"
            alt=""
            draggable="false"
            :style="cardImageStyle(card.cardImageUrl)"
            @load="markCardImageOrientation"
          />
          <!-- 이미지가 있으면 카드 앞면에 카드명이 이미 찍혀 있다. 글자를 겹쳐 쓰지 않는다. -->
          <template v-else>
            <div class="card-top">
              <div>
                <strong>{{ card.name }}</strong>
                <small>{{ card.issuer }}</small>
              </div>
            </div>
            <span class="chip"></span>
            <p>**** **** **** {{ card.last4 }}</p>
          </template>
        </div>
        <div class="card-actions">
          <button @click="openBenefit(card)">혜택 현황</button>
          <span></span>
          <button @click="openEvents(card)">이벤트</button>
        </div>
      </article>
    </div>

    <!-- 보유 카드를 아직 못 받았거나 한 장도 없을 때. 빈 스크롤 줄만 남기지 않는다. -->
    <p v-if="!cards.length" class="py-4 text-xs text-sub">등록된 카드가 없어요</p>
  </section>

  <Transition name="fade">
    <div v-if="benefitCard" class="sheet-layer fixed-layer">
      <button class="scrim" aria-label="혜택 현황 닫기" @click="benefitCard = null"></button>
      <section class="sheet status-sheet">
        <div class="sheet-head">
          <span class="handle"></span>
          <button class="sheet-close" aria-label="닫기" @click="benefitCard = null">
            <X :size="18" />
          </button>
          <h2>{{ benefitCard.name }}</h2>
          <p>{{ benefitCard.issuer }}</p>
          <!-- 상단은 실적이 아니라 **잠재 혜택**이다 (#121, 디자인 기준). -->
          <div class="progress-title">
            <span class="inline-flex items-center gap-1">
              이번 달 잠재 혜택
              <!--
                Preflight 를 빼둔 프로젝트라 `bg-transparent` 를 직접 준다.
                안 주면 브라우저 기본 버튼 배경(회색 알약)이 그대로 보인다.
              -->
              <button
                type="button"
                class="inline-flex bg-transparent p-0 text-muted transition-colors hover:text-sub"
                :aria-expanded="isPotentialInfoOpen"
                aria-label="잠재 혜택이 무엇인지 보기"
                @click="isPotentialInfoOpen = !isPotentialInfoOpen"
              >
                <Info :size="13" />
              </button>
            </span>
            <strong v-if="benefitSummary">
              <em>{{ won(benefitSummary.potential) }}</em>
              <template v-if="benefitSummary.hasLimit">
                / {{ won(benefitSummary.total) }}
              </template>
            </strong>
          </div>
          <div class="progress"><span :style="{ width: `${benefitProgress}%` }"></span></div>
          <p class="tier">{{ performanceLabel }}</p>

          <!-- 잠재 혜택 설명. ⓘ 를 누를 때마다 열리고 닫힌다. 문구는 디자인 주석 그대로다. -->
          <Transition name="expand">
            <p
              v-if="isPotentialInfoOpen"
              class="mt-2 rounded-xl bg-icon-bg px-3 py-2 text-xs leading-relaxed text-sub"
            >
              잠재혜택은 청구할인, 포인트 적립, 캐시백, 할인쿠폰을 합산한 혜택이에요.
            </p>
          </Transition>
        </div>
        <div class="sheet-scroll">
          <div v-if="isBenefitLoading" class="flex justify-center py-16 text-sub">
            <BaseSpinner size="lg" label="혜택 현황을 불러오는 중" />
          </div>

          <template v-else>
            <template v-if="hasBenefitDetail">
              <!--
                **통합 한도 그룹이 먼저다.** 한도를 나눠 쓰는 혜택을 낱개로 흩어 놓으면
                같은 한도가 여러 번 세어져, 받을 수 있는 금액이 실제보다 크게 읽힌다.
              -->
              <div v-if="sharedLimitGroups.length" class="mb-5 flex flex-col gap-3">
                <SharedLimitGroupCard
                  v-for="group in sharedLimitGroups"
                  :key="group.limitGroupId"
                  :group="group"
                />
              </div>

              <!--
                그룹에 속하지 않은 혜택. 한도를 혼자 쓰므로 예전 그대로 낱개 행으로 적는다.
              -->
              <template v-if="categoryBenefits.length || brandBenefits.length">
                <p class="limit-caption">
                  월별 <b>남은</b> 혜택 한도
                  <span v-if="monthlyBenefit?.asOfDate" class="text-xs">
                    · {{ monthlyBenefit.asOfDate }} 기준
                  </span>
                </p>

                <!--
                  두 목록 모두 테두리 있는 상자다. `.benefit-list` 는 배경과 모서리만 잡고
                  테두리·좌우 여백이 없어서 유틸리티로 채운다. 토큰(`border-line`)을 쓴다.
                -->
                <template v-if="categoryBenefits.length">
                  <h3>카테고리별 혜택</h3>
                  <div class="benefit-list border border-line px-4">
                    <div v-for="item in categoryBenefits" :key="item.key" class="benefit-row">
                      <span class="mini-icon">
                        <img
                          :src="item.imageUrl ?? categoryIcon(item.name)"
                          alt=""
                          width="16"
                          height="16"
                        />
                      </span>
                      <div class="benefit-body">
                        <div class="row-title">
                          <strong>{{ item.name }}</strong>
                          <span v-if="item.exhausted" class="exhausted">한도 소진</span>
                          <small v-if="item.perTransactionLimit">{{
                            item.perTransactionLimit
                          }}</small>
                        </div>
                        <div class="row-discount">
                          <span>{{ item.value }}</span>
                          <!-- 횟수는 분수로 적으면 쓴 건지 남은 건지 안 드러난다 (#178). -->
                          <strong v-if="item.remainingLabel && item.isCountLimit">
                            월 {{ item.totalLimitLabel }} 중
                            <em :class="{ muted: item.exhausted }">{{ item.remainingLabel }}</em>
                            남음
                          </strong>
                          <strong v-else-if="item.remainingLabel">
                            <em :class="{ muted: item.exhausted }">{{ item.remainingLabel }}</em>
                            / {{ item.totalLimitLabel }}
                          </strong>
                        </div>
                        <div class="row-total">
                          <span>
                            총 {{ item.transactionCount }}건 ·
                            {{ won(item.totalPaymentAmount) }} 결제
                          </span>
                          <strong>{{ item.received }}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- 여백은 래퍼에 준다. `.sheet-scroll h3` 가 레이어 밖 규칙이라 `mt-*` 를 이긴다. -->
                <div v-if="brandBenefits.length" class="mt-6">
                  <h3>브랜드별 혜택</h3>
                  <div class="benefit-list border border-line px-4">
                    <div v-for="item in brandBenefits" :key="item.key" class="benefit-row">
                      <!--
                        로고가 있으면 `.brand-avatar`(28px 원형 + 테두리) 대신 네모 타일을 쓴다.
                        브랜드 로고는 `7-ELEVEN` · `emart24` 처럼 **가로로 긴 워드마크**가 많아
                        원형 28px 안에서는 눌려서 안 읽힌다. 글자 한 자로 대신할 때만 원형이다.
                      -->
                      <span
                        v-if="item.imageUrl"
                        class="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-xl bg-icon-bg"
                      >
                        <!-- 칸을 가득 채운다. 가로로 긴 로고와 정사각 로고를 나란히 놓기 위해서다. -->
                        <img
                          :src="item.imageUrl"
                          alt=""
                          class="h-full w-full object-contain p-0.5"
                          @error="markLogoBroken(item.key)"
                        />
                      </span>
                      <span v-else class="brand-avatar">{{ item.name.slice(0, 1) }}</span>
                      <div class="benefit-body">
                        <div class="row-title">
                          <strong>{{ item.name }}</strong>
                          <span v-if="item.exhausted" class="exhausted">한도 소진</span>
                          <small v-if="item.perTransactionLimit">
                            {{ item.perTransactionLimit }}
                          </small>
                        </div>
                        <div class="row-discount">
                          <span>{{ item.value }}</span>
                          <!-- 횟수는 분수로 적으면 쓴 건지 남은 건지 안 드러난다 (#178). -->
                          <strong v-if="item.remainingLabel && item.isCountLimit">
                            월 {{ item.totalLimitLabel }} 중
                            <em :class="{ muted: item.exhausted }">{{ item.remainingLabel }}</em>
                            남음
                          </strong>
                          <strong v-else-if="item.remainingLabel">
                            <em :class="{ muted: item.exhausted }">{{ item.remainingLabel }}</em>
                            / {{ item.totalLimitLabel }}
                          </strong>
                        </div>
                        <div class="row-total">
                          <span>
                            총 {{ item.transactionCount }}건 ·
                            {{ won(item.totalPaymentAmount) }} 결제
                          </span>
                          <strong>{{ item.received }}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </template>

            <!-- 월 한도가 걸린 혜택이 하나도 없는 카드. 세 배열이 함께 빈다. -->
            <div v-else class="py-6 text-center text-xs text-sub">
              이 카드에 등록된 혜택 정보가 없어요
            </div>

            <button class="primary-button" @click="openCardReport(benefitCard.id)">
              받은 혜택 리포트 보기
            </button>
          </template>
        </div>
      </section>
    </div>
  </Transition>

  <!-- 카드 이벤트 시트 (#125). 혜택 현황 시트와 같은 구조를 쓴다. -->
  <Transition name="sheet">
    <div v-if="eventCard" class="sheet-layer fixed-layer">
      <button class="scrim" aria-label="이벤트 닫기" @click="eventCard = null"></button>
      <section class="sheet status-sheet">
        <div class="sheet-head">
          <span class="handle"></span>
          <button class="sheet-close" aria-label="닫기" @click="eventCard = null">
            <X :size="18" />
          </button>
          <h2>{{ eventCard.name }}</h2>
          <p>{{ eventCard.issuer }}</p>
        </div>

        <div class="sheet-scroll">
          <div v-if="isEventsLoading" class="flex justify-center py-16 text-sub">
            <BaseSpinner size="lg" label="이벤트를 불러오는 중" />
          </div>

          <template v-else>
            <h3>진행 중인 이벤트</h3>

            <div v-if="events.length" class="flex flex-col gap-3">
              <article
                v-for="event in events"
                :key="event.id"
                class="rounded-2xl border border-line p-4"
              >
                <div class="mb-2 flex items-center gap-2">
                  <span class="rounded-full bg-icon-bg px-2 py-0.5 text-[11px] text-sub">
                    {{ event.scope }}
                  </span>
                  <!-- 남은 일수는 백엔드가 계산해 준다. 화면에서 날짜를 다시 빼지 않는다. -->
                  <span v-if="event.daysRemaining != null" class="text-[11px] font-bold text-ink">
                    D-{{ event.daysRemaining }}
                  </span>
                </div>

                <p class="text-[13px] leading-snug text-ink">{{ event.summary }}</p>
                <p class="mt-2 text-[11px] text-sub">{{ event.period }}</p>

                <!-- 카드사 페이지로 나가는 외부 링크다. -->
                <a
                  v-if="event.detailUrl"
                  :href="event.detailUrl"
                  target="_blank"
                  rel="noreferrer noopener"
                  class="mt-2 inline-block text-[12px] font-bold text-primary-dark underline"
                >
                  자세히 보기
                </a>
              </article>
            </div>

            <div v-else class="py-6 text-center text-xs text-sub">
              지금 진행 중인 이벤트가 없어요
            </div>
          </template>
        </div>
      </section>
    </div>
  </Transition>
</template>
