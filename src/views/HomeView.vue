<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Menu } from 'lucide-vue-next'
// 헤더 로고. 로그인 화면(`LoginView`)과 같은 파일을 쓴다 — 그림을 두 벌로 두지 않는다.
import titleImage from '@/assets/title.png'
import iconSearch from '@/assets/icons/search.svg'
import iconPigPeek from '@/assets/icons/pig-peek.svg'
import iconSpeechBubble from '@/assets/icons/speech-bubble.svg'
import iconHomeActive from '@/assets/icons/click-home.svg'
import iconHome from '@/assets/icons/home.svg'
// 하단 탭 첫 칸의 검색 아이콘. 검색창이 쓰는 `search.svg` 와 그림은 같고 색만 다르다 —
// 비활성은 다른 탭과 같은 회색(#9B948D), 활성은 노랑(#FFCC00)이다.
import iconSearchTab from '@/assets/icons/search-tab.svg'
import iconSearchTabActive from '@/assets/icons/search-tab-selected.svg'
import iconMycard from '@/assets/icons/mycard.svg'
import iconMycardActive from '@/assets/icons/mycard-selected.svg'
import iconReport from '@/assets/icons/report.svg'
import iconReportActive from '@/assets/icons/report-selected.svg'
import { categories } from '@/data'
import { CATEGORY_PHOTOS } from '@/constants/categoryPhotos'
import BaseLocationConsentSheet from '@/components/common/BaseLocationConsentSheet.vue'
import * as userApi from '@/api/userApi'
import { vDragScroll } from '@/directives/dragScroll'
import { useAsyncState } from '@/composables/useAsyncState'
import { usePaymentStore } from '@/stores/paymentStore'
import { useLocationStore } from '@/stores/locationStore'

const router = useRouter()
const paymentStore = usePaymentStore()
const locationStore = useLocationStore()

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
  // 실패해도 홈의 나머지는 그대로 그린다. 이 섹션만 비워 두면 된다.
  fetchFrequentPlaces().catch(() => {})
})

// 홈 화면 위쪽 검색창. 최근·인기 검색어 화면으로 들어간다.
// **하단 탭의 `검색` 칸과 다른 곳이다** — 그 칸은 이 화면 자체를 가리킨다 (#198).
function openSearch() {
  router.push({ name: 'search' })
}

// 하단 탭 `홈` 칸. 결제 화면을 연다. 들어가면 카드 선택부터 시작한다 (#66).
function openPayment() {
  paymentStore.reset()
  router.push({ name: 'payment' })
}

// 돌아올 주소를 통째로 넘긴다 (#61).
function openMyPage() {
  router.push({ name: 'my-page', query: { returnTo: '/home' } })
}

function openMerchants({ categoryId, title, query = '' }) {
  router.push({ name: 'merchants', query: { categoryId, title, query } })
}

/**
 * 자주 찾는 장소를 고르면 **금액 입력 화면으로 간다** (#194).
 *
 * 예전에는 가맹점 목록으로 보냈는데, 이 카드는 어느 가게인지 이미 정해 놓고 누르는 자리다.
 * 목록으로 보내면 방금 고른 가게를 목록에서 한 번 더 찾아야 했다. 가맹점 화면에서 가게를
 * 고른 뒤의 흐름(`MerchantFlowView.selectStore`, #144)과 같은 자리로 바로 붙인다.
 *
 * ⚠️ **`returnTo` 는 뒤로 가기 주소만이 아니다.** `PickAmountView.goToPick` 이 금액을 넣은 뒤
 * **PICK 을 그릴 주소**로도 쓴다 — 그 주소에 `store` · `storeId` · `amount` 를 실어 보내고
 * `MerchantFlowView` 가 그 쿼리로 PICK 을 복원한다. 그래서 홈 주소를 넣으면 안 된다.
 * 금액을 입력해도 홈으로 돌아오고 PICK 이 뜨지 않는다.
 *
 * 그래서 `returnTo` 에는 가맹점 목록 주소를 넣고, **뒤로 갈 곳은 `backTo` 로 따로 넘긴다.**
 * 홈에서 들어왔으니 뒤로 가면 홈이어야 한다.
 */
function openPlaceAmount(place) {
  const returnTo = router.resolve({
    name: 'merchants',
    query: { categoryId: place.categoryId, title: place.name, query: place.name },
  }).fullPath

  router.push({
    name: 'pick-amount',
    // `place.id` 는 응답의 `storeId` 다 (`places` computed 참고). 쿼리는 문자열로 넘긴다.
    query: { storeId: String(place.id), store: place.name, returnTo, backTo: '/home' },
  })
}

function goToMyCard() {
  router.push({ name: 'my-card' })
}

function openReport(cardId = '') {
  router.push({ name: 'report', query: cardId ? { cardId } : {} })
}

/**
 * 하단 내비게이션 탭: icon(비활성/회색), iconActive(활성/노랑).
 *
 * **라벨과 아이콘만 바뀌었고 가는 곳은 예전 그대로다** (#198).
 * 첫 칸 `검색` 은 예전 `홈` 칸이라 이 화면(`/home`, 검색창·카테고리)을 가리키고,
 * 둘째 칸 `홈` 은 예전 `결제` 칸이라 결제 화면(`/payment`)을 가리킨다.
 * 둘째 칸의 아이콘은 예전 홈 칸이 쓰던 것을 그대로 가져왔다.
 */
const navItems = [
  { label: '검색', icon: iconSearchTab, iconActive: iconSearchTabActive },
  { label: '홈', icon: iconHome, iconActive: iconHomeActive },
  { label: '카드 내역', icon: iconMycard, iconActive: iconMycardActive },
  { label: '혜택', icon: iconReport, iconActive: iconReportActive },
]

/** 이 화면은 검색 칸이 가리키는 곳이므로 첫 칸이 켜져 있다. */
const SEARCH_TAB_INDEX = 0

const selectedCategory = ref(null)
const consentCategory = ref(null)
const activeTab = ref(SEARCH_TAB_INDEX)

// 이 화면의 자체 토스트는 없앴다. 유일한 사용처가 "이 탭은 제외했어요" 였는데 네 칸이 전부
// 실제 화면으로 이어지면서 부를 일이 사라졌다. 에러 토스트는 공용 `useToast` 가 맡는다.

/**
 * 카테고리를 고르면 가맹점 목록으로 간다.
 *
 * 동의를 아직 안 받았으면 시트를 먼저 띄운다. **저장하고 나서 넘어간다** — 가맹점 조회가
 * `users.is_location_agreed` 를 보고 403 으로 막으므로(`DefaultStoreService.searchStores`),
 * 먼저 넘어가면 빈 화면을 보여주게 된다.
 *
 * 동의 여부는 이제 `locationStore` 가 새로고침 뒤에도 기억한다 (#220).
 */
function chooseCategory(category) {
  selectedCategory.value = category.id
  if (locationStore.isAgreed) {
    openMerchants({ categoryId: category.id, title: category.name })
    return
  }
  consentCategory.value = category
}

function onConsentAgreed() {
  const category = consentCategory.value
  consentCategory.value = null
  if (category) openMerchants({ categoryId: category.id, title: category.name })
}

/**
 * 하단 탭 이동. 자리는 `navItems` 순서와 같다 (검색 · 홈 · 카드 내역 · 혜택).
 *
 * 첫 칸(검색)은 이미 이 화면이라 아무 데도 가지 않는다. 예전에는 여기에
 * "이 탭은 제외했어요" 토스트가 있었는데, 네 칸이 전부 실제 화면으로 이어지면서
 * 닿을 수 없는 가지가 됐다.
 */
function selectTab(index) {
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
  }
}
</script>

<template>
  <!--
    헤더와 본문을 가르는 선. 픽피가 스크롤로 내려가면서 헤더가 흰 띠만 남아, 아래 내용이
    헤더 밑으로 지나갈 때 경계가 보이지 않았다.

    색은 토큰(`border-line` = `#e9e4dc`)이고 리포트 헤더(`.report-header`)가 쓰는 선과 같다 —
    화면마다 다른 회색을 쓰지 않는다. `style.css` 는 동결이라 유틸리티로 얹는다.
  -->
  <header class="header border-b border-line">
    <!--
      픽피와 말풍선은 아래 스크롤 영역으로 내려갔다 (#192). 그 자리에 서비스 로고를 둔다.

      **로그인 화면이 쓰는 `assets/title.png` 를 그대로 쓴다.** 같은 그림을 파일 두 벌로
      두면 한쪽만 바뀌었을 때 화면끼리 로고가 달라진다.

      원본은 700×200(3.5:1)이다. 헤더가 80px 이고 위 패딩이 13px 이라 34px 로 잡으면
      아래로 넉넉히 남는다. `width` 는 비율대로 따라오게 `h-*` 만 준다.

      장식이 아니라 **서비스 이름**이므로 `alt` 를 채운다.
    -->
    <!--
      `self-end` 로 아래에 붙인다. 헤더는 `padding: 13px 20px 0` 이라 가운데 정렬하면 위 패딩
      때문에 로고가 위쪽으로 치우쳐 보인다. 오른쪽 마이페이지 버튼도 `self-end` 라 둘의
      아래 선이 맞는다.
    -->
    <img :src="titleImage" alt="PickPIG" class="mb-2 h-[34px] w-auto self-end" />

    <button class="icon-button mb-1 self-end" aria-label="마이페이지 열기" @click="openMyPage()">
      <Menu :size="23" />
    </button>
  </header>

  <div class="scroll-content">
    <!--
      디자인상 인사말("안녕하세요 김지연님") 자리를 대신하는 픽피와 말풍선이다.

      **스크롤에 실려야 한다** (#192). 예전에는 헤더 안에 있었는데, 헤더가 80px 고정 밴드라
      본문을 내려도 픽피만 그 자리에 남았다. 걸쳐 있던 검색창은 올라가는데 픽피는 허공에
      뜬 것처럼 보였다. 스크롤 영역의 첫 요소로 옮겨 검색창과 같이 움직인다.

      겹침은 **음수 아래 마진**으로 만든다. 헤더에 있을 때는 `translate-y-2` 로 밴드 밖으로
      흘려보냈지만, `translate` 는 레이아웃을 밀지 않아 흐름 안에서는 아래 요소를 끌어오지
      못한다. `-mb-2` 가 검색창을 8px 끌어올려 같은 겹침을 만든다.

      8px 은 에셋 여백까지 계산한 값이다. `pig-peek.svg` 는 55×60 캔버스 안에서 그림이
      y 15~57.3 에만 있어 **아래로 2.7px 이 비어 있다.** 8px 을 끌어올리면 실제 그림은
      검색창을 5px 파고든다 — 디자인의 겹침과 같다.

      `relative z-[1]` 이 없으면 뒤에 오는 검색창이 위에 그려져 픽피 아랫부분이 가려진다.
      헤더의 `z-index: 2` 가 하던 일을 대신하는 것이다.
      왼쪽 `pl-3`(12px)은 헤더에 있을 때와 같은 자리다 — 헤더 패딩 20px 에 `-ml-2` 였다.
    -->
    <div class="relative z-[1] -mb-2 flex items-end pl-3">
      <img :src="iconPigPeek" alt="" width="55" height="60" class="shrink-0" />
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
          @click="openPlaceAmount(place)"
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

    <!-- `카드 혜택 현황` 은 리포트로 옮겼다. 혜택을 보는 자리를 리포트 한 곳으로 모은다. -->
  </div>

  <nav class="bottom-nav">
    <button
      v-for="(item, index) in navItems"
      :key="item.label"
      :class="{ active: activeTab === index }"
      @click="selectTab(index)"
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
    <BaseLocationConsentSheet
      v-if="consentCategory"
      :subject="consentCategory.name"
      @agreed="onConsentAgreed"
      @close="consentCategory = null"
    />
  </Transition>

  <!-- 혜택 현황·이벤트 시트는 `CardBenefitStatusSection` 과 함께 리포트로 옮겼다. -->
</template>
