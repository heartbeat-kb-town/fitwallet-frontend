<script setup>
import { nextTick, onMounted, ref } from 'vue'

const emit = defineEmits(['back', 'search'])

const searchInput = ref(null)
const query = ref('')
const recents = ref(['스타벅스', 'CU', '올리브영'])
const popularSearches = ['파이브가이즈', '블루보틀', '다이소', 'GS25', '파리바게뜨']

onMounted(() => {
  window.setTimeout(() => searchInput.value?.focus(), 120)
})

function removeRecent(word) {
  recents.value = recents.value.filter((item) => item !== word)
}

function clearAll() {
  recents.value = []
}

async function selectWord(word) {
  query.value = word
  await nextTick()
  submitSearch()
}

function submitSearch() {
  const value = query.value.trim()
  if (!value) {
    searchInput.value?.focus()
    return
  }
  if (!recents.value.includes(value)) {
    recents.value = [value, ...recents.value].slice(0, 5)
  }
  emit('search', { query: value, title: value })
}
</script>

<template>
  <div class="search-screen">
    <header class="search-header">
      <button class="back-button" type="button" aria-label="뒤로가기" @click="emit('back')">
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
          <div v-for="word in recents" :key="word" class="recent-chip">
            <button class="recent-word" type="button" @click="selectWord(word)">
              {{ word }}
            </button>
            <button
              class="remove-recent"
              type="button"
              :aria-label="`${word} 삭제`"
              @click="removeRecent(word)"
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="m3 3 6 6m0-6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <section class="search-section">
        <h2>인기 검색어</h2>
        <div class="popular-list">
          <button
            v-for="(word, index) in popularSearches"
            :key="word"
            type="button"
            @click="selectWord(word)"
          >
            <strong>{{ index + 1 }}</strong>
            <span>{{ word }}</span>
          </button>
        </div>
      </section>
    </div>

    <nav class="search-bottom-nav" aria-label="하단 메뉴">
      <button class="active" type="button" @click="emit('back')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
        </svg>
        <span>홈</span>
      </button>
      <button type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
        </svg>
        <span>결제</span>
      </button>
      <button type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M19 9h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-5a3 3 0 0 1 0-6z" />
        </svg>
        <span>내 카드</span>
      </button>
      <button type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 17 6-6 4 4 8-9" />
          <path d="M15 6h6v6" />
        </svg>
        <span>리포트</span>
      </button>
    </nav>
  </div>
</template>
