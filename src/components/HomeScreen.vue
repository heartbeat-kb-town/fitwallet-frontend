<script setup>
import { computed, ref } from 'vue'
import { Menu, TrendingUp, ChevronDown, ChevronRight, X } from 'lucide-vue-next'
import iconSearch from '../assets/icons/search.svg'
import iconHome from '../assets/icons/click-home.svg'
import iconPayment from '../assets/icons/payment.svg'
import iconMycard from '../assets/icons/mycard.svg'
import iconLocation from '../assets/icons/location.svg'
import { categories, favoritePlaces, cards, benefitProfiles, benefitIcons, events } from '../data'

const emit = defineEmits(['search'])

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
const benefitCard = ref(null)
const eventCard = ref(null)
const brandsOpen = ref(false)
const activeTab = ref(0)
const toast = ref('')
let toastTimer

const profile = computed(() => (benefitCard.value ? benefitProfiles[benefitCard.value.id] : null))
const receivedDiscount = computed(
  () => profile.value?.categories.reduce((sum, item) => sum + item.usedAmount, 0) ?? 0,
)
const progress = computed(() =>
  profile.value
    ? Math.min(100, Math.round((receivedDiscount.value / profile.value.totalLimit) * 100))
    : 0,
)

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
  consentCategory.value = category
}

function confirmLocation() {
  const name = consentCategory.value?.name ?? '선택한 카테고리'
  consentCategory.value = null
  notify(`${name} 주변 매장 화면으로 연결할 수 있어요.`)
}

function openBenefit(card) {
  benefitCard.value = card
  brandsOpen.value = false
}

function categoryIcon(name) {
  return Object.entries(benefitIcons).find(([key]) => name.includes(key))?.[1] ?? iconPayment
}

function selectTab(index, label) {
  activeTab.value = index
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
    <button
      class="icon-button"
      aria-label="메뉴 열기"
      @click="notify('메뉴 화면은 홈 변환본에서 제외했어요.')"
    >
      <Menu :size="23" />
    </button>
  </header>

  <div class="scroll-content">
    <div class="search-wrap">
      <button class="search-bar" @click="emit('search')">
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

    <section class="home-section">
      <h2>자주 찾는 장소</h2>
      <div v-drag-scroll class="horizontal-scroll">
        <button
          v-for="place in favoritePlaces"
          :key="place.id"
          class="place-card"
          @click="notify(`${place.name} 카드 혜택 PICK 화면은 상세 화면 연결 시 열려요.`)"
        >
          <div class="place-image">
            <img :src="place.img" :alt="place.name" />
            <span v-if="place.isNew" class="new-badge">NEW</span>
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
          <div class="card-visual" :style="{ background: card.gradient, color: card.text }">
            <span class="card-glow one"></span>
            <span class="card-glow two"></span>
            <div class="card-top">
              <div>
                <strong>{{ card.name }}</strong>
                <small :style="{ color: card.sub }">{{ card.label }}</small>
              </div>
              <span class="issuer-mark" :class="card.id">{{ card.mark }}</span>
            </div>
            <span class="chip"></span>
            <p :style="{ color: card.sub }">**** **** **** {{ card.last4 }}</p>
          </div>
          <div class="card-actions">
            <button @click="openBenefit(card)">혜택 현황</button>
            <span></span>
            <button @click="eventCard = card">이벤트</button>
          </div>
        </article>
      </div>
    </section>
  </div>

  <nav class="bottom-nav">
    <button
      v-for="(item, index) in [
        { label: '홈', icon: iconHome },
        { label: '결제', icon: iconPayment },
        { label: '내 카드', icon: iconMycard },
        { label: '리포트', icon: null },
      ]"
      :key="item.label"
      :class="{ active: activeTab === index }"
      @click="selectTab(index, item.label)"
    >
      <img v-if="item.icon" :src="item.icon" :alt="item.label" width="22" height="22" />
      <TrendingUp v-else :size="22" :stroke-width="activeTab === index ? 2.3 : 1.8" />
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
        <button class="primary-button" @click="confirmLocation">위치 정보 동의하고 보기</button>
        <button class="text-button" @click="consentCategory = null">다음에 할게요</button>
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
            <span>이번 달 잠재 혜택</span>
            <strong
              ><em>{{ won(receivedDiscount) }}</em> / {{ won(profile.totalLimit) }}</strong
            >
          </div>
          <div class="progress"><span :style="{ width: `${progress}%` }"></span></div>
          <p class="tier">{{ profile.tier }}</p>
        </div>
        <div class="sheet-scroll">
          <p class="limit-caption">월별 <b>남은</b> 혜택 한도</p>
          <h3>카테고리별 혜택</h3>
          <div class="benefit-list">
            <div v-for="item in profile.categories" :key="item.name" class="benefit-row">
              <span class="mini-icon"
                ><img :src="categoryIcon(item.name)" alt="" width="16" height="16"
              /></span>
              <div class="benefit-body">
                <div class="row-title">
                  <strong>{{ item.name }}</strong>
                  <span v-if="item.exhausted" class="exhausted">한도 소진</span>
                  <small>{{ item.perTxMax }}</small>
                </div>
                <div class="row-discount">
                  <span>{{ item.discount }}</span>
                  <strong
                    ><em :class="{ muted: item.exhausted }">{{
                      won(Math.max(0, item.monthlyLimit - item.usedAmount))
                    }}</em>
                    / {{ won(item.monthlyLimit) }}</strong
                  >
                </div>
                <div class="row-total">
                  <span>총 {{ item.txCount }}건 · {{ won(item.txTotal) }} 결제</span>
                  <strong>총 {{ won(item.usedAmount) }} 할인</strong>
                </div>
              </div>
            </div>
          </div>

          <button class="brand-toggle" @click="brandsOpen = !brandsOpen">
            <strong>브랜드별 혜택</strong>
            <ChevronDown :size="18" :class="{ rotated: brandsOpen }" />
          </button>
          <Transition name="expand">
            <div v-if="brandsOpen" class="benefit-list brand-list">
              <template v-if="profile.brands.length">
                <div v-for="item in profile.brands" :key="item.name" class="benefit-row">
                  <span
                    class="brand-avatar"
                    :style="{
                      color: item.logoColor,
                      borderColor: `${item.logoColor}55`,
                      background: `${item.logoColor}16`,
                    }"
                    >{{ item.logoInitial }}</span
                  >
                  <div class="benefit-body">
                    <div class="row-title">
                      <strong>{{ item.name }}</strong>
                      <span v-if="item.exhausted" class="exhausted">한도 소진</span>
                      <small>{{ item.perTxMax }}</small>
                    </div>
                    <div class="row-discount">
                      <span>{{ item.discount }}</span>
                      <strong
                        ><em :class="{ muted: item.exhausted }">{{
                          won(Math.max(0, item.monthlyLimit - item.usedAmount))
                        }}</em>
                        / {{ won(item.monthlyLimit) }}</strong
                      >
                    </div>
                    <div class="row-total">
                      <span>총 {{ item.txCount }}건 · {{ won(item.txTotal) }} 결제</span>
                      <strong>총 {{ won(item.usedAmount) }} 할인</strong>
                    </div>
                  </div>
                </div>
              </template>
              <div v-else class="empty-brand">
                <strong>0</strong><span>등록된 브랜드 혜택이 없어요</span>
              </div>
            </div>
          </Transition>

          <div class="grand-total">
            <span>총 {{ profile.totalCount }}건 · {{ won(profile.totalSpend) }} 결제</span>
            <strong>총 {{ won(receivedDiscount) }} 할인</strong>
          </div>
          <button class="primary-button" @click="notify('받은 혜택 리포트 화면과 연결하면 돼요.')">
            받은 혜택 리포트 보기
          </button>
        </div>
      </section>
    </div>
  </Transition>

  <Transition name="fade">
    <div v-if="eventCard" class="sheet-layer fixed-layer">
      <button class="scrim" aria-label="이벤트 닫기" @click="eventCard = null"></button>
      <section class="sheet event-sheet">
        <span class="handle"></span>
        <button class="sheet-close" aria-label="닫기" @click="eventCard = null">
          <X :size="18" />
        </button>
        <div class="event-head">
          <h2>진행 중인 이벤트</h2>
          <p>{{ eventCard.issuer }}의 {{ eventCard.name }} 이벤트예요</p>
        </div>
        <div class="event-list">
          <article v-for="item in events[eventCard.id]" :key="item.id">
            <div>
              <span class="event-category">{{ item.category }}</span>
              <h3>{{ item.title }}</h3>
              <p>{{ item.condition }}</p>
              <small>{{ item.period }}</small>
            </div>
            <a :href="item.url" target="_blank" rel="noopener noreferrer">
              <strong>{{ item.benefit }}</strong
              ><ChevronRight :size="19" />
            </a>
          </article>
        </div>
      </section>
    </div>
  </Transition>

  <Transition name="toast">
    <div v-if="toast" class="toast">{{ toast }}</div>
  </Transition>
</template>
