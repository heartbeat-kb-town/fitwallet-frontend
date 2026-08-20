<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as storeApi from '@/api/storeApi'
import BaseLocationConsentSheet from '@/components/common/BaseLocationConsentSheet.vue'
import { useAsyncState } from '@/composables/useAsyncState'
import { useToast } from '@/composables/useToast'
import { usePaymentStore } from '@/stores/paymentStore'
import { useLocationStore } from '@/stores/locationStore'

const router = useRouter()
const paymentStore = usePaymentStore()
const locationStore = useLocationStore()
const { showToast } = useToast()

const searchInput = ref(null)
const query = ref('')

/** 동의를 기다리는 검색어. null 이면 시트가 닫혀 있다. */
const consentKeyword = ref(null)

/**
 * 최근·인기 검색어는 서버에 있다.
 *
 * 최근 검색어를 화면이 만들지 않는다 — 키워드로 가맹점을 조회하면 백엔드가 기록한다.
 * 화면이 따로 목록을 들고 있으면 서버와 어긋난다.
 */
const { data: keywords, execute: fetchKeywords } = useAsyncState(storeApi.getStoreKeywords)

const recents = computed(() => keywords.value?.recent ?? [])
const popularSearches = computed(() => keywords.value?.popular?.keywords ?? [])

onMounted(() => {
  window.setTimeout(() => searchInput.value?.focus(), 120)
  // 실패는 조용히 둔다. 검색어 목록이 비어도 검색 자체는 할 수 있다.
  fetchKeywords().catch(() => {})
})

async function removeRecent(recent) {
  try {
    await storeApi.deleteRecentKeyword(recent.searchHistoryId)
  } catch (error) {
    // 이미 지워진 기록이면 목록만 다시 받으면 된다. 사용자가 할 일은 없다.
    if (error.code !== 'SEARCH_HISTORY_NOT_FOUND') {
      showToast('일시적인 오류가 발생했어요')
      return
    }
  }
  await fetchKeywords().catch(() => {})
}

async function clearAll() {
  try {
    await storeApi.deleteRecentKeywords()
  } catch {
    showToast('일시적인 오류가 발생했어요')
    return
  }
  await fetchKeywords().catch(() => {})
}

async function selectWord(word) {
  query.value = word
  await nextTick()
  submitSearch()
}

// 뒤로가기와 하단 탭 `검색` 칸이 함께 쓴다. 둘 다 홈 화면(검색창·카테고리)으로 간다.
function goHome() {
  router.push({ name: 'home' })
}

// 하단 탭 `홈` 칸. 결제 화면을 연다. 들어가면 카드 선택부터 시작한다 (#66).
function openPayment() {
  paymentStore.reset()
  router.push({ name: 'payment' })
}

function goToMyCard() {
  router.push({ name: 'my-card' })
}

function openReport() {
  router.push({ name: 'report' })
}

// 검색 조건은 store 가 아니라 URL 에 싣는다. 이 조건은 가맹점 화면 하나가 읽고,
// 무엇을 보여줄지를 서술하는 값이라 라우트에 있는 게 맞다 (#39 기준표 두 번째 줄).
// 가맹점 화면이 이관되면 `/merchants?query=…&title=…` 형태가 된다.
// `from` 은 가맹점의 뒤로가기가 검색으로 돌아오기 위한 진입 경로다 (#52 패턴).
function submitSearch() {
  const value = query.value.trim()
  if (!value) {
    searchInput.value?.focus()
    return
  }

  // 키워드 검색도 백엔드가 같은 `searchStores` 로 처리하고 위치 동의를 요구한다.
  // 동의 없이 넘어가면 가맹점 화면이 403 을 받는다 (#220).
  if (!locationStore.isAgreed) {
    consentKeyword.value = value
    return
  }

  openMerchants(value)
}

// 최근 검색어에 넣지 않는다. 가맹점 화면이 이 키워드로 조회하면 백엔드가 기록한다.
function openMerchants(keyword) {
  router.push({
    name: 'merchants',
    query: { query: keyword, title: keyword, from: 'search' },
  })
}

function onConsentAgreed() {
  const keyword = consentKeyword.value
  consentKeyword.value = null
  if (keyword) openMerchants(keyword)
}
</script>

<template>
  <div class="search-screen">
    <header class="search-header">
      <button class="back-button" type="button" aria-label="뒤로가기" @click="goHome()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <form class="search-field" @submit.prevent="submitSearch">
        <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16.5 16.5 4.5 4.5" />
        </svg>
        <input
          ref="searchInput"
          v-model="query"
          type="search"
          placeholder="검색어를 입력하세요"
          autocomplete="off"
          aria-label="검색어"
        />
        <button
          v-if="query"
          class="clear-query"
          type="button"
          aria-label="검색어 지우기"
          @click.prevent="query = ''"
        >
          <svg viewBox="0 0 14 14" aria-hidden="true">
            <circle cx="7" cy="7" r="7" />
            <path d="m5 5 4 4m0-4-4 4" />
          </svg>
        </button>
      </form>
    </header>

    <div class="search-content">
      <section v-if="recents.length" class="search-section">
        <div class="section-heading">
          <h2>최근 검색어</h2>
          <button type="button" @click="clearAll">전체 삭제</button>
        </div>

        <div class="recent-list">
          <div v-for="recent in recents" :key="recent.searchHistoryId" class="recent-chip">
            <button class="recent-word" type="button" @click="selectWord(recent.keyword)">
              {{ recent.keyword }}
            </button>
            <button
              class="remove-recent"
              type="button"
              :aria-label="`${recent.keyword} 삭제`"
              @click="removeRecent(recent)"
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="m3 3 6 6m0-6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <section v-if="popularSearches.length" class="search-section">
        <h2>인기 검색어</h2>
        <div class="popular-list">
          <button
            v-for="popular in popularSearches"
            :key="popular.keyword"
            type="button"
            @click="selectWord(popular.keyword)"
          >
            <strong>{{ popular.rank }}</strong>
            <span>{{ popular.keyword }}</span>
          </button>
        </div>
      </section>
    </div>

    <nav class="search-bottom-nav" aria-label="하단 메뉴">
      <!--
        라벨과 아이콘만 바뀌었다 (#198). 첫 칸 `검색` 은 홈 화면(검색창·카테고리)을,
        둘째 칸 `홈` 은 결제 화면을 가리킨다.

        **켜지는 칸이 없다.** 이 화면은 홈의 검색창으로 들어오는 곳이라 어느 탭의 목적지도
        아니다. 예전에는 `홈` 이 켜져 있었는데 여기는 홈이 아니다.

        이 하단 탭만 `<img>` 가 아니라 인라인 SVG 를 쓰고 `stroke: currentColor` 라,
        색을 켜야 할 때 `.active` 하나로 글자와 아이콘이 함께 물든다.
      -->
      <button type="button" @click="goHome()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16.5 16.5 4 4" />
        </svg>
        <span>매장 검색</span>
      </button>
      <!-- `home.svg` 와 같은 모양을 옮겨 적는다. 이 화면만 인라인이라 파일 교체가 닿지 않는다. -->
      <button type="button" @click="openPayment()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M19.125 4.5H4.875C3.42525 4.5 2.25 5.67525 2.25 7.125V16.875C2.25 18.3247 3.42525 19.5 4.875 19.5H19.125C20.5747 19.5 21.75 18.3247 21.75 16.875V7.125C21.75 5.67525 20.5747 4.5 19.125 4.5Z"
          />
          <path d="M2.25 9H21.75M6 14.0625H8.25V15H6V14.0625Z" />
        </svg>
        <span>결제</span>
      </button>
      <button type="button" @click="goToMyCard()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M19 9h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-5a3 3 0 0 1 0-6z" />
        </svg>
        <span>카드 내역</span>
      </button>
      <!--
        이 화면만 하단 탭을 인라인 SVG 로 그린다. `report.svg` 와 같은 모양을 여기에도
        옮겨 적는다 — 안 하면 이 화면의 `혜택` 만 옛 아이콘으로 남는다 (#222).
        색과 굵기는 `.search-bottom-nav svg` 가 `currentColor` 로 정하므로 적지 않는다.
        다만 % 점 두 개는 굵기가 달라야 보이므로 그 패스에만 굵기를 적는다.
      -->
      <button type="button" @click="openReport()">
        <svg viewBox="0 0 23 23" aria-hidden="true">
          <path
            d="M9.64182 1.65663C9.86064 1.41224 10.1285 1.21675 10.428 1.0829C10.7275 0.949062 11.0519 0.879883 11.3799 0.879883C11.7079 0.879883 12.0323 0.949062 12.3317 1.0829C12.6312 1.21675 12.8991 1.41224 13.1179 1.65663L13.9345 2.56885C14.1678 2.82956 14.4569 3.03444 14.7801 3.16832C15.1034 3.30219 15.4527 3.36164 15.802 3.34225L17.0268 3.27459C17.3544 3.25653 17.6821 3.30778 17.9886 3.42498C18.295 3.54219 18.5733 3.72272 18.8053 3.95478C19.0372 4.18684 19.2176 4.46522 19.3347 4.77173C19.4517 5.07825 19.5028 5.40601 19.4846 5.73361L19.4169 6.95729C19.3977 7.30647 19.4573 7.65549 19.5911 7.97856C19.725 8.30163 19.9298 8.59047 20.1903 8.82372L21.1025 9.64028C21.3471 9.85911 21.5427 10.1271 21.6767 10.4267C21.8106 10.7263 21.8799 11.0508 21.8799 11.379C21.8799 11.7072 21.8106 12.0317 21.6767 12.3313C21.5427 12.6309 21.3471 12.8988 21.1025 13.1177L20.1903 13.9342C19.9296 14.1676 19.7247 14.4566 19.5909 14.7799C19.457 15.1032 19.3975 15.4525 19.4169 15.8018L19.4846 17.0267C19.5027 17.3543 19.4514 17.682 19.3342 17.9885C19.217 18.2949 19.0365 18.5732 18.8044 18.8052C18.5724 19.0371 18.294 19.2175 17.9875 19.3346C17.681 19.4516 17.3532 19.5027 17.0257 19.4845L15.802 19.4169C15.4528 19.3977 15.1038 19.4572 14.7808 19.5911C14.4577 19.7249 14.1689 19.9297 13.9356 20.1903L13.1191 21.1025C12.9003 21.3471 12.6323 21.5427 12.3327 21.6767C12.0331 21.8106 11.7086 21.8799 11.3805 21.8799C11.0523 21.8799 10.7278 21.8106 10.4282 21.6767C10.1286 21.5427 9.86065 21.3471 9.64182 21.1025L8.82529 20.1903C8.59192 19.9296 8.3029 19.7247 7.97963 19.5908C7.65635 19.4569 7.30711 19.3975 6.95775 19.4169L5.73295 19.4845C5.40535 19.5026 5.07762 19.4513 4.77117 19.3341C4.46472 19.2169 4.18643 19.0364 3.95449 18.8043C3.72254 18.5723 3.54215 18.2939 3.4251 17.9874C3.30804 17.6809 3.25696 17.3531 3.27517 17.0255L3.34283 15.8018C3.36204 15.4526 3.30251 15.1036 3.16864 14.7806C3.03477 14.4575 2.82999 14.1686 2.56945 13.9354L1.65726 13.1188C1.41269 12.9 1.21703 12.632 1.08308 12.3324C0.949122 12.0328 0.879883 11.7083 0.879883 11.3801C0.879883 11.052 0.949122 10.7275 1.08308 10.4279C1.21703 10.1282 1.41269 9.86028 1.65726 9.64145L2.56945 8.82488C2.83015 8.59151 3.03503 8.30248 3.1689 7.9792C3.30277 7.65591 3.36221 7.30666 3.34283 6.95729L3.27517 5.73245C3.25728 5.40493 3.30865 5.07732 3.42593 4.771C3.54321 4.46468 3.72375 4.18654 3.95579 3.95471C4.18783 3.72289 4.46614 3.5426 4.77256 3.42561C5.07898 3.30862 5.40662 3.25756 5.73411 3.27576L6.95775 3.34342C7.30692 3.36263 7.65593 3.3031 7.97899 3.16923C8.30205 3.03536 8.59088 2.83057 8.82412 2.57002L9.64182 1.65663Z"
          />
          <path
            d="M9.271 7.72803H9.28377V7.7408H9.271V7.72803ZM15.6589 14.1161H15.6716V14.1289H15.6589V14.1161Z"
            stroke-width="3"
          />
          <path d="M16.2978 7.08936L8.63232 14.755" />
        </svg>
        <span>혜택</span>
      </button>
    </nav>

    <Transition name="fade">
      <BaseLocationConsentSheet
        v-if="consentKeyword"
        :subject="consentKeyword"
        @agreed="onConsentAgreed"
        @close="consentKeyword = null"
      />
    </Transition>
  </div>
</template>
