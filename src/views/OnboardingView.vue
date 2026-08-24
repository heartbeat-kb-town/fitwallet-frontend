<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import titleImage from '@/assets/title.png'
import pigCry from '@/assets/icons/pig-cry.svg'
import pigPeek from '@/assets/icons/pig-peek.svg'
import pigPickCard from '@/assets/icons/pig-pickcard.svg'
import pigSmilePeek from '@/assets/icons/pig-smile-peek.svg'
import benefitReportImage from '@/assets/onboarding/benefit-report.png'
import recommendAmountImage from '@/assets/onboarding/recommend-amount.png'
import recommendResultImage from '@/assets/onboarding/recommend-result.png'
import storeSearchImage from '@/assets/onboarding/store-search.png'

const router = useRouter()
const scroller = ref(null)
const panelElements = ref([])
const activeIndex = ref(0)
const observerReady = ref(false)
let panelObserver

const panels = [
  {
    id: 'opening',
    kind: 'opening',
  },
  {
    id: 'problem',
    kind: 'problem',
    step: '01 · 너무 복잡한 카드 혜택',
    title: '혜택은 많은데,',
    highlight: '조건은 더 많아요',
    description: '전월 실적, 월 한도 및 횟수,\n업종별 다양한 할인 혜택까지.',
  },
  {
    id: 'bridge',
    kind: 'bridge',
  },
  {
    id: 'input',
    kind: 'input',
    step: '02 · 매장과 결제 금액 입력',
    title: '어디서 얼마를 쓸지만',
    highlight: '픽피에게 알려주세요',
    description:
      '위치 기반으로 가까운 매장을 빠르게 찾고,\n결제 금액만 입력하면 혜택 계산은 픽피가 대신해요.',
  },
  {
    id: 'result',
    kind: 'result',
    step: '03 · 결제 전 최적 카드 추천',
    title: '내 카드 중 지금',
    highlight: '가장 이득인 카드로',
    description: '할인과 포인트를 금액으로 비교해\n이번 결제에서 혜택이 가장 큰 카드를 알려드려요.',
  },
  {
    id: 'report',
    kind: 'report',
    step: '04 · 받은 혜택과 놓친 혜택',
    title: '결제한 다음에는',
    highlight: '혜택을 한눈에',
    description: '실제로 받은 혜택과 놓쳐버린 혜택을\n월별 리포트로 쉽고 정확하게 확인해요.',
  },
  {
    id: 'future',
    kind: 'future',
    step: '05 · 소비 패턴 기반 카드 추천',
    title: '소비가 쌓일수록',
    highlight: '다음 카드 추천까지',
    description: '내 소비 습관을 분석해 지금보다 혜택을\n더 받을 수 있는 카드까지 찾아드려요.',
  },
]

function setPanelRef(element, index) {
  if (element) panelElements.value[index] = element
}

function goToPanel(index) {
  panelElements.value[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goToLogin() {
  router.push({ name: 'login' })
}

function goToSignUp() {
  router.push({ name: 'signup' })
}

onMounted(async () => {
  await nextTick()

  panelObserver = new IntersectionObserver(
    (entries) => {
      const visiblePanel = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

      if (!visiblePanel) return
      activeIndex.value = Number(visiblePanel.target.dataset.index)
    },
    { root: scroller.value, threshold: [0.45, 0.65, 0.85] },
  )

  panelElements.value.forEach((panel) => panelObserver.observe(panel))
  observerReady.value = true
})

onBeforeUnmount(() => panelObserver?.disconnect())
</script>

<template>
  <div
    ref="scroller"
    class="screen onboarding-screen"
    :class="{
      'story-ready': observerReady,
      'bridge-active': panels[activeIndex]?.kind === 'bridge',
    }"
  >
    <header class="onboarding-header">
      <img :src="titleImage" alt="PickPig" />
      <button type="button" @click="goToLogin()">건너뛰기</button>
    </header>

    <nav class="story-progress" aria-label="온보딩 단계">
      <button
        v-for="(panel, index) in panels"
        :key="panel.id"
        type="button"
        :class="{ active: activeIndex === index, transition: panel.kind === 'bridge' }"
        :aria-label="
          panel.kind === 'opening'
            ? '첫 질문으로 이동'
            : panel.kind === 'bridge'
              ? '혜택 계산 고민 안내로 이동'
              : `${panel.step}로 이동`
        "
        :aria-current="activeIndex === index ? 'step' : undefined"
        @click="goToPanel(index)"
      ></button>
    </nav>

    <section
      v-for="(panel, index) in panels"
      :key="panel.id"
      :ref="(element) => setPanelRef(element, index)"
      class="onboarding-panel"
      :class="[`panel-${panel.kind}`, { 'is-active': activeIndex === index }]"
      :data-index="index"
    >
      <div v-if="panel.step" class="story-copy">
        <p class="story-step">{{ panel.step }}</p>
        <h1>
          {{ panel.title }}
          <strong>{{ panel.highlight }}</strong>
        </h1>
        <p class="story-description">{{ panel.description }}</p>
      </div>

      <div v-if="panel.kind === 'opening'" class="opening-hero">
        <p>지금 가진</p>
        <h1>
          <strong>카드 혜택,</strong>
          <span>다 알고 계신가요?</span>
        </h1>
      </div>

      <div v-else-if="panel.kind === 'bridge'" class="bridge-message">
        <span>복잡한 혜택, 혼자 계산하지 말고</span>
        <strong>이제 픽피에게 맡겨요</strong>
      </div>

      <div
        v-else-if="panel.kind === 'problem'"
        class="story-visual problem-visual"
        aria-hidden="true"
      >
        <div class="complexity-core">
          <span>카드마다</span>
          <strong>조건이</strong>
          <small>달라요</small>
        </div>
        <span class="condition-chip chip-one" style="--order: 1">전월 실적 구간</span>
        <span class="condition-chip chip-two" style="--order: 2">통합 할인 한도</span>
        <span class="condition-chip chip-three" style="--order: 3">월별 이용 횟수</span>
        <span class="condition-chip chip-four" style="--order: 4">업종별 할인율</span>
        <span class="condition-chip chip-five" style="--order: 5">건당 최소 금액</span>
        <span class="condition-chip chip-six" style="--order: 6">포인트 적립</span>
        <span class="condition-chip chip-seven" style="--order: 7">건당 최대 할인한도</span>
        <span class="condition-chip chip-eight" style="--order: 8">브랜드별 할인</span>
        <div class="problem-character">
          <img :src="pigCry" alt="" />
        </div>
      </div>

      <div v-else-if="panel.kind === 'input'" class="story-visual input-visual">
        <div class="nearby-hint" aria-hidden="true">
          <b></b>
          <span>내 위치에서 가까운 매장부터</span>
        </div>

        <figure class="app-screen store-app-screen">
          <img :src="storeSearchImage" alt="매장을 검색하거나 카테고리에서 선택하는 픽피 화면" />
        </figure>

        <figure class="app-screen amount-step-card">
          <img :src="recommendAmountImage" alt="선택한 매장의 결제 금액을 입력하는 픽피 화면" />
          <figcaption>다음 · 결제 금액 입력</figcaption>
        </figure>

        <div class="story-mascot store-mascot" aria-hidden="true">
          <span>매장만 골라주세요!</span>
          <img :src="pigPeek" alt="" />
        </div>
      </div>

      <div v-else-if="panel.kind === 'result'" class="story-visual result-visual">
        <figure class="app-screen result-app-screen">
          <img
            :src="recommendResultImage"
            alt="매장과 결제 금액에 맞는 최적 카드를 추천하는 픽피 화면"
          />
        </figure>
        <div class="result-character" aria-hidden="true">
          <span>혜택 비교 완료!</span>
          <img :src="pigPickCard" alt="" />
        </div>
      </div>

      <div v-else-if="panel.kind === 'report'" class="story-visual report-visual">
        <figure class="app-screen report-app-screen">
          <img
            :src="benefitReportImage"
            alt="이번 달 받은 혜택과 놓친 혜택을 모두 보여주는 픽피 리포트 화면"
          />
          <figcaption>받은 혜택과 놓친 혜택을 한 화면에</figcaption>
        </figure>
        <div class="story-mascot report-mascot" aria-hidden="true">
          <span>놓친 혜택도 찾았어요!</span>
          <img :src="pigSmilePeek" alt="" />
        </div>
      </div>

      <div
        v-else-if="panel.kind === 'future'"
        class="story-visual future-visual"
        aria-hidden="true"
      >
        <div class="spending-insight">
          <div class="insight-heading">
            <span>최근 3개월 소비 분석</span>
            <strong>쇼핑·카페 42%</strong>
          </div>
          <div class="insight-bars">
            <i style="--height: 48%"></i>
            <i style="--height: 72%"></i>
            <i style="--height: 58%"></i>
            <i style="--height: 92%"></i>
            <i style="--height: 76%"></i>
          </div>
        </div>
        <div class="future-card">
          <span class="future-card-label">PICKPIG 추천</span>
          <div class="future-card-chip"></div>
          <strong>쇼핑·카페 혜택 카드</strong>
          <small>월평균 14,200원 더 받을 수 있어요</small>
          <b>추천 카드 보기 →</b>
        </div>
        <div class="future-badge">내 소비에 맞춰 더 똑똑하게</div>
      </div>

      <div
        v-if="panel.kind !== 'bridge' && index < panels.length - 1"
        class="scroll-cue"
        aria-hidden="true"
      >
        <span></span>
        아래로 스크롤
      </div>

      <div v-else-if="index === panels.length - 1" class="story-actions">
        <button class="story-primary" type="button" @click="goToSignUp()">픽피 시작하기</button>
        <button class="story-login" type="button" @click="goToLogin()">이미 계정이 있어요</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.onboarding-screen {
  display: block;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  overscroll-behavior-y: contain;
  background: #fff;
}

.onboarding-screen::-webkit-scrollbar {
  display: none;
}

.onboarding-header {
  position: sticky;
  z-index: 20;
  top: 0;
  height: 74px;
  margin-bottom: -74px;
  padding: 24px 24px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0));
  pointer-events: none;
  transition:
    opacity 0.35s ease,
    transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.onboarding-header img {
  width: 116px;
  height: auto;
}

.onboarding-header button {
  padding: 8px 0 8px 12px;
  background: transparent;
  color: #8e8579;
  font-size: 13px;
  font-weight: 700;
}

.onboarding-header img,
.onboarding-header button {
  pointer-events: auto;
}

.story-progress {
  position: sticky;
  z-index: 18;
  top: calc(50% - 46px);
  width: 18px;
  height: 0;
  margin-left: calc(100% - 24px);
  display: flex;
  flex-direction: column;
  gap: 7px;
  transition:
    opacity 0.3s ease,
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.bridge-active .onboarding-header {
  opacity: 0;
  transform: translateY(-24px);
}

.bridge-active .story-progress {
  opacity: 0;
  transform: translateX(18px);
  pointer-events: none;
}

.story-progress button {
  width: 6px;
  height: 6px;
  padding: 0;
  flex: none;
  border-radius: 999px;
  background: rgba(96, 88, 76, 0.24);
  transition:
    height 0.25s ease,
    background 0.25s ease;
}

.story-progress button.active {
  height: 22px;
  background: #ffcc00;
}

.story-progress button.transition {
  width: 4px;
  height: 4px;
  margin-left: 1px;
}

.story-progress button.transition.active {
  height: 14px;
}

.onboarding-panel {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 650px;
  padding: 88px 24px 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.panel-problem,
.panel-result,
.panel-future {
  background:
    radial-gradient(circle at 88% 14%, rgba(255, 204, 0, 0.16), transparent 27%),
    linear-gradient(180deg, #fffdf8, #fff 70%);
}

.panel-input,
.panel-report {
  background:
    radial-gradient(circle at 10% 82%, rgba(255, 204, 0, 0.12), transparent 31%),
    linear-gradient(180deg, #fff, #fffaf0);
}

.panel-opening {
  background:
    radial-gradient(circle at 87% 23%, rgba(255, 204, 0, 0.28), transparent 31%),
    radial-gradient(circle at 8% 84%, rgba(255, 204, 0, 0.1), transparent 33%), #fffdf8;
}

.panel-opening::before {
  content: '';
  position: absolute;
  top: 19%;
  right: -82px;
  width: 235px;
  height: 315px;
  border-radius: 58% 42% 62% 38%;
  background: linear-gradient(145deg, rgba(255, 204, 0, 0.16), rgba(255, 204, 0, 0.025));
  transform: rotate(17deg);
}

.opening-hero {
  position: relative;
  z-index: 3;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-bottom: 48px;
}

.opening-hero p {
  margin: 0 0 12px;
  color: #6f665a;
  font-size: 20px;
  font-weight: 750;
  letter-spacing: -0.6px;
}

.opening-hero h1 {
  margin: 0;
  line-height: 1.12;
  letter-spacing: -2px;
}

.opening-hero strong,
.opening-hero span {
  display: block;
}

.opening-hero strong {
  position: relative;
  z-index: 0;
  width: max-content;
  color: #1a1a1a;
  font-size: clamp(47px, 12.8vw, 55px);
}

.opening-hero strong::after {
  content: '';
  position: absolute;
  z-index: -1;
  right: -6px;
  bottom: 3px;
  left: -6px;
  height: 17px;
  border-radius: 9px;
  background: rgba(255, 204, 0, 0.82);
}

.opening-hero span {
  margin-top: 8px;
  color: #1a1a1a;
  font-size: clamp(34px, 9.5vw, 41px);
  font-weight: 800;
}

.panel-bridge {
  padding: 0 25px;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at center, rgba(255, 204, 0, 0.18), transparent 31%), #fff;
  color: #1a1a1a;
}

.panel-bridge::before,
.panel-bridge::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  pointer-events: none;
}

.panel-bridge::before {
  width: 470px;
  height: 470px;
  border: 1px solid rgba(224, 216, 204, 0.42);
  box-shadow:
    0 0 0 54px rgba(255, 204, 0, 0.045),
    0 0 0 108px rgba(224, 216, 204, 0.08);
  transform: translate(-50%, -50%);
}

.panel-bridge::after {
  width: 285px;
  height: 285px;
  background: repeating-conic-gradient(
    from -7deg,
    rgba(230, 168, 0, 0.64) 0 2deg,
    transparent 2deg 15deg
  );
  -webkit-mask: radial-gradient(circle, transparent 0 55%, #000 56% 61%, transparent 62%);
  mask: radial-gradient(circle, transparent 0 55%, #000 56% 61%, transparent 62%);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4) rotate(-12deg);
}

.bridge-message {
  position: relative;
  z-index: 2;
  width: 100%;
  text-align: center;
}

.bridge-message span,
.bridge-message strong {
  display: block;
}

.bridge-message span {
  color: #6f665a;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.bridge-message strong {
  position: relative;
  z-index: 0;
  width: max-content;
  max-width: 100%;
  margin-top: 10px;
  margin-right: auto;
  margin-left: auto;
  color: #1a1a1a;
  font-size: clamp(31px, 8.7vw, 38px);
  line-height: 1.18;
  letter-spacing: -1.7px;
}

.bridge-message strong::after {
  content: '';
  position: absolute;
  z-index: -1;
  right: -5px;
  bottom: 2px;
  left: -5px;
  height: 13px;
  border-radius: 7px;
  background: rgba(255, 204, 0, 0.82);
  transform: scaleX(0);
  transform-origin: left center;
}

.story-copy {
  position: relative;
  z-index: 4;
  flex: none;
}

.story-step {
  margin: 0 0 10px;
  color: #c18700;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.1px;
}

.story-copy h1 {
  margin: 0;
  font-size: clamp(27px, 7.4vw, 31px);
  line-height: 1.28;
  letter-spacing: -1.25px;
}

.story-copy h1 strong {
  display: block;
  width: max-content;
  max-width: 100%;
  position: relative;
  z-index: 0;
  font-weight: 800;
}

.story-copy h1 strong::after {
  content: '';
  position: absolute;
  z-index: -1;
  right: -3px;
  bottom: 2px;
  left: -3px;
  height: 10px;
  border-radius: 6px;
  background: rgba(255, 204, 0, 0.68);
}

.story-description {
  margin: 14px 0 0;
  color: #60584c;
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.58;
  letter-spacing: -0.25px;
  white-space: pre-line;
}

.story-visual {
  position: relative;
  min-height: 0;
  margin-top: 10px;
  flex: 1;
}

.problem-visual {
  background:
    radial-gradient(circle at 50% 37%, rgba(255, 204, 0, 0.12), transparent 34%),
    repeating-radial-gradient(
      circle at 50% 37%,
      transparent 0 33px,
      rgba(224, 216, 204, 0.32) 34px 35px
    );
}

.problem-character {
  position: absolute;
  z-index: 4;
  right: 5px;
  bottom: 68px;
  width: 174px;
  height: 174px;
}

.problem-character > img {
  display: block;
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 12px 12px rgba(70, 49, 11, 0.11));
}

.complexity-core {
  position: absolute;
  z-index: 1;
  top: 37%;
  left: 50%;
  width: 132px;
  height: 132px;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(230, 168, 0, 0.26);
  border-radius: 999px;
  background: rgba(255, 249, 229, 0.92);
  color: #6f665a;
  text-align: center;
  transform: translate(-50%, -50%);
}

.complexity-core span,
.complexity-core strong,
.complexity-core small {
  display: block;
}

.complexity-core span,
.complexity-core small {
  font-size: 9px;
  font-weight: 700;
}

.complexity-core strong {
  margin: 2px 0;
  color: #1a1a1a;
  font-size: 27px;
}

.condition-chip {
  position: absolute;
  z-index: 3;
  top: 37%;
  left: 50%;
  padding: 9px 12px;
  border: 1px solid #ebe5db;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.97);
  color: #6f665a;
  box-shadow: 0 8px 20px rgba(64, 52, 33, 0.09);
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
  transform: translate(-50%, -50%) translate(var(--orbit-x), var(--orbit-y)) rotate(var(--tilt));
}

.chip-one {
  --orbit-x: -106px;
  --orbit-y: -112px;
  --tilt: -6deg;
}

.chip-two {
  --orbit-x: 0px;
  --orbit-y: -142px;
  --tilt: 2deg;
}

.chip-three {
  --orbit-x: 104px;
  --orbit-y: -105px;
  --tilt: 6deg;
}

.chip-four {
  --orbit-x: 122px;
  --orbit-y: -28px;
  --tilt: -4deg;
}

.chip-five {
  --orbit-x: 103px;
  --orbit-y: 58px;
  --tilt: 5deg;
}

.chip-six {
  --orbit-x: 0px;
  --orbit-y: 106px;
  --tilt: -2deg;
}

.chip-seven {
  --orbit-x: -103px;
  --orbit-y: 60px;
  --tilt: 4deg;
}

.chip-eight {
  --orbit-x: -122px;
  --orbit-y: -27px;
  --tilt: -5deg;
}

.app-screen {
  margin: 0;
  overflow: hidden;
  border: 1px solid #eee8df;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 18px 38px rgba(61, 47, 22, 0.14);
}

.app-screen img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.input-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 20px;
}

.nearby-hint {
  display: flex;
  position: absolute;
  z-index: 7;
  top: 8px;
  left: -2px;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border: 1px solid rgba(230, 168, 0, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #60584c;
  box-shadow: 0 9px 20px rgba(61, 47, 22, 0.12);
  font-size: 9px;
  font-weight: 900;
  white-space: nowrap;
}

.nearby-hint b {
  position: relative;
  width: 12px;
  height: 12px;
  flex: none;
  border: 3px solid #f2b700;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}

.nearby-hint b::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #f2b700;
}

.store-app-screen {
  position: relative;
  top: -34px;
  left: -10px;
  width: min(286px, 86%);
  border-color: rgba(255, 204, 0, 0.52);
  box-shadow:
    -12px 14px 0 rgba(255, 204, 0, 0.15),
    0 20px 40px rgba(61, 47, 22, 0.14);
  transform: rotate(-2deg);
}

.amount-step-card {
  position: absolute;
  z-index: 4;
  right: -4px;
  bottom: 62px;
  width: 145px;
  border: 3px solid #fff;
  border-radius: 17px;
  box-shadow: 0 10px 22px rgba(26, 26, 26, 0.22);
  transform: rotate(5deg);
}

.amount-step-card img {
  height: 158px;
  object-fit: cover;
  object-position: top;
}

.amount-step-card figcaption {
  padding: 8px 6px 9px;
  background: #1a1a1a;
  color: #ffcc00;
  font-size: 8px;
  font-weight: 900;
  text-align: center;
}

.story-mascot {
  position: absolute;
  z-index: 6;
  width: 130px;
  text-align: center;
}

.story-mascot::before,
.result-character::before {
  content: '';
  position: absolute;
  z-index: 0;
  bottom: 7px;
  left: 50%;
  width: 88px;
  height: 88px;
  border: 3px solid rgba(255, 204, 0, 0.6);
  border-radius: 50%;
  opacity: 0;
  transform: translateX(-50%) scale(0.2);
}

.story-mascot::after,
.result-character::after {
  content: '';
  position: absolute;
  z-index: 3;
  right: 17px;
  bottom: 35px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffcc00;
  box-shadow:
    -94px 16px 0 #f2b700,
    -80px -35px 0 #ffe27a,
    -13px -60px 0 #f2b700,
    17px -25px 0 #ffe27a;
  opacity: 0;
}

.story-mascot > span {
  display: inline-block;
  position: relative;
  z-index: 2;
  margin-bottom: -6px;
  padding: 8px 10px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #1a1a1a;
  color: #ffcc00;
  box-shadow: 0 9px 20px rgba(26, 26, 26, 0.18);
  font-size: 9px;
  font-weight: 900;
  white-space: nowrap;
}

.story-mascot > span::after,
.result-character span::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  width: 10px;
  height: 10px;
  background: inherit;
  transform: translateX(-50%) rotate(45deg);
}

.story-mascot > img {
  display: block;
  position: relative;
  z-index: 1;
  width: 108px;
  height: 108px;
  margin: 0 auto;
  object-fit: contain;
  filter: drop-shadow(0 9px 10px rgba(70, 49, 11, 0.11));
}

.store-mascot {
  bottom: 23px;
  left: -8px;
}

.result-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 48px;
}

.result-app-screen {
  position: relative;
  z-index: 2;
  top: -48px;
  width: min(250px, 77%);
}

.result-character {
  position: absolute;
  z-index: 4;
  right: 7px;
  bottom: 27px;
  width: 134px;
  text-align: center;
}

.result-character span {
  display: inline-block;
  position: relative;
  z-index: 2;
  margin-bottom: -10px;
  padding: 8px 10px;
  border-radius: 999px;
  background: #1a1a1a;
  color: #ffcc00;
  box-shadow: 0 8px 18px rgba(26, 26, 26, 0.17);
  font-size: 9px;
  font-weight: 900;
}

.result-character img {
  display: block;
  position: relative;
  z-index: 1;
  width: 120px;
  height: 120px;
  margin: 0 auto;
  object-fit: contain;
  filter: drop-shadow(0 9px 10px rgba(70, 49, 11, 0.1));
}

.report-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 9px;
}

.report-app-screen {
  width: min(238px, 72%);
  margin-right: 4px;
  margin-left: auto;
  padding: 7px 7px 0;
  transform: rotate(1.5deg);
}

.report-app-screen img {
  width: 100%;
  height: auto;
  border-radius: 16px 16px 0 0;
}

.report-app-screen figcaption {
  padding: 10px 5px 12px;
  color: #60584c;
  font-size: 9px;
  font-weight: 800;
  text-align: center;
}

.report-mascot {
  bottom: 34px;
  left: -7px;
}

.future-visual {
  min-height: 340px;
}

.spending-insight {
  position: absolute;
  z-index: 1;
  top: 15px;
  left: 0;
  width: 78%;
  height: 160px;
  padding: 17px;
  border: 1px solid #eee8df;
  border-radius: 21px;
  background: #fff;
  box-shadow: 0 15px 32px rgba(61, 47, 22, 0.1);
  transform: rotate(-2.5deg);
}

.insight-heading span,
.insight-heading strong {
  display: block;
}

.insight-heading span {
  color: #8e8579;
  font-size: 9px;
  font-weight: 700;
}

.insight-heading strong {
  margin-top: 4px;
  font-size: 16px;
}

.insight-bars {
  position: absolute;
  right: 17px;
  bottom: 17px;
  left: 17px;
  height: 63px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  border-bottom: 1px solid #eee9e1;
}

.insight-bars i {
  height: var(--height);
  flex: 1;
  border-radius: 5px 5px 1px 1px;
  background: linear-gradient(180deg, #ffcc00, #ffe581);
}

.future-card {
  position: absolute;
  z-index: 3;
  right: 0;
  bottom: 44px;
  width: 86%;
  height: 190px;
  padding: 18px;
  overflow: hidden;
  border-radius: 23px;
  background: linear-gradient(135deg, #2e3238, #15171a);
  color: #fff;
  box-shadow: 0 20px 38px rgba(26, 26, 26, 0.25);
  transform: rotate(2deg);
}

.future-card::after {
  content: '';
  position: absolute;
  top: -75px;
  right: -45px;
  width: 190px;
  height: 190px;
  border: 30px solid rgba(255, 204, 0, 0.75);
  border-radius: 999px;
}

.future-card-label {
  color: #ffcc00;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.5px;
}

.future-card-chip {
  width: 36px;
  height: 27px;
  margin: 19px 0 12px;
  border-radius: 7px;
  background:
    linear-gradient(90deg, transparent 47%, rgba(98, 80, 16, 0.5) 48% 52%, transparent 53%),
    linear-gradient(#f3d164, #bd9630);
}

.future-card strong,
.future-card small,
.future-card b {
  display: block;
  position: relative;
  z-index: 2;
}

.future-card strong {
  font-size: 15px;
}

.future-card small {
  margin-top: 5px;
  color: #d9d6d1;
  font-size: 9px;
}

.future-card b {
  margin-top: 15px;
  color: #ffcc00;
  font-size: 10px;
}

.future-badge {
  position: absolute;
  z-index: 5;
  bottom: 22px;
  left: 7px;
  padding: 9px 12px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #fff8e5;
  color: #8a6500;
  box-shadow: 0 9px 20px rgba(61, 47, 22, 0.13);
  font-size: 9px;
  font-weight: 900;
}

.scroll-cue {
  position: absolute;
  z-index: 8;
  bottom: 18px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #9a9186;
  font-size: 10px;
  font-weight: 700;
  transform: translateX(-50%);
}

.scroll-cue span {
  width: 18px;
  height: 28px;
  position: relative;
  border: 1.5px solid #c6bfb5;
  border-radius: 999px;
}

.scroll-cue span::after {
  content: '';
  position: absolute;
  top: 5px;
  left: 50%;
  width: 3px;
  height: 6px;
  border-radius: 999px;
  background: #ffcc00;
  transform: translateX(-50%);
  animation: scroll-dot 1.5s ease-in-out infinite;
}

.story-actions {
  position: relative;
  z-index: 8;
  margin-top: 6px;
  flex: none;
}

.story-primary {
  width: 100%;
  height: 52px;
  border-radius: 15px;
  background: #ffcc00;
  box-shadow: 0 10px 20px rgba(230, 168, 0, 0.2);
  font-size: 15px;
  font-weight: 800;
}

.story-login {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: #60584c;
  font-size: 12px;
  font-weight: 700;
}

.story-ready .onboarding-panel:not(.is-active) .story-copy {
  opacity: 0;
  transform: translateY(30px);
}

.story-ready .onboarding-panel:not(.is-active) .story-visual,
.story-ready .onboarding-panel:not(.is-active) .scroll-cue,
.story-ready .onboarding-panel:not(.is-active) .story-actions {
  opacity: 0;
  transform: translateY(46px) scale(0.95);
}

.story-copy,
.story-visual,
.scroll-cue,
.story-actions {
  transform-origin: center bottom;
  transition:
    opacity 0.55s ease,
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-active .story-visual {
  transition-delay: 0.1s;
}

.is-active .scroll-cue,
.is-active .story-actions {
  transition-delay: 0.22s;
}

.is-active .app-screen,
.is-active .spending-insight,
.is-active .future-card {
  animation: screen-settle 0.72s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
}

.is-active .condition-chip {
  animation: chip-arrive 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(0.11s + var(--order) * 0.045s);
}

.is-active .problem-character {
  transform-origin: center bottom;
  animation: problem-character-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

.is-active .problem-character > img {
  animation: problem-sway 3.2s ease-in-out 1.2s infinite;
}

.is-active .store-mascot {
  transform-origin: left bottom;
  animation: store-character-in 0.82s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
}

.is-active .store-mascot > img {
  animation: store-peek-idle 2.8s ease-in-out 1.25s infinite;
}

.is-active .store-mascot::before {
  animation: store-ripple 0.8s ease-out 0.48s both;
}

.is-active .store-mascot > span {
  animation: store-bubble-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.72s both;
}

.is-active .result-character {
  transform-origin: center bottom;
  animation: result-character-in 0.88s cubic-bezier(0.34, 1.56, 0.64, 1) 0.26s both;
}

.is-active .result-character > img {
  animation: result-card-idle 2.5s ease-in-out 1.25s infinite;
}

.is-active .result-character::after {
  animation: result-sparks 0.72s ease-out 0.48s both;
}

.is-active .result-character > span {
  animation: result-bubble-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.68s both;
}

.is-active .report-mascot > img {
  animation: report-roam 2.7s ease-in-out infinite;
}

.is-active .amount-step-card {
  animation: secondary-screen-pop 0.64s cubic-bezier(0.16, 1, 0.3, 1) 0.36s both;
}

.panel-bridge.is-active::after {
  animation: bridge-firework 1s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both;
}

.panel-bridge.is-active .bridge-message span {
  animation: bridge-question-in 0.68s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

.panel-bridge.is-active .bridge-message strong {
  animation: bridge-answer-in 0.78s cubic-bezier(0.34, 1.56, 0.64, 1) 0.43s both;
}

.panel-bridge.is-active .bridge-message strong::after {
  animation: bridge-highlight 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.72s both;
}

.is-active .nearby-hint {
  animation: nearby-arrive 0.58s cubic-bezier(0.16, 1, 0.3, 1) 0.62s both;
}

.panel-opening.is-active .opening-hero p {
  animation: opening-line-arrive 0.62s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
}

.panel-opening.is-active .opening-hero strong {
  animation: opening-title-arrive 0.72s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
}

.panel-opening.is-active .opening-hero span {
  animation: opening-line-arrive 0.68s cubic-bezier(0.16, 1, 0.3, 1) 0.38s both;
}

@keyframes opening-line-arrive {
  from {
    opacity: 0;
    filter: blur(7px);
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

@keyframes opening-title-arrive {
  from {
    opacity: 0;
    transform: translateY(26px) scale(0.82);
  }
  72% {
    opacity: 1;
    transform: translateY(-3px) scale(1.04);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes screen-settle {
  from {
    opacity: 0;
    transform: translateY(26px) scale(0.94);
  }
}

@keyframes chip-arrive {
  from {
    opacity: 0;
    translate: 0 14px;
    scale: 0.9;
  }
}

@keyframes problem-character-in {
  from {
    opacity: 0;
    transform: translate(28px, 45px) scale(0.88) rotate(8deg);
  }
  55% {
    opacity: 1;
    transform: translate(-4px, -3px) scale(1) rotate(-5deg);
  }
  76% {
    transform: translate(2px, 1px) rotate(3deg);
  }
  to {
    opacity: 1;
    transform: translate(0, 0) scale(1) rotate(0);
  }
}

@keyframes problem-sway {
  0%,
  100% {
    transform: translateY(0) rotate(0);
  }
  50% {
    transform: translateY(3px) rotate(-2deg);
  }
}

@keyframes store-character-in {
  from {
    opacity: 0;
    transform: translate(-82px, 26px) scale(0.78) rotate(-15deg);
  }
  68% {
    opacity: 1;
    transform: translate(7px, -3px) scale(1.03) rotate(4deg);
  }
  to {
    opacity: 1;
    transform: translate(0, 0) scale(1) rotate(0);
  }
}

@keyframes store-peek-idle {
  0%,
  100% {
    transform: translateX(0) rotate(0);
  }
  50% {
    transform: translateX(4px) rotate(2deg);
  }
}

@keyframes store-ripple {
  from {
    opacity: 0.8;
    transform: translateX(-50%) scale(0.2);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) scale(1.55, 0.85);
  }
}

@keyframes store-bubble-in {
  from {
    opacity: 0;
    transform: translateX(-34px) scaleX(0.72);
  }
  to {
    opacity: 1;
    transform: translateX(0) scaleX(1);
  }
}

@keyframes result-character-in {
  from {
    opacity: 0;
    transform: translateY(88px) scale(0.48) rotate(13deg);
  }
  58% {
    opacity: 1;
    transform: translateY(-18px) scale(1.12) rotate(-7deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0);
  }
}

@keyframes result-card-idle {
  0%,
  100% {
    transform: translateY(0) rotate(0);
  }
  50% {
    transform: translateY(-7px) rotate(3deg);
  }
}

@keyframes result-sparks {
  from {
    opacity: 0;
    transform: scale(0.25) rotate(-24deg);
  }
  38% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: scale(1.35) rotate(18deg);
  }
}

@keyframes result-bubble-in {
  from {
    opacity: 0;
    transform: translateY(13px) scale(0.55) rotate(9deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0);
  }
}

@keyframes report-roam {
  0%,
  100% {
    transform: translate(-4px, 0) rotate(-2deg);
  }
  25% {
    transform: translate(3px, -4px) rotate(1deg);
  }
  50% {
    transform: translate(8px, 0) rotate(2deg);
  }
  75% {
    transform: translate(2px, -3px) rotate(0);
  }
}

@keyframes secondary-screen-pop {
  from {
    opacity: 0;
    transform: translate(34px, 24px) scale(0.78) rotate(11deg);
  }
  to {
    opacity: 1;
    transform: translate(0, 0) scale(1) rotate(5deg);
  }
}

@keyframes bridge-firework {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.58) rotate(-9deg);
  }
  48% {
    opacity: 0.62;
  }
  to {
    opacity: 0.08;
    transform: translate(-50%, -50%) scale(1.08) rotate(3deg);
  }
}

@keyframes bridge-question-in {
  from {
    opacity: 0;
    filter: blur(9px);
    letter-spacing: 3px;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    filter: blur(0);
    letter-spacing: -0.5px;
    transform: translateY(0);
  }
}

@keyframes bridge-answer-in {
  from {
    opacity: 0;
    filter: blur(10px);
    transform: translateY(22px) scale(0.82);
  }
  68% {
    filter: blur(0);
    transform: translateY(-3px) scale(1.04);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0) scale(1);
  }
}

@keyframes bridge-highlight {
  from {
    opacity: 0;
    transform: scaleX(0);
  }
  to {
    opacity: 1;
    transform: scaleX(1);
  }
}

@keyframes nearby-arrive {
  from {
    opacity: 0;
    transform: translate(-28px, 8px) rotate(-5deg);
  }
  to {
    opacity: 1;
    transform: translate(0, 0) rotate(0);
  }
}

@keyframes scroll-dot {
  0%,
  100% {
    opacity: 0.35;
    transform: translate(-50%, 0);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, 8px);
  }
}

@media (max-height: 720px) {
  .onboarding-panel {
    padding-top: 74px;
    padding-bottom: 16px;
  }

  .panel-bridge {
    padding: 0 25px;
  }

  .story-description {
    margin-top: 9px;
    font-size: 12.5px;
  }

  .story-visual {
    margin-top: 4px;
  }

  .condition-chip {
    padding: 7px 9px;
    font-size: 9px;
  }

  .complexity-core {
    width: 112px;
    height: 112px;
    padding: 0;
  }

  .problem-character {
    bottom: 57px;
    width: 145px;
    height: 145px;
  }

  .nearby-hint {
    top: 2px;
    padding: 7px 9px;
    font-size: 8px;
  }

  .store-app-screen {
    width: min(245px, 75%);
  }

  .amount-step-card {
    bottom: 53px;
    width: 122px;
  }

  .amount-step-card img {
    height: 128px;
  }

  .story-mascot {
    width: 108px;
  }

  .story-mascot > img {
    width: 87px;
    height: 87px;
  }

  .store-mascot {
    bottom: 18px;
  }

  .report-mascot {
    bottom: 22px;
  }

  .result-app-screen {
    width: min(218px, 67%);
  }

  .result-character {
    bottom: 14px;
  }

  .result-character img {
    width: 99px;
    height: 99px;
  }

  .report-app-screen {
    width: min(201px, 62%);
  }

  .future-visual {
    min-height: 286px;
  }

  .spending-insight {
    height: 132px;
  }

  .insight-bars {
    height: 47px;
  }

  .future-card {
    bottom: 33px;
    height: 162px;
  }

  .future-card-chip {
    margin: 12px 0 8px;
  }

  .future-card b {
    margin-top: 9px;
  }

  .scroll-cue {
    bottom: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-screen {
    scroll-behavior: auto;
  }

  .story-copy,
  .story-visual,
  .scroll-cue,
  .story-actions,
  .onboarding-header,
  .story-progress,
  .story-progress button {
    transition: none;
  }

  .is-active .app-screen,
  .is-active .spending-insight,
  .is-active .future-card,
  .is-active .condition-chip,
  .is-active .problem-character,
  .is-active .problem-character > img,
  .is-active .story-mascot,
  .is-active .story-mascot::before,
  .is-active .story-mascot::after,
  .is-active .story-mascot > img,
  .is-active .story-mascot > span,
  .is-active .result-character,
  .is-active .result-character::before,
  .is-active .result-character::after,
  .is-active .result-character > img,
  .is-active .result-character > span,
  .is-active .amount-step-card,
  .panel-bridge.is-active::after,
  .panel-bridge.is-active .bridge-message span,
  .panel-bridge.is-active .bridge-message strong,
  .panel-bridge.is-active .bridge-message strong::after,
  .is-active .nearby-hint,
  .scroll-cue span::after {
    animation: none;
  }

  .panel-opening.is-active .opening-hero p,
  .panel-opening.is-active .opening-hero strong,
  .panel-opening.is-active .opening-hero span {
    animation: none;
  }

  .bridge-message strong::after {
    opacity: 1;
    transform: scaleX(1);
  }
}
</style>
