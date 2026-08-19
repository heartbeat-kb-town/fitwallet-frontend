<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as storeApi from '@/api/storeApi'
import { useAsyncState } from '@/composables/useAsyncState'
import { useToast } from '@/composables/useToast'
import { usePaymentStore } from '@/stores/paymentStore'

const router = useRouter()
const paymentStore = usePaymentStore()
const { showToast } = useToast()

const searchInput = ref(null)
const query = ref('')

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
  // 최근 검색어에 넣지 않는다. 가맹점 화면이 이 키워드로 조회하면 백엔드가 기록한다.
  router.push({
    name: 'merchants',
    query: { query: value, title: value, from: 'search' },
  })
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
        <span>검색</span>
      </button>
      <button type="button" @click="openPayment()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
        </svg>
        <span>홈</span>
      </button>
      <button type="button" @click="goToMyCard()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M19 9h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-5a3 3 0 0 1 0-6z" />
        </svg>
        <span>카드 내역</span>
      </button>
      <button type="button" @click="openReport()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 17 6-6 4 4 8-9" />
          <path d="M15 6h6v6" />
        </svg>
        <span>혜택</span>
      </button>
    </nav>
  </div>
</template>
