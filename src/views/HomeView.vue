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
import { Menu, X } from 'lucide-vue-next'
import iconSearch from '@/assets/icons/search.svg'
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
import * as cardApi from '@/api/cardApi'
import * as userApi from '@/api/userApi'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
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
    }
  }),
)

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
const activeTab = ref(0)
const toast = ref('')
let toastTimer

/**
 * 혜택 현황 시트의 내용. 카드별 이용 실적에서 온다 (#101).
 *
 * **예전 시트는 목데이터라서 보여줄 수 있던 것이 더 많았다.** 카테고리별 한도·사용액·건수와
 * 브랜드별 혜택이 있었는데 `/card/{id}/usage` 는 그것들을 주지 않는다.
 * 지어내지 않고, 실제로 오는 것(실적 금액·구간·구간별 혜택)만 보여준다.
 *
 * 카테고리별 사용액이 오게 되면 그때 예전 모양으로 되돌린다 (#101 의 A안).
 */
const {
  data: usage,
  isLoading: isUsageLoading,
  execute: fetchUsage,
} = useAsyncState(cardApi.getCardUsage)

/** 이번 달 실적 인정 금액. 실적 미달이어도 0 이 아니라 쌓인 만큼 온다. */
const recognizedAmount = computed(() => Number(usage.value?.usageSummary?.recognizedAmount) || 0)

/** 다음 구간 기준액. 최고 구간이거나 실적 조건이 없으면 null 이라 화면에서 분기한다. */
const nextTierAmount = computed(() => {
  const amount = usage.value?.nextTier?.minimumAmount
  return amount == null ? null : Number(amount)
})

/** 실적 진행률. 백엔드가 계산해서 준다 — 화면에서 다시 구하지 않는다. */
const progress = computed(() =>
  Math.min(100, Math.round(Number(usage.value?.tierProgressRate) || 0)),
)

/** 헤더에 한 줄로 뜨는 실적 상태. */
const tierLabel = computed(() => {
  if (!usage.value) return ''

  const current = usage.value.currentTier?.tierName
  const until = usage.value.amountUntilNextTier
  if (until != null && usage.value.nextTier) {
    return `${current ?? '실적 구간'} 적용 중 · 다음 구간까지 ${won(Number(until))}`
  }
  return current ? `${current} 적용 중 (최고 구간)` : '실적 조건이 없는 카드예요'
})

/**
 * 구간별 혜택을 한 줄로 편다.
 *
 * 실적 조건이 없는 카드는 `tiers` 가 비고 혜택이 `defaultBenefits` 로 온다 (cardApi 주석).
 * 두 경우를 한 목록으로 합쳐 화면이 분기하지 않게 한다.
 */
const tierBenefits = computed(() => {
  if (!usage.value) return []

  const fromTiers = (usage.value.tiers ?? []).flatMap((tier) =>
    (tier.benefits ?? []).map((benefit) => ({
      key: `${tier.tierOrder}-${benefit.benefitId}`,
      name: benefit.benefitName,
      value: benefit.valueLabel,
      // 적립과 할인은 사용자에게 다른 혜택이다. 뭉뚱그리지 않는다.
      kind: benefit.benefitType === 'ACCUMULATE' ? '적립' : '할인',
      tierName: tier.tierName,
      reached: tier.achieved || tier.current,
    })),
  )

  const fromDefault = (usage.value.defaultBenefits ?? []).map((benefit) => ({
    key: `default-${benefit.benefitId}`,
    name: benefit.benefitName,
    value: benefit.valueLabel,
    kind: benefit.benefitType === 'ACCUMULATE' ? '적립' : '할인',
    tierName: '기본 혜택',
    reached: true,
  }))

  return [...fromTiers, ...fromDefault]
})

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

async function openBenefit(card) {
  benefitCard.value = card
  try {
    // yearMonth 를 생략하면 현재 월이다 (cardApi 주석).
    await fetchUsage(card.id)
  } catch (error) {
    showToast(error.status >= 500 || !error.code ? '일시적인 오류가 발생했어요' : error.message)
    benefitCard.value = null
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
    <div class="profile">
      <img src="/pickpig-face.png" alt="" class="pig-face" />
      <div>
        <p>안녕하세요</p>
        <strong>김지연님</strong>
      </div>
    </div>
    <button class="icon-button" aria-label="마이페이지 열기" @click="openMyPage()">
      <Menu :size="23" />
    </button>
  </header>

  <div class="scroll-content">
    <div class="search-wrap">
      <button class="search-bar" @click="openSearch()">
        <img :src="iconSearch" alt="" width="19" height="19" />
        <span>어떤 혜택을 찾으시나요?</span>
      </button>
    </div>

    <div class="category-grid">
      <button
        v-for="category in categories"
        :key="category.id"
        class="category-card"
        :class="{ active: selectedCategory === category.id }"
        @click="chooseCategory(category)"
      >
        <span class="category-icon">
          <img :src="category.icon" :alt="category.name" width="26" height="26" />
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
            백엔드가 가게 사진을 주지 않아 카테고리 아이콘을 그린다.
            목 사진을 그대로 두면 `HD현대오일뱅크직영 효진주유소` 에 블루보틀 사진이 붙는다.

            `.place-image` 를 쓰지 않고 Tailwind 로 새로 짠다. style.css 4700줄은 레이어 밖에
            있어서 `.place-image img { object-fit: cover }` 가 유틸리티를 이긴다 —
            클래스를 그대로 두면 아이콘이 칸에 맞춰 늘어난다.
          -->
          <div class="flex h-[130px] items-center justify-center bg-icon-bg">
            <img v-if="place.icon" :src="place.icon" alt="" class="size-12 object-contain" />
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
            <!-- TODO(#101): 백엔드에 이벤트 도메인이 생기면 여기에 시트를 붙인다.
                 자리를 남겨두려고 버튼만 두었다. 목데이터로 채우지 않는다. -->
            <button @click="notify('카드 이벤트는 준비 중이에요')">이벤트</button>
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
          <div class="progress-title">
            <span>이번 달 실적</span>
            <strong>
              <em>{{ won(recognizedAmount) }}</em>
              <template v-if="nextTierAmount"> / {{ won(nextTierAmount) }}</template>
            </strong>
          </div>
          <div class="progress"><span :style="{ width: `${progress}%` }"></span></div>
          <p class="tier">{{ tierLabel }}</p>
        </div>
        <div class="sheet-scroll">
          <div v-if="isUsageLoading" class="flex justify-center py-16 text-sub">
            <BaseSpinner size="lg" label="이용 실적을 불러오는 중" />
          </div>

          <template v-else>
            <p class="limit-caption">실적 구간에 따라 <b>적용되는</b> 혜택</p>
            <h3>구간별 혜택</h3>
            <div v-if="tierBenefits.length" class="benefit-list">
              <div v-for="item in tierBenefits" :key="item.key" class="benefit-row">
                <span class="mini-icon"
                  ><img :src="categoryIcon(item.name)" alt="" width="16" height="16"
                /></span>
                <div class="benefit-body">
                  <div class="row-title">
                    <strong>{{ item.name }}</strong>
                    <span v-if="!item.reached" class="exhausted">미달성</span>
                    <small>{{ item.tierName }}</small>
                  </div>
                  <div class="row-discount">
                    <span>{{ item.kind }}</span>
                    <strong
                      ><em :class="{ muted: !item.reached }">{{ item.value }}</em></strong
                    >
                  </div>
                </div>
              </div>
            </div>
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

  <Transition name="toast">
    <div v-if="toast" class="toast">{{ toast }}</div>
  </Transition>
</template>
