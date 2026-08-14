<script>
// 같은 세션에서 동의 시트를 두 번 띄우지 않기 위한 캐시. 홈에 다시 들어와도 유지된다.
//
// **동의의 진짜 상태는 서버에 있다** (`users.is_location_agreed`). 이건 요청을 아끼는 용도일 뿐이다.
// 새로고침하면 false 로 돌아가 시트가 다시 뜨는데, 그때 동의를 한 번 더 저장한다.
// 멱등한 요청이라 문제 없다. 서버 값을 읽어 시트 노출을 정하려면 `GET /user/me` 가 필요한데
// 백엔드에 아직 없다 (#117).
let locationConsented = false
</script>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Info, Menu, X } from 'lucide-vue-next'
import iconSearch from '@/assets/icons/search.svg'
import iconPigPeek from '@/assets/icons/pig-peek.svg'
import iconSpeechBubble from '@/assets/icons/speech-bubble.svg'
import iconHomeActive from '@/assets/icons/click-home.svg'
import iconHome from '@/assets/icons/home.svg'
import iconPayment from '@/assets/icons/payment.svg'
import iconPaymentActive from '@/assets/icons/payment-selected.svg'
import iconMycard from '@/assets/icons/mycard.svg'
import iconMycardActive from '@/assets/icons/mycard-selected.svg'
import iconReport from '@/assets/icons/report.svg'
import iconReportActive from '@/assets/icons/report-selected.svg'
import iconLocation from '@/assets/icons/location.svg'
import { categories, benefitIcons } from '@/data'
import { CATEGORY_PHOTOS } from '@/constants/categoryPhotos'
import * as cardApi from '@/api/cardApi'
import * as userApi from '@/api/userApi'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import SharedLimitGroupCard from '@/components/card/SharedLimitGroupCard.vue'
import { useAsyncState } from '@/composables/useAsyncState'
import { useCardImage } from '@/composables/useCardImage'
import { useToast } from '@/composables/useToast'
import { useCardStore } from '@/stores/cardStore'
import { usePaymentStore } from '@/stores/paymentStore'

const router = useRouter()
const paymentStore = usePaymentStore()
const cardStore = useCardStore()
const { showToast } = useToast()
const { markCardImageOrientation, cardImageStyle } = useCardImage()

/**
 * 보유 카드. 목데이터가 아니라 `cardStore` 에서 온다 (#101).
 *
 * 예전에는 `src/data.js` 의 목 카드를 그렸는데, 거기 뜨는 `KB Gold & More` 는
 * 사용자가 갖고 있지도 않은 카드였다. 보유 카드의 유일한 출처는 store 다 (#76).
 */
const cards = computed(() => cardStore.cards)

/**
 * 자주 찾는 장소. 목데이터가 아니라 API 에서 온다 (#114).
 *
 * 예전에는 `data.js` 의 `favoritePlaces` 를 그렸는데, "자주 찾는" 이라고 적어 놓고
 * 누구에게나 블루보틀·파이브가이즈가 떴다. 사용자가 가본 적 없는 가게였다.
 *
 * 정렬과 개수는 백엔드가 정한다 (최근 1개월, 횟수 내림차순 상위 3건).
 */
const { data: frequentPlaces, execute: fetchFrequentPlaces } = useAsyncState(
  userApi.getFrequentPlaces,
  [],
)

/**
 * 응답에는 `categoryId` 도 가게 사진도 없다. `categoryName` 으로 로컬 카테고리를 찾아
 * 아이콘과 `categoryId` 를 얻는다. 카테고리 이름은 백엔드 `category` 테이블과 정확히 같다
 * (카페/디저트 · 편의점/마트 · 쇼핑 · 푸드 · 병원 · 주유).
 *
 * 못 찾으면 `categoryId` 없이 이름만으로 검색한다. 가맹점 화면은 키워드가 있으면
 * 카테고리를 보지 않으므로 이동은 그대로 동작한다.
 */
const places = computed(() =>
  (frequentPlaces.value ?? []).map((place) => {
    const category = categories.find((item) => item.name === place.categoryName)

    return {
      id: place.storeId,
      name: place.storeName,
      category: place.categoryName,
      categoryId: category?.id,
      icon: category?.icon,
      // 그 가게의 사진이 아니라 카테고리 대표 사진이다. `constants/categoryPhotos` 주석 참고.
      photo: CATEGORY_PHOTOS[place.categoryName],
    }
  }),
)

/**
 * 로드에 실패한 사진 주소. 카테고리 사진은 외부(Unsplash)에서 받아오므로 오프라인이거나
 * 주소가 죽으면 깨진 이미지가 남는다. 실패한 것만 기억해 두고 카테고리 아이콘으로 되돌린다.
 */
const brokenPhotos = ref(new Set())

function markPhotoBroken(url) {
  brokenPhotos.value = new Set(brokenPhotos.value).add(url)
}

onMounted(() => {
  cardStore.ensureCardsWithImages()

  // 실패해도 홈의 나머지는 그대로 그린다. 이 섹션만 비워 두면 된다.
  fetchFrequentPlaces().catch(() => {})
})

// 결제 탭으로 들어가면 카드 선택부터 시작한다 (기존 navigateTo('payment') 의 초기화).
function openPayment() {
  paymentStore.reset()
  router.push({ name: 'payment' })
}

function openSearch() {
  router.push({ name: 'search' })
}

// 돌아올 주소를 통째로 넘긴다 (#61).
function openMyPage() {
  router.push({ name: 'my-page', query: { returnTo: '/home' } })
}

function openMerchants({ categoryId, title, query = '' }) {
  router.push({ name: 'merchants', query: { categoryId, title, query } })
}

function goToMyCard() {
  router.push({ name: 'my-card' })
}

function openReport(cardId = '') {
  router.push({ name: 'report', query: cardId ? { cardId } : {} })
}

// 하단 내비게이션 탭: icon(비활성/회색), iconActive(활성/노랑)
const navItems = [
  { label: '홈', icon: iconHome, iconActive: iconHomeActive },
  { label: '결제', icon: iconPayment, iconActive: iconPaymentActive },
  { label: '내 카드', icon: iconMycard, iconActive: iconMycardActive },
  { label: '리포트', icon: iconReport, iconActive: iconReportActive },
]

// 가로 스크롤 영역을 마우스로 잡아끌 수 있게 해주는 커스텀 디렉티브 (v-drag-scroll)
// 터치·트랙패드는 브라우저 기본 스크롤을 그대로 쓰고, 마우스일 때만 동작해요.
const vDragScroll = {
  mounted(el) {
    let pointerId = null
    let startX = 0
    let startScrollLeft = 0
    let dragged = false

    const onPointerDown = (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      pointerId = event.pointerId
      startX = event.clientX
      startScrollLeft = el.scrollLeft
      dragged = false
    }

    const onPointerMove = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return
      const deltaX = event.clientX - startX
      if (!dragged && Math.abs(deltaX) > 6) {
        dragged = true
        el.setPointerCapture(pointerId)
        el.style.scrollSnapType = 'none'
        el.classList.add('dragging')
      }
      if (dragged) {
        el.scrollLeft = startScrollLeft - deltaX
        event.preventDefault()
      }
    }

    const endDrag = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return
      pointerId = null
      el.classList.remove('dragging')
      el.style.scrollSnapType = ''
      // 드래그 직후 발생하는 클릭 한 번을 막은 뒤 상태를 초기화해요
      window.setTimeout(() => {
        dragged = false
      }, 0)
    }

    const onClickCapture = (event) => {
      if (dragged) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('click', onClickCapture, true)

    el._dragScrollCleanup = () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('click', onClickCapture, true)
    }
  },
  unmounted(el) {
    el._dragScrollCleanup?.()
  },
}

const selectedCategory = ref(null)
const consentCategory = ref(null)
const isSavingConsent = ref(false)
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
const activeTab = ref(0)
const toast = ref('')
let toastTimer

/**
 * 혜택 현황 시트 전체가 이 응답 하나로 그려진다 (#121).
 *
 * 상단 요약·진행바, 카테고리별 혜택, 브랜드별 혜택이 전부 여기서 온다.
 * 예전 목데이터 시트가 보여주던 카테고리별 한도·사용액·건수와 브랜드별 혜택이
 * 이 API 로 돌아왔다. `/card/{id}/usage` 는 그것들을 주지 않아 한동안 비어 있었다.
 */
const {
  data: monthlyBenefit,
  isLoading: isBenefitLoading,
  execute: fetchMonthlyBenefit,
} = useAsyncState(cardApi.getCardMonthlyBenefit)

/**
 * 한도 금액을 표시 단위로 적는다. 포인트 혜택은 `원` 이 아니라 `P` 다.
 *
 * 단위는 `limitUnit` 이 알려준다 (`KRW` · `POINT`). 화면이 카드 종류로 추측하지 않는다.
 */
function limitAmount(value, unit) {
  const amount = (Number(value) || 0).toLocaleString('ko-KR')
  return unit === 'POINT' ? `${amount}P` : `${amount}원`
}

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
function toBenefitRow(item, key, tag) {
  // 월 한도가 여럿 걸린 혜택이 있다. 대표로 첫 줄만 시트에 노출한다.
  const limit = item.monthlyLimits?.[0] ?? null

  return {
    key,
    tag,
    name: item.displayName,
    imageUrl: item.categoryImageUrl ?? item.brandImageUrl ?? null,
    // 정률 표기가 없는 혜택은 건당 한도가 그 자리를 대신한다 (교통 "건당 최대 800원").
    value: [item.valueLabel, item.perTransactionLimitLabel].filter(Boolean).join(' · '),
    remainingLabel: limit ? limitAmount(limit.remainingValue, limit.limitUnit) : null,
    totalLimitLabel: limit ? limitAmount(limit.limitValue, limit.limitUnit) : null,
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
    .map((item) =>
      toBenefitRow(item, `category-${item.benefitServiceId}-${item.categoryId}`, null),
    ),
)

/**
 * 브랜드 행에는 업종 칩을 붙인다. 디자인은 "이마트 [마트]" 처럼 업종명을 적지만
 * **낱개 브랜드 응답에는 업종명이 없다** (`CardMonthlyBrandBenefitResponse` 에 categoryId 도 없다).
 * 그룹 카드는 `categories` 로 업종명을 찾을 수 있어 거기서만 실제 업종을 적는다.
 */
const brandBenefits = computed(() =>
  (monthlyBenefit.value?.brandBenefits ?? [])
    .filter((item) => item.limitGroupId == null)
    .map((item) => toBenefitRow(item, `brand-${item.benefitServiceId}-${item.brandId}`, '브랜드')),
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
 * `/card/{id}/usage` 밖에 없던 동안은 실적 진행률로 대신 그렸는데(#105),
 * 잠재 혜택과 전체 한도가 `monthlySummary` 로 오면서 디자인대로 되돌렸다 (#121).
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

/**
 * 잠재 혜택 설명 토글. 상단 ⓘ 를 누를 때마다 열리고 닫힌다.
 *
 * 문구는 디자인 주석 그대로다. 잠재 혜택이 무엇을 합한 값인지 화면 어디에도 없어서,
 * 진행바 숫자가 어디서 나온 건지 사용자가 알 방법이 없었다.
 */
const isPotentialInfoOpen = ref(false)

function won(value) {
  return `${value.toLocaleString('ko-KR')}원`
}

function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2200)
}

function chooseCategory(category) {
  selectedCategory.value = category.id
  if (locationConsented) {
    openMerchants({ categoryId: category.id, title: category.name })
    return
  }
  consentCategory.value = category
}

/**
 * 위치 정보 이용 동의.
 *
 * **서버에 저장하고 나서 넘어간다.** 가맹점 조회가 `users.is_location_agreed` 를 보고
 * 403 으로 막으므로(`DefaultStoreService`), 먼저 넘어가면 빈 화면을 보여주게 된다.
 *
 * 예전에는 모듈 변수만 세우고 서버에 알리지 않아, 동의를 눌러도 목록이 뜨지 않았다 (#117).
 */
async function confirmLocation() {
  if (isSavingConsent.value) return

  const category = consentCategory.value
  isSavingConsent.value = true

  try {
    await userApi.patchLocationAgreement({ agreed: true })
  } catch (error) {
    // 시트를 닫지 않는다. 닫으면 사용자가 다시 동의할 방법이 없다.
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
    return
  } finally {
    isSavingConsent.value = false
  }

  locationConsented = true
  consentCategory.value = null

  if (category) {
    openMerchants({ categoryId: category.id, title: category.name })
  }
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

function categoryIcon(name) {
  return Object.entries(benefitIcons).find(([key]) => name.includes(key))?.[1] ?? iconPayment
}

function selectTab(index, label) {
  activeTab.value = index
  if (index === 1) {
    openPayment()
    return
  }
  if (index === 2) {
    goToMyCard()
    return
  }
  if (index === 3) {
    openReport()
    return
  }
  if (index !== 0) {
    notify(`${label} 탭은 홈 화면 변환본에서 제외했어요.`)
    requestAnimationFrame(() => {
      activeTab.value = 0
    })
  }
}
</script>

<template>
  <header class="header">
    <!--
      디자인상 이 자리에 인사말("안녕하세요 김지연님") 대신 픽피와 말풍선이 들어간다.

      픽피는 헤더 아래 검색창에 걸쳐야 한다. 헤더는 80px 고정 밴드이고 검색창은 그 아래
      스크롤 영역의 첫 요소라, 픽피를 헤더 바닥에 붙인 뒤(`self-end`) 8px 흘러나오게 한다
      (`translate-y-2`). `translate` 는 레이아웃을 밀지 않아서 헤더 높이가 그대로 유지된다.
      헤더가 `z-index: 2` 라 흘러나온 부분이 검색창 위에 그려진다.

      8px 은 에셋 여백까지 계산한 값이다. `pig-peek.svg` 는 55×60 캔버스 안에서 그림이
      y 15~57.3 에만 있어 **아래로 2.7px 이 비어 있다.** 캔버스를 8px 내리면 실제 그림은
      검색창을 5px 파고든다 — 디자인의 겹침과 같다.
    -->
    <div class="flex translate-y-2 items-end self-end">
      <img :src="iconPigPeek" alt="" width="55" height="60" class="-ml-2 shrink-0" />
      <!--
        말풍선은 디자이너가 준 도형(120×26)이고 글자가 들어 있지 않다. 이미지를 깔고 그 위에
        실제 텍스트를 얹는다 — 글자를 이미지로 구우면 읽히지도, 확대에도 견디지 못한다.

        몸통은 y 0~25 구간이고 꼬리가 26까지 내려오므로 글자는 25px 안에서 가운데 정렬한다.
        몸통이 x=4 부터라 `pl-1` 로 그만큼 밀어 준다.
      -->
      <div class="relative mb-4 h-[26px] w-[120px] shrink-0">
        <img :src="iconSpeechBubble" alt="" width="120" height="26" class="absolute inset-0" />
        <span
          class="absolute inset-x-0 top-0 flex h-[25px] items-center justify-center pl-1 text-[10px] font-bold"
        >
          <!-- 디자인의 강조색은 #E8AC04 다. 토큰 primary-dark(#E6A800) 와 육안 구분이 안 된다. -->
          <span class="text-primary-dark">최대 혜택</span><span class="text-ink">으로 빠르게</span>
        </span>
      </div>
    </div>

    <button class="icon-button mb-1 self-end" aria-label="마이페이지 열기" @click="openMyPage()">
      <Menu :size="23" />
    </button>
  </header>

  <div class="scroll-content">
    <div class="search-wrap">
      <button class="search-bar" @click="openSearch()">
        <img :src="iconSearch" alt="" width="19" height="19" />
        <span>매장명을 검색하고 최적의 카드로 혜택을 받으세요</span>
      </button>
    </div>

    <!--
      디자인에 있는 섹션 제목. `.home-section h2` 를 쓰지 않는 이유는 그 규칙이 `.home-section`
      안에서만 먹고, 카테고리 그리드는 그 래퍼 밖에 있어서다. Preflight 를 빼둔 프로젝트라
      브라우저 기본 h2 여백·크기가 그대로 남으므로 `m-0` 과 크기를 직접 지정한다.
    -->
    <h2 class="m-0 mb-3 pl-5 text-base font-bold text-ink">매장 카테고리</h2>

    <div class="category-grid">
      <button
        v-for="category in categories"
        :key="category.id"
        class="category-card"
        :class="{ active: selectedCategory === category.id }"
        @click="chooseCategory(category)"
      >
        <span class="category-icon">
          <img :src="category.icon" :alt="category.name" width="22" height="22" />
        </span>
        <span>{{ category.name }}</span>
      </button>
    </div>

    <!-- 결제 내역이 없으면 빈 배열이 온다. 그때는 섹션을 통째로 감춘다. -->
    <section v-if="places.length" class="home-section">
      <h2>자주 찾는 장소</h2>
      <div v-drag-scroll class="horizontal-scroll">
        <button
          v-for="place in places"
          :key="place.id"
          class="place-card"
          @click="
            openMerchants({
              categoryId: place.categoryId,
              title: place.name,
              query: place.name,
            })
          "
        >
          <!--
            백엔드가 가게 사진을 주지 않아 **카테고리 대표 사진**을 그린다.
            그 가게의 사진이 아니다 — 카페면 커피 사진, 주유소면 주유소 사진이다.

            예전 목 사진은 가게마다 고정이라 `HD현대오일뱅크직영 효진주유소` 에 블루보틀
            사진이 붙었다. 카테고리로 고르면 적어도 종류는 맞는다.

            사진이 없는 카테고리이거나 로드에 실패하면 카테고리 아이콘으로 되돌린다.

            `.place-image` 를 쓰지 않고 Tailwind 로 새로 짠다. style.css 4700줄은 레이어 밖에
            있어서 `.place-image img { object-fit: cover }` 가 유틸리티를 이긴다 —
            클래스를 그대로 두면 아이콘이 칸에 맞춰 늘어난다.
          -->
          <div class="flex h-[130px] items-center justify-center bg-icon-bg">
            <img
              v-if="place.photo && !brokenPhotos.has(place.photo)"
              :src="place.photo"
              alt=""
              loading="lazy"
              draggable="false"
              class="size-full object-cover"
              @error="markPhotoBroken(place.photo)"
            />
            <img v-else-if="place.icon" :src="place.icon" alt="" class="size-12 object-contain" />
          </div>
          <div class="place-info">
            <strong>{{ place.name }}</strong>
            <span>{{ place.category }}</span>
          </div>
        </button>
      </div>
    </section>

    <section class="home-section cards-section">
      <h2>카드 혜택 현황</h2>
      <div v-drag-scroll class="horizontal-scroll">
        <article v-for="card in cards" :key="card.id" class="benefit-card">
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
    </section>
  </div>

  <nav class="bottom-nav">
    <button
      v-for="(item, index) in navItems"
      :key="item.label"
      :class="{ active: activeTab === index }"
      @click="selectTab(index, item.label)"
    >
      <img
        :src="activeTab === index ? item.iconActive : item.icon"
        :alt="item.label"
        width="22"
        height="22"
      />
      <span>{{ item.label }}</span>
    </button>
  </nav>

  <Transition name="fade">
    <div v-if="consentCategory" class="sheet-layer">
      <button class="scrim" aria-label="닫기" @click="consentCategory = null"></button>
      <section class="sheet consent-sheet">
        <span class="handle"></span>
        <span class="consent-icon">
          <img :src="iconLocation" alt="" width="32" height="32" />
        </span>
        <div class="consent-copy">
          <h2>내 주변 {{ consentCategory.name }} 혜택을 볼까요?</h2>
          <p>가까운 매장과 지금 받을 수 있는 카드 혜택을 찾기 위해 위치 정보가 필요해요.</p>
        </div>
        <button class="primary-button" :disabled="isSavingConsent" @click="confirmLocation">
          {{ isSavingConsent ? '저장 중…' : '위치 정보 동의하고 보기' }}
        </button>
        <button class="text-button" :disabled="isSavingConsent" @click="consentCategory = null">
          다음에 할게요
        </button>
      </section>
    </div>
  </Transition>

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
          <!--
            상단은 실적이 아니라 **잠재 혜택**이다 (#121, 디자인 기준).
            `/card/{id}/usage` 밖에 없던 동안만 실적 진행률로 대신 그렸다 (#105).
          -->
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
        <!--
          혜택 카드가 흰 바탕이라 시트 본문에 옅은 바탕을 깐다.
          `.sheet` 가 흰색이라 그대로 두면 카드 경계가 보이지 않는다. 색은 토큰이다.
        -->
        <div class="sheet-scroll bg-muted-softer">
          <div v-if="isBenefitLoading" class="flex justify-center py-16 text-sub">
            <BaseSpinner size="lg" label="혜택 현황을 불러오는 중" />
          </div>

          <template v-else>
            <template v-if="hasBenefitDetail">
              <p v-if="monthlyBenefit?.asOfDate" class="limit-caption">
                {{ monthlyBenefit.asOfDate }} 기준 · 오늘 결제는 아직 반영되지 않아요
              </p>

              <!--
                **통합 한도 그룹이 먼저다.** 한도를 나눠 쓰는 혜택을 낱개로 흩어 놓으면
                같은 한도가 여러 번 세어져, 받을 수 있는 금액이 실제보다 크게 읽힌다.
              -->
              <div v-if="sharedLimitGroups.length" class="flex flex-col gap-3">
                <SharedLimitGroupCard
                  v-for="group in sharedLimitGroups"
                  :key="group.limitGroupId"
                  :group="group"
                />
              </div>

              <!--
                그룹에 속하지 않은 혜택. 한도를 혼자 쓰므로 그룹 카드 없이 한 줄로 적는다.
                디자인에는 없지만 **남은 한도 줄은 남겼다** — 이 시트가 원래 답해 주는 질문이
                "이 카드로 이번 달에 얼마를 더 받을 수 있나" 라서다.
              -->
              <div
                v-for="item in [...categoryBenefits, ...brandBenefits]"
                :key="item.key"
                class="mt-3 flex items-start gap-3 rounded-2xl bg-white p-4"
              >
                <span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-icon-bg">
                  <img
                    :src="item.imageUrl ?? categoryIcon(item.name)"
                    alt=""
                    width="18"
                    height="18"
                  />
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <b class="truncate text-[15px] font-bold text-ink">{{ item.name }}</b>
                    <em
                      v-if="item.tag"
                      class="flex-none rounded bg-chip px-1.5 py-0.5 text-[10px] text-sub not-italic"
                    >
                      {{ item.tag }}
                    </em>
                    <span v-if="item.exhausted" class="exhausted">한도 소진</span>
                    <b class="ml-auto flex-none text-[15px] font-extrabold text-received">
                      {{ item.received }}
                    </b>
                  </div>
                  <div class="mt-1 flex items-baseline gap-2 text-[12px] text-sub">
                    <span class="truncate">{{ item.value }}</span>
                    <span class="ml-auto flex-none">
                      {{ item.transactionCount }}건 · {{ won(item.totalPaymentAmount) }} 결제
                    </span>
                  </div>
                  <div
                    v-if="item.remainingLabel"
                    class="mt-2 flex items-baseline justify-between border-t border-line pt-2 text-[12px] text-sub"
                  >
                    <span>남은 한도</span>
                    <span>
                      <em
                        class="font-bold not-italic"
                        :class="item.exhausted ? 'text-muted' : 'text-primary-dark'"
                      >
                        {{ item.remainingLabel }}
                      </em>
                      / {{ item.totalLimitLabel }}
                    </span>
                  </div>
                </div>
              </div>
            </template>

            <!-- 월 한도가 걸린 혜택이 하나도 없는 카드. 세 배열이 함께 빈다. -->
            <div v-else class="py-6 text-center text-xs text-sub">
              이 카드에 등록된 혜택 정보가 없어요
            </div>

            <button class="primary-button" @click="openReport(benefitCard.id)">
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

  <Transition name="toast">
    <div v-if="toast" class="toast">{{ toast }}</div>
  </Transition>
</template>
